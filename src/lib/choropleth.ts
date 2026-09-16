import type { ExpressionSpecification } from "maplibre-gl";
import { suburbs } from "@/data/suburbs";
import type { Choropleth } from "@/lib/map-store";
import type { SafetyBand, Suburb } from "@/lib/suburb-types";

/** Cartographic fills — muted, not alarm colours. */
export const SAFETY_FILL: Record<SafetyBand, string> = {
  1: "#C45C4A",
  2: "#D07A3F",
  3: "#D4A017",
  4: "#8BA85A",
  5: "#3B7D58",
};

export const HOUSING_LOW = "#D6E2EA";
export const HOUSING_HIGH = "#2C4A5E";
export const FAMILIES_LOW = "#EDE6D9";
export const FAMILIES_HIGH = "#6B5344";
export const BORN_AU_LOW = "#D7EDEA";
export const BORN_AU_HIGH = "#0F5F59";

const rents = suburbs.map((s) => s.housing.medianWeeklyRent);
const families = suburbs.map((s) => s.households.pctFamiliesWithChildren);
const bornAu = suburbs.map((s) => s.backgrounds.pctBornAustralia);

export const rentRange = { min: Math.min(...rents), max: Math.max(...rents) };
export const familyRange = {
  min: Math.min(...families),
  max: Math.max(...families),
};
export const bornAuRange = { min: Math.min(...bornAu), max: Math.max(...bornAu) };

export function fillColorExpression(layer: Choropleth): ExpressionSpecification {
  if (layer === "safety") {
    return [
      "match",
      ["get", "safetyBand"],
      1,
      SAFETY_FILL[1],
      2,
      SAFETY_FILL[2],
      3,
      SAFETY_FILL[3],
      4,
      SAFETY_FILL[4],
      5,
      SAFETY_FILL[5],
      "#B0A89C",
    ];
  }
  if (layer === "housing") {
    return [
      "interpolate",
      ["linear"],
      ["get", "rent"],
      rentRange.min,
      HOUSING_LOW,
      rentRange.max,
      HOUSING_HIGH,
    ];
  }
  if (layer === "households") {
    return [
      "interpolate",
      ["linear"],
      ["get", "families"],
      familyRange.min,
      FAMILIES_LOW,
      familyRange.max,
      FAMILIES_HIGH,
    ];
  }
  return [
    "interpolate",
    ["linear"],
    ["get", "bornAu"],
    bornAuRange.min,
    BORN_AU_LOW,
    bornAuRange.max,
    BORN_AU_HIGH,
  ];
}

export function safetyBandLabel(band: SafetyBand): string {
  switch (band) {
    case 5:
      return "Fewer incidents per capita";
    case 4:
      return "Below the Sydney median";
    case 3:
      return "Near the Sydney median";
    case 2:
      return "Above the Sydney median";
    case 1:
      return "More incidents per capita";
  }
}

export function formatAud(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function mixHex(a: string, b: string, t: number): string {
  const p = Math.min(1, Math.max(0, t));
  const parse = (h: string) => {
    const n = parseInt(h.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${hex(Math.round(ar + (br - ar) * p))}${hex(Math.round(ag + (bg - ag) * p))}${hex(Math.round(ab + (bb - ab) * p))}`;
}

export function suburbFill(suburb: Suburb, layer: Choropleth): string {
  if (layer === "safety") return SAFETY_FILL[suburb.safety.band];
  if (layer === "housing") {
    const t =
      rentRange.max === rentRange.min
        ? 0.5
        : (suburb.housing.medianWeeklyRent - rentRange.min) / (rentRange.max - rentRange.min);
    return mixHex(HOUSING_LOW, HOUSING_HIGH, t);
  }
  if (layer === "households") {
    const t =
      familyRange.max === familyRange.min
        ? 0.5
        : (suburb.households.pctFamiliesWithChildren - familyRange.min) /
          (familyRange.max - familyRange.min);
    return mixHex(FAMILIES_LOW, FAMILIES_HIGH, t);
  }
  const t =
    bornAuRange.max === bornAuRange.min
      ? 0.5
      : (suburb.backgrounds.pctBornAustralia - bornAuRange.min) / (bornAuRange.max - bornAuRange.min);
  return mixHex(BORN_AU_LOW, BORN_AU_HIGH, t);
}
