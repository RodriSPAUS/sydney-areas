/**
 * Pure helpers behind src/data/suburb-community.json. Column classification
 * works from the DataPack headers the script actually reads, not from a fixed
 * list: a table's categories are whatever `<prefix><key><suffix>` columns it
 * has, and the English-proficiency parts of each language are whatever other
 * `POL_<key>_…` columns sit next to its `_Tot` column.
 *
 * Header families this relies on are the ones scripts/fetch-census-2021.mjs
 * already reads from the same DataPack: `POL_<lang>_Tot` (G13),
 * `P_<country>_Tot` (G09) and `<ancestry>_Tot_resp` (G08).
 */

export type Share = { count: number | null; pct: number | null };

/**
 * Keys that are not a single real category: totals and subtotals, "not
 * stated", "inadequately described" / "not further defined", and residual
 * catch-alls ("Other", "Born elsewhere", "Uses other language and speaks
 * English" umbrella columns).
 */
export function isExcludedKey(key: string): boolean {
  const tokens = key.split("_");
  const last = tokens[tokens.length - 1] ?? "";
  if (tokens.some((t) => /^tot$/i.test(t))) return true;
  if (/^(oth|other)$/i.test(last) || /^other$/i.test(tokens[0] ?? "")) return true;
  if (tokens.some((t) => /^(ns|nfd|inad|inadequately|inadeq)$/i.test(t))) return true;
  if (/not_?stated|inadequate|not_?further|elsewhere/i.test(key)) return true;
  if (/UOLSE|SEO/.test(key)) return true;
  return false;
}

export type LanguageColumns = {
  /** language key → the proficiency columns summed for it (falls back to [total]). */
  parts: Map<string, string[]>;
  /** language key → its published `_Tot` column, for the reconciliation report. */
  totals: Map<string, string>;
};

/**
 * G13: every `POL_<key>_Tot` is one language; its parts are the other
 * `POL_<key>_<part>` columns, matched on the longest known key so a key that
 * contains underscores (`CL_Mandarin`) is not cut short. A language with no
 * part columns falls back to its total.
 */
export function languageColumns(headers: string[]): LanguageColumns {
  const totals = new Map<string, string>();
  for (const h of headers) {
    const m = h.match(/^POL_(.+)_Tot$/);
    if (m && !isExcludedKey(m[1])) totals.set(m[1], h);
  }
  const keysLongestFirst = [...totals.keys()].sort((a, b) => b.length - a.length);
  const parts = new Map<string, string[]>();
  for (const h of headers) {
    if (!h.startsWith("POL_") || h.endsWith("_Tot")) continue;
    const key = keysLongestFirst.find((k) => h.startsWith(`POL_${k}_`));
    if (!key) continue;
    const list = parts.get(key) ?? [];
    list.push(h);
    parts.set(key, list);
  }
  for (const [key, total] of totals) if (!parts.has(key)) parts.set(key, [total]);
  return { parts, totals };
}

/** `<prefix><key><suffix>` columns as key → column, minus excluded keys. */
export function simpleColumns(headers: string[], prefix: string, suffix: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const h of headers) {
    if (!h.startsWith(prefix) || !h.endsWith(suffix)) continue;
    const key = h.slice(prefix.length, h.length - suffix.length);
    if (!key || isExcludedKey(key)) continue;
    out.set(key, h);
  }
  return out;
}

/** Sum of the parts; null only when every part is missing. */
export function sumParts(row: Record<string, number | null | undefined>, cols: string[]): number | null {
  let total = 0;
  let any = false;
  for (const c of cols) {
    const v = row[c];
    if (typeof v === "number" && Number.isFinite(v)) {
      total += v;
      any = true;
    }
  }
  return any ? total : null;
}

/** The `n` keys with the largest totals, ties broken by key. */
export function topKeys(totals: Map<string, number>, n: number): string[] {
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([k]) => k);
}

/** { count, pct } with pct = count / denominator × 100 to one decimal. */
export function share(count: number | null, denominator: number | null | undefined): Share {
  if (count == null) return { count: null, pct: null };
  if (denominator == null || !(denominator > 0)) return { count, pct: null };
  return { count, pct: Math.round((count / denominator) * 1000) / 10 };
}

/** Words that describe a DataPack cell's structure, not the category itself. */
const STRUCTURE =
  /\b(persons?|males?|females?|total|tot|responses?|count of|number of|language used at home|language spoken at home|uses other language and speaks english|speaks other language|speaks english|proficiency in english|country of birth( of person)?|birthplace|ancestry|born in)\b/gi;

/**
 * A readable category name from an ABS long column name, e.g.
 * "Persons_Chinese_languages_Mandarin_Total" → "Mandarin",
 * "Australian_Aboriginal_Total_responses" → "Australian Aboriginal".
 * Null when nothing readable is left.
 */
export function labelFromLong(long: string | null | undefined): string | null {
  if (!long) return null;
  let text = long.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  // Group-prefixed languages: "Chinese languages Mandarin" → "Mandarin".
  const grouped = text.match(/\blanguages\s+(.+)$/i);
  if (grouped && !/\blanguages$/i.test(text)) text = grouped[1];
  text = text.replace(STRUCTURE, " ").replace(/\s+/g, " ").replace(/^[\s,:-]+|[\s,:-]+$/g, "");
  if (!text || /\d/.test(text)) return null;
  return text;
}

/**
 * True when a label still reads like a DataPack short header ("CL_Mandarin",
 * "Sth_Africa", "Aust", "POL_Spanish_Tot") rather than a name a person uses.
 */
export function looksLikeShortCode(label: string | null | undefined): boolean {
  if (!label || !label.trim()) return true;
  if (/_/.test(label)) return true;
  if (/^[A-Z]{2,5}$/.test(label)) return true;
  return /\b(Tot|NS|nfd|resp|POL|SOL|Aust|Sth|Nth|Oth|Eng|Lang|Cntry|Abor|Stat|Ch|Ctry)\b/.test(label);
}
