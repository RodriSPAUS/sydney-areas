export type SafetyBand = 1 | 2 | 3 | 4 | 5;

export type ServiceType = "hospital" | "school" | "station";

export type AncestryShare = {
  name: string;
  pct: number;
};

export type ServicePin = {
  type: ServiceType;
  name: string;
  lng: number;
  lat: number;
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
    band?: SafetyBand;
    bandStreet?: SafetyBand;
    bandDwelling?: SafetyBand;
    bandCombined?: SafetyBand;
    bandDomestic?: SafetyBand;
    summary: string;
    period12?: string;
    period6?: string;
    last12Months?: SafetyCounts;
    last6Months?: SafetyCounts;
    population?: number | null;
    populationYear?: string;
    streetPer1000?: number | null;
    dwellingPer1000?: number | null;
    combinedPer1000?: number | null;
    domesticPer1000?: number | null;
    housingPer1000?: number | null;
    harmPer1000?: number | null;
    harmScore?: number;
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
  services: ServicePin[];
};
