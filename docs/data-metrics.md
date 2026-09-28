---
type: reference
title: Uvicus derived metrics
description: Field definitions for suburb-metrics.json and suburb-community.json
status: draft
generated: { by: "claude/claude-code", at: "2026-09-28" }
---

# Uvicus derived metrics

Two derived files feed the filter screen. Both are built by
`npm run data:metrics` (`scripts/build-suburb-metrics.mjs`) and checked by
`npm run data:check`. Types: `src/lib/suburb-metrics-types.ts`.

| File | Contents | Loaded |
|---|---|---|
| `src/data/suburb-metrics.json` | One filter-ready record per mapped suburb | With the filter screen |
| `src/data/suburb-community.json` | Census 2021 language, ancestry, country of birth shares | Lazily, kept separate for size |

`data:metrics` reads only the generated JSON in `src/data/` and files already in
`data/cache/`. It never downloads anything.

- Safety rates and bands come from `src/lib/safety-metrics.ts`, the module the
  app uses. `data:check` recomputes them from `bocsar-safety.json` and fails if
  any value differs.
- Transit coverage comes from `src/lib/transit-coverage.ts`, which is also what
  `src/lib/access.ts` calls.
- Rent follows the same DCJ-then-Census rule as `src/data/suburbs.ts`.

**Null means the value is not published or can't be derived. It never means
zero.** A real zero (0 incidents, 0% coverage) is written as `0`.

## Refresh

| Where | What happens |
|---|---|
| Monthly GitHub Action | Runs after BOCSAR, DCJ and the sitemap, and before `data:check`. `suburb-metrics.json` goes into the same `data/refresh` PR. CI has no Census cache, so `suburb-community.json` stays as committed (Census 2021 is fixed), and the LGA fields carry forward from the committed `suburb-metrics.json`. |
| Locally with caches | Run `npm run data:census` once to cache the DataPack. Put the ABS ASGS 2021 correspondence zip in `data/cache/` (`npm run data:housing` caches it). `data:metrics` then rebuilds both files and the LGA join. |
| `--inspect` | `npm run data:metrics -- --inspect` writes `data/cache/community-columns.json`: each DataPack header, how it was classified, and the ABS long name from the metadata. |

If nothing changed apart from the timestamp, `generatedAt` keeps its old value,
so a month with no new data opens no PR.

## suburb-metrics.json

### Top level

| Field | Meaning |
|---|---|
| `schemaVersion` | `1`. Bumped on any breaking shape change. |
| `generatedAt` | ISO time the content last changed. |
| `sources.safety` | BOCSAR source, `period` (rolling 12 months, e.g. `Jul 2025–Jun 2026`), population source. |
| `sources.rent` | DCJ source, `period` (quarter, e.g. `Jun 2026 quarter`), SAL→postcode join, Census fallback. |
| `sources.census` | ABS GCP source; period is Census night, 10 August 2021. |
| `sources.transit` | GTFS extract and date; `walkMetres` = 800. |
| `sources.lga` | `method` used for the LGA join, or null. `carriedForwardFrom` is set when the values came from a previous file. |
| `percentileDirection` | Per percentile field: which way is high, and which suburbs are included. |
| `suburbs` | One record per polygon in `suburb-polygons.json`, same ids and order. |

### Per suburb

