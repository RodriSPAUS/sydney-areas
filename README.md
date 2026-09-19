# Sydney Areas

Map of Greater Sydney suburbs. No account. Safety figures are BOCSAR recorded incidents; housing, households and backgrounds are sample figures for comparing suburbs in the prototype.

## What it does

- Full-screen map (MapLibre)
- Real suburb shapes (ABS SAL 2021)
- Layers: Safety, Housing, Households, Backgrounds
- Service pins (hospital, school, station)
- Hover for a snapshot; click for the profile

## Run

```bash
npm install
npm run dev
```

## Data

- Safety for mapped suburbs: `src/data/bocsar-safety.json`, generated from the official BOCSAR SuburbData.csv (CC-BY 3.0 AU). Map colour is incidents per 1,000 usual residents (ABS Census 2021). Names are matched to ABS SAL 2021 polygons on the map.
- Refresh that file:

```bash
npm run data:bocsar
npm run data:bocsar -- --fresh
```

The zip is cached under `data/cache/` (gitignored). `unzip` is required. The app never downloads crime data in the browser.

- Polygons: `src/data/suburb-polygons.json`
- Housing / households / backgrounds: sample figures in `src/data/suburbs.ts`
