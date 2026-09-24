import accessPlaces from "@/data/access-places.json";
import polygonFc from "@/data/suburb-polygons.json";
import type { FeatureCollection, LineString, MultiPolygon, Point, Polygon } from "geojson";

export type TransitMode = "rail" | "metro" | "lightrail" | "ferry";

export type TransitStop = {
  name: string;
  mode: TransitMode;
};

export type SuburbTransit = {
  rail: number;
  metro: number;
  lightrail: number;
  ferry: number;
  total: number;
  names: TransitStop[];
};

type Ring = number[][];
type PolyGeom = Polygon | MultiPolygon;

type IndexedPoly = {
  id: string;
  west: number;
  south: number;
  east: number;
  north: number;
  geom: PolyGeom;
};

const MODE_ORDER: Record<TransitMode, number> = { metro: 0, rail: 1, lightrail: 2, ferry: 3 };

const METRO_NAMES = new Set([
  "Tallawong",
  "Rouse Hill",
  "Kellyville",
  "Bella Vista",
  "Norwest",
  "Hills Showground",
  "Castle Hill",
  "Cherrybrook",
  "Epping",
  "Macquarie University",
  "Macquarie Park",
  "North Ryde",
  "Chatswood",
  "Crows Nest",
  "Victoria Cross",
  "Barangaroo",
  "Martin Place",
  "Gadigal",
  "Pitt Street",
  "Central",
  "Waterloo",
  "Sydenham",
]);

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

function isRawMode(value: string): value is "rail" | "lightrail" | "ferry" {
  return value === "rail" || value === "lightrail" || value === "ferry";
}

/** Metro is a named subset of rail stops. Strip only a trailing " Station". */
export function transitMode(name: string, raw: string): TransitMode | null {
  if (!isRawMode(raw)) return null;
  if (raw === "rail") {
    const base = name.endsWith(" Station") ? name.slice(0, -" Station".length) : name;
    if (METRO_NAMES.has(base)) return "metro";
  }
  return raw;
}

function ringLength(ring: Ring): number {
  const n = ring.length;
  if (n > 1 && ring[0][0] === ring[n - 1][0] && ring[0][1] === ring[n - 1][1]) return n - 1;
  return n;
}

function onSegment(
  lon: number,
  lat: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): boolean {
  const cross = (lat - y1) * (x2 - x1) - (lon - x1) * (y2 - y1);
  if (Math.abs(cross) > 1e-9) return false;
  return (
    lon >= Math.min(x1, x2) - 1e-9 &&
    lon <= Math.max(x1, x2) + 1e-9 &&
    lat >= Math.min(y1, y2) - 1e-9 &&
    lat <= Math.max(y1, y2) + 1e-9
  );
}

function onBoundary(lon: number, lat: number, ring: Ring): boolean {
  const n = ringLength(ring);
  for (let i = 0; i < n; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % n];
    if (onSegment(lon, lat, a[0], a[1], b[0], b[1])) return true;
  }
  return false;
}

function rayInside(lon: number, lat: number, ring: Ring): boolean {
  const n = ringLength(ring);
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function contains(lon: number, lat: number, geom: PolyGeom): boolean {
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  for (const poly of polys) {
    const [outer, ...holes] = poly;
    if (!onBoundary(lon, lat, outer) && !rayInside(lon, lat, outer)) continue;
    let inHole = false;
    for (const hole of holes) {
      if (!onBoundary(lon, lat, hole) && rayInside(lon, lat, hole)) {
        inHole = true;
        break;
      }
    }
    if (!inHole) return true;
  }
  return false;
}

function boundsOf(geom: PolyGeom): [number, number, number, number] {
  let west = 180;
  let south = 90;
  let east = -180;
  let north = -90;
  const walk = (c: unknown) => {
    if (Array.isArray(c) && typeof c[0] === "number") {
      west = Math.min(west, c[0] as number);
      south = Math.min(south, c[1] as number);
      east = Math.max(east, c[0] as number);
      north = Math.max(north, c[1] as number);
    } else if (Array.isArray(c)) c.forEach(walk);
  };
  walk(geom.coordinates);
  return [west, south, east, north];
}

const indexed: IndexedPoly[] = (
  polygonFc as unknown as { features: { properties: { id: string }; geometry: PolyGeom; bbox?: number[] }[] }
).features.map((f) => {
  const box =
    f.bbox && f.bbox.length === 4
      ? (f.bbox as [number, number, number, number])
      : boundsOf(f.geometry);
  return {
    id: f.properties.id,
    west: box[0],
    south: box[1],
    east: box[2],
    north: box[3],
    geom: f.geometry,
  };
});

function suburbAt(lon: number, lat: number): string | undefined {
  for (const poly of indexed) {
    if (lon < poly.west || lon > poly.east || lat < poly.south || lat > poly.north) continue;
    if (contains(lon, lat, poly.geom)) return poly.id;
  }
  return undefined;
}

const EMPTY: SuburbTransit = { rail: 0, metro: 0, lightrail: 0, ferry: 0, total: 0, names: [] };

const bySuburb = new Map<string, SuburbTransit>();

{
  const buckets = new Map<string, TransitStop[]>();
  for (const place of accessPlaces.places) {
    const mode = transitMode(place.name, place.mode);
    if (!mode) continue;
    const id = suburbAt(place.lon, place.lat);
    if (!id) continue;
    const list = buckets.get(id) ?? [];
    list.push({ name: place.name, mode });
    buckets.set(id, list);
  }
  for (const [id, names] of buckets) {
    names.sort(
      (a, b) => MODE_ORDER[a.mode] - MODE_ORDER[b.mode] || a.name.localeCompare(b.name, "en"),
    );
    let rail = 0;
    let metro = 0;
    let lightrail = 0;
    let ferry = 0;
    for (const stop of names) {
      if (stop.mode === "rail") rail += 1;
      else if (stop.mode === "metro") metro += 1;
      else if (stop.mode === "lightrail") lightrail += 1;
      else ferry += 1;
    }
    bySuburb.set(id, { rail, metro, lightrail, ferry, total: names.length, names });
  }
}

export function transitFor(id: string): SuburbTransit {
  return bySuburb.get(id) ?? EMPTY;
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
  eager: true,
  import: "default",
}) as Record<string, FeatureCollection<LineString>>;

/** Simplified GTFS shapes when src/data/transit-lines.json is present. */
export function transitLinesGeoJSON(): FeatureCollection<LineString> | null {
  const data = Object.values(lineModules)[0];
  if (!data || data.type !== "FeatureCollection" || !data.features?.length) return null;
  return data;
}
