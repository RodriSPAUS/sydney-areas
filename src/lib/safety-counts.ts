import type { SafetyMetric } from "@/lib/map-store";
import type { SafetyCounts } from "@/lib/suburb-types";

/** Homicide, sexual offences, non-DV assault, assault on police, robbery, theft from person. */
export function violenceCount(c: SafetyCounts): number {
  return (
    c.homicide +
    c.sexualAssault +
    c.otherSexual +
    c.assaultNonDv +
    c.assaultPolice +
    c.robbery +
    c.stealFromPerson
  );
}

/** Break-and-enter, theft from home or vehicle, stolen vehicles, malicious damage. */
export function propertyCount(c: SafetyCounts): number {
  return (
    c.breakEnterDwelling +
    c.stealFromDwelling +
    c.stealFromVehicle +
    c.motorVehicleTheft +
    c.maliciousDamage
  );
}

export function domesticCount(c: SafetyCounts): number {
  return c.assaultDv;
}

/** Violence + property. Not domestic. Not retail. */
export function allCount(c: SafetyCounts): number {
  return violenceCount(c) + propertyCount(c);
}

export function metricCount(c: SafetyCounts, metric: SafetyMetric): number {
  if (metric === "violence") return violenceCount(c);
  if (metric === "property") return propertyCount(c);
  if (metric === "domestic") return domesticCount(c);
  return allCount(c);
}

/**
 * City-centre SALs where daytime population dwarfs usual residents. Kept to the
 * CBD core on purpose: a longer list would be our opinion, not the data's.
 */
export const VISITOR_HUB_IDS: ReadonlySet<string> = new Set([
  "sydney",
  "haymarket",
  "the-rocks-sydney-nsw",
  "barangaroo",
  "millers-point",
  "dawes-point",
]);
