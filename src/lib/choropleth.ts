import type { ExpressionSpecification } from "maplibre-gl";
import { suburbs } from "@/data/suburbs";
import type { Choropleth, SafetyMetric } from "@/lib/map-store";
import type { SafetyBand, Suburb } from "@/lib/suburb-types";

/**
 * Colorblind-safe 5-class sequential fills. Darker = more of the mapped value.
 * Safety is orange-brown (no red/green). Housing / backgrounds
 * use quintiles so neighbouring suburbs do not wash into one mid-tone.
 */
export const SAFETY_FILL: Record<SafetyBand, string> = {
  5: "#F2E4CC",
  4: "#E0B06A",
  3: "#C67A3C",
  2: "#9A4A28",
  1: "#5C2418",
};

/** 1 = lowest rent (light), 5 = highest (dark). */
export const HOUSING_FILL: Record<SafetyBand, string> = {
  1: "#C5E4F5",
  2: "#5FA8D3",
  3: "#2171B5",
  4: "#0B4F86",
  5: "#06233F",
};

/** 1 = fewest families, 5 = most. */
export const FAMILIES_FILL: Record<SafetyBand, string> = {
  1: "#F0DCC0",
  2: "#D4A06A",
  3: "#B06830",
  4: "#7A3C16",
  5: "#3A1A08",
};

/** 1 = lowest share born in Australia, 5 = highest. */
export const BORN_AU_FILL: Record<SafetyBand, string> = {
  1: "#C6EDE6",
  2: "#5CBBAE",
  3: "#1A8A7C",
  4: "#0B5A50",
  5: "#022E2A",
};

/** 1 = fewest stops (light), 5 = most (dark). Not the safety ramp. */
export const TRANSIT_FILL: Record<SafetyBand, string> = {
  1: "#E7DFF2",
  2: "#C4B0DE",
  3: "#9674C4",
  4: "#6A45A0",
  5: "#3C2268",
};

export const HOUSING_LOW = HOUSING_FILL[1];
export const HOUSING_HIGH = HOUSING_FILL[5];
export const FAMILIES_LOW = FAMILIES_FILL[1];
export const FAMILIES_HIGH = FAMILIES_FILL[5];
export const BORN_AU_LOW = BORN_AU_FILL[1];
export const BORN_AU_HIGH = BORN_AU_FILL[5];
export const NEUTRAL_FILL = "#B0A89C";

function quintileBands(rows: { id: string; value: number }[]): Map<string, SafetyBand> {
  const sorted = [...rows].sort((a, b) => a.value - b.value || a.id.localeCompare(b.id));
  const n = sorted.length;
  const map = new Map<string, SafetyBand>();
  sorted.forEach((row, i) => {
    const band = Math.min(5, Math.floor((i / Math.max(n, 1)) * 5) + 1) as SafetyBand;
    map.set(row.id, band);
  });
  return map;
}

/** Band 1 = most incidents (darkest). Band 5 = fewest. */
function safetyQuintileBands(rows: { id: string; value: number }[]): Map<string, SafetyBand> {
  const sorted = [...rows].sort((a, b) => b.value - a.value || a.id.localeCompare(b.id));
  const n = sorted.length;
  const map = new Map<string, SafetyBand>();
  sorted.forEach((row, i) => {
    const band = Math.min(5, Math.floor((i / Math.max(n, 1)) * 5) + 1) as SafetyBand;
    map.set(row.id, band);
  });
  return map;
}

function rateRows(pick: (s: Suburb) => number | null | undefined): { id: string; value: number }[] {
  return suburbs.flatMap((s) => {
    const value = pick(s);
    return value == null ? [] : [{ id: s.id, value }];
  });
}

