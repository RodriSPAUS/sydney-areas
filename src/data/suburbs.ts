/**
 * Safety = BOCSAR. Households / backgrounds = ABS Census 2021.
 * Housing = DCJ new-bond rents when present, else Census 2021 rent.
 */
import bocsarSafety from "@/data/bocsar-safety.json";
import census2021 from "@/data/census-2021.json";
import dcjHousing from "@/data/dcj-housing.json";
import polygonFc from "@/data/suburb-polygons.json";
import type { AncestryShare, BBox, SafetyCounts, Suburb } from "@/lib/suburb-types";
import { transitFor } from "@/lib/access";
import { allCount, domesticCount, propertyCount, violenceCount } from "@/lib/safety-counts";

type PolygonFeature = {
  properties: { id: string; name: string };
  bbox?: number[];
};

type BocsarRow = {
  id: string;
  summary: string;
  period12?: string;
  period6?: string;
  band?: number;
  bandStreet?: number;
  bandDwelling?: number;
  bandCombined?: number;
  bandDomestic?: number;
  last12Months?: SafetyCounts;
  last6Months?: SafetyCounts;
  population?: number | null;
  populationYear?: string;
  streetPer1000?: number | null;
  dwellingPer1000?: number | null;
  combinedPer1000?: number | null;
  domesticPer1000?: number | null;
};

type CensusRow = {
  id: string;
  medianAge?: number | null;
  pctRenting?: number | null;
  pctFamiliesWithChildren?: number | null;
  pctBornAustralia?: number | null;
  topAncestries?: AncestryShare[];
  topLanguageOther?: string;
  medianWeeklyRent2021?: number | null;
  medianMortgageMonthly2021?: number | null;
};

type DcjRow = {
  id: string;
  medianWeeklyRent?: number | null;
  medianPurchase?: number | null;
  period?: string;
  postcode?: string;
  rentNote?: string;
  bondsNote?: string;
  rent1Br?: number | null;
  rent2Br?: number | null;
  rent3Br?: number | null;
  rentHouse?: number | null;
  rentFlat?: number | null;
};

const bocsarById = new Map((bocsarSafety.suburbs as BocsarRow[]).map((row) => [row.id, row]));
const censusById = new Map((census2021.suburbs as CensusRow[]).map((row) => [row.id, row]));
const dcjById = new Map((dcjHousing.suburbs as DcjRow[]).map((row) => [row.id, row]));

function clampPersonPct(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0 || value > 100) return null;
  return value;
}

/**
 * Below this many Census 2021 usual residents a per-1,000 rate swings on a
 * handful of incidents (Barangaroo, Eastern Creek), so it is shown as counts
 * only and never ranked or coloured.
 */
export const MIN_POP = 1000;

function per1000(count: number, population: number | null | undefined): number | null {
  if (population == null || population < MIN_POP) return null;
  return Math.round((count / population) * 10000) / 10;
}

export const suburbs: Suburb[] = (
  polygonFc as unknown as { features: PolygonFeature[] }
).features.map((f) => {
  const id = f.properties.id;
  const bbox = (f.bbox && f.bbox.length === 4
    ? [f.bbox[0], f.bbox[1], f.bbox[2], f.bbox[3]]
    : [151.1, -33.9, 151.2, -33.8]) as BBox;

  const next: Suburb = {
    id,
    name: f.properties.name,
    bbox,
    transit: transitFor(id),
  };

  const safetyRow = bocsarById.get(id);
  if (safetyRow) {
    const counts = safetyRow.last12Months;
    const population = safetyRow.population;
    next.safety = {
      summary: safetyRow.summary,
      period12: safetyRow.period12,
      period6: safetyRow.period6,
      last12Months: counts,
      last6Months: safetyRow.last6Months,
      population,
      populationYear: safetyRow.populationYear,
      violencePer1000: counts ? per1000(violenceCount(counts), population) : null,
      propertyPer1000: counts ? per1000(propertyCount(counts), population) : null,
      allPer1000: counts ? per1000(allCount(counts), population) : null,
      domesticPer1000: counts ? per1000(domesticCount(counts), population) : null,
    };
  }

  const census = censusById.get(id);
  if (census) {
    const pctRenting = clampPersonPct(census.pctRenting);
    const pctFamilies = clampPersonPct(census.pctFamiliesWithChildren);
    if (census.medianAge != null && pctRenting != null && pctFamilies != null) {
      next.households = {
        medianAge: census.medianAge,
        pctRenting,
        pctFamiliesWithChildren: pctFamilies,
      };
    }
    const born = clampPersonPct(census.pctBornAustralia);
    const ancestries = (census.topAncestries ?? []).filter(
      (item) => typeof item.pct === "number" && item.pct >= 0 && item.pct <= 100,
    );
    if (born != null && ancestries.length) {
      next.backgrounds = {
        pctBornAustralia: born,
        topAncestries: ancestries,
        topLanguageOther: census.topLanguageOther || "—",
      };
    }
    if (census.medianWeeklyRent2021 != null) {
      next.housing = {
        medianWeeklyRent: census.medianWeeklyRent2021,
        medianWeeklyRent2021: census.medianWeeklyRent2021,
        medianMortgageMonthly2021: census.medianMortgageMonthly2021,
        source: "census-2021",
        period: "Census 2021",
      };
    }
  }

  const dcj = dcjById.get(id);
  if (dcj && (dcj.medianWeeklyRent != null || dcj.medianPurchase != null)) {
    next.housing = {
      ...next.housing,
      ...(dcj.medianWeeklyRent != null ? { medianWeeklyRent: dcj.medianWeeklyRent } : {}),
      ...(dcj.medianPurchase != null ? { medianPurchase: dcj.medianPurchase } : {}),
      source: dcj.medianWeeklyRent != null ? "dcj" : next.housing?.source,
      period: dcj.period ?? next.housing?.period,
      postcode: dcj.postcode,
      rentNote: dcj.bondsNote ?? dcj.rentNote,
      medianWeeklyRent2021: next.housing?.medianWeeklyRent2021 ?? census?.medianWeeklyRent2021,
      rent1Br: dcj.rent1Br ?? null,
      rent2Br: dcj.rent2Br ?? null,
      rent3Br: dcj.rent3Br ?? null,
      rentHouse: dcj.rentHouse ?? null,
      rentFlat: dcj.rentFlat ?? null,
    };
  }

  return next;
});

export const suburbsById: Record<string, Suburb> = Object.fromEntries(
  suburbs.map((s) => [s.id, s]),
);
