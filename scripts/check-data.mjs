#!/usr/bin/env node
/**
 * Sanity gate for refreshed data. A failed download makes some fetch scripts
 * write an empty or partial file on purpose (the app falls back to Census),
 * which is fine locally but must never reach main unnoticed. Exit 1 on any
 * failed check, so the refresh workflow stops before opening a PR.
 */
import { existsSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { looksLikeShortCode } from "../src/lib/community-derive.ts";
import { SAFETY_METRICS, safetyBandsByMetric, safetyRates } from "../src/lib/safety-metrics.ts";
import { allCount, domesticCount, propertyCount, violenceCount } from "../src/lib/safety-counts.ts";

const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const polygonIds = read("src/data/suburb-polygons.json").features.map((f) => String(f.properties.id));
const polygons = polygonIds.length;
const RENT_MIN = 100;
const RENT_MAX = 5000;
const METRICS_GZIP_MAX = 500 * 1024;
const problems = [];

function check(label, ok, detail) {
  console.error(`${ok ? "ok  " : "FAIL"} ${label}: ${detail}`);
  if (!ok) problems.push(label);
}

const bocsar = read("src/data/bocsar-safety.json");
const withCounts = bocsar.suburbs.filter((r) => r.last12Months && r.population != null).length;
check("BOCSAR rows", withCounts >= polygons * 0.9, `${withCounts} of ${polygons} suburbs have counts and population`);
check("BOCSAR period", /\d{4}/.test(bocsar.suburbs[0]?.period12 ?? ""), bocsar.suburbs[0]?.period12 ?? "missing");

const dcj = read("src/data/dcj-housing.json");
const withRent = dcj.suburbs.filter((r) => r.medianWeeklyRent != null).length;
check("DCJ rent rows", withRent >= polygons * 0.85, `${withRent} of ${polygons} suburbs have a median rent`);
check("DCJ period", /quarter/i.test(dcj.period ?? ""), dcj.period ?? "missing");

const rents = dcj.suburbs.map((r) => r.medianWeeklyRent).filter((v) => v != null);
const outOfRange = rents.filter((v) => v < RENT_MIN || v > RENT_MAX).length;
check("DCJ rent range", outOfRange === 0, `${outOfRange} medians outside $100–$5,000 a week`);

/** Every mapped suburb exactly once, and nothing else. */
function checkIds(label, rows) {
  const seen = new Map();
  for (const r of rows) seen.set(r.id, (seen.get(r.id) ?? 0) + 1);
  const missing = polygonIds.filter((id) => !seen.has(id)).length;
  const dupes = [...seen.values()].filter((n) => n > 1).length;
  const known = new Set(polygonIds);
  const orphans = [...seen.keys()].filter((id) => !known.has(id)).length;
  check(
    `${label} ids`,
    missing === 0 && dupes === 0 && orphans === 0,
    `${seen.size} ids, ${missing} missing, ${dupes} duplicated, ${orphans} orphan`,
  );
}

const inRange = (v) => v == null || (typeof v === "number" && v >= 0 && v <= 100);

function sizes(label, path) {
  const raw = readFileSync(path);
  const gz = gzipSync(raw, { level: 9 }).length;
  console.error(`size ${label}: ${(raw.length / 1024).toFixed(0)} KB raw, ${(gz / 1024).toFixed(0)} KB gzip`);
  return gz;
}

const metricsPath = "src/data/suburb-metrics.json";
if (!existsSync(metricsPath)) {
  check("Metrics file", false, `${metricsPath} missing (npm run data:metrics)`);
} else {
  const metrics = read(metricsPath);
  const rows = metrics.suburbs ?? [];
  checkIds("Metrics", rows);

  const pctBad = rows.filter(
    (r) => !inRange(r.transit?.coverage) || !inRange(r.profile?.pctRenting) || !inRange(r.profile?.pctFamiliesWithChildren),
  ).length;
  check("Metrics percentages", pctBad === 0, `${pctBad} suburbs with a share outside 0–100`);
  const pctlBad = rows.filter((r) => !Object.values(r.percentiles ?? {}).every(inRange)).length;
  check("Metrics percentiles", pctlBad === 0, `${pctlBad} suburbs with a percentile outside 0–100`);

  const rentValues = rows.flatMap((r) => Object.values(r.rent ?? {}).filter((v) => v != null));
  const rentBad = rentValues.filter((v) => v < RENT_MIN || v > RENT_MAX).length;
  check("Metrics rent range", rentBad === 0, `${rentBad} of ${rentValues.length} rents outside $100–$5,000 a week`);

  // Recompute safety from bocsar-safety.json with the module the app uses.
  const byId = new Map(bocsar.suburbs.map((r) => [r.id, r]));
  const counted = { all: allCount, violence: violenceCount, property: propertyCount, domestic: domesticCount };
  const expected = polygonIds.map((id) => {
    const b = byId.get(id);
    return { id, counts: b?.last12Months ?? null, rates: safetyRates(b?.last12Months, b?.population) };
  });
  const bands = safetyBandsByMetric(expected);
  const metricsById = new Map(rows.map((r) => [r.id, r]));
  let safetyBad = 0;
  for (const e of expected) {
    const got = metricsById.get(e.id)?.safety;
    for (const m of SAFETY_METRICS) {
      const want = {
        count: e.counts ? counted[m](e.counts) : null,
        rate: e.rates[m],
        band: bands[m].get(e.id) ?? null,
      };
      const have = got?.[m];
      if (!have || have.count !== want.count || have.rate !== want.rate || have.band !== want.band) safetyBad += 1;
    }
  }
  check("Metrics safety", safetyBad === 0, `${safetyBad} suburb × category values differ from src/lib/safety-metrics.ts`);

  const gz = sizes("suburb-metrics.json", metricsPath);
  check("Metrics size", gz <= METRICS_GZIP_MAX, `${(gz / 1024).toFixed(0)} KB gzip (limit ${METRICS_GZIP_MAX / 1024} KB)`);
}

const communityPath = "src/data/suburb-community.json";
if (!existsSync(communityPath)) {
  check("Community file", false, `${communityPath} missing (cache the DataPack with npm run data:census, then npm run data:metrics)`);
} else {
  const community = read(communityPath);
  const rows = community.suburbs ?? [];
  checkIds("Community", rows);
  let bad = 0;
  let cats = 0;
  for (const [name, table] of Object.entries(community.tables ?? {})) {
    cats += table.categories?.length ?? 0;
    for (const r of rows) for (const v of Object.values(r[name] ?? {})) if (!inRange(v?.pct)) bad += 1;
  }
  check("Community percentages", bad === 0, `${bad} shares outside 0–100 across ${cats} categories`);
  const codeLabels = Object.values(community.tables ?? {}).flatMap((t) =>
    (t.categories ?? []).filter((c) => looksLikeShortCode(c.label)).map((c) => `${t.table} ${c.key}="${c.label}"`),
  );
  check(
    "Community labels",
    codeLabels.length === 0,
    codeLabels.length ? `short-code labels: ${codeLabels.slice(0, 8).join(", ")}` : `${cats} readable labels`,
  );
  const kept = Object.entries(community.tables ?? {}).map(([k, t]) => `${k} ${t.kept ?? t.categories?.length}`);
  const thin = Object.values(community.tables ?? {}).filter((t) => (t.categories?.length ?? 0) < 15).length;
  check("Community categories", thin === 0, `kept per table: ${kept.join(", ")}`);
  sizes("suburb-community.json", communityPath);
}

if (problems.length) {
  console.error(`\n${problems.length} check(s) failed: ${problems.join(", ")}`);
  process.exit(1);
}
