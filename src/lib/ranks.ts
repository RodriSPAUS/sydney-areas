import { suburbs } from "@/data/suburbs";
import type { Choropleth, SafetyMetric } from "@/lib/map-store";
import type { Suburb } from "@/lib/suburb-types";

export type Rank = {
  rank: number;
  of: number;
  value: number;
};

function rankMap(
  rows: { id: string; value: number }[],
  direction: "asc" | "desc",
): Map<string, Rank> {
  const sorted = [...rows].sort((a, b) => {
    const d = direction === "asc" ? a.value - b.value : b.value - a.value;
    return d || a.id.localeCompare(b.id);
  });
  const of = sorted.length;
  const map = new Map<string, Rank>();
  sorted.forEach((row, i) => {
    map.set(row.id, { rank: i + 1, of, value: row.value });
  });
  return map;
}

function rate(suburb: Suburb, metric: SafetyMetric): number | null {
  const s = suburb.safety;
  if (!s) return null;
  const value =
    metric === "street"
      ? s.streetPer1000
      : metric === "dwelling"
        ? s.dwellingPer1000
        : metric === "domestic"
          ? s.domesticPer1000
          : s.combinedPer1000;
  return value == null ? null : value;
}

function buildSafety(metric: SafetyMetric): Map<string, Rank> {
  return rankMap(
    suburbs.flatMap((s) => {
      const value = rate(s, metric);
      return value == null ? [] : [{ id: s.id, value }];
    }),
    "asc",
  );
}

const safetyRanks: Record<SafetyMetric, Map<string, Rank>> = {
  combined: buildSafety("combined"),
  street: buildSafety("street"),
  dwelling: buildSafety("dwelling"),
  domestic: buildSafety("domestic"),
};

const housingRanks = rankMap(
  suburbs.flatMap((s) =>
    s.housing?.medianWeeklyRent != null
      ? [{ id: s.id, value: s.housing.medianWeeklyRent }]
      : [],
  ),
  "asc",
);

const familyRanks = rankMap(
  suburbs.flatMap((s) =>
    s.households ? [{ id: s.id, value: s.households.pctFamiliesWithChildren }] : [],
  ),
  "asc",
);

const bornAuRanks = rankMap(
  suburbs.flatMap((s) =>
    s.backgrounds ? [{ id: s.id, value: s.backgrounds.pctBornAustralia }] : [],
  ),
  "asc",
);

export function safetyRank(id: string, metric: SafetyMetric): Rank | undefined {
  return safetyRanks[metric].get(id);
}

export function layerRank(id: string, layer: Choropleth, metric: SafetyMetric): Rank | undefined {
  if (layer === "safety") return safetyRank(id, metric);
  if (layer === "housing") return housingRanks.get(id);
  if (layer === "households") return familyRanks.get(id);
  return bornAuRanks.get(id);
}

export function rankCaption(layer: Choropleth, metric: SafetyMetric): string {
  if (layer === "safety") {
    const what =
      metric === "street"
        ? "street incidents"
        : metric === "dwelling"
          ? "home break-ins and theft"
          : metric === "domestic"
            ? "domestic assault"
            : "combined street and home incidents";
    return `1 = fewest ${what} per 1,000`;
  }
  if (layer === "housing") return "1 = lowest weekly rent";
  if (layer === "households") return "1 = fewest families with children";
  return "1 = lowest share born in Australia";
}
