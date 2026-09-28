#!/usr/bin/env node
/**
 * Build src/data/suburb-metrics.json (one filter-ready record per mapped
 * suburb) and src/data/suburb-community.json (Census 2021 language, ancestry
 * and country of birth shares).
 *
 *   npm run data:metrics
 *   npm run data:metrics -- --inspect   # also dump DataPack columns to data/cache/
 *
 * Reads only the generated JSON in src/data/ and what is already cached in
 * data/cache/. Never downloads. Safety rates and bands, and transit coverage,
 * come from the same modules the app uses (src/lib/safety-metrics.ts,
 * src/lib/transit-coverage.ts), so the numbers cannot diverge.
 *
 * Without the Census DataPack in data/cache/ (CI never has it), the community
 * file is left as it is: Census 2021 does not change. Without the ABS SAL→LGA
 * correspondence, LGA fields are carried forward from the previous
 * suburb-metrics.json.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { listZip, labelAncestry, labelLang, parseNum, readCsvByCode, readCsvHeader } from "./census-datapack.mjs";
import {
  isExcludedKey,
  labelFromLong,
  languageColumns,
  share,
  simpleColumns,
  sumParts,
  topKeys,
} from "../src/lib/community-derive.ts";
import { gpoDistanceKm, percentiles, personPct, postcodeCounts, resolveRent } from "../src/lib/metrics-derive.ts";
import { allCount, domesticCount, propertyCount, violenceCount } from "../src/lib/safety-counts.ts";
import { SAFETY_METRICS, safetyBandsByMetric, safetyRates } from "../src/lib/safety-metrics.ts";
import { computeSuburbTransit, WALK_M } from "../src/lib/transit-coverage.ts";

const SCHEMA_VERSION = 1;
const TOP_N = 40;
/** Fewer named categories than this in a table means the headers were misread. */
const MIN_CATEGORIES = 15;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "src", "data");
const cacheDir = join(root, "data", "cache");
const datapackZip = join(cacheDir, "2021_GCP_SAL_for_NSW_short-header.zip");
const corrZip = join(cacheDir, "asgs2021correspondences.zip");
const lgaXlsx = join(cacheDir, "CG_SAL_2021_LGA_2021.xlsx");
const metricsPath = join(dataDir, "suburb-metrics.json");
const communityPath = join(dataDir, "suburb-community.json");

const read = (name) => JSON.parse(readFileSync(join(dataDir, name), "utf8"));

function fail(message) {
  console.error(message);
  process.exit(1);
}

const COUNT_OF = { all: allCount, violence: violenceCount, property: propertyCount, domestic: domesticCount };

/**
 * census-2021.json joined SALs by folded name, so a few disambiguated suburbs
 * ("Kingswood (Penrith - NSW)") picked up another SAL of the same name. BOCSAR
 * population is joined on the full SAL name, so a large gap between the two
 * marks a Census row that belongs to a different place.
 */
function censusMismatch(bocsarPop, censusPop) {
  if (bocsarPop == null || censusPop == null) return false;
  const lo = Math.min(bocsarPop, censusPop);
  const hi = Math.max(bocsarPop, censusPop);
  if (lo === 0) return hi >= 100;
  return hi / lo > 2;
}

// ---------------------------------------------------------------------------
// LGA

function cellText(value) {
  if (value == null) return "";
  if (typeof value === "object") {
    if ("result" in value && value.result != null) return cellText(value.result);
    if ("text" in value && value.text != null) return String(value.text);
    if (Array.isArray(value.richText)) return value.richText.map((p) => p.text).join("");
  }
  return String(value);
}

/** Extract CG_SAL_2021_LGA_2021.xlsx from the cached ASGS correspondence zip (local only). */
function ensureLgaXlsx() {
  if (existsSync(lgaXlsx)) return true;
  if (!existsSync(corrZip)) return false;
  const name = listZip(corrZip).find((n) => /(^|\/)CG_SAL_2021_LGA_2021\.xlsx$/i.test(n));
  if (!name) {
    console.error(`${corrZip} has no CG_SAL_2021_LGA_2021.xlsx`);
    return false;
  }
  const res = spawnSync("unzip", ["-j", "-o", corrZip, name, "-d", cacheDir], { encoding: "utf8" });
  return res.status === 0 && existsSync(lgaXlsx);
}

