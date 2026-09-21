#!/usr/bin/env node
/**
 * Build src/data/dcj-housing.json from NSW DCJ Rent and Sales Report
 * postcode tables, joined to mapped SALs via ABS 2021 SAL↔POA
 * correspondence (largest overlap). Fallback: SAL centroid in POA.
 *
 *   npm run data:housing
 *   npm run data:housing -- --fresh
 *
 * Does not invent medians. Missing / suppressed cells stay null.
 */
import { spawnSync } from "node:child_process";
import { createWriteStream, readFileSync } from "node:fs";
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";

const RENT_URL =
  "https://dcj.nsw.gov.au/content/dam/dcj/dcj-website/documents/about-us/families-and-communities-statistics/housing-and-rent-sales/rent-tables-june-2026-quarter.xlsx";
const SALES_URL =
  "https://dcj.nsw.gov.au/content/dam/dcj/dcj-website/documents/about-us/families-and-communities-statistics/housing-and-rent-sales/sales-tables-march-2026-quarter.xlsx";
const CORR_ZIP_URL =
  "https://data.gov.au/data/dataset/2c79581f-600e-4560-80a8-98adb1922dfc/resource/33d822ba-138e-47ae-a15f-460279c3acc3/download/asgs2021correspondences.zip";
const POA_LAYER = "https://geo.abs.gov.au/arcgis/rest/services/ASGS2021/POA/MapServer/0/query";
const ATTRIBUTION = "NSW Department of Communities and Justice, Rent and Sales Report";
const LICENCE = "CC BY 4.0";
const MISSING = new Set(["", "null", "na", "n.a.", "n/a", "..", "...", "-", "*", "s", "(s)", "–", "—"]);

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = join(root, "data", "cache");
const rentPath = join(cacheDir, "rent-tables-june-2026-quarter.xlsx");
const salesPath = join(cacheDir, "sales-tables-march-2026-quarter.xlsx");
const corrZipPath = join(cacheDir, "asgs2021correspondences.zip");
const corrXlsxPath = join(cacheDir, "CG_SAL_2021_POA_2021.xlsx");
const polygonsPath = join(root, "src", "data", "suburb-polygons.json");
const censusPath = join(root, "src", "data", "census-2021.json");
const outPath = join(root, "src", "data", "dcj-housing.json");

const UA = { "User-Agent": "SydneyAreas/1.0" };

function fail(message) {
  console.error(message);
  process.exit(1);
}

function cellText(value) {
  if (value == null || value === "") return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if ("result" in value && value.result != null) return cellText(value.result);
    if ("text" in value && value.text != null) return String(value.text);
    if (Array.isArray(value.richText)) return value.richText.map((p) => p.text).join("");
    if (value.hyperlink && value.text) return String(value.text);
  }
  return String(value);
}

