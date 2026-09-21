import type { SafetyMetric } from "@/lib/map-store";
import type { SafetyCounts } from "@/lib/suburb-types";

/** Street metric: non-DV assault, robbery, theft from / of vehicles. */
export function streetCount(c: SafetyCounts): number {
  return c.assaultNonDv + c.robbery + c.stealFromVehicle + c.motorVehicleTheft;
}

/** Homes metric: break-and-enter and theft from dwelling. */
export function dwellingCount(c: SafetyCounts): number {
  return c.breakEnterDwelling + c.stealFromDwelling;
}

export function combinedCount(c: SafetyCounts): number {
  return streetCount(c) + dwellingCount(c);
}

export function metricCount(c: SafetyCounts, metric: SafetyMetric): number {
  if (metric === "street") return streetCount(c);
  if (metric === "dwelling") return dwellingCount(c);
  if (metric === "domestic") return c.assaultDv;
  return combinedCount(c);
}
