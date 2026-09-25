#!/usr/bin/env node
/**
 * Sanity gate for refreshed data. A failed download makes some fetch scripts
 * write an empty or partial file on purpose (the app falls back to Census),
 * which is fine locally but must never reach main unnoticed. Exit 1 on any
 * failed check, so the refresh workflow stops before opening a PR.
 */
import { readFileSync } from "node:fs";

const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const polygons = read("src/data/suburb-polygons.json").features.length;
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
const outOfRange = rents.filter((v) => v < 100 || v > 5000).length;
check("DCJ rent range", outOfRange === 0, `${outOfRange} medians outside $100–$5,000 a week`);

if (problems.length) {
  console.error(`\n${problems.length} check(s) failed: ${problems.join(", ")}`);
  process.exit(1);
}
