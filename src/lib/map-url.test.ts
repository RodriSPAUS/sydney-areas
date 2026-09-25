import assert from "node:assert/strict";
import { test } from "node:test";
import {
  layerFromSearch,
  metricFromSearch,
  searchFromState,
  validateMapSearch,
} from "./map-url.ts";

test("old layer names still open the right layer", () => {
  assert.equal(layerFromSearch(validateMapSearch({ layer: "access" })), "transit");
  assert.equal(layerFromSearch(validateMapSearch({ layer: "households" })), "housing");
  assert.equal(layerFromSearch(validateMapSearch({})), "safety");
});

test("old metric names map to the current chips", () => {
  assert.equal(metricFromSearch(validateMapSearch({ metric: "street" })), "violence");
  assert.equal(metricFromSearch(validateMapSearch({ metric: "dwelling" })), "property");
  assert.equal(metricFromSearch(validateMapSearch({ metric: "nonsense" })), "all");
});

test("metric is only serialised on Safety, and not when it is All", () => {
  const base = { selectedId: "bondi", safetyMetric: "violence" as const };
  assert.deepEqual(searchFromState({ ...base, choropleth: "safety" }), {
    s: "bondi",
    metric: "violence",
  });
  assert.deepEqual(searchFromState({ ...base, choropleth: "housing" }), {
    s: "bondi",
    layer: "housing",
  });
  assert.deepEqual(
    searchFromState({ selectedId: null, choropleth: "safety", safetyMetric: "all" }),
    {},
  );
});

test("oversized or empty suburb ids are dropped", () => {
  assert.equal(validateMapSearch({ s: "" }).s, undefined);
  assert.equal(validateMapSearch({ s: "x".repeat(80) }).s, undefined);
});