/** SAL code → the LGA holding the largest share of it (ABS RATIO_FROM_TO). */
async function loadSalToLga() {
  if (!ensureLgaXlsx()) return null;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(lgaXlsx);
  const ws = wb.worksheets[0];
  const header = [];
  for (let c = 1; c <= ws.columnCount; c++) header.push(cellText(ws.getRow(1).getCell(c).value));
  const salCol = header.findIndex((h) => /^SAL_CODE/i.test(h));
  const lgaCol = header.findIndex((h) => /^LGA_CODE/i.test(h));
  const nameCol = header.findIndex((h) => /^LGA_NAME/i.test(h));
  const ratioCol = header.findIndex((h) => /RATIO/i.test(h));
  if (salCol < 0 || lgaCol < 0) throw new Error(`LGA correspondence headers: ${header.join(", ")}`);
  const best = new Map();
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const sal = cellText(row.getCell(salCol + 1).value).replace(/^SAL/i, "").trim();
    const code = cellText(row.getCell(lgaCol + 1).value).replace(/^LGA/i, "").trim();
    if (!sal || !code) continue;
    const ratio = ratioCol >= 0 ? (parseNum(cellText(row.getCell(ratioCol + 1).value)) ?? 0) : 1;
    const prev = best.get(sal);
    if (!prev || ratio > prev.ratio) {
      best.set(sal, { code, name: nameCol >= 0 ? cellText(row.getCell(nameCol + 1).value).trim() || null : null, ratio });
    }
  }
  console.error(`LGA correspondence: ${best.size} SAL → LGA rows`);
  return best;
}

