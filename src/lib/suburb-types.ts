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
  assaultNonDv: number;
  assaultDv: number;
  breakEnterDwelling: number;
  stealFromDwelling: number;
  stealFromVehicle: number;
  motorVehicleTheft: number;
  robbery: number;
  maliciousDamage: number;
  stealRetail: number;
};

export type Suburb = {
  id: string;
  name: string;
  bbox: BBox;
  safety?: {
    band?: SafetyBand;
    summary: string;
    period12?: string;
    period6?: string;
    last12Months?: SafetyCounts;
    last6Months?: SafetyCounts;
    population?: number | null;
    populationYear?: string;
    housingPer1000?: number | null;
    streetPer1000?: number | null;
  };
  housing?: {
    medianWeeklyRent: number;
    medianPurchase: number;
  };
  households?: {
    medianAge: number;
    pctRenting: number;
    pctFamiliesWithChildren: number;
  };
  backgrounds?: {
    pctBornAustralia: number;
    topAncestries: [AncestryShare, AncestryShare, AncestryShare];
    topLanguageOther: string;
  };
  services: ServicePin[];
};
