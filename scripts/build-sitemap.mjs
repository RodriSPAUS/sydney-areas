#!/usr/bin/env node
/**
 * Writes public/sitemap.xml: the map, /about, and one /suburb/<id> page per
 * ABS SAL polygon. Re-run after `npm run data:polygons`.
 */
import { readFileSync, writeFileSync } from "node:fs";

const SITE_URL = "https://uvicus.com";
const polygons = JSON.parse(readFileSync("src/data/suburb-polygons.json", "utf8"));
const ids = polygons.features.map((f) => f.properties.id).sort();

const urls = ["/", "/about", ...ids.map((id) => `/suburb/${encodeURIComponent(id)}`)];
const body = urls.map((path) => `  <url><loc>${SITE_URL}${path}</loc></url>`).join("\n");

writeFileSync(
  "public/sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
);
console.error(`Wrote public/sitemap.xml (${urls.length} URLs)`);
