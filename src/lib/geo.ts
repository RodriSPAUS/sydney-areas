import type { Feature, FeatureCollection, MultiPolygon, Point, Polygon } from "geojson";
import polygonFc from "@/data/suburb-polygons.json";
import { suburbs, suburbsById } from "@/data/suburbs";
import type { BBox, Suburb } from "@/lib/suburb-types";

type PolyGeom = Polygon | MultiPolygon;
type PolyProps = { id: string; name: string };

const polygonCollection = polygonFc as unknown as FeatureCollection<PolyGeom, PolyProps>;

const polygonById = new Map(polygonCollection.features.map((f) => [f.properties.id, f]));

export function suburbGeometry(id: string): PolyGeom | undefined {
  return polygonById.get(id)?.geometry;
}

export function featureBBox(id: string): BBox | undefined {
  const f = polygonById.get(id);
  if (!f) return undefined;
  if (f.bbox && f.bbox.length === 4) {
    return [f.bbox[0], f.bbox[1], f.bbox[2], f.bbox[3]];
  }
  let minX = 180,
    minY = 90,
    maxX = -180,
    maxY = -90;
  const walk = (c: unknown) => {
    if (Array.isArray(c) && typeof c[0] === "number") {
      minX = Math.min(minX, c[0] as number);
      minY = Math.min(minY, c[1] as number);
      maxX = Math.max(maxX, c[0] as number);
      maxY = Math.max(maxY, c[1] as number);
    } else if (Array.isArray(c)) c.forEach(walk);
  };
  walk(f.geometry.coordinates);
  return [minX, minY, maxX, maxY];
}

export function projectGeometry(
  geom: PolyGeom,
  project: (lng: number, lat: number) => { x: number; y: number },
): string {
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  return polys
    .flatMap((rings) =>
      rings.map((ring) => {
        const pts = ring.map(([lng, lat], i) => {
          const p = project(lng, lat);
          return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
        });
        return `${pts.join(" ")} Z`;
      }),
    )
    .join(" ");
}

function propsFor(id: string, name: string, suburb?: Suburb) {
  return {
    id,
    name: suburb?.name ?? name,
    safetyBand: suburb?.safety?.bandCombined ?? suburb?.safety?.band ?? null,
    bandStreet: suburb?.safety?.bandStreet ?? null,
    bandDwelling: suburb?.safety?.bandDwelling ?? null,
    bandDomestic: suburb?.safety?.bandDomestic ?? null,
    rent: suburb?.housing?.medianWeeklyRent ?? null,
    families: suburb?.households?.pctFamiliesWithChildren ?? null,
    bornAu: suburb?.backgrounds?.pctBornAustralia ?? null,
    topAncestry: suburb?.backgrounds?.topAncestries[0]?.name ?? "",
    hasFigures:
      suburb?.safety?.band || suburb?.safety?.bandCombined || suburb?.safety?.bandStreet
        ? 1
        : 0,
  };
}

export function suburbFeature(suburb: Suburb, _index?: number): Feature<PolyGeom> {
  const geometry = suburbGeometry(suburb.id) ?? {
    type: "Polygon" as const,
    coordinates: [],
  };
  return {
    type: "Feature",
    id: suburb.id,
    properties: propsFor(suburb.id, suburb.name, suburb),
    geometry,
  };
}

export function suburbsGeoJSON(): FeatureCollection<PolyGeom> {
  return {
    type: "FeatureCollection",
    features: polygonCollection.features.map((f) => ({
      type: "Feature" as const,
      id: f.properties.id,
      properties: propsFor(f.properties.id, f.properties.name, suburbsById[f.properties.id]),
      geometry: f.geometry,
    })),
  };
}

export function servicesGeoJSON(): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: suburbs.flatMap((suburb) =>
      suburb.services.map((pin, i) => ({
        type: "Feature" as const,
        id: `${suburb.id}-${i}`,
        properties: {
          suburbId: suburb.id,
          type: pin.type,
          name: pin.name,
          label: pin.type === "hospital" ? "H" : pin.type === "school" ? "S" : "T",
        },
        geometry: { type: "Point" as const, coordinates: [pin.lng, pin.lat] },
      })),
    ),
  };
}

export function bboxCorners(bbox: BBox): [[number, number], [number, number]] {
  const [west, south, east, north] = bbox;
  return [
    [west, south],
    [east, north],
  ];
}

export function isDesktop(): boolean {
  return window.matchMedia("(min-width: 768px)").matches;
}

export function fitPadding(sheetOpen: boolean): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  const w = Math.max(typeof window === "undefined" ? 390 : window.innerWidth, 1);
  const h = Math.max(typeof window === "undefined" ? 640 : window.innerHeight, 1);
  const desktop = w >= 768;
  const top = Math.min(136, Math.round(h * 0.2));
  let bottom = sheetOpen
    ? desktop
      ? Math.min(88, Math.round(h * 0.14))
      : Math.round(h * 0.48)
    : Math.min(112, Math.round(h * 0.16));
  const left = 16;
  let right = desktop && sheetOpen ? Math.min(372, Math.round(w * 0.38)) : 16;
  if (h - top - bottom < 90) bottom = Math.max(0, h - top - 90);
  if (w - left - right < 90) right = Math.max(0, w - left - 90);
  return { top, bottom, left, right };
}

export const suburbPolygonCount = polygonCollection.features.length;
