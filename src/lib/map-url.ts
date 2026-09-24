import type { Choropleth, SafetyMetric } from "@/lib/map-store";

export const LAYER_IDS = ["safety", "housing", "backgrounds"] as const;
export const METRIC_IDS = ["all", "violence", "property", "domestic"] as const;

export type MapSearch = {
  s?: string;
  layer?: Choropleth;
  metric?: SafetyMetric;
};

function readLayer(value: unknown): Choropleth | undefined {
  if (value === "households" || value === "housing") return "housing";
  if (value === "backgrounds") return "backgrounds";
  if (value === "access") return "access";
  return undefined;
}

function readMetric(value: unknown): SafetyMetric {
  if (value === "street" || value === "violence") return "violence";
  if (value === "dwelling" || value === "property") return "property";
  if (value === "domestic") return "domestic";
  return "all";
}

export function validateMapSearch(search: Record<string, unknown>): MapSearch {
  const next: MapSearch = {};
  if (typeof search.s === "string" && search.s.length > 0 && search.s.length < 80) {
    next.s = search.s;
  }
  const layer = readLayer(search.layer);
  if (layer) next.layer = layer;
  const metric = readMetric(search.metric);
  if (!next.layer && metric !== "all") next.metric = metric;
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
    ...(state.choropleth === "safety" ? { metric: state.safetyMetric } : {}),
  });
}

export function layerFromSearch(search: MapSearch): Choropleth {
  return readLayer(search.layer) ?? "safety";
}

export function metricFromSearch(search: MapSearch): SafetyMetric {
  if (readLayer(search.layer)) return "all";
  return readMetric(search.metric);
}
