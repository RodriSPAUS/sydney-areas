#!/usr/bin/env node
/**
 * Download ABS SAL 2021 polygons for Greater Sydney urban extent and
 * write src/data/suburb-polygons.json.
 *
 *   npm run data:polygons
 */
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SAL_URL = "https://geo.abs.gov.au/arcgis/rest/services/ASGS2021/SAL/MapServer/0/query";
const SOURCE = "ABS ASGS Edition 3, Suburbs and Localities 2021";

/** Inclusive urban envelope (lng/lat). Keep if centroid is inside, or must-include / already mapped. */
const WEST = 150.6;
const EAST = 151.35;
const SOUTH = -34.12;
const NORTH = -33.58;

const MUST_INCLUDE = [
  "Penrith",
  "St Marys",
  "Mount Druitt",
  "Blacktown",
  "Seven Hills",
  "Doonside",
  "Rooty Hill",
  "Quakers Hill",
  "Schofields",
  "Rouse Hill",
  "Castle Hill",
  "Baulkham Hills",
  "Parramatta",
  "Harris Park",
  "Granville",
  "Merrylands",
  "Guildford",
  "Auburn",
  "Lidcombe",
  "Fairfield",
  "Cabramatta",
  "Canley Vale",
  "Bonnyrigg",
  "Liverpool",
  "Casula",
  "Bankstown",
  "Punchbowl",
  "Lakemba",
  "Wiley Park",
  "Belmore",
  "Campbelltown",
  "Macquarie Fields",
  "Ingleburn",
];

const EXCLUDE_NAME = [
  /^katoomba$/i,
  /^leura$/i,
  /^wentworth falls$/i,
  /^medlow bath$/i,
  /^blackheath$/i,
  /^mount victoria$/i,
  /^blaxland$/i,
  /^glenbrook$/i,
  /^lapstone$/i,
  /^warrimoo$/i,
  /^valley heights$/i,
  /^springwood$/i,
  /^faulconbridge$/i,
  /^hazelbrook$/i,
  /^lawson$/i,
  /^wollongong$/i,
  /^gosford$/i,
  /^wyong$/i,
  /^lord howe/i,
];