| Field | Unit | Source / period | Null when |
|---|---|---|---|
| `id`, `name` | — | `suburb-polygons.json` (ABS SAL 2021) | never |
| `population` | persons | Census 2021 usual residents. This is the BOCSAR file's population, joined on the full SAL name. Falls back to `census-2021.json`. | neither file has it |
| `rent.all` | AUD / week | DCJ new-bond median, all dwellings, postcode, latest quarter. Else the Census 2021 median weekly rent. | neither published (1 suburb, Ku-ring-gai Chase) |
| `rent.bed1` `bed2` `bed3` | AUD / week | DCJ, all dwelling types, by bedrooms | DCJ does not publish that cell. There is no Census fallback. |
| `rent.house` `flat` | AUD / week | DCJ, all bedroom counts, by dwelling type | DCJ does not publish that cell |
| `rentSource` | `"dcj"` \| `"census"` | Where `rent.all` came from | no rent |
| `rentPostcode` | 4-digit string | DCJ postcode joined to the SAL (ABS SAL→POA correspondence, largest share) | no DCJ row |
| `rentPostcodeShared` | boolean | `true` if more than one mapped suburb uses that postcode | no postcode |
| `safety.period` | text | BOCSAR rolling 12 months | no BOCSAR row |
| `safety.<all\|violence\|property\|domestic>.count` | incidents | BOCSAR recorded incidents over the period | no BOCSAR counts |
| `…rate` | per 1,000 residents, 1 dp | count ÷ Census 2021 usual residents × 1,000 | under 1,000 residents, or no population |
| `…band` | 1–5 | Quintile among suburbs with a rate. **1 = most incidents**, 5 = fewest. Same as the map colour. | no rate |
| `transit.coverage` | % (integer) | Share of the polygon within 800 m (straight line) of a rail, metro, light rail or ferry stop. Grid samples about 200 m apart. TfNSW GTFS. | only when the polygon cannot be sampled (none today) |
| `transit.hasRail` `hasMetro` `hasLightRail` `hasFerry` | boolean | A stop of that mode is within 800 m of some part of the suburb (the app's "modes nearby") | never |
| `profile.medianAge` | years | Census 2021 | not in `census-2021.json` |
| `profile.pctRenting` | % (integer) | Census 2021, rented ÷ occupied private dwellings | missing or outside 0–100 |
| `profile.pctFamiliesWithChildren` | % (integer) | Census 2021, as on the Housing sheet (see caveats) | missing or outside 0–100 |
| `location.gpoKm` | km, 1 dp | Straight line from the polygon's area-weighted centroid to Sydney GPO (−33.8676, 151.2070). Haversine. | polygon has no area |
| `location.lgaCode` `lgaName` | ABS LGA 2021 | ABS ASGS 2021 correspondence `CG_SAL_2021_LGA_2021`. The LGA with the largest share of the SAL wins. | correspondence not cached and nothing to carry forward (**null today**, see open questions in the PR) |
| `percentiles.*` | 0–100 (integer) | See below | suburb not in that percentile's population |
| `flags` | string[] | `"census-sal-mismatch"`: see caveats | never (empty array) |

### Percentiles

Mid-rank: (suburbs strictly lower + (ties − 1) / 2) ÷ (n − 1) × 100, rounded.
The lowest value gets 0, the highest gets 100, and equal values share a
percentile. **A high percentile always means more of the thing.**

| Field | High means | Included |
|---|---|---|
| `rentAll` | more expensive | Suburbs with a DCJ all-dwellings median. Census 2021 fallbacks are left out, because 2021 rents would rank as cheap. |
| `rent2Br` | more expensive | Suburbs with a DCJ 2-bedroom median |
| `safetyAll` | more recorded incidents per resident (violence + property) | Suburbs with 1,000+ residents |
| `transitCoverage` | more of the suburb near a stop | All suburbs, including 0%. Every suburb with 0% shares one mid-rank (about 25 today). The map's Transit rank, by contrast, leaves 0% out. |
| `medianAge` | older | Suburbs with a Census median age |

## suburb-community.json

Source: ABS Census 2021 General Community Profile DataPack, SAL level, NSW,
short headers (`data/cache/2021_GCP_SAL_for_NSW_short-header.zip`, the zip
`data:census` already caches). CC BY 4.0. Period: Census night, 10 August 2021.

| Table key | DataPack | Category columns | Count | Denominator |
|---|---|---|---|---|
| `language` | G13 (A–E) | `POL_<lang>_Tot` identifies a language | Sum of that language's English-proficiency columns (`POL_<lang>_*` other than `_Tot`). Falls back to `_Tot` if a language has no part columns. | G13 `P_Tot_Tot`: all usual residents, including language not stated |
| `ancestry` | G08 | `<ancestry>_Tot_resp` | Total responses for that ancestry | G01 `Tot_P_P`: usual residents. **Each person can give up to two ancestries, so shares can add up to more than 100%.** |
| `countryOfBirth` | G09 (A–H) | `P_<country>_Tot` | Persons born there | G09 `P_Tot_Tot`: all usual residents, including not stated |

- **Categories kept.** Each table keeps up to 40 of its largest named
  categories across all mapped suburbs, or all of them when it has fewer. G08
  and G13 have fewer than 40 named categories.
  - The number kept is recorded per table in the file as
    `tables.<key>.kept`, next to `namedCategories` (how many the table has).
  - The build fails only if a table has fewer than 15 named categories, which
    would mean the headers were misread.
  - Actual counts per table: see the PR, and `data:check` prints them as
    "kept per table".
- **Excluded categories.**
  - Totals and subtotals: any `Tot` token, e.g. a language-group total.
  - Not stated (`NS`).
  - Inadequately described / not further defined.
  - Residual catch-alls: `Other`, `Oth`, `Elsewhere`, and the "uses other
    language and speaks English" umbrella columns.

  English only is not a G13 `POL_` column, so it is not a category.
- **Labels.** Labels come from the DataPack's cell-descriptor metadata, which
  maps each short header to an ABS long name.
  - The build opens every `.xlsx` in the zip and uses the sheets with `Short`
    and `Long` columns. The geography workbook
    (`2021Census_geog_desc_1st_2nd_3rd_release.xlsx`) has none, so it
    contributes nothing.
  - `label` is the long name with structural words removed (Persons, Total,
    responses, the language-group prefix), e.g. "Mandarin", "Colombia",
    "Australian".
  - `absLabel` keeps the untouched ABS long name.
  - The build fails if no workbook maps the table columns.
  - `data:check` fails if any label still looks like a short header code: an
    underscore, an all-caps code, or abbreviations like `Aust`, `Sth`, `Tot`.
- **Checks on the headers.** Classification comes from the DataPack's own
  headers. The build also fails if a single-response table's categories add up
  to more than 102% of residents, because that means a subtotal is being
  double counted.
- **Shape.** `tables.<key>` has `table`, `denominator`, `namedCategories`,
  `kept` and `categories`. `categories` is `[{ key, label, absLabel,
  greaterSydney }]`. `key` is the DataPack short key. `absLabel` is the ABS
  long column name from the DataPack metadata. Each suburb has
  `<table>: { <key>: { count, pct } }`, with `pct` to 1 dp.
- **Null.** If the suburb has no DataPack row, `count` and `pct` are null. If
  the denominator is missing or 0, `pct` is null.

## Caveats

- **Rent is postcode-level.** DCJ publishes by postcode, not suburb. Suburbs
  that share a postcode get the same rent (`rentPostcodeShared: true`), and a
  big postcode can mix very different streets. The medians are for new bonds
  lodged that quarter, not all current rents.
- **Census fallback rent is from 2021.** 22 suburbs use it
  (`rentSource: "census"`). It is years older than DCJ and usually lower.
  `rentAll` percentiles leave it out.
- **Crime per resident is inflated where few people live.** Rates divide by
  usual residents. Commercial, retail, nightlife and transport hubs (Sydney
  CBD, Haymarket, Parramatta, industrial suburbs) draw far more visitors than
  residents, so their per-1,000 figures look high. The app's
  `VISITOR_HUB_IDS` note applies. Suburbs under 1,000 residents get no rate,
  band or percentile at all.
- **Recorded incidents measure reporting and policing, not risk.** Domestic
  assault is only in `domestic`, never in `all`. Retail theft is never used.
- **Census 2021 is a single date.** Age, renting, families, language,
  ancestry and birthplace describe August 2021. That was during COVID
  lockdowns, when international students and temporary visa holders were
  under-represented. Suburbs that have grown since (new apartment precincts)
  have changed the most.
- **Families with children.** `pctFamiliesWithChildren` comes from
  `census-2021.json`: families with children ÷ occupied private dwellings. The
  denominator is dwellings, not families. It is kept as-is so the filter
  matches the Housing sheet.
- **`census-sal-mismatch` (9 suburbs).** `census-2021.json` joined SALs on a
  folded name. A few disambiguated suburbs (e.g. "Kingswood (Penrith - NSW)")
  picked up another SAL with the same short name elsewhere in NSW.
  - Symptom: the Census population is very different from the BOCSAR
    population, which is joined on the full name.
  - Affected: every value that depends on that Census row or its `salCode`:
    `profile`, the Census rent fallback, the DCJ postcode (joined via
    `salCode`), `lgaCode`, and the community shares.
  - Suburbs: Darlington, Enmore, Greendale, Kingswood, Lilli Pilli, Nelson,
    Silverwater, Summer Hill, The Rocks.
  - The values are passed through as the app shows them and flagged, not
    corrected.
- **Transit coverage is straight-line.** 800 m as the crow flies, not
  walking distance. Buses are not included. Metro stations are a named subset
  of rail stops and set `hasMetro`, not `hasRail`.
- **GPO distance is from the centroid.** Large or oddly shaped suburbs can
  have a centroid far from where people live.
- **Census cells are randomly perturbed by ABS.** Summed proficiency parts can
  differ slightly from ABS's own per-language total. The build logs the
  largest gap. Small counts are unreliable.