function previousMetrics() {
  if (!existsSync(metricsPath)) return null;
  try {
    return JSON.parse(readFileSync(metricsPath, "utf8"));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Metrics

async function buildMetrics({ polygons, bocsar, census, dcj, access }) {
  const bocsarById = new Map(bocsar.suburbs.map((r) => [r.id, r]));
  const censusById = new Map(census.suburbs.map((r) => [r.id, r]));
  const dcjById = new Map(dcj.suburbs.map((r) => [r.id, r]));
  const transit = computeSuburbTransit(polygons.features, access.places);

  const salToLga = await loadSalToLga().catch((err) => {
    console.error(`LGA correspondence unreadable (${err instanceof Error ? err.message : err}).`);
    return null;
  });
  const prev = salToLga ? null : previousMetrics();
  const prevById = new Map((prev?.suburbs ?? []).map((s) => [s.id, s]));
  const lgaMethod = salToLga
    ? "ABS ASGS 2021 correspondence CG_SAL_2021_LGA_2021 (largest RATIO_FROM_TO)"
    : prevById.size
      ? prev.sources?.lga?.method ?? null
      : null;
  if (!salToLga) {
    console.error(
      prevById.size
        ? "No SAL→LGA correspondence in data/cache; carrying LGA forward from the previous suburb-metrics.json."
        : "No SAL→LGA correspondence in data/cache and no previous file; LGA left null.",
    );
  }

  const rateRows = [];
  const rows = polygons.features.map((f) => {
    const id = String(f.properties.id);
    const b = bocsarById.get(id);
    const c = censusById.get(id);
    const counts = b?.last12Months ?? null;
    const rates = safetyRates(counts, b?.population);
    rateRows.push({ id, rates });
    return { f, id, b, c, d: dcjById.get(id), counts, rates };
  });
  const bands = safetyBandsByMetric(rateRows);
  const pcCounts = postcodeCounts(rows.map((r) => r.d?.postcode));

  const suburbs = rows.map(({ f, id, b, c, d, counts, rates }) => {
    const population = b?.population ?? c?.usualResidentPopulation ?? null;
    const rent = resolveRent(d, c?.medianWeeklyRent2021);
    const safety = { period: b?.period12 ?? null };
    for (const metric of SAFETY_METRICS) {
      safety[metric] = {
        count: counts ? COUNT_OF[metric](counts) : null,
        rate: rates[metric],
        band: bands[metric].get(id) ?? null,
      };
    }
    const t = transit.get(id);
    const modes = new Set(t?.modesNearby ?? []);
    let lgaCode = null;
    let lgaName = null;
    if (salToLga) {
      const hit = c?.salCode ? salToLga.get(String(c.salCode)) : null;
      lgaCode = hit?.code ?? null;
      lgaName = hit?.name ?? null;
    } else {
      const p = prevById.get(id)?.location;
      lgaCode = p?.lgaCode ?? null;
      lgaName = p?.lgaName ?? null;
    }
    const flags = [];
    if (censusMismatch(b?.population, c?.usualResidentPopulation)) flags.push("census-sal-mismatch");
    return {
      id,
      name: String(f.properties.name),
      population,
      rent: rent.rent,
      rentSource: rent.rentSource,
      rentPostcode: rent.rentPostcode,
      rentPostcodeShared: rent.rentPostcode ? (pcCounts.get(rent.rentPostcode) ?? 0) > 1 : null,
      safety,
      transit: {
        coverage: t ? t.walkPct : null,
        hasRail: modes.has("rail"),
        hasMetro: modes.has("metro"),
        hasLightRail: modes.has("lightrail"),
        hasFerry: modes.has("ferry"),
      },
      profile: {
        medianAge: c?.medianAge ?? null,
        pctRenting: personPct(c?.pctRenting),
        pctFamiliesWithChildren: personPct(c?.pctFamiliesWithChildren),
      },
      location: {
        gpoKm: gpoDistanceKm(f.geometry),
        lgaCode,
        lgaName,
      },
      percentiles: {},
      flags,
    };
  });

  const pick = (fn) =>
    suburbs.flatMap((s) => {
      const value = fn(s);
      return value == null ? [] : [{ id: s.id, value }];
    });
  const pct = {
    rentAll: percentiles(pick((s) => (s.rentSource === "dcj" ? s.rent.all : null))),
    rent2Br: percentiles(pick((s) => s.rent.bed2)),
    safetyAll: percentiles(pick((s) => s.safety.all.rate)),
    transitCoverage: percentiles(pick((s) => s.transit.coverage)),
    medianAge: percentiles(pick((s) => s.profile.medianAge)),
  };
  for (const s of suburbs) {
    s.percentiles = Object.fromEntries(Object.entries(pct).map(([k, m]) => [k, m.get(s.id) ?? null]));
  }

  const periods = [...new Set(bocsar.suburbs.map((r) => r.period12).filter(Boolean))];
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    sources: {
      safety: {
        source: bocsar.source,
        period: periods.length === 1 ? periods[0] : periods,
        population: bocsar.populationSource,
      },
      rent: { source: dcj.source, period: dcj.period, join: dcj.join ?? null, fallback: "ABS Census 2021 median weekly rent" },
      census: { source: census.source, period: "Census 2021 (10 August 2021)" },
      transit: { source: access.source, walkMetres: WALK_M },
      lga: {
        source: lgaMethod ? "ABS ASGS 2021" : null,
        method: lgaMethod,
        carriedForwardFrom:
          salToLga || !lgaMethod ? null : (prev?.sources?.lga?.carriedForwardFrom ?? prev?.generatedAt ?? null),
      },
    },
    percentileDirection: {
      rentAll: "High = more expensive. Among suburbs with a DCJ all-dwellings median only (Census fallback excluded).",
      rent2Br: "High = more expensive. Among suburbs with a DCJ 2-bedroom median.",
      safetyAll: "High = more recorded incidents per 1,000 residents. Among suburbs with 1,000+ residents.",
      transitCoverage: "High = more of the suburb within 800 m of a rail, metro, light rail or ferry stop. All suburbs.",
      medianAge: "High = older. Among suburbs with a Census median age.",
    },
    suburbs,
  };
}

// ---------------------------------------------------------------------------
// Community

/** Short → long column names from one sheet with "Short" and "Long" header cells. */
function sheetShortToLong(ws) {
  const out = new Map();
  for (let r = 1; r <= Math.min(ws.rowCount, 60); r++) {
    const cells = [];
    for (let c = 1; c <= Math.min(ws.columnCount, 20); c++) cells.push(cellText(ws.getRow(r).getCell(c).value).trim());
    const shortCol = cells.findIndex((h) => /^short$/i.test(h));
    const longCol = cells.findIndex((h) => /^long$/i.test(h));
    if (shortCol < 0 || longCol < 0) continue;
    for (let rr = r + 1; rr <= ws.rowCount; rr++) {
      const row = ws.getRow(rr);
      const short = cellText(row.getCell(shortCol + 1).value).trim();
      const long = cellText(row.getCell(longCol + 1).value).trim();
      if (short && long && !out.has(short)) out.set(short, long);
    }
    break;
  }
  return out;
}

/**
 * The DataPack ships several metadata workbooks; only the cell-descriptor one
 * maps short headers to long names (the geography one does not). Open every
 * .xlsx in the zip and keep whichever sheets have Short/Long columns.
 */
async function extractMetadataLabels(files) {
  const out = new Map();
  for (const name of files.filter((n) => /\.xlsx$/i.test(n))) {
    const res = spawnSync("unzip", ["-j", "-o", datapackZip, name, "-d", cacheDir], { encoding: "utf8" });
    if (res.status !== 0) continue;
    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.readFile(join(cacheDir, name.split("/").pop()));
    } catch {
      continue;
    }
    let found = 0;
    for (const ws of wb.worksheets) {
      for (const [short, long] of sheetShortToLong(ws)) {
        if (!out.has(short)) {
          out.set(short, long);
          found += 1;
        }
      }
    }
    console.error(`DataPack metadata: ${found} short → long column names from ${name}`);
  }
  return out;
}

