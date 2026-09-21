# Sydney Areas — decision log

What we did and **why**. One entry per product change.
Whoever continues (human or agent) reads this; chat is not enough.

---

## 2026-09-22 — Share URL, ranks, colourblind fills, no fake services

**What:** Shareable `?s=&layer=&metric=` URL. Suburb sheet shows band bar +
`#n of N` (1 = fewest / lowest). Safety palette is sequential orange-brown
(darker = more incidents), not red–green. Sample suburb list and service pins
are gone. Mobile chrome is compact; legend collapses; sheet is shorter so the
map stays visible. UI copy is English only.

**Why:** The map could not be sent as a link. The profile was a wall of
counts. Red/green failed colourblind users and fought the “darker = more”
housing ramp. Services only existed on 20 prototype suburbs. Spanish footer
plus English chrome mixed languages.

**What we did not add:** language toggle, real OSM services, compare view.

---

## 2026-09-21 — Cloudflare: polygons without colour

**What:** MapLibre 6 asks for `maplibre-gl-worker.mjs` next to the bundle. Vite
did not copy it; Cloudflare returned 404 and the canvas painted the Esri
basemap without fills. Now the worker is bundled (`?worker&url`) and passed
with `setWorkerUrl`. Suburb layers sit above the raster.

**Why:** The pages.dev site showed chrome (title, legend) but Sydney was grey,
no quintiles. Log: `ERR_FAILED .../assets/maplibre-gl-worker.mjs`.

---

## 2026-09-21 — Cloudflare Pages (dist, not Vercel)

**What:** The default Nitro build is still Vercel. If the environment is
Cloudflare Pages (`CF_PAGES=1` or `NITRO_PRESET=cloudflare_pages`) the
preset becomes `cloudflare_pages` and writes `dist/`. `wrangler.toml` with
`pages_build_output_dir = "dist"` and `nodejs_compat`.

**Why:** Deploy to Cloudflare failed: the command set
`NITRO_PRESET=cloudflare_pages` but `vite.config.ts` had `preset:
"vercel"` hardcoded. Nitro wrote `.vercel/output` and Cloudflare
looked for `dist`.

---

## 2026-09-21 — Census 2021 + DCJ rent/sale (end of sample)

**What:** Households and Backgrounds move to ABS Census 2021 (SAL). Housing
uses median rent of **new bonds** DCJ by postcode (Jun 2026 quarter) and
median purchase DCJ (Mar 2026 quarter). If a SAL has no DCJ row, Census 2021
rent is kept and labelled. Invented $2.42 m figures are gone.

**Why:** The user asked for official figures, not sample, and not Domain.
Census covers every mapped polygon (663/663). 2021 rent is not today’s
price, hence DCJ by postcode, with a note that a neighbour may share colour.

**Join:** `CG_SAL_2021_POA_2021.xlsx` (largest `RATIO_FROM_TO`). Bondi and
Bondi Beach → 2026 ($1,050/week, purchase $1.93 m). Mount Druitt → 2770
($530). Penrith → 2750 ($620). 641/663 SAL with DCJ; 22 (few bonds or no
match) stay on Census 2021.

**What we did not touch:** Safety/BOCSAR, polygons, ranking per 1,000,
auth, Google.

**Scripts:** `npm run data:census`, `npm run data:housing`. Cache
xlsx/zip in `data/cache/` (gitignored). Small JSON is committed.
DevDep `exceljs`.

**Copy:** Households/Backgrounds legend = “ABS Census 2021”. Housing =
“Weekly rent (new bonds, DCJ)” when DCJ is present.

---

## 2026-09-21 — Greater Sydney + city-wide ranking

**What:** ABS SAL polygons ~663 (west Penrith/Blacktown/Mount Druitt,
Liverpool, Campbelltown). Camera shows Parramatta and Bondi together.
Safety now has four metrics (Combined / Street / Homes / Domestic),
quintiles among **all** mapped suburbs, per 1,000 residents.
Combined = street + home; retail never paints; DV only the Domestic chip.

**Why:** The inner/east crop hid the west, and bands were only among
night-economy suburbs. Inner east took all the red and the west looked
calm because it was not compared to the rest of the city.

**What the map stopped painting:** the harm-weighted index (20 Sep). Extra
counts stay on the sheet. Explicit request for a comparable city-wide rank.

**Script:** `npm run data:polygons` + `npm run data:bocsar -- --fresh`.

---

## 2026-09-21 — Project memory

**What:** this log. Pointer in `AGENTS.md`.

**Why:** Until here decisions lived only in chat. The user asked if notes
were being kept. They were not.

---

## 2026-09-20 — Harm-weighted index

**What:** Safety colour stopped treating every offence equally.
Moved to a weighted rate per 1,000 residents. Homicide, sexual assault,
theft from person, assault on police entered. The sheet still shows raw
counts with the ×weight.

**Why:** A stolen car counted the same as an assault; rape was missing.
Noisy minor-theft suburbs looked as “high” as violent ones. User request.

**What we could not do:** BOCSAR at suburb level does not split a pub fight
from serious assault (all Non-DV assault).

**Superseded:** colour went back to unweighted rates on 21 Sep (Greater
Sydney comparable). Extra counts stay.

---

## 2026-09-20 — Push to `main`

**What:** `7522b27` on https://github.com/RodriSPAUS/sydney-areas

**Includes:** 357 ABS polygons, BOCSAR on every mapped suburb,
rate per 1,000 (Census 2021). Does not include the harm index (that was
later).

**Why:** The user asked if it was on `main`. It was not.

---

## 2026-09-20 — Per 1,000 residents

**What:** Rank by rate (count / 2021 population × 1000), not raw count.
`MIN_POP = 100`.

**Why:** “More people makes it look more dangerous.” Bondi is not
comparable to a small suburb if you only sum incidents.

---

## 2026-09-20 — BOCSAR on every mapped suburb

**What:** Safety on each mapped polygon, not only the 20 from the prototype.

**Why:** “Put it on every suburb that is on the map.”

**Still the same (then):** Housing / households / backgrounds = sample.
That changed 21 Sep (Census 2021 + DCJ).
