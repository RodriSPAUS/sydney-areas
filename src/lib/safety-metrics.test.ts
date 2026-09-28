import assert from "node:assert/strict";
import { test } from "node:test";
import { MIN_POP, per1000, safetyBandsByMetric, safetyQuintileBands, safetyRates } from "./safety-metrics.ts";
import type { SafetyCounts } from "./suburb-types.ts";

const zero: SafetyCounts = {
  homicide: 0,
  sexualAssault: 0,
  otherSexual: 0,
  assaultNonDv: 0,
  assaultPolice: 0,
  assaultDv: 0,
  robbery: 0,
  stealFromPerson: 0,
  breakEnterDwelling: 0,
  stealFromDwelling: 0,
  stealFromVehicle: 0,
  motorVehicleTheft: 0,
  maliciousDamage: 0,
  stealRetail: 0,
};

test("per 1,000 residents to one decimal", () => {
  assert.equal(per1000(45, 3000), 15);
  assert.equal(per1000(1, 3000), 0.3);
  assert.equal(per1000(0, 3000), 0);
});

test("no rate under 1,000 residents or without a population", () => {
  assert.equal(MIN_POP, 1000);
  assert.equal(per1000(50, 999), null);
  assert.equal(per1000(50, 1000), 50);
  assert.equal(per1000(50, null), null);
  assert.equal(per1000(50, undefined), null);
});

test("all = violence + property; domestic only in its own category; retail never used", () => {
  const counts = { ...zero, assaultNonDv: 10, maliciousDamage: 5, assaultDv: 7, stealRetail: 500 };
  assert.deepEqual(safetyRates(counts, 1000), { all: 15, violence: 10, property: 5, domestic: 7 });
  assert.deepEqual(safetyRates(null, 5000), { all: null, violence: null, property: null, domestic: null });
  assert.deepEqual(safetyRates(counts, 500), { all: null, violence: null, property: null, domestic: null });
});

test("band 1 = most incidents, quintiles among suburbs with a rate", () => {
  const rows = Array.from({ length: 10 }, (_, i) => ({ id: `s${i}`, value: i }));
  const bands = safetyQuintileBands(rows);
  assert.equal(bands.get("s9"), 1);
  assert.equal(bands.get("s8"), 1);
  assert.equal(bands.get("s7"), 2);
  assert.equal(bands.get("s0"), 5);
  assert.equal(bands.size, 10);
});

test("suburbs without a rate get no band", () => {
  const byMetric = safetyBandsByMetric([
    { id: "a", rates: { all: 3, violence: 1, property: 2, domestic: null } },
    { id: "b", rates: { all: null, violence: null, property: null, domestic: null } },
  ]);
  assert.equal(byMetric.all.get("a"), 1);
  assert.equal(byMetric.all.has("b"), false);
  assert.equal(byMetric.domestic.size, 0);
});
