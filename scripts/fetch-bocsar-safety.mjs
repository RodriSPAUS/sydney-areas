#!/usr/bin/env node
/**
 * Download BOCSAR SuburbData.zip and write src/data/bocsar-safety.json
 * for every suburb drawn on the map. Streams the CSV — never loads the
 * 440 MB file as one string.
 *
 *   npm run data:bocsar
 *   npm run data:bocsar -- --fresh
 */
import { spawn, spawnSync } from "node:child_process";
import { createWriteStream, readFileSync } from "node:fs";
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const SOURCE_URL = "https://bocsarblob.blob.core.windows.net/bocsar-open-data/SuburbData.zip";
const LICENCE = "CC-BY 3.0 Australia";
const ATTRIBUTION = "NSW Bureau of Crime Statistics and Research (BOCSAR)";
const POP_SOURCE_URL =
  "https://services-ap1.arcgis.com/ypkPEy1AmwPKGNNv/ArcGIS/rest/services/ABS_Socio_Economic_Indexes_for_Areas_SEIFA_by_2021_SAL/FeatureServer/0/query";
const POP_ATTRIBUTION =
  "Australian Bureau of Statistics, Census of Population and Housing 2021, usual resident population by SAL";
const MIN_POP = 100;
const BAND_NOTE =
  "Rank among mapped suburbs using incidents per 1,000 residents (Census 2021 usual residence). 5 = fewer, 1 = more. Retail theft and domestic assault are not used.";

const GROUPS = {
  assaultNonDv: "Assault / Non-domestic violence related assault",
  assaultDv: "Assault / Domestic violence related assault",
  breakEnterDwelling: "Theft / Break and enter dwelling",
  stealFromDwelling: "Theft / Steal from dwelling",
  stealFromVehicle: "Theft / Steal from motor vehicle",
  motorVehicleTheft: "Theft / Motor vehicle theft",
  robbery: "Robbery (all weapon categories)",
  maliciousDamage: "Malicious damage to property / Malicious damage to property",
  stealRetail: "Theft / Steal from retail store",
};

/** @type {{ key: keyof typeof GROUPS; category: string; subcategory: string }[]} */
const GROUP_ROWS = [
  { key: "assaultNonDv", category: "Assault", subcategory: "Non-domestic violence related assault" },
  { key: "assaultDv", category: "Assault", subcategory: "Domestic violence related assault" },
  { key: "breakEnterDwelling", category: "Theft", subcategory: "Break and enter dwelling" },
  { key: "stealFromDwelling", category: "Theft", subcategory: "Steal from dwelling" },
  { key: "stealFromVehicle", category: "Theft", subcategory: "Steal from motor vehicle" },
  { key: "motorVehicleTheft", category: "Theft", subcategory: "Motor vehicle theft" },
  { key: "robbery", category: "Robbery", subcategory: "Robbery without a weapon" },
  { key: "robbery", category: "Robbery", subcategory: "Robbery with a firearm" },
  { key: "robbery", category: "Robbery", subcategory: "Robbery with a weapon not a firearm" },
  {
    key: "maliciousDamage",
    category: "Malicious damage to property",
    subcategory: "Malicious damage to property",
  },
  { key: "stealRetail", category: "Theft", subcategory: "Steal from retail store" },
];

const COUNT_KEYS = /** @type {(keyof typeof GROUPS)[]} */ (Object.keys(GROUPS));
const MONTH_RE = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[ -]\d{4}$/i;
const MISSING = new Set(["", "nc", "n.c.", "n.c", "n.a.", "n.a", "na", "n/a", "*", "np", "n.p."]);

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = join(root, "data", "cache");
const zipPath = join(cacheDir, "SuburbData.zip");
const polygonsPath = join(root, "src", "data", "suburb-polygons.json");
const popCachePath = join(cacheDir, "sal-urp-2021.json");
const outPath = join(root, "src", "data", "bocsar-safety.json");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function requireUnzip() {
  const check = spawnSync("unzip", ["-v"], { encoding: "utf8" });
  if (check.error?.code === "ENOENT") {
    fail("unzip is required. Install unzip and retry.");
  }
}

