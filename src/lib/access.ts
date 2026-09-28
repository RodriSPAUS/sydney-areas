import accessPlaces from "@/data/access-places.json";
import polygonFc from "@/data/suburb-polygons.json";
import {
  computeSuburbTransit,
  EMPTY_TRANSIT,
  transitMode,
  type PolygonFeatureLike,
  type SuburbTransit,
  type TransitMode,
} from "@/lib/transit-coverage";
import type { FeatureCollection, LineString, Point } from "geojson";

export type { SuburbTransit, TransitMode, TransitStop } from "@/lib/transit-coverage";
export { transitMode } from "@/lib/transit-coverage";

export const TRANSIT_MODE_COLOR: Record<TransitMode, string> = {
  rail: "#1C1917",
  metro: "#DB2777",
  lightrail: "#C2410C",
  ferry: "#0369A1",
};

export const TRANSIT_MODE_LABEL: Record<TransitMode, string> = {
  metro: "Metro",
  rail: "Rail",
  lightrail: "Light rail",
  ferry: "Ferry",
};

const bySuburb = computeSuburbTransit(
  (polygonFc as unknown as { features: PolygonFeatureLike[] }).features,
  accessPlaces.places,
);

export function transitFor(id: string): SuburbTransit {
  return bySuburb.get(id) ?? EMPTY_TRANSIT;
}

export function transitPointsGeoJSON(): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: accessPlaces.places.flatMap((place) => {
      const mode = transitMode(place.name, place.mode);
      if (!mode) return [];
      return [
        {
          type: "Feature" as const,
          properties: { name: place.name, mode },
          geometry: { type: "Point" as const, coordinates: [place.lon, place.lat] },
        },
      ];
    }),
  };
}

const lineModules = import.meta.glob("../data/transit-lines.json", {
  import: "default",
}) as Record<string, () => Promise<FeatureCollection<LineString>>>;

let linesPromise: Promise<FeatureCollection<LineString> | null> | undefined;

/**
 * Simplified GTFS shapes when src/data/transit-lines.json is present. ~1 MB,
 * so it is its own chunk and only fetched the first time Transit is shown.
 */
export function loadTransitLines(): Promise<FeatureCollection<LineString> | null> {
  const load = Object.values(lineModules)[0];
  if (!load) return Promise.resolve(null);
  linesPromise ??= load()
    .then((data) =>
      data && data.type === "FeatureCollection" && data.features?.length ? data : null,
    )
    .catch(() => {
      linesPromise = undefined;
      return null;
    });
  return linesPromise;
}
