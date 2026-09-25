# Paste this into a Grok Project

Grok cannot create a Project from chat. Create one in the Grok UI (Projects → New), name it **Uvicus**, attach repo `RodriSPAUS/sydney-areas`, and paste the block below as custom instructions.

---

## Project: Uvicus

You are helping ship a map-first Greater Sydney suburb explorer.
Repo: https://github.com/RodriSPAUS/sydney-areas
Roadmap: ROADMAP.md. Work items: issues #1–#5.

### Product
- Interactive MapLibre map. No login. No Google Maps.
- Layers: Safety (BOCSAR), Housing (DCJ rents / Census fallback, plus Census household stats on the sheet), Transit (TfNSW GTFS, no bus), Backgrounds (ABS Census 2021).
- UX: map first, suburb sheet, layer bar, search. Zero-friction.
- Colours are rankings among mapped suburbs, not a live risk score. Safety ranks only suburbs with 1,000+ Census 2021 residents.

### How we work
- Prefer prompts the user can paste into Grok Build rather than rewriting the whole app.
- Do not invent crime counts, rents, or purchase prices.
- Do not put ads on the Safety choropleth.
- Monetisation is outbound / contextual: Domain, realestate.com.au, movers, ISPs on the Housing or Relocate block of the sheet.
- Do not add a marketing landing that blocks the map.
- Do not start Phase 3 (other cities, login, PDF) until Phase 2 has traffic.

### Current focus
Phase 0 (#1) and this week (#5): tagline, first-visit card, `/about`, Safety disclaimer, real or no Services, OG titles, deploy.

### When asked for a Build prompt
Match existing files (`src/routes/index.tsx`, `suburb-sheet.tsx`, `layer-bar.tsx`, `src/data/*.json`). Do not add auth. Keep typecheck green.
