#!/usr/bin/env node
/**
 * Build src/data/census-2021.json for every mapped SAL.
 *
 * Prefers the ABS 2021 GCP FeatureServer for medians / tenure / birthplace,
 * then fills ancestry, language and families from the NSW SAL DataPack.
 *
 *   npm run data:census
 *   npm run data:census -- --fresh
 */
import { spawnSync } from "node:child_process";
import { createWriteStream, readFileSync } from "node:fs";
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import {
  entry,
  labelAncestry,
  labelLang,
  mergeMaps,
  parseNum,
  readCsvByCode as readZipCsvByCode,
} from "./census-datapack.mjs";

const GCP_LAYER =
  "https://services1.arcgis.com/vHnIGBHHqDR6y0CR/arcgis/rest/services/2021_ABS_General_Community_Profile/FeatureServer/5/query";
const DATAPACK_URL =
  "https://www.abs.gov.au/census/find-census-data/datapacks/download/2021_GCP_SAL_for_NSW_short-header.zip";
const ATTRIBUTION = "Australian Bureau of Statistics, Census of Population and Housing 2021";
const LICENCE = "CC BY 4.0";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = join(root, "data", "cache");
const zipPath = join(cacheDir, "2021_GCP_SAL_for_NSW_short-header.zip");
const polygonsPath = join(root, "src", "data", "suburb-polygons.json");
const outPath = join(root, "src", "data", "census-2021.json");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function norm(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function foldName(name) {
  return norm(
    String(name ?? "")
      .replace(/\s*\([^)]*\)\s*/g, " ")
      .replace(/\s*-\s*NSW\b/gi, "")
      .replace(/\bst[.]?\s+/gi, "st ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function loadMapSuburbs() {
  const fc = JSON.parse(readFileSync(polygonsPath, "utf8"));
  return fc.features.map((f) => ({
    id: String(f.properties.id),
    name: String(f.properties.name),
  }));
}

function pct(part, whole) {
  if (part == null || whole == null || whole <= 0) return null;
  return Math.round((part / whole) * 100);
}

async function fetchGcpLayer() {
  const rows = [];
  let offset = 0;
  for (;;) {
    const params = new URLSearchParams({
      where: "SAL_CODE_2021 LIKE '1%'",
      outFields:
        "SAL_CODE_2021,SAL_NAME_2021,Median_age_persons,Median_rent_weekly,Median_mortgage_repay_monthly,R_Tot_Total,Total_Total_G37,Birthplace_Australia_P,Tot_P_P",
      returnGeometry: "false",
      f: "json",
      resultRecordCount: "1000",
      resultOffset: String(offset),
      orderByFields: "SAL_CODE_2021",
    });
    let res;
    try {
      res = await fetch(`${GCP_LAYER}?${params}`);
    } catch (err) {
      console.error(`GCP FeatureServer failed (${err instanceof Error ? err.message : "network"}). Using DataPack only.`);
      return [];
    }
    if (!res.ok) {
      console.error(`GCP FeatureServer failed (${res.status}). Using DataPack only.`);
      return [];
    }
    const body = await res.json();
    if (body.error) {
      console.error(`GCP FeatureServer failed (${body.error.message ?? "ArcGIS"}). Using DataPack only.`);
      return [];
    }
    const batch = (body.features ?? []).map((f) => f.attributes);
    rows.push(...batch);
    if (!batch.length || !body.exceededTransferLimit) break;
    offset += batch.length;
    if (offset > 20000) break;
  }
  console.error(`GCP FeatureServer: ${rows.length} NSW SAL rows`);
  return rows;
}

async function downloadZip(fresh) {
  if (!fresh) {
    try {
      const info = await stat(zipPath);
      if (info.size > 0) {
        console.error(`Using cached ${zipPath}`);
        return true;
      }
    } catch {
      /* download */
    }
  }
  console.error(`Downloading ${DATAPACK_URL}`);
  let res;
  try {
    res = await fetch(DATAPACK_URL, { headers: { "User-Agent": "SydneyAreas/1.0" } });
  } catch (err) {
    console.error(`DataPack download failed (${err instanceof Error ? err.message : "network"}).`);
    return false;
  }
  if (!res.ok || !res.body) {
    console.error(`DataPack download failed (${res.status}).`);
    return false;
  }
  const tmp = `${zipPath}.partial`;
  try {
    await pipeline(Readable.fromWeb(res.body), createWriteStream(tmp));
    await rename(tmp, zipPath);
  } catch (err) {
    await rm(tmp, { force: true });
    console.error(`DataPack write failed (${err instanceof Error ? err.message : "write"}).`);
    return false;
  }
  const info = await stat(zipPath);
  console.error(`Saved ${zipPath} (${(info.size / 1e6).toFixed(1)} MB)`);
  return true;
}

const readCsvByCode = (name, pick) => readZipCsvByCode(zipPath, name, pick);

async function parseDataPack() {
  const check = spawnSync("unzip", ["-v"], { encoding: "utf8" });
  if (check.error?.code === "ENOENT") fail("unzip is required to read the Census DataPack.");

  console.error("Parsing G01 population");
  const g01 = await readCsvByCode(entry("2021Census_G01_NSW_SAL.csv"), (r) => ({
    usualResidentPopulation: parseNum(r.Tot_P_P),
  }));

  console.error("Parsing G02 medians");
  const g02 = await readCsvByCode(entry("2021Census_G02_NSW_SAL.csv"), (r) => ({
    medianAge: parseNum(r.Median_age_persons),
    medianWeeklyRent2021: parseNum(r.Median_rent_weekly),
    medianMortgageMonthly2021: parseNum(r.Median_mortgage_repay_monthly),
  }));

  console.error("Parsing G37 tenure");
  const g37 = await readCsvByCode(entry("2021Census_G37_NSW_SAL.csv"), (r) => {
    const rented = parseNum(r.R_Tot_Total);
    const total = parseNum(r.Total_Total);
    return { pctRenting: pct(rented, total), occupiedDwellings: total };
  });

  console.error("Parsing G29 families");
  const g29 = await readCsvByCode(entry("2021Census_G29_NSW_SAL.csv"), (r) => {
    const withKids =
      (parseNum(r.CF_ChU15_a_Total_F) ?? 0) +
      (parseNum(r.CF_no_ChU15_a_Total_F) ?? 0) +
      (parseNum(r.OPF_ChU15_a_Total_F) ?? 0) +
      (parseNum(r.OPF_no_ChU15_a_Total_F) ?? 0);
    return { familiesWithChildren: withKids };
  });

  console.error("Parsing G09 country of birth");
  const g09 = await readCsvByCode(entry("2021Census_G09F_NSW_SAL.csv"), (r) => ({
    bornAu: parseNum(r.P_Australia_Tot),
  }));
  const g09tot = await readCsvByCode(entry("2021Census_G09H_NSW_SAL.csv"), (r) => ({
    bornTot: parseNum(r.P_Tot_Tot),
  }));

  console.error("Parsing G08 ancestry");
  const g08 = await readCsvByCode(entry("2021Census_G08_NSW_SAL.csv"), (r) => {
    const total = parseNum(r.Tot_P_Tot_resp);
    const scores = [];
    for (const [col, raw] of Object.entries(r)) {
      const m = col.match(/^(.+)_Tot_resp$/);
      if (!m) continue;
      const key = m[1];
      if (key === "Tot_P" || key === "Ancestry_NS" || key === "Other") continue;
      const n = parseNum(raw);
      if (n == null) continue;
      scores.push({ name: labelAncestry(key), n });
    }
    scores.sort((a, b) => b.n - a.n);
    const topAncestries = scores.slice(0, 3).map((s) => ({
      name: s.name,
      pct: pct(s.n, total) ?? 0,
    }));
    return { topAncestries };
  });

  console.error("Parsing G13 language");
  const langParts = [];
  for (const letter of ["A", "B", "C", "D", "E"]) {
    langParts.push(
      await readCsvByCode(entry(`2021Census_G13${letter}_NSW_SAL.csv`), (r) => {
        const out = {};
        for (const [col, raw] of Object.entries(r)) {
          const m = col.match(/^POL_(.+)_Tot$/);
          if (!m) continue;
          const key = m[1];
          if (
            key.includes("UOLSE") ||
            key.includes("SEO") ||
            key === "Tot" ||
            key === "Oth" ||
            /(^|_)Tot$/.test(key)
          ) {
            continue;
          }
          out[`lang:${key}`] = parseNum(raw);
        }
        if (r.P_Tot_Tot != null) out.langTotal = parseNum(r.P_Tot_Tot);
        if (r.P_LUatH_NS_Tot != null) out.langNs = parseNum(r.P_LUatH_NS_Tot);
        return out;
      }),
    );
  }
  const g13 = mergeMaps(langParts);
  for (const [code, row] of g13) {
    const total = row.langTotal;
    let best = null;
    for (const [k, n] of Object.entries(row)) {
      if (!k.startsWith("lang:") || n == null) continue;
      const key = k.slice(5);
      if (!best || n > best.n) best = { key, n };
    }
    g13.set(code, {
      topLanguageOther: best && total ? labelLang(best.key) : null,
    });
  }

  return mergeMaps([g01, g02, g37, g29, g09, g09tot, g08, g13]);
}

function csvNameLookup(mapSuburbs) {
  const exact = new Map();
  for (const { id, name } of mapSuburbs) exact.set(norm(name), id);
  const lookup = new Map(exact);
  for (const { id, name } of mapSuburbs) {
    const folded = foldName(name);
    if (folded && !lookup.has(folded)) lookup.set(folded, id);
  }
  return lookup;
}

async function main() {
  const fresh = process.argv.includes("--fresh");
  await mkdir(cacheDir, { recursive: true });
  const mapSuburbs = loadMapSuburbs();
  const lookup = csvNameLookup(mapSuburbs);
  const byId = new Map(mapSuburbs.map((s) => [s.id, { ...s }]));

  const gcpRows = await fetchGcpLayer();
  const gcpByCode = new Map();
  for (const row of gcpRows) {
    const code = String(row.SAL_CODE_2021 ?? "").replace(/^SAL/i, "");
    const name = String(row.SAL_NAME_2021 ?? "");
    gcpByCode.set(code, {
      name,
      medianAge: parseNum(row.Median_age_persons),
      medianWeeklyRent2021: parseNum(row.Median_rent_weekly),
      medianMortgageMonthly2021: parseNum(row.Median_mortgage_repay_monthly),
      pctRenting: pct(parseNum(row.R_Tot_Total), parseNum(row.Total_Total_G37)),
      pctBornAustralia: pct(parseNum(row.Birthplace_Australia_P), parseNum(row.Tot_P_P)),
      usualResidentPopulation: parseNum(row.Tot_P_P),
    });
  }

  const haveZip = await downloadZip(fresh);
  let pack = new Map();
  if (haveZip) {
    try {
      pack = await parseDataPack();
    } catch (err) {
      console.error(`DataPack parse failed (${err instanceof Error ? err.message : err}).`);
    }
  } else {
    console.error("No DataPack — shipping FeatureServer fields only.");
  }

  const codes = new Set([...gcpByCode.keys(), ...pack.keys()]);
  const used = new Set();
  const suburbs = [];

  for (const code of codes) {
    const gcp = gcpByCode.get(code) ?? {};
    const dp = pack.get(code) ?? {};
    const name = gcp.name ?? null;
    const id =
      (name && (lookup.get(norm(name)) || lookup.get(foldName(name)))) ||
      (name && lookup.get(foldName(`${name} (NSW)`))) ||
      null;
    if (!id || used.has(id)) continue;
    used.add(id);
    const mapName = byId.get(id)?.name ?? name;
    const families =
      dp.pctFamiliesWithChildren ??
      pct(dp.familiesWithChildren, dp.occupiedDwellings);
    const bornAu =
      dp.bornAu != null ? pct(dp.bornAu, dp.bornTot ?? gcp.usualResidentPopulation) : gcp.pctBornAustralia;
    const rent = gcp.medianWeeklyRent2021 ?? dp.medianWeeklyRent2021;
    const mortgage = gcp.medianMortgageMonthly2021 ?? dp.medianMortgageMonthly2021;
    suburbs.push({
      id,
      name: mapName,
      salCode: code,
      medianAge: gcp.medianAge ?? dp.medianAge ?? null,
      pctRenting: gcp.pctRenting ?? dp.pctRenting ?? null,
      pctFamiliesWithChildren: families,
      pctBornAustralia: bornAu ?? null,
      topAncestries: dp.topAncestries ?? [],
      topLanguageOther: dp.topLanguageOther ?? null,
      medianWeeklyRent2021: rent && rent > 0 ? rent : null,
      medianMortgageMonthly2021: mortgage && mortgage > 0 ? mortgage : null,
      usualResidentPopulation: gcp.usualResidentPopulation ?? dp.usualResidentPopulation ?? null,
    });
  }

  const payload = {
    source: "ABS 2021 Census General Community Profile (SAL)",
    sourceUrl: DATAPACK_URL,
    featureServer: GCP_LAYER.replace("/query", ""),
    licence: LICENCE,
    attribution: ATTRIBUTION,
    extractedAt: new Date().toISOString(),
    suburbs,
  };
  await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.error(
    `Wrote ${outPath} (${suburbs.length}/${mapSuburbs.length} mapped suburbs, DataPack ${haveZip ? "yes" : "no"})`,
  );
  const missing = mapSuburbs.filter((s) => !used.has(s.id)).map((s) => s.name);
  if (missing.length) {
    console.error(`No Census row for ${missing.length} mapped suburbs (left unmatched, not invented).`);
  }
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