function norm(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function stripQualifier(name) {
  return String(name ?? "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();
}

/** ABS SAL uses "(Sydney - NSW)"; BOCSAR uses "(Sydney)". */
function foldName(name) {
  return norm(
    String(name ?? "")
      .replace(/\s*-\s*NSW\b/gi, "")
      .replace(/\s+\)/g, ")"),
  );
}

function loadMapSuburbs() {
  const fc = JSON.parse(readFileSync(polygonsPath, "utf8"));
  /** @type {{ id: string; name: string }[]} */
  const list = fc.features.map((f) => ({
    id: String(f.properties.id),
    name: String(f.properties.name),
  }));
  if (!list.length) fail("suburb-polygons.json has no features.");
  return list;
}

/** @param {{ id: string; name: string }[]} mapSuburbs */
function csvNameLookup(mapSuburbs) {
  /** @type {Map<string, string>} */
  const exact = new Map();
  for (const { id, name } of mapSuburbs) {
    const key = norm(name);
    if (exact.has(key) && exact.get(key) !== id) fail(`Duplicate map suburb name: ${name}`);
    exact.set(key, id);
  }
  /** @type {Map<string, string[]>} */
  const stripClaims = new Map();
  for (const { id, name } of mapSuburbs) {
    const stripped = norm(stripQualifier(name));
    if (!stripped || stripped === norm(name)) continue;
    const ids = stripClaims.get(stripped) ?? [];
    ids.push(id);
    stripClaims.set(stripped, ids);
  }
  const lookup = new Map(exact);
  for (const { id, name } of mapSuburbs) {
    const folded = foldName(name);
    if (folded && !lookup.has(folded)) lookup.set(folded, id);
    else if (folded && lookup.get(folded) !== id) {
      /* keep the exact mapping; do not collapse distinct places */
    }
  }
  for (const [key, ids] of stripClaims) {
    if (ids.length === 1 && !lookup.has(key)) lookup.set(key, ids[0]);
  }
  return lookup;
}

async function loadNswUrp(fresh) {
  if (!fresh) {
    try {
      const cached = JSON.parse(readFileSync(popCachePath, "utf8"));
      if (Array.isArray(cached?.rows) && cached.rows.length) {
        console.error(`Using cached ${popCachePath} (${cached.rows.length} NSW SAL rows)`);
        return cached.rows;
      }
    } catch {
      /* download */
    }
  }
  console.error("Downloading Census 2021 usual resident population by SAL (NSW)");
  const rows = [];
  let offset = 0;
  for (;;) {
    const params = new URLSearchParams({
      where: "sal_code_2021 LIKE '1%'",
      outFields: "sal_code_2021,sal_name_2021,urp",
      returnGeometry: "false",
      f: "json",
      resultRecordCount: "1000",
      resultOffset: String(offset),
      orderByFields: "sal_code_2021",
    });
    let res;
    try {
      res = await fetch(`${POP_SOURCE_URL}?${params}`);
    } catch (err) {
      fail(
        `Population download failed (${err instanceof Error ? err.message : "network error"}). Check the network and retry.`,
      );
    }
    if (!res.ok) fail(`Population download failed (${res.status}). Check the network and retry.`);
    const body = await res.json();
    if (body.error) fail(`Population download failed (${body.error.message ?? "ArcGIS error"}).`);
    const batch = (body.features ?? []).map((f) => f.attributes);
    rows.push(...batch);
    if (!batch.length || !body.exceededTransferLimit) break;
    offset += batch.length;
    if (offset > 20000) fail("Population download did not finish paging.");
  }
  if (!rows.length) fail("No NSW SAL population rows returned. Do not invent numbers.");
  await writeFile(
    popCachePath,
    `${JSON.stringify({ source: POP_ATTRIBUTION, sourceUrl: POP_SOURCE_URL, extractedAt: new Date().toISOString(), rows }, null, 2)}\n`,
  );
  console.error(`Saved ${popCachePath} (${rows.length} NSW SAL rows)`);
  return rows;
}

/** @param {{ id: string; name: string }[]} mapSuburbs */
function matchUrp(mapSuburbs, nswRows) {
  const byName = new Map();
  for (const row of nswRows) {
    const name = String(row.sal_name_2021 ?? "");
    if (name) byName.set(name, row);
  }
  /** @type {Map<string, number | null>} */
  const popById = new Map();
  const missing = [];
  for (const { id, name } of mapSuburbs) {
    const hit =
      byName.get(name) ??
      byName.get(`${name} (NSW)`) ??
      [...byName.values()].filter((row) => {
        const n = String(row.sal_name_2021 ?? "");
        return foldName(n) === foldName(name) || foldName(n) === foldName(`${name} (NSW)`);
      });
    const row = Array.isArray(hit) ? (hit.length === 1 ? hit[0] : null) : hit;
    const urp = row && Number.isFinite(Number(row.urp)) ? Number(row.urp) : null;
    if (!row) missing.push(name);
    popById.set(id, urp);
  }
  if (missing.length) {
    console.error(`No Census 2021 population for ${missing.length} mapped suburbs: ${missing.join("; ")}`);
  }
  return popById;
}

function per1000(count, pop) {
  if (!pop || pop < MIN_POP) return null;
  return Math.round((count / pop) * 10000) / 10;
}

function parseCount(raw) {
  const t = String(raw ?? "").trim().toLowerCase();
  if (MISSING.has(t)) return 0;
  const n = Number(t.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

async function* csvRowStrings(readable) {
  let buf = "";
  let inQuotes = false;
  for await (const chunk of readable) {
    const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') inQuotes = !inQuotes;
      if ((c === "\n" || c === "\r") && !inQuotes) {
        if (c === "\r" && text[i + 1] === "\n") i += 1;
        if (buf.length) yield buf;
        buf = "";
        continue;
      }
      buf += c;
    }
  }
  if (buf.length) yield buf;
}

async function downloadZip() {
  console.error(`Downloading ${SOURCE_URL}`);
  let res;
  try {
    res = await fetch(SOURCE_URL);
  } catch (err) {
    fail(`Download failed (${err instanceof Error ? err.message : "network error"}). Check the network and retry.`);
  }
  if (!res.ok || !res.body) {
    fail(`Download failed (${res.status}). Check the network and retry.`);
  }
  const tmp = `${zipPath}.partial`;
  try {
    await pipeline(Readable.fromWeb(res.body), createWriteStream(tmp));
    await rename(tmp, zipPath);
  } catch (err) {
    await rm(tmp, { force: true });
    fail(`Download failed (${err instanceof Error ? err.message : "write error"}). Check the network and retry.`);
  }
  const info = await stat(zipPath);
  console.error(`Saved ${zipPath} (${(info.size / 1e6).toFixed(1)} MB)`);
}

function zipCsvName() {
  const listed = spawnSync("unzip", ["-Z", "-1", zipPath], { encoding: "utf8" });
  if (listed.status !== 0) {
    fail(`Could not read ${zipPath}. Re-run with --fresh, or install unzip and retry.`);
  }
  const names = listed.stdout
    .split(/\r?\n/)
    .map((n) => n.trim())
    .filter(Boolean);
  const csv =
    names.find((n) => n.split(/[/\\]/).pop()?.toLowerCase() === "suburbdata.csv") ??
    names.find((n) => n.toLowerCase().endsWith(".csv"));
  if (!csv) fail(`No CSV found inside ${zipPath}. Re-run with --fresh.`);
  return csv;
}

function unzipCsvStream(entry) {
  const child = spawn("unzip", ["-p", zipPath, entry], { stdio: ["ignore", "pipe", "ignore"] });
  child.on("error", (err) => {
    if (err.code === "ENOENT") fail("unzip is required. Install unzip and retry.");
    fail(err.message);
  });
  const done = new Promise((resolve, reject) => {
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`unzip -p failed (${code}). Install unzip and retry.`));
    });
  });
  return { stdout: child.stdout, done };
}

