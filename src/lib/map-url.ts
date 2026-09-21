import type { Choropleth, SafetyMetric } from "@/lib/map-store";

export const LAYER_IDS = ["safety", "housing", "households", "backgrounds"] as const;
export const METRIC_IDS = ["combined", "street", "dwelling", "domestic"] as const;

export type MapSearch = {
  s?: string;
  layer?: Choropleth;
  metric?: SafetyMetric;
};

function isLayer(value: unknown): value is Choropleth {
  return typeof value === "string" && (LAYER_IDS as readonly string[]).includes(value);
}

function isMetric(value: unknown): value is SafetyMetric {
  return typeof value === "string" && (METRIC_IDS as readonly string[]).includes(value);
}

export function validateMapSearch(search: Record<string, unknown>): MapSearch {
  const next: MapSearch = {};
  if (typeof search.s === "string" && search.s.length > 0 && search.s.length < 80) {
    next.s = search.s;
  }
  if (isLayer(search.layer) && search.layer !== "safety") next.layer = search.layer;
  if (isMetric(search.metric) && search.metric !== "combined") next.metric = search.metric;
  return next;
}

export function searchFromState(state: {
  selectedId: string | null;
  choropleth: Choropleth;
  safetyMetric: SafetyMetric;
}): MapSearch {
  return validateMapSearch({
    s: state.selectedId ?? undefined,
    layer: state.choropleth,
    metric: state.safetyMetric,
  });
}

export function sameSearch(a: MapSearch, b: MapSearch): boolean {
  return a.s === b.s && a.layer === b.layer && a.metric === b.metric;
}

export function layerFromSearch(search: MapSearch): Choropleth {
  return search.layer ?? "safety";
}

export function metricFromSearch(search: MapSearch): SafetyMetric {
  return search.metric ?? "combined";
}