const humanise = (key) => key.replace(/_/g, " ").trim();

async function readTable(files, re, columns) {
  const names = files.filter((n) => re.test(n));
  const wanted = new Set(columns);
  const byCode = new Map();
  for (const name of names) {
    const header = await readCsvHeader(datapackZip, name);
    if (!header.some((h) => wanted.has(h))) continue;
    const part = await readCsvByCode(datapackZip, name, (r) => {
      const out = {};
      for (const col of wanted) if (col in r) out[col] = parseNum(r[col]);
      return out;
    });
    for (const [code, row] of part) byCode.set(code, { ...(byCode.get(code) ?? {}), ...row });
  }
  return byCode;
}

async function headersOf(files, re) {
  const out = [];
  for (const name of files.filter((n) => re.test(n))) out.push(...(await readCsvHeader(datapackZip, name)));
  return out;
}

async function buildCommunity({ polygons, census, inspect }) {
  if (!existsSync(datapackZip)) {
    console.error(
      `No Census DataPack at ${datapackZip}; ${communityPath} left as it is. Run npm run data:census once to cache it.`,
    );
    return null;
  }
  const files = listZip(datapackZip);
  const G13 = /2021Census_G13[A-Z]?_NSW_SAL\.csv$/;
  const G09 = /2021Census_G09[A-Z]?_NSW_SAL\.csv$/;
  const G08 = /2021Census_G08_NSW_SAL\.csv$/;
  const G01 = /2021Census_G01_NSW_SAL\.csv$/;
  const [h13, h09, h08] = [await headersOf(files, G13), await headersOf(files, G09), await headersOf(files, G08)];
  const longs = await extractMetadataLabels(files).catch(() => new Map());

  const lang = languageColumns(h13);
  const cob = simpleColumns(h09, "P_", "_Tot");
  const anc = simpleColumns(h08, "", "_Tot_resp");
  const TOTAL = "P_Tot_Tot";
  if (inspect) {
    const dump = {
      G13: { headers: h13, languages: Object.fromEntries(lang.parts) },
      G09: { headers: h09, countries: Object.fromEntries(cob) },
      G08: { headers: h08, ancestries: Object.fromEntries(anc) },
      excluded: {
        G13: h13.filter((h) => /^POL_(.+)_Tot$/.test(h) && isExcludedKey(h.slice(4, -4))),
        G09: h09.filter((h) => /^P_(.+)_Tot$/.test(h) && isExcludedKey(h.slice(2, -4))),
        G08: h08.filter((h) => /_Tot_resp$/.test(h) && isExcludedKey(h.slice(0, -9))),
      },
      long: Object.fromEntries([...h13, ...h09, ...h08].map((h) => [h, longs.get(h) ?? null])),
    };
    const path = join(cacheDir, "community-columns.json");
    await writeFile(path, `${JSON.stringify(dump, null, 2)}\n`);
    console.error(`Wrote ${path}`);
  }
  if (lang.parts.size < MIN_CATEGORIES || cob.size < MIN_CATEGORIES || anc.size < MIN_CATEGORIES) {
    fail(
      `Too few categories found (G13 ${lang.parts.size}, G09 ${cob.size}, G08 ${anc.size}; ` +
        `expected at least ${MIN_CATEGORIES} each, which suggests a parsing bug). ` +
        "Run with --inspect and check data/cache/community-columns.json.",
    );
  }
  const shortCols = [...[...lang.totals.values()], ...cob.values(), ...anc.values()];
  const withLong = shortCols.filter((c) => longs.has(c)).length;
  if (withLong === 0) {
    fail("No DataPack metadata workbook maps these columns to long names, so categories would be labelled with short codes.");
  }
  if (!h13.includes(TOTAL) || !h09.includes(TOTAL)) fail(`${TOTAL} missing from G13 or G09 headers.`);

  const langCols = [...new Set([...[...lang.parts.values()].flat(), ...lang.totals.values(), TOTAL])];
  const t13 = await readTable(files, G13, langCols);
  const t09 = await readTable(files, G09, [...cob.values(), TOTAL]);
  const t08 = await readTable(files, G08, [...anc.values()]);
  const t01 = await readTable(files, G01, ["Tot_P_P"]);

  const mapped = polygons.features.map((f) => String(f.properties.id));
  const codeById = new Map(census.suburbs.map((r) => [r.id, r.salCode ? String(r.salCode) : null]));

  const tables = {
    language: {
      table: "G13",
      keys: [...lang.parts.keys()],
      count: (row, key) => sumParts(row, lang.parts.get(key)),
      rows: t13,
      denominator: (code) => t13.get(code)?.[TOTAL] ?? null,
      denominatorNote: "All usual residents in G13 (P_Tot_Tot), including language not stated.",
      fallbackLabel: labelLang,
      column: (key) => lang.totals.get(key),
      exclusive: true,
    },
    ancestry: {
      table: "G08",
      keys: [...anc.keys()],
      count: (row, key) => row[anc.get(key)] ?? null,
      rows: t08,
      denominator: (code) => t01.get(code)?.Tot_P_P ?? null,
      denominatorNote:
        "Usual residents (G01 Tot_P_P). Each person can give up to two ancestries, so shares can sum to more than 100%.",
      fallbackLabel: labelAncestry,
      column: (key) => anc.get(key),
      exclusive: false,
    },
    countryOfBirth: {
      table: "G09",
      keys: [...cob.keys()],
      count: (row, key) => row[cob.get(key)] ?? null,
      rows: t09,
      denominator: (code) => t09.get(code)?.[TOTAL] ?? null,
      denominatorNote: "All usual residents in G09 (P_Tot_Tot), including country of birth not stated.",
      fallbackLabel: humanise,
      column: (key) => cob.get(key),
      exclusive: true,
    },
  };

  const out = { tables: {}, suburbs: mapped.map((id) => ({ id })) };
  for (const [name, t] of Object.entries(tables)) {
    const sydney = new Map();
    let sydneyDenominator = 0;
    for (const id of mapped) {
      const code = codeById.get(id);
      const row = code ? t.rows.get(code) : null;
      if (!row) continue;
      sydneyDenominator += t.denominator(code) ?? 0;
      for (const key of t.keys) sydney.set(key, (sydney.get(key) ?? 0) + (t.count(row, key) ?? 0));
    }
    const allCategories = [...sydney.values()].reduce((a, b) => a + b, 0);
    const ratio = sydneyDenominator ? allCategories / sydneyDenominator : 0;
    console.error(
      `${t.table}: ${t.keys.length} categories, Greater Sydney sum ${allCategories} / denominator ${sydneyDenominator} = ${ratio.toFixed(3)}`,
    );
    // Single-response tables: kept categories are disjoint, so they cannot add up
    // to more than everyone. More means a subtotal slipped through.
    if (t.exclusive && ratio > 1.02) {
      fail(`${t.table} categories add up to ${(ratio * 100).toFixed(1)}% of residents: a subtotal is being double counted.`);
    }
    // Up to TOP_N of the largest named categories, or all of them when the table has fewer.
    const keys = topKeys(sydney, TOP_N);
    out.tables[name] = {
      table: t.table,
      denominator: t.denominatorNote,
      namedCategories: t.keys.length,
      kept: keys.length,
      categories: keys.map((key) => {
        const absLabel = longs.get(t.column(key)) ?? null;
        return {
          key,
          label: labelFromLong(absLabel) ?? t.fallbackLabel(key),
          absLabel,
          greaterSydney: sydney.get(key) ?? 0,
        };
      }),
    };
    console.error(`${t.table}: kept ${keys.length} of ${t.keys.length} named categories`);
    for (const s of out.suburbs) {
      const code = codeById.get(s.id);
      const row = code ? t.rows.get(code) : null;
      const denom = code ? t.denominator(code) : null;
      s[name] = Object.fromEntries(keys.map((key) => [key, share(row ? t.count(row, key) : null, denom)]));
    }
  }

  // How far summed proficiency parts drift from ABS's own per-language totals
  // (each cell is perturbed separately, so they rarely match exactly).
  let worst = { key: null, diff: 0 };
  for (const key of out.tables.language.categories.map((c) => c.key)) {
    let parts = 0;
    let total = 0;
    for (const row of t13.values()) {
      parts += sumParts(row, lang.parts.get(key)) ?? 0;
      total += row[lang.totals.get(key)] ?? 0;
    }
    const diff = total ? Math.abs(parts - total) / total : 0;
    if (diff > worst.diff) worst = { key, diff };
  }
  console.error(`G13: largest NSW gap between summed proficiency parts and the published total: ${worst.key ?? "none"} ${(worst.diff * 100).toFixed(2)}%`);

  return out;
}

