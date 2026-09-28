import assert from "node:assert/strict";
import { test } from "node:test";
import {
  gpoDistanceKm,
  haversineKm,
  percentiles,
  personPct,
  polygonCentroid,
  postcodeCounts,
  resolveRent,
  SYDNEY_GPO,
} from "./metrics-derive.ts";

const square = (lon: number, lat: number, d: number) => ({
  type: "Polygon" as const,
  coordinates: [
    [
      [lon, lat],
      [lon + d, lat],
      [lon + d, lat + d],
      [lon, lat + d],
      [lon, lat],
    ],
  ],
});

test("percentiles: lowest 0, highest 100, ties share a mid-rank", () => {
  const p = percentiles([
    { id: "a", value: 100 },
    { id: "b", value: 200 },
    { id: "c", value: 200 },
    { id: "d", value: 400 },
    { id: "e", value: 500 },
  ]);
  assert.equal(p.get("a"), 0);
  assert.equal(p.get("b"), 38); // (1 + 0.5) / 4
  assert.equal(p.get("c"), 38);
  assert.equal(p.get("d"), 75);
  assert.equal(p.get("e"), 100);
});

test("percentiles: empty and single rows", () => {
  assert.equal(percentiles([]).size, 0);
  assert.equal(percentiles([{ id: "x", value: 3 }]).get("x"), 50);
});

test("haversine: one degree of latitude is ~111 km", () => {
  const d = haversineKm({ lat: -34, lon: 151 }, { lat: -33, lon: 151 });
  assert.ok(Math.abs(d - 111.2) < 0.1, String(d));
});

test("centroid of a square, and of a square with a hole", () => {
  const c = polygonCentroid(square(151, -34, 0.02));
  assert.ok(c);
  assert.ok(Math.abs(c.lon - 151.01) < 1e-9 && Math.abs(c.lat - -33.99) < 1e-9);
  const holed = {
    type: "Polygon" as const,
    coordinates: [
      square(151, -34, 0.04).coordinates[0],
      square(151.02, -33.98, 0.02).coordinates[0],
    ],
  };
  const h = polygonCentroid(holed);
  assert.ok(h);
  assert.ok(h.lon < 151.02 && h.lat < -33.98, "hole pulls the centroid away");
});

test("multipolygon centroid is area-weighted", () => {
  const big = square(151, -34, 0.03).coordinates;
  const small = square(151.1, -34, 0.01).coordinates;
  const c = polygonCentroid({ type: "MultiPolygon", coordinates: [big, small] });
  assert.ok(c);
  // (0.0009 * 151.015 + 0.0001 * 151.105) / 0.001
  assert.ok(Math.abs(c.lon - 151.024) < 1e-9, String(c.lon));
});

test("GPO distance rounds to 0.1 km and is 0 at the GPO", () => {
  const d = 0.001;
  assert.equal(gpoDistanceKm(square(SYDNEY_GPO.lon - d / 2, SYDNEY_GPO.lat - d / 2, d)), 0);
  const km = gpoDistanceKm(square(151.0, -33.82, 0.001));
  assert.ok(km != null && Math.round(km * 10) === km * 10);
  assert.ok(km > 19 && km < 20, String(km));
});

test("rent: DCJ all-dwellings median wins, bedroom medians only from DCJ", () => {
  const r = resolveRent(
    { postcode: "2150", medianWeeklyRent: 650, rent1Br: null, rent2Br: 600, rent3Br: 720, rentHouse: 750, rentFlat: 580 },
    420,
  );
  assert.deepEqual(r.rent, { all: 650, bed1: null, bed2: 600, bed3: 720, house: 750, flat: 580 });
  assert.equal(r.rentSource, "dcj");
  assert.equal(r.rentPostcode, "2150");
});

test("rent: Census 2021 fallback when DCJ has no all-dwellings median", () => {
  const r = resolveRent({ postcode: "2000", medianWeeklyRent: null, rent2Br: 900 }, 480);
  assert.equal(r.rent.all, 480);
  assert.equal(r.rent.bed2, 900);
  assert.equal(r.rentSource, "census");
  assert.equal(r.rentPostcode, "2000");
  const none = resolveRent(undefined, null);
  assert.equal(none.rent.all, null);
  assert.equal(none.rentSource, null);
  assert.equal(none.rentPostcode, null);
  assert.equal(resolveRent(undefined, 0).rent.all, null, "a zero is missing, not a rent");
});

test("postcode counts drive rentPostcodeShared", () => {
  const counts = postcodeCounts(["2150", "2150", "2026", null, undefined]);
  assert.equal(counts.get("2150"), 2);
  assert.equal(counts.get("2026"), 1);
  assert.equal(counts.size, 2);
});

test("person shares outside 0–100 are dropped", () => {
  assert.equal(personPct(42), 42);
  assert.equal(personPct(101), null);
  assert.equal(personPct(-1), null);
  assert.equal(personPct(null), null);
});
