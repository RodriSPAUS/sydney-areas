# Uvicus

Map of Greater Sydney suburbs. No account. Safety is BOCSAR recorded incidents. Households and backgrounds are ABS Census 2021. Weekly rent is NSW DCJ new-bond medians by postcode, with Census 2021 as fallback.

## What it does

- Full-screen map (MapLibre)
- Real suburb shapes (ABS SAL 2021)
- Layers: Safety, Housing, Households, Backgrounds
- Shareable URL for suburb, layer, and safety metric
- Hover for a snapshot (mouse); tap or click for the profile

## Run

```bash
npm install
npm run dev
```

## Data

- Safety for mapped suburbs: `src/data/bocsar-safety.json`, generated from the BOCSAR SuburbData.csv (CC-BY 3.0 AU). Map colour is incidents per 1,000 usual residents (ABS Census 2021), ranked among Greater Sydney suburbs on this map. Combined = street + home; retail theft is never used; domestic assault only colours the Domestic chip. Darker fill = more incidents.
- Households / backgrounds: `src/data/census-2021.json` (ABS Census 2021 GCP, SAL). CC BY 4.0.
- Housing: `src/data/dcj-housing.json` (NSW DCJ Rent and Sales Report, postcode). All-dwellings median colours the map; 1/2/3-bed and house/flat medians appear on the profile when published. Census 2021 rent if a postcode median is missing. CC BY.
- Refresh:

```bash
npm run data:polygons
npm run data:bocsar
npm run data:bocsar -- --fresh
npm run data:census
npm run data:housing
```

Zips and xlsx are cached under `data/cache/` (gitignored). `unzip` is required for BOCSAR, Census DataPack and the SAL–POA correspondence. The app never downloads source tables in the browser.

- Polygons: `src/data/suburb-polygons.json`

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
