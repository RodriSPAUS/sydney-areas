export type SafetyBand = 1 | 2 | 3 | 4 | 5;

export type AncestryShare = {
  name: string;
  pct: number;
};

/** Bounding box: [minLng, minLat, maxLng, maxLat] */
export type BBox = [number, number, number, number];

export type SafetyCounts = {
  homicide: number;
  sexualAssault: number;
  otherSexual: number;
  assaultNonDv: number;
  assaultPolice: number;
  assaultDv: number;
  robbery: number;
  stealFromPerson: number;
  breakEnterDwelling: number;
  stealFromDwelling: number;
  stealFromVehicle: number;
  motorVehicleTheft: number;
  maliciousDamage: number;
  stealRetail: number;
};

export type Suburb = {
  id: string;
  name: string;
  bbox: BBox;
  safety?: {
    period12?: string;
    last12Months?: SafetyCounts;
    population?: number | null;
    populationYear?: string;
    violencePer1000?: number | null;
    propertyPer1000?: number | null;
    allPer1000?: number | null;
    domesticPer1000?: number | null;
  };
  housing?: {
    medianWeeklyRent?: number;
    medianPurchase?: number;
    medianWeeklyRent2021?: number | null;
    medianMortgageMonthly2021?: number | null;
    source?: "dcj" | "census-2021";
    period?: string;
    postcode?: string;
    rentNote?: string;
    rent1Br?: number | null;
    rent2Br?: number | null;
    rent3Br?: number | null;
    rentHouse?: number | null;
    rentFlat?: number | null;
  };
  households?: {
    medianAge: number;
    pctRenting: number;
    pctFamiliesWithChildren: number;
  };
  backgrounds?: {
    pctBornAustralia: number;
    topAncestries: AncestryShare[];
    topLanguageOther: string;
  };
  transit: {
    rail: number;
    metro: number;
    lightrail: number;
    ferry: number;
    total: number;
    walkPct: number;
    modesNearby: ("rail" | "metro" | "lightrail" | "ferry")[];
    names: { name: string; mode: "rail" | "metro" | "lightrail" | "ferry" }[];
  };
};
