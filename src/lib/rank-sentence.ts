import type { Choropleth } from "@/lib/map-store";

export type Rank = {
  rank: number;
  of: number;
  value: number;
};

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
