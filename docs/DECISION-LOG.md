# Sydney Areas — decision log

What we did and **why**. One entry per product change.
Whoever continues (human or agent) reads this; chat is not enough.

---

## 2026-09-23 — Phase 0 remainder is trust, not a visual rewrite

**What:** Rewrote `ROADMAP.md`. Struck “Official open data” from the intro.
Marked the 22 Sep frame (tagline, first-visit, `/about`, Safety disclaimer,
no Services, OG titles, pages.dev) as done on main `d4fadd3`. Phase 0 now
has only the trust slice: no Official, independent/not-affiliated chrome,
unofficial footer, Safety “ranking on this map” line, DCJ vs Census label,
clamp person-% (Scheyville 143), missing-data fill + “No data” swatch.
Glass, hover≠selected, mobile layer chips, URL/search bugs, spinner, payload,
analytics, testers, Domain links, email, SEO pages stay Phase 1–2.

**Why:** Live review 22–23 Sep (Mateo / Nora / Leo / Vera / Rita) mixed
reputation, taste, and architecture into one P0 queue. Shipping that queue
would reopen the prototype. Risk that actually blocks showing the map:
BOCSAR-looking screenshots and a 143% legend.

**Job we are building:** before you open Domain, see how this suburb sits on
incidents, rent, and who lives there versus the rest of Greater Sydney.

**What we did not build in this commit:** app copy or data clamp. Docs only.
Next product slice is a Build prompt for the Phase 0 trust list, after copy
is agreed in chat.

---

## 2026-09-22 — Drop sheet feedback; share titles follow suburb and layer

**What:** Removed the suburb sheet “Useful? Yes / No” footer and the
`feedback` / `setFeedback` store fields. Document title and Open Graph on `/`
follow `{Suburb} · {Layer} · Sydney Areas`, or `{Layer} · Sydney Areas` when no
known suburb is selected (`s=` missing or unknown). Layer labels are Safety,
Housing, Households, Backgrounds. `/about` stays `About · Sydney Areas`. Helper:
`src/lib/share-title.ts`. Image stays `/og.jpg`.

**Why:** Issue #1 share titles. The footer was noise and was not stored.

**What we did not add:** per-suburb URLs (`/suburb/bondi`), a new OG image,
Domain/REA links, analytics, another sheet CTA.

---

## 2026-09-22 — Phase 0 frame: tagline, first-visit, /about, Safety disclaimer

**What:** Tagline under the title. First-visit card (3 bullets + source names),
dismissed to `localStorage` key `sa-first-visit-v1`. New `/about` with BOCSAR,
ABS Census 2021, DCJ, ABS SAL, licences, and “not a risk score”. Short disclaimer
on the Safety sheet. About link in the header. Copy lives in `src/lib/copy.ts`.
No marketing landing in front of the map.

**Why:** Issue #1 / #5 item 1. The map still looked like a Build preview.

**What we did not add:** OG `{Suburb} · {Layer}` titles, domain/deploy, OSM
services (pins already gone), analytics, Domain/REA links, email capture.

---

## 2026-09-22 — Drop filters; DCJ 1/2/3-bed and house/flat rents

**What:** Filter chips are gone (too much chrome). Housing sheet now shows DCJ
new-bond medians for 1 / 2 / 3 bedrooms and House vs Flat when the postcode
table publishes them. Map colour is still all-dwellings median only. Suppressed
cells (`*`, `s`, `-`) stay blank, never $0.

**Why:** Three rows of chips covered the map. Bedroom rents are in the same
DCJ workbook and answer “what does a two-bed cost here?” without a second
colour scale.

---

## 2026-09-22 — Centre on search, layer-first sheet, stronger fills, filters

**What:** Search always recentres the suburb in the leftover map (even if it
was already selected). The profile opens on the **active layer** (Housing first
when Housing is on); the other sections collapse. Housing / Households /
Backgrounds use five discrete quintile colours with a wider lightness range.
Filter chips: All / lower / higher for the current layer (also in the URL as
`f=low|high`). Unmatched suburbs fade.

**Why:** Typing a suburb did not reliably fly the camera. The sheet always
started at Safety, so Housing looked missing. Continuous ramps clustered most
suburbs in one muddy mid-tone. No way to hide the expensive or high-incident
end.

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
