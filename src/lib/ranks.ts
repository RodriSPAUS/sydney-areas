import { suburbs } from "@/data/suburbs";
import type { Choropleth, SafetyMetric } from "@/lib/map-store";
import type { Rank } from "@/lib/rank-sentence";
import type { Suburb } from "@/lib/suburb-types";

export type { Rank } from "@/lib/rank-sentence";
export { rankSentence } from "@/lib/rank-sentence";

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
    metric === "violence"
      ? s.violencePer1000
      : metric === "property"
        ? s.propertyPer1000
        : metric === "domestic"
          ? s.domesticPer1000
          : s.allPer1000;
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
  all: buildSafety("all"),
  violence: buildSafety("violence"),
  property: buildSafety("property"),
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

const bornAuRanks = rankMap(
  suburbs.flatMap((s) =>
    s.backgrounds ? [{ id: s.id, value: s.backgrounds.pctBornAustralia }] : [],
  ),
  "asc",
);

const transitRanks = rankMap(
  suburbs.flatMap((s) =>
    s.transit.walkPct > 0 ? [{ id: s.id, value: s.transit.walkPct }] : [],
  ),
  "asc",
);

export function safetyRank(id: string, metric: SafetyMetric): Rank | undefined {
  return safetyRanks[metric].get(id);
}

export function layerRank(id: string, layer: Choropleth, metric: SafetyMetric): Rank | undefined {
  if (layer === "safety") return safetyRank(id, metric);
  if (layer === "housing") return housingRanks.get(id);
  if (layer === "transit") return transitRanks.get(id);
  return bornAuRanks.get(id);
}
