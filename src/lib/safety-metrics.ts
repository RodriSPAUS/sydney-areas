/**
 * Safety rates and bands, shared by the app (src/data/suburbs.ts,
 * src/lib/choropleth.ts) and the data scripts (scripts/build-suburb-metrics.mjs,
 * scripts/check-data.mjs) so the numbers cannot diverge.
 *
 * Plain TypeScript with relative `.ts` imports and type-only aliases, so Node
 * can load it with --experimental-strip-types.
 */
import type { SafetyMetric } from "@/lib/map-store";
import type { SafetyBand, SafetyCounts } from "@/lib/suburb-types";
import { allCount, domesticCount, propertyCount, violenceCount } from "./safety-counts.ts";

export const SAFETY_METRICS: readonly SafetyMetric[] = ["all", "violence", "property", "domestic"];

/**
 * Below this many Census 2021 usual residents a per-1,000 rate swings on a
 * handful of incidents (Barangaroo, Eastern Creek), so it is shown as counts
 * only and never ranked or coloured.
 */
export const MIN_POP = 1000;

/** Incidents per 1,000 usual residents, one decimal. Null under MIN_POP. */
export function per1000(count: number, population: number | null | undefined): number | null {
  if (population == null || population < MIN_POP) return null;
  return Math.round((count / population) * 10000) / 10;
}

export type SafetyRates = Record<SafetyMetric, number | null>;

/** All = violence + property. Domestic only in its own category. Retail theft never used. */
export function safetyRates(
  counts: SafetyCounts | null | undefined,
  population: number | null | undefined,
): SafetyRates {
  return {
    all: counts ? per1000(allCount(counts), population) : null,
    violence: counts ? per1000(violenceCount(counts), population) : null,
    property: counts ? per1000(propertyCount(counts), population) : null,
    domestic: counts ? per1000(domesticCount(counts), population) : null,
  };
}

/**
 * Quintiles among the suburbs that have a rate. Band 1 = most incidents
 * (darkest), band 5 = fewest. Ties break on id so the order is stable.
 */
export function safetyQuintileBands(rows: { id: string; value: number }[]): Map<string, SafetyBand> {
  const sorted = [...rows].sort((a, b) => b.value - a.value || a.id.localeCompare(b.id));
  const n = sorted.length;
  const map = new Map<string, SafetyBand>();
  sorted.forEach((row, i) => {
    const band = Math.min(5, Math.floor((i / Math.max(n, 1)) * 5) + 1) as SafetyBand;
    map.set(row.id, band);
  });
  return map;
}

/** Bands per metric for every suburb with a non-null rate. */
export function safetyBandsByMetric(
  rows: { id: string; rates: SafetyRates }[],
): Record<SafetyMetric, Map<string, SafetyBand>> {
  const bands = (metric: SafetyMetric) =>
    safetyQuintileBands(
      rows.flatMap((r) => {
        const value = r.rates[metric];
        return value == null ? [] : [{ id: r.id, value }];
      }),
    );
  return {
    all: bands("all"),
    violence: bands("violence"),
    property: bands("property"),
    domestic: bands("domestic"),
  };
}
