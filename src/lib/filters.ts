import { suburbs } from "@/data/suburbs";
import { activeSafetyBand, bornBandById, familyBandById, housingBandById } from "@/lib/choropleth";
import type { Choropleth, LayerFilter, SafetyMetric } from "@/lib/map-store";
import type { Suburb } from "@/lib/suburb-types";

export const FILTER_CHIPS: Record<Choropleth, { id: LayerFilter; label: string }[]> = {
  safety: [
    { id: "all", label: "All" },
    { id: "low", label: "Fewer incidents" },
    { id: "high", label: "More incidents" },
  ],
  housing: [
    { id: "all", label: "All" },
    { id: "low", label: "Lower rent" },
    { id: "high", label: "Higher rent" },
  ],
  households: [
    { id: "all", label: "All" },
    { id: "low", label: "Fewer families" },
    { id: "high", label: "More families" },
  ],
  backgrounds: [
    { id: "all", label: "All" },
    { id: "low", label: "Lower born in Australia" },
    { id: "high", label: "Higher born in Australia" },
  ],
};

function bandMatches(band: number | undefined, filter: LayerFilter): boolean {
  if (filter === "all") return true;
  if (band == null) return false;
  if (filter === "low") return band <= 2;
  return band >= 4;
}

/** Safety bands are inverted (1 = more incidents). */
function safetyMatches(band: number | undefined, filter: LayerFilter): boolean {
  if (filter === "all") return true;
  if (band == null) return false;
  if (filter === "low") return band >= 4;
  return band <= 2;
}

export function suburbMatchesFilter(
  suburb: Suburb,
  layer: Choropleth,
  metric: SafetyMetric,
  filter: LayerFilter,
): boolean {
  if (filter === "all") return true;
  if (layer === "safety") return safetyMatches(activeSafetyBand(suburb, metric), filter);
  if (layer === "housing") return bandMatches(housingBandById.get(suburb.id), filter);
  if (layer === "households") return bandMatches(familyBandById.get(suburb.id), filter);
  return bandMatches(bornBandById.get(suburb.id), filter);
}

export function filterMatchCount(
  layer: Choropleth,
  metric: SafetyMetric,
  filter: LayerFilter,
): number {
  if (filter === "all") return suburbs.length;
  return suburbs.filter((s) => suburbMatchesFilter(s, layer, metric, filter)).length;
}
