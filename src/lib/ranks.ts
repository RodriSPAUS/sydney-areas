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

const MORE_LESS: Record<Choropleth, [string, string]> = {
  safety: ["More recorded incidents", "Fewer recorded incidents"],
  housing: ["Higher rent", "Lower rent"],
  transit: ["More of the suburb near a stop", "Less of the suburb near a stop"],
  backgrounds: ["Higher share born in Australia", "Lower share born in Australia"],
};

/**
 * One direction for every layer: say which side of the pack this suburb is on,
 * as a share of the suburbs ranked on this map. Rank 1 is always the lowest
 * value, so `rank - 1` suburbs sit below and `of - rank` sit above.
 */
export function rankSentence(layer: Choropleth, rank: Rank): string {
  const below = rank.rank - 1;
  const above = rank.of - rank.rank;
  const [more, less] = MORE_LESS[layer];
  const pct = (n: number) => Math.round((n / rank.of) * 100);
  const tail = `of ${rank.of.toLocaleString("en-AU")} suburbs on this map`;
  if (below >= above) return `${more} than ${pct(below)}% ${tail}`;
  return `${less} than ${pct(above)}% ${tail}`;
}