function parseNum(raw) {
  const t = cellText(raw).trim().toLowerCase().replace(/,/g, "");
  if (MISSING.has(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function padPostcode(raw) {
  const digits = cellText(raw).replace(/\D/g, "");
  if (!digits) return null;
  return digits.padStart(4, "0");
}

function salCode(raw) {
  return cellText(raw).replace(/^SAL/i, "").trim();
}

function isTotal(raw) {
  return /^(total|all|all dwellings|all dwelling types)$/i.test(cellText(raw).trim());
}

function quarterFromText(text, fallback) {
  const t = cellText(text);
  const range = t.match(
    /(January|February|March|April|May|June|July|August|September|October|November|December)[^\d]{0,24}(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i,
  );
  if (range) {
    const end = range[2].slice(0, 3);
    return `${end.charAt(0).toUpperCase()}${end.slice(1).toLowerCase()} ${range[3]} quarter`;
  }
  const one = t.match(
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i,
  );
  if (one) {
    const m = one[1].slice(0, 3);
    return `${m.charAt(0).toUpperCase()}${m.slice(1).toLowerCase()} ${one[2]} quarter`;
  }
  return fallback;
}

async function downloadFile(url, dest, fresh) {
  if (!fresh) {
    try {
      const info = await stat(dest);
      if (info.size > 0) {
        console.error(`Using cached ${dest}`);
        return true;
      }
    } catch {
      /* download */
    }
  }
  console.error(`Downloading ${url}`);
  let res;
  try {
    res = await fetch(url, { headers: UA });
  } catch (err) {
    console.error(`Download failed (${err instanceof Error ? err.message : "network"}): ${url}`);
    return false;
  }
  if (!res.ok || !res.body) {
    console.error(`Download failed (${res.status}): ${url}`);
    return false;
  }
  const tmp = `${dest}.partial`;
  try {
    await pipeline(Readable.fromWeb(res.body), createWriteStream(tmp));
    await rename(tmp, dest);
  } catch (err) {
    await rm(tmp, { force: true });
    console.error(`Write failed (${err instanceof Error ? err.message : "write"}): ${dest}`);
    return false;
  }
  const info = await stat(dest);
  console.error(`Saved ${dest} (${(info.size / 1e6).toFixed(1)} MB)`);
  return true;
}

function headerIndex(cells, tests) {
  for (let i = 0; i < cells.length; i++) {
    if (tests.every((re) => re.test(cells[i]))) return i;
  }
  return -1;
}

function findHeaderRow(ws, maxRow = 20) {
  const maxC = Math.min(ws.columnCount || 20, 20);
  for (let r = 1; r <= Math.min(ws.rowCount, maxRow); r++) {
    const cells = [];
    for (let c = 1; c <= maxC; c++) cells.push(cellText(ws.getRow(r).getCell(c).value));
    const joined = cells.join(" | ");
    if (/postcode/i.test(joined) && /median/i.test(joined)) return { row: r, cells };
  }
  return null;
}

function sheetByName(wb, re) {
  return wb.worksheets.find((s) => re.test(s.name)) ?? null;
}

async function parseRent(path) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const ws = sheetByName(wb, /postcode/i);
  if (!ws) throw new Error("Rent workbook has no Postcode sheet");
  const period = quarterFromText(ws.getRow(2).getCell(1).value, "Jun 2026 quarter");
  const header = findHeaderRow(ws);
  if (!header) throw new Error("Rent Postcode sheet: no header with Postcode + Median");
  const pcCol = headerIndex(header.cells, [/^postcode$/i]);
  const dwellCol = headerIndex(header.cells, [/dwelling/i]);
  const bedsCol = headerIndex(header.cells, [/bedroom/i]);
  const medianCol = headerIndex(header.cells, [/median/i, /weekly rent/i]);
  if (pcCol < 0 || medianCol < 0 || dwellCol < 0 || bedsCol < 0) {
    throw new Error(
      `Rent headers missing (pc=${pcCol} dwell=${dwellCol} beds=${bedsCol} median=${medianCol})`,
    );
  }
  /** @type {Map<string, number>} */
  const byPc = new Map();
  for (let r = header.row + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (!isTotal(row.getCell(dwellCol + 1).value) || !isTotal(row.getCell(bedsCol + 1).value)) {
      continue;
    }
    const pc = padPostcode(row.getCell(pcCol + 1).value);
    const median = parseNum(row.getCell(medianCol + 1).value);
    if (!pc || median == null) continue;
    byPc.set(pc, median);
  }
  console.error(`Rent Postcode: ${byPc.size} postcodes with Total/Total median (${period})`);
  return { period, byPc };
}

async function parseSales(path) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const ws = sheetByName(wb, /postcode/i);
  if (!ws) throw new Error("Sales workbook has no Postcode sheet");
  const period = quarterFromText(ws.getRow(2).getCell(1).value, "Mar 2026 quarter");
  const header = findHeaderRow(ws);
  if (!header) throw new Error("Sales Postcode sheet: no header with Postcode + Median");
  const pcCol = headerIndex(header.cells, [/^postcode$/i]);
  const dwellCol = headerIndex(header.cells, [/dwelling/i]);
  const medianCol = headerIndex(header.cells, [/median/i, /sales price/i]);
  const thousands = header.cells[medianCol]?.includes("000") || /\$'000/i.test(header.cells[medianCol] ?? "");
  if (pcCol < 0 || medianCol < 0 || dwellCol < 0) {
    throw new Error(`Sales headers missing (pc=${pcCol} dwell=${dwellCol} median=${medianCol})`);
  }
  /** @type {Map<string, number>} */
  const byPc = new Map();
  for (let r = header.row + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (!isTotal(row.getCell(dwellCol + 1).value)) continue;
    const pc = padPostcode(row.getCell(pcCol + 1).value);
    const median = parseNum(row.getCell(medianCol + 1).value);
    if (!pc || median == null) continue;
    byPc.set(pc, thousands ? Math.round(median * 1000) : median);
  }
  console.error(`Sales Postcode: ${byPc.size} postcodes with Total median (${period})`);
  return { period, byPc };
}

async function loadSalToPoa(path) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const ws = wb.worksheets[0];
  const header = [];
  for (let c = 1; c <= ws.columnCount; c++) header.push(cellText(ws.getRow(1).getCell(c).value));
  const salCol = header.findIndex((h) => /SAL_CODE/i.test(h));
  const poaCol = header.findIndex((h) => /POA_CODE/i.test(h));
  const ratioCol = header.findIndex((h) => /RATIO/i.test(h));
  if (salCol < 0 || poaCol < 0) throw new Error("Correspondence missing SAL_CODE / POA_CODE");
  /** @type {Map<string, { postcode: string, ratio: number }>} */
  const best = new Map();
  for (let r = 2; r <= ws.rowCount; r++) {
    const code = salCode(ws.getRow(r).getCell(salCol + 1).value);
    const pc = padPostcode(ws.getRow(r).getCell(poaCol + 1).value);
    const ratio = ratioCol >= 0 ? (parseNum(ws.getRow(r).getCell(ratioCol + 1).value) ?? 0) : 1;
    if (!code || !pc) continue;
    const prev = best.get(code);
    if (!prev || ratio > prev.ratio) best.set(code, { postcode: pc, ratio });
  }
  console.error(`Correspondence: ${best.size} SAL → POA rows`);
  return best;
}

function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi + 0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInFeature(lng, lat, geom) {
  if (!geom) return false;
  if (geom.type === "Polygon") {
    if (!pointInRing(lng, lat, geom.coordinates[0] ?? [])) return false;
    for (const hole of geom.coordinates.slice(1)) {
      if (pointInRing(lng, lat, hole)) return false;
    }
    return true;
  }
  if (geom.type === "MultiPolygon") {
    return geom.coordinates.some((poly) => {
      if (!pointInRing(lng, lat, poly[0] ?? [])) return false;
      for (const hole of poly.slice(1)) {
        if (pointInRing(lng, lat, hole)) return false;
      }
      return true;
    });
  }
  return false;
}

function featureCentroid(geom) {
  const ring =
    geom?.type === "Polygon"
      ? geom.coordinates[0]
      : geom?.type === "MultiPolygon"
        ? geom.coordinates[0]?.[0]
        : null;
  if (!ring?.length) return null;
  let x = 0;
  let y = 0;
  const n = ring.length - (ring[0][0] === ring[ring.length - 1][0] ? 1 : 0);
  for (let i = 0; i < n; i++) {
    x += ring[i][0];
    y += ring[i][1];
  }
  return { lng: x / n, lat: y / n };
}

async function fetchPoaPolygons() {
  const features = [];
  let offset = 0;
  for (;;) {
    const params = new URLSearchParams({
      geometry: "150.55,-34.15,151.40,-33.55",
      geometryType: "esriGeometryEnvelope",
      inSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
      outFields: "poa_code_2021",
      returnGeometry: "true",
      outSR: "4326",
      f: "geojson",
      resultRecordCount: "1000",
      resultOffset: String(offset),
    });
    const res = await fetch(`${POA_LAYER}?${params}`, { headers: UA });
    if (!res.ok) throw new Error(`POA layer ${res.status}`);
    const body = await res.json();
    const batch = body.features ?? [];
    features.push(...batch);
    if (!batch.length || !body.exceededTransferLimit) break;
    offset += batch.length;
    if (offset > 5000) break;
  }
  console.error(`POA FeatureServer: ${features.length} polygons in envelope`);
  return features;
}

async function centroidFallback(mapFeatures) {
  const poas = await fetchPoaPolygons();
  /** @type {Map<string, string>} */
  const byId = new Map();
  for (const f of mapFeatures) {
    const id = String(f.properties.id);
    const c = featureCentroid(f.geometry);
    if (!c) continue;
    const hit = poas.find((p) => pointInFeature(c.lng, c.lat, p.geometry));
    const pc = padPostcode(hit?.properties?.poa_code_2021 ?? hit?.properties?.POA_CODE_2021);
    if (pc) byId.set(id, pc);
  }
  console.error(`Centroid fallback: ${byId.size}/${mapFeatures.length} SALs in a POA`);
  return byId;
}

async function ensureCorrespondence(fresh) {
  try {
    const info = await stat(corrXlsxPath);
    if (!fresh && info.size > 0) {
      console.error(`Using cached ${corrXlsxPath}`);
      return true;
    }
  } catch {
    /* extract */
  }
  const got = await downloadFile(CORR_ZIP_URL, corrZipPath, fresh);
  if (!got) return false;
  const check = spawnSync("unzip", ["-v"], { encoding: "utf8" });
  if (check.error?.code === "ENOENT") {
    console.error("unzip is required to extract the SAL–POA correspondence.");
    return false;
  }
  const extracted = spawnSync(
    "unzip",
    ["-o", corrZipPath, "CG_SAL_2021_POA_2021.xlsx", "-d", cacheDir],
    { encoding: "utf8" },
  );
  if (extracted.status !== 0) {
    console.error(extracted.stderr || "unzip correspondence failed");
    return false;
  }
  return true;
}

async function writeEmpty(reason) {
  const payload = {
    source: ATTRIBUTION,
    sourceUrl: "https://dcj.nsw.gov.au/about-us/families-and-communities-statistics/housing-rent-and-sales/rent-and-sales-report.html",
    period: null,
    salesPeriod: null,
    attribution: ATTRIBUTION,
    licence: LICENCE,
    extractedAt: new Date().toISOString(),
    note: reason,
    suburbs: [],
  };
  await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.error(`Wrote empty ${outPath} (${reason}). Census 2021 housing stays.`);
}

async function main() {
  const fresh = process.argv.includes("--fresh");
  await mkdir(cacheDir, { recursive: true });

  const mapFc = JSON.parse(readFileSync(polygonsPath, "utf8"));
  const census = JSON.parse(readFileSync(censusPath, "utf8"));
  const censusById = new Map(census.suburbs.map((row) => [row.id, row]));

  const gotRent = await downloadFile(RENT_URL, rentPath, fresh);
  if (!gotRent) {
    await writeEmpty("Could not download DCJ rent tables");
    return;
  }
  const gotSales = await downloadFile(SALES_URL, salesPath, fresh);

  let rent;
  try {
    rent = await parseRent(rentPath);
  } catch (err) {
    await writeEmpty(`Rent parse failed: ${err instanceof Error ? err.message : err}`);
    return;
  }

  let sales = { period: null, byPc: new Map() };
  if (gotSales) {
    try {
      sales = await parseSales(salesPath);
    } catch (err) {
      console.error(`Sales parse failed (${err instanceof Error ? err.message : err}). Shipping rent only.`);
    }
  }

  let salToPoa = new Map();
  const haveCorr = await ensureCorrespondence(fresh);
  if (haveCorr) {
    try {
      salToPoa = await loadSalToPoa(corrXlsxPath);
    } catch (err) {
      console.error(`Correspondence parse failed (${err instanceof Error ? err.message : err}).`);
    }
  }

  /** @type {Map<string, string>} */
  const idToPc = new Map();
  for (const f of mapFc.features) {
    const id = String(f.properties.id);
    const code = censusById.get(id)?.salCode;
    const mapped = code ? salToPoa.get(String(code)) : null;
    if (mapped?.postcode) idToPc.set(id, mapped.postcode);
  }

  if (idToPc.size < mapFc.features.length * 0.5) {
    console.error("Correspondence covered too few SALs — trying POA centroid join.");
    try {
      const fallback = await centroidFallback(mapFc.features);
      for (const [id, pc] of fallback) {
        if (!idToPc.has(id)) idToPc.set(id, pc);
      }
    } catch (err) {
      console.error(`Centroid fallback failed (${err instanceof Error ? err.message : err}).`);
    }
  }

  if (!idToPc.size) {
    await writeEmpty("No SAL→POA join (correspondence and centroid both failed)");
    return;
  }

  const suburbs = [];
  for (const f of mapFc.features) {
    const id = String(f.properties.id);
    const name = String(f.properties.name);
    const postcode = idToPc.get(id);
    if (!postcode) continue;
    const medianWeeklyRent = rent.byPc.get(postcode) ?? null;
    const medianPurchase = sales.byPc.get(postcode) ?? null;
    if (medianWeeklyRent == null && medianPurchase == null) continue;
    suburbs.push({
      id,
      name,
      postcode,
      medianWeeklyRent,
      medianPurchase,
      period: rent.period,
      rentNote: `Postcode ${postcode} median, new bonds, ${rent.period}. Not this suburb alone.`,
    });
  }

  const payload = {
    source: ATTRIBUTION,
    sourceUrl: RENT_URL,
    period: rent.period,
    salesPeriod: sales.period,
    attribution: ATTRIBUTION,
    licence: LICENCE,
    extractedAt: new Date().toISOString(),
    join: "ABS 2021 correspondence CG_SAL_2021_POA_2021 (largest RATIO_FROM_TO)",
    suburbs,
  };
  await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`);
  const withRent = suburbs.filter((s) => s.medianWeeklyRent != null).length;
  const withSale = suburbs.filter((s) => s.medianPurchase != null).length;
  console.error(
    `Wrote ${outPath} (${suburbs.length}/${mapFc.features.length} suburbs, rent ${withRent}, sales ${withSale})`,
  );
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
