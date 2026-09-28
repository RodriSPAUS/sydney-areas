/**
 * Shapes of src/data/suburb-metrics.json and src/data/suburb-community.json,
 * written by scripts/build-suburb-metrics.mjs. Field meanings, sources and
 * null semantics: docs/data-metrics.md. Null always means "not published or
 * not derivable", never zero.
 */
import type { SafetyMetric } from "@/lib/map-store";
import type { SafetyBand } from "@/lib/suburb-types";

export type SafetyCategoryMetrics = {
  /** Recorded incidents in the 12-month period. */
  count: number | null;
  /** Per 1,000 Census 2021 usual residents, 1 dp. Null under 1,000 residents. */
  rate: number | null;
  /** 1 = most incidents … 5 = fewest, quintiles among suburbs with a rate. */
  band: SafetyBand | null;
};

export type SuburbMetrics = {
  id: string;
  name: string;
  /** Census 2021 usual residents. */
  population: number | null;
  /** Weekly rent, AUD. Bedroom and dwelling-type medians are DCJ only. */
  rent: {
    all: number | null;
    bed1: number | null;
    bed2: number | null;
    bed3: number | null;
    house: number | null;
    flat: number | null;
  };
  rentSource: "dcj" | "census" | null;
  rentPostcode: string | null;
  /** True when the postcode is shared by more than one mapped suburb. Null without a postcode. */
  rentPostcodeShared: boolean | null;
  safety: { period: string | null } & Record<SafetyMetric, SafetyCategoryMetrics>;
  transit: {
    /** % of the polygon within 800 m of a rail, metro, light rail or ferry stop. */
    coverage: number | null;
    hasRail: boolean;
    hasMetro: boolean;
    hasLightRail: boolean;
    hasFerry: boolean;
  };
  profile: {
    medianAge: number | null;
    pctRenting: number | null;
    pctFamiliesWithChildren: number | null;
  };
  location: {
    /** Straight-line km from the polygon centroid to Sydney GPO, 1 dp. */
    gpoKm: number | null;
    lgaCode: string | null;
    lgaName: string | null;
  };
  /** 0–100 among suburbs with data; high = more of the thing. See percentileDirection. */
  percentiles: {
    rentAll: number | null;
    rent2Br: number | null;
    safetyAll: number | null;
    transitCoverage: number | null;
    medianAge: number | null;
  };
  /** "census-sal-mismatch": the Census 2021 row looks like another SAL of the same name. */
  flags: string[];
};

export type SuburbMetricsFile = {
  schemaVersion: number;
  generatedAt: string;
  sources: {
    safety: { source: string; period: string | string[]; population: string };
    rent: { source: string; period: string | null; join: string | null; fallback: string };
    census: { source: string; period: string };
    transit: { source: string; walkMetres: number };
    lga: { source: string | null; method: string | null; carriedForwardFrom: string | null };
  };
  percentileDirection: Record<keyof SuburbMetrics["percentiles"], string>;
  suburbs: SuburbMetrics[];
};

export type CommunityShare = { count: number | null; pct: number | null };

export type CommunityTableName = "language" | "ancestry" | "countryOfBirth";

export type CommunityCategory = {
  /** DataPack short-header key, e.g. "CL_Mandarin". */
  key: string;
  label: string;
  /** ABS long column name from the DataPack metadata, when present. */
  absLabel: string | null;
  /** Count across all mapped suburbs. */
  greaterSydney: number;
};

export type SuburbCommunityFile = {
  schemaVersion: number;
  generatedAt: string;
  source: string;
  period: string;
  licence: string;
  topN: number;
  tables: Record<
    CommunityTableName,
    { table: string; denominator: string; categories: CommunityCategory[] }
  >;
  suburbs: ({ id: string } & Record<CommunityTableName, Record<string, CommunityShare>>)[];
};
