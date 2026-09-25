# Uvicus — roadmap

(Formerly “Sydney Areas”; repo name unchanged.)

Map-first suburb explorer for Greater Sydney (crime, rent, who lives there).
Independent map on ABS / BOCSAR / DCJ open data — not affiliated with those
agencies. No account. Monetisation later via contextual ads / outbound links
(Domain, realestate.com.au, movers, ISPs) — never on the Safety choropleth.

Live: https://uvicus.com (also https://sydney-areas.pages.dev)
Job: before you open Domain, see how this suburb sits on incidents, rent, and
who lives there versus the rest of Greater Sydney — no account, no paid report.

## Rules

- The product is the map. Do not put a marketing page in front of it.
- Safety colours stay ad-free.
- Do not invent Domain / CoreLogic prices or crime counts.
- Do not add login until email capture is not enough.
- Do not spend ad budget until domain, /about, and outbound click tracking exist.
- Do not present rankings as an official BOCSAR safety score.
- Do not start Phase 3 until Phase 2 has traffic.
- Never use the word “Official” in meta, OG, chrome, or this file.

## Phase 0 — close the prototype

Work through Grok Build after copy is agreed. Do not treat the 22–23 Sep
review P0 list as this week’s sprint.

### Already on main (2026-09-22 / SHA d4fadd3)

- [x] Tagline under the title
- [x] First-visit panel (3 bullets + Sources), `localStorage` `sa-first-visit-v1`
- [x] `/about` with BOCSAR, ABS Census 2021, DCJ, ABS SAL, “not a risk score”
- [x] Short disclaimer on the Safety sheet (must be strengthened below)
- [x] Fake Services pins removed (do not bring them back)
- [x] Share title / OG: `{Suburb} · {Layer} · Sydney Areas`
- [x] Deployed on Cloudflare Pages (`sydney-areas.pages.dev`)

### Still Phase 0 — trust slice (do this next)

Copy + data honesty only. No glass, no PMTiles, no hover redesign, no ads.

- [x] Strip “Official” from meta / description / any remaining chrome
- [x] Meta description (draft): “Crime, rent and who lives there — ranked among Greater Sydney suburbs. Independent map using ABS, BOCSAR and DCJ open data. Not a live risk score.”
- [x] First-visit + map chrome: independent / not affiliated with ABS, BOCSAR, DCJ
- [x] Map footer: `Sources (open data, unofficial)` + link to `/about`
- [x] Safety sheet one-liner: ranking on this map, not an official BOCSAR score; hero = active-layer metric, Band/# secondary
- [x] Housing sheet: say when the figure is DCJ new-bond (postcode) vs Census 2021
- [x] Clamp person-% fields to 0–100 or null (Scheyville `pctBornAustralia` 143 must not reach the legend). Ancestry items may *sum* over 100; no single item > 100
- [x] Missing / null / too-few: dead fill (not the light end of the ramp) + legend swatch “No data”. Fine hatch is nice-to-have if MapLibre is cheap; colour + swatch is enough to ship
- [ ] Optional: custom domain when it is ready (pages.dev is an acceptable Phase 0 host)

Exit Phase 0: a screenshot of Safety or Backgrounds cannot be read as “BOCSAR/ABS official”, and no legend shows >100% for a person rate.

## Phase 1 — usable beta (after Phase 0 exit)

Original beta plus the review items that are product, not taste.

- [x] Privacy-friendly analytics (Plausible or Umami)
- [x] Events: search, layer, suburb open, outbound click
- [ ] 10–20 testers (Moving to Sydney groups, internationals)
- [x] Mobile: layer chips in the sheet header so a layer change does not require closing the sheet
- [x] Hover ≠ selected (no polygon scale). Sheet open + hover on another suburb must not look like two selections
- [x] Clear search query on deselect; do not serialise `metric=` when `layer !== safety`
- [x] One `fitBounds` per select (no double-fit camera shake)
- [x] Spinner / skeleton before the map load (2.3 MB cold start)
- [ ] Backgrounds: one ethical line — ancestry is multi-response Census 2021, not a character judgement
- [ ] Fix the worst data bugs testers find (after the Phase 0 clamp)
- [x] Email capture: “Ping me when rents / crime update for suburbs I follow” (Buttondown, off until `VITE_SIGNUP_ENDPOINT` is set)
- [ ] Payload later if testers on 4G name it: simplify / gzip GeoJSON. PMTiles only if that is still not enough