function communityJson(body) {
  const head = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    source: "ABS Census 2021 General Community Profile DataPack, SAL, NSW (G08, G09, G13)",
    period: "Census 2021 (10 August 2021)",
    licence: "CC BY 4.0",
    topN: TOP_N,
    tables: body.tables,
  };
  const lines = body.suburbs.map((s) => `    ${JSON.stringify(s)}`);
  const top = JSON.stringify(head, null, 2).replace(/\n}$/, "");
  return `${top},\n  "suburbs": [\n${lines.join(",\n")}\n  ]\n}\n`;
}

/**
 * Keep the previous generatedAt when nothing else changed, so the monthly
 * refresh does not open a PR for a timestamp alone.
 */
function stableText(path, text) {
  if (!existsSync(path)) return text;
  const old = readFileSync(path, "utf8");
  const stamp = /"generatedAt": "[^"]*"/;
  const prev = old.match(stamp);
  if (!prev) return text;
  const reused = text.replace(stamp, prev[0]);
  return reused === old ? old : text;
}

async function main() {
  const inspect = process.argv.includes("--inspect");
  const polygons = read("suburb-polygons.json");
  const inputs = {
    polygons,
    bocsar: read("bocsar-safety.json"),
    census: read("census-2021.json"),
    dcj: read("dcj-housing.json"),
    access: read("access-places.json"),
  };
  const community = await buildCommunity({ polygons, census: inputs.census, inspect });
  const metrics = await buildMetrics(inputs);
  await writeFile(metricsPath, stableText(metricsPath, `${JSON.stringify(metrics, null, 2)}\n`));
  const s = metrics.suburbs;
  const count = (fn) => s.filter(fn).length;
  console.error(
    `Wrote ${metricsPath} (${s.length} suburbs; rent ${count((r) => r.rent.all != null)} [dcj ${count((r) => r.rentSource === "dcj")}], ` +
      `safety rate ${count((r) => r.safety.all.rate != null)}, LGA ${count((r) => r.location.lgaCode != null)}, ` +
      `census-sal-mismatch ${count((r) => r.flags.includes("census-sal-mismatch"))})`,
  );
  if (community) {
    await writeFile(communityPath, stableText(communityPath, communityJson(community)));
    console.error(`Wrote ${communityPath}`);
  }
}

main().catch((err) => fail(err instanceof Error ? (err.stack ?? err.message) : String(err)));
