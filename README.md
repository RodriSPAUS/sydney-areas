# Uvicus

Map of Greater Sydney suburbs. No account. Safety is BOCSAR recorded incidents. Who lives there is ABS Census 2021. Weekly rent is NSW DCJ new-bond medians by postcode, with Census 2021 as fallback. Census age, renting, and families sit on the Housing sheet.

## What it does

- Full-screen map (MapLibre on the OpenFreeMap Positron basemap, © OpenStreetMap contributors)
- Real suburb shapes (ABS SAL 2021)
- Layers: Safety, Housing, Transit, Backgrounds
- Shareable URL for suburb, layer, and safety metric, plus a Share button
- A text page per suburb at `/suburb/<id>` for search engines and links
- Hover for a snapshot (mouse); tap or click for the profile

## Run

```bash
npm install
npm run dev
```

## Data

- Safety for mapped suburbs: `src/data/bocsar-safety.json`, generated from the BOCSAR SuburbData.csv (CC-BY 3.0 AU). The JSON keeps counts, population and period only; rates, bands and ranks are derived in the app. Map colour is incidents per 1,000 usual residents (ABS Census 2021), ranked among Greater Sydney suburbs on this map. Suburbs under 1,000 residents keep their counts but get no rate, colour or rank. All = violence + property; retail theft is never used; domestic assault only colours the Domestic chip. Darker fill = more incidents.
- Census 2021: `src/data/census-2021.json` (ABS GCP, SAL). Backgrounds colour is share born in Australia. Median age, % renting, and % families with children are on the Housing sheet. CC BY 4.0.
- Housing: `src/data/dcj-housing.json` (NSW DCJ Rent and Sales Report, postcode). All-dwellings median colours the map; 1/2/3-bed and house/flat medians appear on the profile when published. Census 2021 rent if a postcode median is missing. CC BY.
- Transit: `src/data/access-places.json` (stops) and `src/data/transit-lines.json` (simplified shapes). Transport for NSW Complete GTFS, CC-BY. Rail, metro, light rail, and ferry only. Metro is a named subset of the rail points, drawn in its own colour, and is not double-counted as rail. Suburb colour is the share of the polygon within 800 m of one of those stops, not the count of points inside the boundary. Lines are the GTFS shapes for those services, clipped to Greater Sydney and simplified, and are loaded only when Transit is first shown. No bus.
- Refresh:

```bash
npm run data:polygons
npm run data:bocsar
npm run data:bocsar -- --fresh
npm run data:census
npm run data:housing
npm run data:sitemap
```

Zips and xlsx are cached under `data/cache/` (gitignored). `unzip` is required for BOCSAR, Census DataPack and the SAL–POA correspondence. The app never downloads source tables in the browser.

- Polygons: `src/data/suburb-polygons.json`

## Update emails (optional)

Set `VITE_SIGNUP_ENDPOINT` in `.env.production` to your Buttondown embed URL,
`https://buttondown.com/api/emails/embed-subscribe/<username>`. Each signup is
tagged `suburb:<id>`. Without the variable the form is not shown.

## Deploy (Cloudflare Pages)

The app defaults to a Vercel Nitro build (`.vercel/output`). Cloudflare Pages
looks for `dist`. Set:

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Output directory | `dist` |
| Node | 22 |

Cloudflare sets `CF_PAGES=1`, which switches Nitro to `cloudflare_pages` and
writes `dist/`. You can also force it with `NITRO_PRESET=cloudflare_pages`.
`nodejs_compat` is in `wrangler.toml`.

Analytics is off until Cloudflare Pages has `VITE_PLAUSIBLE_DOMAIN`.
Set it to `uvicus.com`, or to `sydney-areas.pages.dev` until the custom domain
is live. Create that site in Plausible first. With the variable empty, the
app does not load the Plausible script and events are a no-op.