function emptyCounts() {
  return Object.fromEntries(COUNT_KEYS.map((k) => [k, 0]));
}

function findGroup(category, subcategory) {
  const c = norm(category);
  const s = norm(subcategory);
  return GROUP_ROWS.find((row) => norm(row.category) === c && norm(row.subcategory) === s);
}

function periodLabel(months) {
  if (!months.length) return "";
  const a = months[0].replace("-", " ");
  const b = months[months.length - 1].replace("-", " ");
  return `${a}–${b}`;
}

function quintiles(scores) {
  const n = scores.length;
  const order = scores.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v || a.i - b.i);
  const first = new Map();
  for (let pos = 0; pos < n; pos++) {
    if (!first.has(order[pos].v)) first.set(order[pos].v, pos);
  }
  return scores.map((v) => 5 - Math.min(4, Math.floor((first.get(v) * 5) / n)));
}

function median(values) {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function vsMedian(score, med) {
  if (med === 0) return score === 0 ? "near the median" : "above the median";
  const r = score / med;
  if (r <= 0.6) return "well below the median";
  if (r < 0.9) return "below the median";
  if (r <= 1.1) return "near the median";
  if (r < 1.5) return "above the median";
  return "well above the median";
}

function summarise(housingRate, streetRate, housingMed, streetMed, period12) {
  const h = vsMedian(housingRate, housingMed);
  const s = vsMedian(streetRate, streetMed);
  const lead =
    h === s
      ? `Dwelling and street incidents per 1,000 residents both sit ${h} of mapped suburbs.`
      : `Dwelling incidents per 1,000 residents sit ${h} of mapped suburbs. Street incidents sit ${s}.`;
  return `${lead} BOCSAR recorded incidents, ${period12}.`;
}

function clampBand(n) {
  return Math.min(5, Math.max(1, n));
}

async function parseSuburbRows(mapSuburbs, lookup) {
  const entry = zipCsvName();
  console.error(`Streaming ${entry} from zip`);
  const { stdout, done } = unzipCsvStream(entry);
  const stream = stdout;

  /** @type {Record<string, { name: string; seen: boolean; last12Months: Record<string, number>; last6Months: Record<string, number> }>} */
  const byId = Object.fromEntries(
    mapSuburbs.map(({ id, name }) => [
      id,
      { name, seen: false, last12Months: emptyCounts(), last6Months: emptyCounts() },
    ]),
  );

  let header = null;
  let categoryIdx = 1;
  let subIdx = 2;
  let monthIdx = [];
  let rows = 0;
  let matched = 0;

  for await (const line of csvRowStrings(stream)) {
    const stripped = line.replace(/^\uFEFF/, "");
    if (!header) {
      header = parseCsvLine(stripped).map((h) => h.trim());
      const lower = header.map((h) => h.toLowerCase());
      const suburbIdx = lower.findIndex((h) => h === "suburb");
      categoryIdx = lower.findIndex((h) => h === "offence category" || h === "offense category");
      subIdx = lower.findIndex((h) => h === "subcategory" || h === "sub category");
      if (suburbIdx < 0 || categoryIdx < 0 || subIdx < 0) {
        fail(`Unexpected CSV header: ${header.slice(0, 8).join(", ")}`);
      }
      monthIdx = header
        .map((h, i) => (MONTH_RE.test(h) ? i : -1))
        .filter((i) => i >= 0);
      if (monthIdx.length < 12) {
        fail(`Expected monthly columns, found ${monthIdx.length}.`);
      }
      continue;
    }

    rows += 1;
    const firstComma = stripped.indexOf(",");
    if (firstComma < 0) continue;
    const suburbGuess = (stripped.startsWith('"')
      ? stripped.slice(1, stripped.indexOf('"', 1))
      : stripped.slice(0, firstComma)
    ).trim();
    const id = lookup.get(norm(suburbGuess));
    if (!id) continue;

    const cols = parseCsvLine(stripped);
    const group = findGroup(cols[categoryIdx], cols[subIdx]);
    if (!group) continue;

    matched += 1;
    const rec = byId[id];
    rec.seen = true;
    const last12 = monthIdx.slice(-12);
    const last6 = monthIdx.slice(-6);
    let sum12 = 0;
    let sum6 = 0;
    for (const i of last12) sum12 += parseCount(cols[i]);
    for (const i of last6) sum6 += parseCount(cols[i]);
    rec.last12Months[group.key] += sum12;
    rec.last6Months[group.key] += sum6;
  }

  if (!header) fail("CSV was empty.");

  const months = header.filter((h) => MONTH_RE.test(h)).map((h) => h.replace("-", " "));
  const latestMonthInFile = months[months.length - 1] ?? "";
  const period12 = periodLabel(months.slice(-12));
  const period6 = periodLabel(months.slice(-6));

  await done;

  const seen = Object.values(byId).filter((r) => r.seen);
  if (!seen.length) {
    fail("No CSV rows matched mapped suburbs. Do not invent numbers.");
  }
  const missing = Object.values(byId)
    .filter((r) => !r.seen)
    .map((r) => r.name);
  if (missing.length) {
    console.error(`No BOCSAR row for ${missing.length} mapped suburbs: ${missing.join("; ")}`);
  }

  console.error(
    `Parsed ${rows} CSV rows, ${matched} offence rows for ${seen.length}/${mapSuburbs.length} mapped suburbs. Latest month ${latestMonthInFile}.`,
  );
  return { byId, period12, period6, latestMonthInFile };
}

async function main() {
  const fresh = process.argv.includes("--fresh");
  requireUnzip();
  await mkdir(cacheDir, { recursive: true });

  const mapSuburbs = loadMapSuburbs();
  const lookup = csvNameLookup(mapSuburbs);
  console.error(`Matching BOCSAR names to ${mapSuburbs.length} mapped suburbs`);

  let haveZip = false;
  try {
    const info = await stat(zipPath);
    haveZip = info.size > 0;
  } catch {
    haveZip = false;
  }
  if (!haveZip || fresh) await downloadZip();
  else console.error(`Using cached ${zipPath}`);

  const { byId, period12, period6, latestMonthInFile } = await parseSuburbRows(mapSuburbs, lookup);
  const nswUrp = await loadNswUrp(fresh);
  const popById = matchUrp(mapSuburbs, nswUrp);

  const rows = mapSuburbs
    .map(({ id, name }) => {
      const rec = byId[id];
      if (!rec.seen) return null;
      const c = rec.last12Months;
      const population = popById.get(id) ?? null;
      const housingScore = c.breakEnterDwelling + c.stealFromDwelling;
      const streetScore = c.assaultNonDv + c.robbery + c.stealFromVehicle + c.motorVehicleTheft;
      return {
        id,
        name,
        population,
        housingScore,
        streetScore,
        housingPer1000: per1000(housingScore, population),
        streetPer1000: per1000(streetScore, population),
        last12Months: rec.last12Months,
        last6Months: rec.last6Months,
      };
    })
    .filter(Boolean);

  const ranked = rows.filter((r) => r.housingPer1000 != null && r.streetPer1000 != null);
  if (!ranked.length) fail("No suburbs had both BOCSAR counts and Census 2021 population. Do not invent numbers.");

  const housingQ = quintiles(ranked.map((r) => r.housingPer1000));
  const streetQ = quintiles(ranked.map((r) => r.streetPer1000));
  const housingMed = median(ranked.map((r) => r.housingPer1000));
  const streetMed = median(ranked.map((r) => r.streetPer1000));
  const bandById = new Map(
    ranked.map((r, i) => [r.id, clampBand(Math.round((housingQ[i] + streetQ[i]) / 2))]),
  );

  const suburbs = rows.map((r) => {
    const band = bandById.get(r.id);
    const summary =
      band != null
        ? summarise(r.housingPer1000, r.streetPer1000, housingMed, streetMed, period12)
        : `Census 2021 usual residents are too few for a stable rate. Counts are still listed. BOCSAR recorded incidents, ${period12}.`;
    return {
      id: r.id,
      name: r.name,
      period12,
      period6,
      ...(band != null ? { band } : {}),
      bandNote: BAND_NOTE,
      population: r.population,
      populationYear: "2021",
      housingPer1000: r.housingPer1000,
      streetPer1000: r.streetPer1000,
      last12Months: r.last12Months,
      last6Months: r.last6Months,
      summary,
    };
  });

  const payload = {
    source: "BOCSAR SuburbData.csv",
    sourceUrl: SOURCE_URL,
    licence: LICENCE,
    attribution: ATTRIBUTION,
    populationSource: POP_ATTRIBUTION,
    extractedAt: new Date().toISOString(),
    latestMonthInFile,
    groups: GROUPS,
    suburbs,
  };

  await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.error(
    `Wrote ${outPath} (${suburbs.length} suburbs, ${ranked.length} with per-1,000 bands, period ${period12})`,
  );
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