const rents = suburbs.flatMap((s) =>
  s.housing?.medianWeeklyRent != null ? [{ id: s.id, value: s.housing.medianWeeklyRent }] : [],
);
const bornAu = suburbs.flatMap((s) =>
  s.backgrounds ? [{ id: s.id, value: s.backgrounds.pctBornAustralia }] : [],
);
const transitCounts = suburbs.flatMap((s) =>
  s.transit.total > 0 ? [{ id: s.id, value: s.transit.total }] : [],
);
const violenceRates = rateRows((s) => s.safety?.violencePer1000);
const propertyRates = rateRows((s) => s.safety?.propertyPer1000);
const allRates = rateRows((s) => s.safety?.allPer1000);
const domesticRates = rateRows((s) => s.safety?.domesticPer1000);

export const housingBandById = quintileBands(rents);
export const bornBandById = quintileBands(bornAu);
export const transitBandById = quintileBands(transitCounts);
export const violenceBandById = safetyQuintileBands(violenceRates);
export const propertyBandById = safetyQuintileBands(propertyRates);
export const allBandById = safetyQuintileBands(allRates);
export const domesticBandById = safetyQuintileBands(domesticRates);

const SAFETY_BANDS: Record<SafetyMetric, Map<string, SafetyBand>> = {
  all: allBandById,
  violence: violenceBandById,
  property: propertyBandById,
  domestic: domesticBandById,
};

export const rentRange = {
  min: rents.length ? Math.min(...rents.map((r) => r.value)) : 0,
  max: rents.length ? Math.max(...rents.map((r) => r.value)) : 1,
};
export const bornAuRange = {
  min: bornAu.length ? Math.min(...bornAu.map((r) => r.value)) : 0,
  max: bornAu.length ? Math.max(...bornAu.map((r) => r.value)) : 1,
};

const BAND_PROP: Record<SafetyMetric, string> = {
  all: "bandAll",
  violence: "bandViolence",
  property: "bandProperty",
  domestic: "bandDomestic",
};

function discreteFill(prop: string, fills: Record<SafetyBand, string>): ExpressionSpecification {
  return [
    "case",
    ["==", ["typeof", ["get", prop]], "number"],
    [
      "match",
      ["get", prop],
      1,
      fills[1],
      2,
      fills[2],
      3,
      fills[3],
      4,
      fills[4],
      5,
      fills[5],
      NEUTRAL_FILL,
    ],
    NEUTRAL_FILL,
  ];
}

export function fillColorExpression(
  layer: Choropleth,
  metric: SafetyMetric = "all",
): ExpressionSpecification {
  if (layer === "safety") return discreteFill(BAND_PROP[metric], SAFETY_FILL);
  if (layer === "housing") return discreteFill("rentBand", HOUSING_FILL);
  if (layer === "transit") return discreteFill("transitBand", TRANSIT_FILL);
  return discreteFill("bornBand", BORN_AU_FILL);
}

export function safetyBandLabel(band: SafetyBand): string {
  switch (band) {
    case 5:
      return "Fewer recorded incidents per 1,000 among Greater Sydney suburbs on this map";
    case 4:
      return "Below the middle among Greater Sydney suburbs on this map";
    case 3:
      return "Near the middle among Greater Sydney suburbs on this map";
    case 2:
      return "Above the middle among Greater Sydney suburbs on this map";
    case 1:
      return "More recorded incidents per 1,000 among Greater Sydney suburbs on this map";
  }
}

export function activeSafetyBand(suburb: Suburb, metric: SafetyMetric): SafetyBand | undefined {
  return SAFETY_BANDS[metric].get(suburb.id);
}

export function formatAud(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function suburbFill(
  suburb: Suburb,
  layer: Choropleth,
  metric: SafetyMetric = "all",
): string {
  if (layer === "safety") {
    const band = activeSafetyBand(suburb, metric);
    return band ? SAFETY_FILL[band] : NEUTRAL_FILL;
  }
  if (layer === "housing") {
    const band = housingBandById.get(suburb.id);
    return band ? HOUSING_FILL[band] : NEUTRAL_FILL;
  }
  if (layer === "transit") {
    const band = transitBandById.get(suburb.id);
    return band ? TRANSIT_FILL[band] : NEUTRAL_FILL;
  }
  const band = bornBandById.get(suburb.id);
  return band ? BORN_AU_FILL[band] : NEUTRAL_FILL;
}
