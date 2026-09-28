import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isExcludedKey,
  labelFromLong,
  languageColumns,
  looksLikeShortCode,
  share,
  simpleColumns,
  sumParts,
  topKeys,
} from "./community-derive.ts";

// Illustrative headers in the families the existing census script reads.
// The proficiency suffixes are made up on purpose: the code must not care.
const G13 = [
  "SAL_CODE_2021",
  "POL_Arabic_A",
  "POL_Arabic_B",
  "POL_Arabic_NS",
  "POL_Arabic_Tot",
  "POL_CL_Mandarin_A",
  "POL_CL_Mandarin_B",
  "POL_CL_Mandarin_NS",
  "POL_CL_Mandarin_Tot",
  "POL_CL_Tot_Tot",
  "POL_CL_Oth_Tot",
  "POL_Tamil_Tot",
  "POL_Tot_Tot",
  "P_Tot_Tot",
];

test("language: each language sums its proficiency columns", () => {
  const { parts, totals } = languageColumns(G13);
  assert.deepEqual(parts.get("Arabic"), ["POL_Arabic_A", "POL_Arabic_B", "POL_Arabic_NS"]);
  assert.deepEqual(parts.get("CL_Mandarin"), ["POL_CL_Mandarin_A", "POL_CL_Mandarin_B", "POL_CL_Mandarin_NS"]);
  assert.equal(totals.get("Arabic"), "POL_Arabic_Tot");
  const row = { POL_Arabic_A: 120, POL_Arabic_B: 30, POL_Arabic_NS: 3, POL_Arabic_Tot: 150 };
  assert.equal(sumParts(row, parts.get("Arabic") ?? []), 153);
});

test("language: subtotals and catch-alls are not languages; no parts falls back to the total", () => {
  const { parts } = languageColumns(G13);
  assert.equal(parts.has("CL_Tot"), false);
  assert.equal(parts.has("CL_Oth"), false);
  assert.equal(parts.has("Tot"), false);
  assert.deepEqual(parts.get("Tamil"), ["POL_Tamil_Tot"]);
  assert.deepEqual([...parts.keys()].sort(), ["Arabic", "CL_Mandarin", "Tamil"]);
});

test("sumParts: null only when every part is missing", () => {
  assert.equal(sumParts({ a: null, b: undefined }, ["a", "b"]), null);
  assert.equal(sumParts({ a: 0, b: null }, ["a", "b"]), 0);
});

test("country of birth and ancestry columns", () => {
  const g09 = simpleColumns(
    ["P_Australia_Tot", "P_England_Tot", "P_Elsewhere_Tot", "P_COB_NS_Tot", "P_Tot_Tot", "M_Australia_Tot", "P_Australia_0_4"],
    "P_",
    "_Tot",
  );
  assert.deepEqual([...g09.keys()], ["Australia", "England"]);
  const g08 = simpleColumns(["Aust_Tot_resp", "Chinese_Tot_resp", "Ancestry_NS_Tot_resp", "Other_Tot_resp", "Tot_P_Tot_resp"], "", "_Tot_resp");
  assert.deepEqual([...g08.keys()], ["Aust", "Chinese"]);
});

test("exclusions", () => {
  for (const k of ["Tot", "CL_Tot", "Oth", "IAL_Oth", "Other", "COB_NS", "Lang_NS", "Chinese_nfd", "Inadequately_described", "UOLSE_Tot", "Elsewhere"]) {
    assert.equal(isExcludedKey(k), true, k);
  }
  for (const k of ["Arabic", "CL_Mandarin", "Sth_African", "Australia", "NZ", "Aust_Abor", "Tongan"]) {
    assert.equal(isExcludedKey(k), false, k);
  }
});

test("top keys by Greater Sydney total, ties by key", () => {
  const totals = new Map([
    ["b", 5],
    ["a", 5],
    ["c", 9],
    ["d", 1],
  ]);
  assert.deepEqual(topKeys(totals, 3), ["c", "a", "b"]);
});

test("share: pct to one decimal; null semantics", () => {
  assert.deepEqual(share(37, 1200), { count: 37, pct: 3.1 });
  assert.deepEqual(share(null, 1200), { count: null, pct: null });
  assert.deepEqual(share(4, 0), { count: 4, pct: null });
});

test("labels from ABS long column names", () => {
  assert.equal(labelFromLong("Persons_Chinese_languages_Mandarin_Total"), "Mandarin");
  assert.equal(labelFromLong("Australian_Aboriginal_Total_responses"), "Australian Aboriginal");
  assert.equal(labelFromLong("Persons_Colombia_Total"), "Colombia");
  assert.equal(labelFromLong("Spanish_Persons_Total"), "Spanish");
  assert.equal(labelFromLong("Persons_Total"), null);
  assert.equal(labelFromLong(null), null);
});

test("short-code labels are caught, real names pass", () => {
  for (const bad of ["CL_Mandarin", "Aust", "Sth Africa", "POL Spanish Tot", "NZ", "", null]) {
    assert.equal(looksLikeShortCode(bad), true, String(bad));
  }
  for (const ok of ["Spanish", "Colombia", "Vietnamese", "New Zealand", "Australian Aboriginal", "Thai", "Fiji"]) {
    assert.equal(looksLikeShortCode(ok), false, ok);
  }
});
