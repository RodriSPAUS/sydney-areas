/**
 * Pure helpers behind src/data/suburb-metrics.json (scripts/build-suburb-metrics.mjs).
 * No I/O and no `@/` value imports, so Node can load it with
 * --experimental-strip-types and the tests need no fixtures on disk.
 */
import type { MultiPolygon, Polygon } from "geojson";

/** Sydney GPO, 1 Martin Place. */
export const SYDNEY_GPO = { lat: -33.8676, lon: 151.207 } as const;

const EARTH_RADIUS_KM = 6371.0088;

/** Great-circle distance in km. */
export function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Shoelace area and centroid, relative to `origin` to keep precision at lon ≈ 151. */
function ringAreaCentroid(
  ring: number[][],
  origin: number[],
): { area: number; x: number; y: number } {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0] - origin[0];
    const yi = ring[i][1] - origin[1];
    const xj = ring[j][0] - origin[0];
    const yj = ring[j][1] - origin[1];
    const cross = xj * yi - xi * yj;
    a += cross;
    cx += (xj + xi) * cross;
    cy += (yj + yi) * cross;
  }
  a /= 2;
  if (a === 0) return { area: 0, x: 0, y: 0 };
  return { area: Math.abs(a), x: cx / (6 * a), y: cy / (6 * a) };
}

/**
 * Area-weighted centroid of every part of a (Multi)Polygon, holes subtracted.
 * Planar in lon/lat: at suburb scale the error is metres, and scaling lon by
 * cos(lat) is affine, so it would not move the centroid anyway.
 */
export function polygonCentroid(geom: Polygon | MultiPolygon): { lat: number; lon: number } | null {
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  const origin = polys[0]?.[0]?.[0];
  if (!origin) return null;
  let area = 0;
  let x = 0;
  let y = 0;
  for (const [outer, ...holes] of polys) {
    if (!outer?.length) continue;
    const o = ringAreaCentroid(outer, origin);
    area += o.area;
    x += o.x * o.area;
    y += o.y * o.area;
    for (const hole of holes) {
      const h = ringAreaCentroid(hole, origin);
      area -= h.area;
      x -= h.x * h.area;
      y -= h.y * h.area;
    }
  }
  if (!(area > 0)) return null;
  return { lon: origin[0] + x / area, lat: origin[1] + y / area };
}

/** Straight-line km from the centroid to Sydney GPO, rounded to 0.1. */
export function gpoDistanceKm(geom: Polygon | MultiPolygon): number | null {
  const c = polygonCentroid(geom);
  if (!c) return null;
  return Math.round(haversineKm(c, SYDNEY_GPO) * 10) / 10;
}

/**
 * 0–100 percentile among the rows given (callers pass only suburbs with data).
 * Mid-rank for ties: (strictly lower + (ties − 1) / 2) / (n − 1), so the lowest
 * value is 0, the highest is 100, equal values share one percentile, and a
 * high percentile always means a high value. One row alone gets 50.
 */
export function percentiles(rows: { id: string; value: number }[]): Map<string, number> {
  const out = new Map<string, number>();
  const n = rows.length;
  if (n === 0) return out;
  if (n === 1) {
    out.set(rows[0].id, 50);
    return out;
  }
  const sorted = [...rows].sort((a, b) => a.value - b.value);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && sorted[j + 1].value === sorted[i].value) j += 1;
    const ties = j - i + 1;
    const pct = Math.round(((i + (ties - 1) / 2) / (n - 1)) * 100);
    for (let k = i; k <= j; k++) out.set(sorted[k].id, pct);
    i = j + 1;
  }
  return out;
}

export type DcjRentRow = {
  postcode?: string | null;
  medianWeeklyRent?: number | null;
  rent1Br?: number | null;
  rent2Br?: number | null;
  rent3Br?: number | null;
  rentHouse?: number | null;
  rentFlat?: number | null;
};

export type ResolvedRent = {
  rent: {
    all: number | null;
    bed1: number | null;
    bed2: number | null;
    bed3: number | null;
    house: number | null;
    flat: number | null;
  };
  rentSource: "dcj" | "census" | null;
  rentPostcode: string | null;
};

const num = (v: number | null | undefined): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/**
 * Same rule as the app (src/data/suburbs.ts): the DCJ all-dwellings median
 * when published, else the Census 2021 median rent. Bedroom and dwelling-type
 * medians only ever come from DCJ; there is no Census fallback for them.
 */
export function resolveRent(
  dcj: DcjRentRow | null | undefined,
  censusRent2021: number | null | undefined,
): ResolvedRent {
  const dcjAll = num(dcj?.medianWeeklyRent);
  const census = num(censusRent2021);
  const all = dcjAll ?? (census != null && census > 0 ? census : null);
  return {
    rent: {
      all,
      bed1: num(dcj?.rent1Br),
      bed2: num(dcj?.rent2Br),
      bed3: num(dcj?.rent3Br),
      house: num(dcj?.rentHouse),
      flat: num(dcj?.rentFlat),
    },
    rentSource: dcjAll != null ? "dcj" : all != null ? "census" : null,
    rentPostcode: dcj?.postcode ?? null,
  };
}

/** How many mapped suburbs use each postcode. */
export function postcodeCounts(postcodes: (string | null | undefined)[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const pc of postcodes) if (pc) out.set(pc, (out.get(pc) ?? 0) + 1);
  return out;
}

/** A 0–100 person share, or null when missing or out of range (as the app does). */
export function personPct(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0 || value > 100) return null;
  return value;
}
