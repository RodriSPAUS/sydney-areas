# Sydney Areas — decision log

What we did and **why**. One entry per product change.
Whoever continues (human or agent) reads this; chat is not enough.

---

## 2026-09-25 — A text page per suburb

**What:** `/suburb/<id>` is a server-rendered page for each of the 663
suburbs: Safety, Housing, Transit and Backgrounds as plain text with the
same figures, rank sentences and caveats as the sheet, a “See on the map”
button, its own title, description and canonical. Unknown ids return 404.
The sheet links to it. `npm run data:sitemap` writes all 665 URLs.

**Why:** The map is one URL with query strings, so search engines had one
page and almost no text. Phase 2 needs pages people can land on from a
search for “Bondi crime rate” or “Parramatta rent”.

## 2026-09-25 — Basemap: OpenFreeMap Positron instead of Esri Canvas

**What:** The basemap is the OpenFreeMap Positron vector style (OSM data).
The style JSON is fetched with a 5 s timeout; if it fails, the map uses a
plain background so suburbs still draw. Attribution keeps OSM/OpenMapTiles
from the style and adds ABS, BOCSAR and DCJ.

**Why:** Esri's `server.arcgisonline.com` Canvas tiles are for ArcGIS
account holders; a site that plans outbound partner links should not rely
on them. OpenFreeMap is free for commercial use and needs no key.

## 2026-09-25 — Share button; template auth and database removed

**What:** A Share button in the header and on the suburb sheet. Touch
devices get the native share sheet, others copy the link. Plausible gets
a `share` event. Removed the app-builder template's unused auth
(better-auth), PGLite database, migrations, multiplayer, connector client,
their scripts and tests, and 38 unused packages. The Grok PWA and preview
plumbing stays.

**Why:** The URL could already be shared but nothing said so. The product
has no login (see Rules), and the template code added weight, a lint error
and failing tests without doing anything for the map.

## 2026-09-25 — Safety ranks only 1,000+ residents, in one direction

**What:** A per-1,000 rate needs at least 1,000 Census 2021 usual residents
(was 100). Below that the sheet leads with the incident count and says why
there is no colour. Every layer now states its rank as one sentence, e.g.
“More recorded incidents than 70% of 581 suburbs on this map”, and at the
ends “The most / fewest …”. “Band n of 5” and “#rank of N” are gone from
the sheet and tooltip. Under the rate: incident count, period, residents.
The CBD core (Sydney, Haymarket, The Rocks, Barangaroo, Millers Point, Dawes
Point) carries a visitor/worker note. One disclaimer instead of three.

**Why:** The top of the ranking was Eastern Creek (874 residents),
Barangaroo (220), The Rocks and Menangle Park: tiny or industrial resident
bases, not places a resident would feel as least safe. And the sheet showed
two opposite scales side by side (band 1 = most, rank 1 = fewest).

---

## 2026-09-25 — Suburbs draw before basemap tiles; lighter bundle

**What:** Suburb layers are added on `style.load`, not `load`, with a
“Loading suburbs…” status until then. `transit-lines.json` is a lazy chunk
fetched the first time Transit is shown. `bocsar-safety.json` keeps counts,
population and period only (1.1 MB → 0.4 MB); the generator matches.
Canonical links, absolute `og:image` / `og:url`, `robots.txt`, `sitemap.xml`.
Transit legend and sheet say bus is not included. Mobile footer is one line.
The first-visit card does not cover a shared `?s=` link.

**Why:** With Esri tiles slow or blocked the map stayed empty, because
`load` waits for every tile. The main JS chunk was 3.3 MB, most of it data
the app never read or only needs on one layer.

## 2026-09-25 — Contact is a mailto, not a form

**What:** About, after Licences, and the map footer link to c8labs@agentmail.to.

**Why:** A wrong suburb or a question needs an email. No form, no ticket queue.

---

## 2026-09-24 — Transit colour is a short walk, not a point count

**What:** Transit fill and rank use the share of each suburb within 800 m of a
rail, metro, light rail or ferry stop. A ~200 m grid is kept only where it
falls inside the ABS polygon; a tiny polygon uses its centre or a vertex.
`walkPct === 0` stays the neutral fill. Quintiles are among suburbs with some
coverage (1 = lowest). Two or more modes within that walk sit one band darker,
capped at 5. The sheet hero is the percentage, then the modes and the stop
names. Inside-polygon counts are still stored and are not used for colour or
rank. Lines and stop dots are unchanged.

**Why:** Kingsgrove station sits just over the Bexley North boundary, so a
point-in-polygon count painted the neighbour as unserved. A large suburb with
one edge station looked as well served as a small one that is all station.

---

## 2026-09-24 — Transit lines from GTFS shapes

**What:** The Transit layer draws simplified line strings from zoom 9, under the
stop dots. Geometry is TfNSW Complete GTFS `shapes.txt` (bundle 23 Sep 2026),
kept only for the 2,518 shape ids in the supplied index — every id matched.
Clipped to longitude 150.62–151.34 and latitude −34.12–−33.34, then
Douglas-Peucker at 0.00025°. Near-duplicate corridors of the same mode are
collapsed. 746 lines, about 967 KB, in `src/data/transit-lines.json`. M1 stays
metro, not rail. Hunter, Stockton, Newcastle light rail, and the CRF ferry
shapes in that index never enter the window, so they are not drawn. `shapes.txt`
and the id index are not committed.

