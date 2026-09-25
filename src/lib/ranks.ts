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

const WORDS: Record<Choropleth, { more: string; less: string; most: string; least: string }> = {
  safety: {
    more: "More recorded incidents",
    less: "Fewer recorded incidents",
    most: "The most recorded incidents",
    least: "The fewest recorded incidents",
  },
  housing: {
    more: "Higher rent",
    less: "Lower rent",
    most: "The highest rent",
    least: "The lowest rent",
  },
  transit: {
    more: "More of the suburb near a stop",
    less: "Less of the suburb near a stop",
    most: "The most of the suburb near a stop",
    least: "The least of the suburb near a stop",
  },
  backgrounds: {
    more: "Higher share born in Australia",
    less: "Lower share born in Australia",
    most: "The highest share born in Australia",
    least: "The lowest share born in Australia",
  },
};

/**
 * One direction for every layer: say which side of the pack this suburb is on,
 * as a share of the other suburbs ranked on this map. Rank 1 is always the
 * lowest value, so `rank - 1` suburbs sit below and `of - rank` sit above.
 */
export function rankSentence(layer: Choropleth, rank: Rank): string {
  const words = WORDS[layer];
  const tail = `of ${rank.of.toLocaleString("en-AU")} suburbs on this map`;
  const others = rank.of - 1;
  if (others <= 0) return `Only suburb ranked on this map`;
  if (rank.rank === rank.of) return `${words.most} ${tail}`;
  if (rank.rank === 1) return `${words.least} ${tail}`;
  const below = rank.rank - 1;
  const above = rank.of - rank.rank;
  // Clamp so a near-extreme suburb never reads "than 100%" or "than 0%".
  const pct = (n: number) => Math.min(99, Math.max(1, Math.round((n / others) * 100)));
  if (below >= above) return `${words.more} than ${pct(below)}% ${tail}`;
  return `${words.less} than ${pct(above)}% ${tail}`;
}
