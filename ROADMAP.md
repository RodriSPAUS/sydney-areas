# Sydney Areas — roadmap

Map-first suburb explorer for Greater Sydney (crime, rent, who lives there).
Official open data. No account. Monetisation later via contextual ads / outbound links
(Domain, realestate.com.au, movers, ISPs) — never on the Safety choropleth.

## Rules

- The product is the map. Do not put a marketing page in front of it.
- Safety colours stay ad-free.
- Do not invent Domain / CoreLogic prices.
- Do not add login until email capture is not enough.
- Do not spend ad budget until domain, /about, and outbound click tracking exist.

## Phase 0 — close the prototype (this week)

- [ ] Tagline under the title (one sentence)
- [ ] First-visit panel (3 bullets + Sources), dismissed to localStorage
- [ ] `/about` with BOCSAR, ABS Census 2021, DCJ, ABS SAL, and “not a risk score”
- [ ] Short disclaimer on the Safety sheet
- [ ] Turn off fake Services pins or replace with OSM
- [ ] Share title / OG: `{Suburb} · {Layer} · Sydney Areas`
- [ ] Real domain + deploy outside Build preview

## Phase 1 — usable beta (2–3 weeks)

- [ ] Privacy-friendly analytics (Plausible or Umami)
- [ ] Events: search, layer, suburb open, outbound click
- [ ] 10–20 testers (Moving to Sydney groups, internationals)
- [ ] Fix the five worst data bugs they find
- [ ] Email capture: “Ping me when rents / crime update for suburbs I follow”
- [ ] Mobile: sheet does not eat the map; first tap is obvious

Exit: ~200 visits/week or 50 distinct suburb opens, and no “this calls X a slum” complaint.

## Phase 2 — site an advertiser can buy (3–6 weeks)

- [ ] Per-suburb URL `/suburb/bondi`
- [ ] Housing sheet: “Rentals on Domain” / realestate.com.au with UTM
- [ ] Apply to Domain / REA partner or affiliate if it exists; otherwise measure raw clicks
- [ ] Relocate slot on the sheet: movers + NBN/ISP (one partner or a comparison link)
- [ ] Written ad policy: no ads on Safety; no “this area is dangerous, buy an alarm”
- [ ] Search Console + ~20 suburb pages indexed
- [ ] Calendar reminder: refresh DCJ quarterly, BOCSAR when a new cut lands

Exit to paid ads: ~1,000 visits/month or ~200 Domain clicks/month.

## Phase 3 — only if Phase 2 is not empty

- [ ] Clone pipeline to Melbourne / Brisbane (new state crime sources)
- [ ] More sheet partners: storage, contents insurance — never on the map
- [ ] Optional one-page suburb PDF for an agent to host
- [ ] Login only if a loose email list is no longer enough

## This week (order)

1. Product copy: name + tagline + first-visit + `/about`
2. Kill or replace fake Services
3. Deploy + domain
4. Four analytics events
5. Fifteen testers and a “what they did not understand” note
6. Domain / REA links on Housing (even before they pay)
7. Email capture