**Why:** The attached file was shape ids, shorts, and modes — no coordinates.
Drawing a segment between stops would invent a network. These are the published
shapes for those ids.

---

## 2026-09-24 — Transit v1: metro colour, no invented lines

**What:** The fourth map layer is Transit, not Access. Old `layer=access` still
opens it and is rewritten to `layer=transit`. The same 310 TfNSW points are
drawn from zoom 10 in four colours: rail, metro, light rail, ferry. Metro is
only the named City & Southwest / Northwest stations after stripping a trailing
“ Station” (21 of those names are in this extract; Pitt Street is not, so it is
not drawn). A metro stop is not also counted as rail. Suburb colour is how many
stops fall inside the ABS boundary. Quintiles are only among suburbs with at
least one stop (1 = fewest); zero stays the neutral fill. Line strings are
drawn only when `src/data/transit-lines.json` is present. That file is not in
this cut, so the map shows circles and does not join stations with invented
tracks. `shapes.txt` is not in the repo.

**Why:** “Access” hid that metro is a different service from suburban rail, and
a shape-id index has no coordinates. Drawing a line between stops would invent
a network this extract does not have.

---

## 2026-09-24 — Access v1: stops inside the suburb

**What:** Access is a fourth map layer. 310 TfNSW Complete GTFS points (rail
including metro, light rail, ferry) are drawn as dots from zoom 10. A suburb’s
colour is how many of those points fall inside its ABS boundary. Quintiles are
only among suburbs with at least one stop; zero stays the neutral fill. No bus,
no metres, no line strings, and no line letter on a stop. Circles are not
clickable.

**Why:** “Is there a station?” is the question. Counting the point inside the
polygon is the honest first cut. A buffer or a T4 join would invent a network
this extract does not have. Superseded the same day by Transit v1 (rename,
metro colour). The point-in-polygon rule is unchanged.

---

## 2026-09-24 — Three layers, new safety groups, readable chrome

**What:** Map layers are Safety, Housing, and Backgrounds. Household Census
stats (median age, % renting, % families with children) sit on the Housing
sheet. Safety chips are All, Violence, Property, and Domestic. Rates and
quintiles are computed in the client from last-12-month counts and population.
Old `layer=households` opens Housing. Old `metric=street` opens Violence.
Header, search, legend, and layer pills use surface/80 and blur. The sheet
stays solid. Mobile Safety shows one rate, not four tiles, and no 6-month
toggle.

**Why:** Street / Homes / Combined did not match the offences people ask
about, a fourth Households layer hid those figures, and the title washed out
on dark fills.

---

## 2026-09-23 — Mobile sheet layers, URL metric, search zoom

**What:** The suburb sheet has a layer row on small screens, so Housing can be
opened without closing the sheet. Closing the sheet clears the search box.
`metric` is omitted from the URL unless the layer is Safety. The search field
is 16px below `md` so iOS does not zoom the page on focus.

**Why:** The map bar hides while the sheet is open, a leftover `metric=` made
shared Housing links look like Safety, and a 14px input cropped the sheet.

---

## 2026-09-23 — Analytics seed, no testers yet

**What:** Optional Plausible pageviews plus `search`, `layer`, `suburb_open`,
and `outbound`. The script loads only when `VITE_PLAUSIBLE_DOMAIN` is set;
otherwise `track()` returns. No testers, email, or ads.

**Why:** Phase 1 needs a privacy-friendly count before anyone is invited.
The map must keep working on pages.dev with the variable unset.

---

## 2026-09-23 — Safety colour and rates are the last 12 months

**What:** The sheet, legend, and rank line say the map colour and the per-1,000
figures are the last 12 months (the extract’s `period12`). The 6-month control
is labelled as counts only and does not recolour the map.

**Why:** The 12- and 6-month count tiles sat next to the rate, so it was unclear
which window the colour used. The pipeline already ranks on the 12-month totals.

---

## 2026-09-23 — Search list above the legend; suburb fits the leftover map

**What:** The map header stacks above the legend, and the legend sits under the
measured header, so suggestions are not covered on a phone. Selecting a suburb
fits the camera even when MapLibre still reports the style as dirty. Padding
uses the real header height and the sheet (42vh on a phone, 360px drawer on
desktop) so the suburb lands in the gap, not under the sheet. One fit per
select.

**Why:** The legend painted over the first search row. The fit was skipped
after `setPaintProperty`, so a search pick left the suburb at the overview
zoom.

---

## 2026-09-23 — Uvicus name and Phase 0 trust copy

**What:** Visible name is Uvicus (`APP_NAME`). Greater Sydney stays the place
line, not the product name. Meta, first-visit, footer, and `/about` say the
map is independent and not affiliated with ABS, BOCSAR or DCJ. Footer is
“Sources (open data, unofficial)” plus About. Safety sheet hero is the active
rate per 1,000; band and rank sit under it. Housing says DCJ new-bond vs
Census 2021. Person-% outside 0–100 become null and that households or
backgrounds block is omitted (Scheyville 143 does not paint or reach the
legend). Missing suburbs stay `#B0A89C` with a “No data” legend swatch.
First-visit key is `uvicus-first-visit-v1`.

**Why:** A screenshot must not read as a BOCSAR or ABS score, and a person
rate must not show above 100%.

**What we did not add:** glass, hover≠selected, PMTiles, custom-domain DNS,
ads, Services pins, auth. Repo name stays `sydney-areas`.

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