Exit: ~200 visits/week or 50 distinct suburb opens, and no “this calls X a slum” complaint.

Map layers on the beta are Safety, Housing, and Backgrounds. Households is not a layer: Census median age, % renting, and % families with children sit on the Housing sheet. Safety chips are All, Violence, Property, and Domestic (not Street / Homes / Combined). Header, search, legend, and layer pills use a light blur so type stays readable on dark fills. The suburb sheet stays solid. Dark mode is still out.

Transit colour is the share of each suburb within 800 m of a rail, metro, light rail or ferry stop (a station across the boundary still counts). Two or more of those modes sit one quintile darker. Dots and simplified GTFS lines stay. Bus stays out.

## Phase 2 — site an advertiser can buy (3–6 weeks)

Acquisition before compare-UI. Per-suburb pages beat a 2–4 suburb comparator.

- [x] Per-suburb URL `/suburb/bondi` (server-rendered text page, in sitemap.xml)
- [ ] Housing sheet: “Rentals on Domain” / realestate.com.au with UTM
- [ ] Apply to Domain / REA partner or affiliate if it exists; otherwise measure raw clicks
- [ ] Relocate slot on the sheet: movers + NBN/ISP (one partner or a comparison link)
- [ ] Written ad policy: no ads on Safety; no “this area is dangerous, buy an alarm”
- [ ] Search Console + ~20 suburb pages indexed (robots.txt, 665-URL sitemap and canonical are in — submit the sitemap)
- [ ] Calendar reminder: refresh DCJ quarterly, BOCSAR when a new cut lands

Exit to paid ads: ~1,000 visits/month or ~200 Domain clicks/month.

## Phase 3 — only if Phase 2 is not empty

- [ ] Clone pipeline to Melbourne / Brisbane (new state crime sources)
- [ ] More sheet partners: storage, contents insurance — never on the map
- [ ] Optional one-page suburb PDF for an agent to host
- [ ] Login only if a loose email list is no longer enough
- [ ] 2–4 suburb comparator (after SEO pages exist)

## Do not do yet

From the 22–23 Sep live review. Logged so it is not re-litigated as Phase 0.

- Paid ads, B2B agent outreach, or Social posts of Safety screenshots with BOCSAR chrome
- Dark mode and a basemap opacity pass (chrome blur on the header, search, legend, and layer pills already shipped)
- PMTiles / vector tiles as a Phase 0 blocker
- Fake Services pins
- Marketing landing in front of the map

## 2026-09-23 — live review (kept on purpose)

Internal critique of https://sydney-areas.pages.dev (Mateo / Nora / Leo / Vera / Rita +
desktop playtest). Full notes lived in chat; this is what we kept.

**Agree**
- Framing sounds more official than we are (meta “Official”, agency footer, BOCSAR period).
- Scheyville `pctBornAustralia` 143 breaks the Backgrounds legend (0%–143%).
- Mobile sheet hides the layer bar — cannot change layer without closing.
- Do not monetise or pitch agents until trust copy + clamp are in.

**Disagree / defer**
- Market 4/10 scores the wrong job (replace Domain / Microburbs). The job is pre-Domain orientation.
- Review “P0” glass + hover + PMTiles is a second roadmap. It is Phase 1+, not Phase 0.
- Playtest ~7/10 on desktop; map engine is good enough to ship the trust slice first.

**Reputation minimum on the map + About**
- Independent; not affiliated with or endorsed by ABS, BOCSAR, DCJ.
- Colours rank suburbs on *this* map; not a live risk score; not an official safety index.
- Safety = recorded incidents per 1,000 usual residents for a named period.
- Housing: label DCJ new-bond vs Census 2021.
- Backgrounds: Census 2021; ancestry is multi-response.
- Cut-off dates visible.

Issues: #1 Phase 0, #5 this-week list (partially superseded by the trust slice above),
#2 Phase 1, #3 Phase 2, #4 Phase 3.