const MAX_JSON_BYTES = 3 * 1024 * 1024;
const PAGE = 200;
const OFFSET_START = 0.00028;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(root, "src", "data", "suburb-polygons.json");
const cacheDir = join(root, "data", "cache");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function norm(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function foldName(name) {
  return norm(
    String(name ?? "")
      .replace(/\s*\([^)]*\)\s*/g, " ")
      .replace(/\s*-\s*NSW\b/gi, "")
      .replace(/\bst[.]?\s+/gi, "st ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function slugId(name) {
  return String(name)
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function displayName(absName, prior) {
  if (prior?.name) return prior.name;
  return String(absName).replace(/\s*\(NSW\)\s*$/i, "").trim();
}

function walkCoords(geom, fn) {
  const walk = (c) => {
    if (Array.isArray(c) && typeof c[0] === "number") fn(c);
    else if (Array.isArray(c)) c.forEach(walk);
  };
  walk(geom?.coordinates);
}

function featureBBox(geom) {
  let minX = 180,
    minY = 90,
    maxX = -180,
    maxY = -90;
  walkCoords(geom, (c) => {
    minX = Math.min(minX, c[0]);
    minY = Math.min(minY, c[1]);
    maxX = Math.max(maxX, c[0]);
    maxY = Math.max(maxY, c[1]);
  });
  return [minX, minY, maxX, maxY];
}

function centroidOf(geom) {
  let sx = 0,
    sy = 0,
    n = 0;
  walkCoords(geom, (c) => {
    sx += c[0];
    sy += c[1];
    n += 1;
  });
  if (!n) return null;
  return [sx / n, sy / n];
}

function insideEnvelope(lng, lat) {
  return lng >= WEST && lng <= EAST && lat >= SOUTH && lat <= NORTH;
}

function bboxOverlapsEnvelope(bbox) {
  const [minX, minY, maxX, maxY] = bbox;
  return minX <= EAST && maxX >= WEST && minY <= NORTH && maxY >= SOUTH;
}

function isTinyIsland(name, areaKm2) {
  if (!/\bisland\b/i.test(name)) return false;
  return !Number.isFinite(areaKm2) || areaKm2 < 3;
}

function excludedByName(name) {
  const folded = foldName(name);
  return EXCLUDE_NAME.some((re) => re.test(folded));
}

async function querySal(params) {
  const search = new URLSearchParams({
    where: "STATE_CODE_2021='1'",
    outFields: "SAL_CODE_2021,SAL_NAME_2021,AREA_ALBERS_SQKM",
    outSR: "4326",
    inSR: "4326",
    f: "geojson",
    returnGeometry: "true",
    ...params,
  });
  let res;
  try {
    res = await fetch(`${SAL_URL}?${search}`);
  } catch (err) {
    fail(`SAL download failed (${err instanceof Error ? err.message : "network error"}).`);
  }
  if (!res.ok) fail(`SAL download failed (${res.status}).`);
  const body = await res.json();
  if (body.error) fail(`SAL download failed (${body.error.message ?? "ArcGIS error"}).`);
  return body;
}

async function fetchEnvelope(maxOffset) {
  const features = [];
  let offset = 0;
  for (;;) {
    const body = await querySal({
      geometry: `${WEST},${SOUTH},${EAST},${NORTH}`,
      geometryType: "esriGeometryEnvelope",
      spatialRel: "esriSpatialRelIntersects",
      resultRecordCount: String(PAGE),
      resultOffset: String(offset),
      maxAllowableOffset: String(maxOffset),
    });
    const batch = body.features ?? [];
    features.push(...batch);
    console.error(`SAL page offset ${offset}: ${batch.length} (total ${features.length})`);
    if (!batch.length || !body.exceededTransferLimit) break;
    offset += batch.length;
    if (offset > 20000) fail("SAL download did not finish paging.");
  }
  return features;
}

async function fetchByName(name, maxOffset) {
  const folded = name.replace(/'/g, "''");
  const where = `STATE_CODE_2021='1' AND (SAL_NAME_2021='${folded}' OR SAL_NAME_2021='${folded} (NSW)' OR SAL_NAME_2021 LIKE '${folded} %')`;
  const body = await querySal({
    where,
    resultRecordCount: "20",
    maxAllowableOffset: String(maxOffset),
  });
  return body.features ?? [];
}

function loadExisting() {
  try {
    const fc = JSON.parse(readFileSync(outPath, "utf8"));
    return Array.isArray(fc.features) ? fc.features : [];
  } catch {
    return [];
  }
}

function simplifyRing(ring, eps) {
  if (!ring || ring.length <= 4 || eps <= 0) return ring;
  const sq = eps * eps;
  const dist2 = (p, a, b) => {
    const x = p[0],
      y = p[1],
      x1 = a[0],
      y1 = a[1],
      x2 = b[0],
      y2 = b[1];
    const dx = x2 - x1,
      dy = y2 - y1;
    if (dx === 0 && dy === 0) return (x - x1) ** 2 + (y - y1) ** 2;
    let t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
    t = Math.max(0, Math.min(1, t));
    const px = x1 + t * dx,
      py = y1 + t * dy;
    return (x - px) ** 2 + (y - py) ** 2;
  };
  const rec = (pts) => {
    if (pts.length <= 2) return pts;
    let maxD = 0,
      idx = 0;
    const a = pts[0],
      b = pts[pts.length - 1];
    for (let i = 1; i < pts.length - 1; i++) {
      const d = dist2(pts[i], a, b);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD < sq) return [a, b];
    const left = rec(pts.slice(0, idx + 1));
    const right = rec(pts.slice(idx));
    return left.slice(0, -1).concat(right);
  };
  const closed = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1];
  const open = closed ? ring.slice(0, -1) : ring;
  const simple = rec(open);
  if (simple.length < 3) return ring;
  if (closed) simple.push(simple[0]);
  return simple;
}

function simplifyGeom(geom, eps) {
  if (!geom) return geom;
  if (geom.type === "Polygon") {
    return { type: "Polygon", coordinates: geom.coordinates.map((r) => simplifyRing(r, eps)) };
  }
  if (geom.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geom.coordinates.map((poly) => poly.map((r) => simplifyRing(r, eps))),
    };
  }
  return geom;
}

function pickName(props) {
  return String(props.sal_name_2021 ?? props.SAL_NAME_2021 ?? "").trim();
}

function pickArea(props) {
  const n = Number(props.area_albers_sqkm ?? props.AREA_ALBERS_SQKM);
  return Number.isFinite(n) ? n : null;
}

async function main() {
  await mkdir(cacheDir, { recursive: true });
  const existing = loadExisting();
  const existingByFold = new Map();
  for (const f of existing) {
    const name = String(f.properties?.name ?? "");
    const id = String(f.properties?.id ?? "");
    if (!name || !id) continue;
    existingByFold.set(foldName(name), { id, name });
  }
  const mustFold = new Set(MUST_INCLUDE.map(foldName));

  console.error(`Fetching ABS SAL 2021 in Greater Sydney envelope (${existing.length} existing ids)`);
  let raw = await fetchEnvelope(OFFSET_START);
  const byCode = new Map();
  for (const f of raw) byCode.set(String(f.properties.sal_code_2021 ?? f.properties.SAL_CODE_2021), f);

  const presentFold = new Set(raw.map((f) => foldName(pickName(f.properties))));
  for (const name of MUST_INCLUDE) {
    if (presentFold.has(foldName(name))) continue;
    console.error(`Must-include miss in envelope, querying by name: ${name}`);
    const extra = await fetchByName(name, OFFSET_START);
    for (const f of extra) {
      const code = String(f.properties.sal_code_2021 ?? f.properties.SAL_CODE_2021);
      if (!byCode.has(code)) {
        byCode.set(code, f);
        presentFold.add(foldName(pickName(f.properties)));
      }
    }
  }

  const kept = [];
  const seenId = new Set();
  for (const f of byCode.values()) {
    const absName = pickName(f.properties);
    if (!absName || !f.geometry) continue;
    const area = pickArea(f.properties);
    const bbox = featureBBox(f.geometry);
    const c = centroidOf(f.geometry);
    const folded = foldName(absName);
    const prior = existingByFold.get(folded);
    const must = mustFold.has(folded);
    const centroidIn = c ? insideEnvelope(c[0], c[1]) : false;
    const keep =
      Boolean(prior) ||
      must ||
      centroidIn ||
      (bboxOverlapsEnvelope(bbox) && must);
    if (!keep) continue;
    if (!prior && !must && excludedByName(absName)) continue;
    if (!prior && !must && isTinyIsland(absName, area)) continue;
    if (!prior && !must && c && c[0] < WEST) continue;

    const shown = displayName(absName, prior);
    const id = prior?.id ?? slugId(shown);
    if (seenId.has(id)) {
      console.error(`Skip duplicate id ${id} (${absName})`);
      continue;
    }
    seenId.add(id);
    kept.push({
      type: "Feature",
      id,
      bbox,
      properties: { id, name: shown },
      geometry: f.geometry,
    });
  }

  for (const f of existing) {
    const id = String(f.properties?.id ?? "");
    if (!id || seenId.has(id)) continue;
    seenId.add(id);
    kept.push({
      type: "Feature",
      id,
      bbox: f.bbox ?? featureBBox(f.geometry),
      properties: { id, name: String(f.properties.name) },
      geometry: f.geometry,
    });
  }

  kept.sort((a, b) => a.properties.name.localeCompare(b.properties.name, "en"));

  const missingMust = MUST_INCLUDE.filter((n) => !kept.some((f) => foldName(f.properties.name) === foldName(n)));
  if (missingMust.length) {
    fail(`Missing required SALs after fetch: ${missingMust.join(", ")}. Do not invent polygons.`);
  }

  let eps = OFFSET_START;
  let payload = { type: "FeatureCollection", features: kept };
  let json = `${JSON.stringify(payload)}\n`;
  while (Buffer.byteLength(json) > MAX_JSON_BYTES && eps < 0.0012) {
    eps *= 1.35;
    console.error(`GeoJSON ${Buffer.byteLength(json)} bytes > 3 MB, simplifying eps=${eps.toFixed(5)}`);
    payload = {
      type: "FeatureCollection",
      features: kept.map((f) => ({
        ...f,
        geometry: simplifyGeom(f.geometry, eps),
        bbox: featureBBox(simplifyGeom(f.geometry, eps)),
      })),
    };
    json = `${JSON.stringify(payload)}\n`;
  }
  if (Buffer.byteLength(json) > MAX_JSON_BYTES) {
    fail(`suburb-polygons.json still ${Buffer.byteLength(json)} bytes after simplify. Do not ship oversized GeoJSON.`);
  }

  await writeFile(outPath, json);
  const west = Math.min(...kept.map((f) => f.bbox[0]));
  const south = Math.min(...kept.map((f) => f.bbox[1]));
  const east = Math.max(...kept.map((f) => f.bbox[2]));
  const north = Math.max(...kept.map((f) => f.bbox[3]));
  console.error(
    `Wrote ${outPath} (${kept.length} SALs, ${(Buffer.byteLength(json) / 1e6).toFixed(2)} MB, bbox ${west.toFixed(2)},${south.toFixed(2)} – ${east.toFixed(2)},${north.toFixed(2)})`,
  );
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
