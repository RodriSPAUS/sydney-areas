# Sydney Areas — log de decisiones

Qué hicimos y **por qué**. Una entrada por cambio de producto.
Quien continúe el trabajo (humano o agente) lee esto; el chat no alcanza.

---

## 2026-09-21 — Cloudflare Pages (dist, no Vercel)

**Qué:** El build Nitro por defecto sigue siendo Vercel. Si el entorno es
Cloudflare Pages (`CF_PAGES=1` o `NITRO_PRESET=cloudflare_pages`) el
preset pasa a `cloudflare_pages` y escribe `dist/`. `wrangler.toml` con
`pages_build_output_dir = "dist"` y `nodejs_compat`.

**Por qué:** Deploy a Cloudflare falló: el comando ponía
`NITRO_PRESET=cloudflare_pages` pero `vite.config.ts` tenía `preset:
"vercel"` hardcodeado. Nitro escribió `.vercel/output` y Cloudflare
buscó `dist`.

---

## 2026-09-21 — Census 2021 + DCJ alquiler/venta (fin de sample)

**Qué:** Households y Backgrounds pasan a ABS Census 2021 (SAL). Housing
usa mediana de alquiler de **nuevos bonds** DCJ por código postal
(trimestre jun 2026) y mediana de compra DCJ (trimestre mar 2026).
Si un SAL no tiene fila DCJ, se deja el alquiler del Censo 2021 y se
dice. Se fueron los $2,42 m inventados.

**Por qué:** El usuario pidió cifras oficiales, no sample, y no Domain.
El Censo cubre cada polígono mapeado (663/663). El alquiler 2021 no es
el precio de hoy, por eso DCJ por postcode, con nota de que el vecino
puede compartir color.

**Join:** `CG_SAL_2021_POA_2021.xlsx` (mayor `RATIO_FROM_TO`). Bondi y
Bondi Beach → 2026 ($1.050/sem, compra $1,93 m). Mount Druitt → 2770
($530). Penrith → 2750 ($620). 641/663 SAL con DCJ; 22 (pocos bonds o
sin match) quedan en Censo 2021.

**Qué no se tocó:** Safety/BOCSAR, polígonos, ranking por 1.000,
auth, Google.

**Scripts:** `npm run data:census`, `npm run data:housing`. Cache
xlsx/zip en `data/cache/` (gitignored). JSON chicos sí se commitean.
DevDep `exceljs`.

**Copy:** leyenda Households/Backgrounds = “ABS Census 2021”. Housing =
“Weekly rent (new bonds, DCJ)” si hay DCJ.

---

## 2026-09-21 — Greater Sydney + ranking de toda la ciudad

**Qué:** Polígonos ABS SAL ~663 (oeste Penrith/Blacktown/Mount Druitt,
Liverpool, Campbelltown). Cámara muestra Parramatta y Bondi juntos.
Safety ahora tiene cuatro métricas (Combined / Street / Homes / Domestic),
quintiles entre **todos** los suburbios mapeados, por 1.000 habitantes.
Combined = street + home; retail nunca pinta; DV solo el chip Domestic.

**Por qué:** El recorte inner/east hacía que el oeste ni se viera, y las
bandas se calculaban solo entre suburbios de economía nocturna. El inner
east se llevaba todo el rojo y el west parecía calmo aunque no se lo
estuviera comparando con el resto de la ciudad.

**Qué deja de pintar el mapa:** el índice de gravedad (20 sep). Los
conteos extra siguen en la ficha. Pedido explícito de ranking comparable
en toda la ciudad.

**Script:** `npm run data:polygons` + `npm run data:bocsar -- --fresh`.

---

## 2026-09-21 — Memoria de proyecto

**Qué:** `AGENTS.project.md` + este log. Puntero en `AGENTS.md`.

**Por qué:** Hasta acá las decisiones vivían solo en el chat. El usuario
preguntó si se estaba tomando nota. No se estaba. Sin esto, un session
nuevo no sabe por qué el mapa es per cápita y ponderado.

---

## 2026-09-20 — Índice de gravedad (harm-weighted)

**Qué:** El color de Safety dejó de tratar todos los delitos igual.
Pasa a tasa ponderada por 1.000 habitantes. Entran homicidio, agresión
sexual, hurto a persona, asalto a policía. La ficha sigue mostrando
conteos crudos con el ×peso.

**Por qué:** Un hurto de auto valía lo mismo que un asalto; no entraba
una violación. Los suburbios ruidosos de hurtos menores se veían igual
de “altos” que los de violencia. Pedido del usuario.

**Qué no se pudo:** BOCSAR a nivel suburbio no separa pelea de borrachos
de agresión grave (todo es Non-DV assault).

**Superseded:** el color volvió a tasas sin peso el 21 sep (Greater
Sydney comparable). Los conteos extra se quedan.

---

## 2026-09-20 — Push a `main`

**Qué:** `7522b27` en https://github.com/RodriSPAUS/sydney-areas

**Incluye:** 357 polígonos ABS, BOCSAR en todos los suburbios del mapa,
tasa por 1.000 (Censo 2021). No incluye el índice de gravedad (eso fue
después).

**Por qué:** El usuario preguntó si estaba en `main`. No estaba.

---

## 2026-09-20 — Por 1.000 habitantes

**Qué:** Ranking por tasa (conteo / población 2021 × 1000), no por
conteo crudo. `MIN_POP = 100`.

**Por qué:** “A más habitantes, parece más peligroso.” Bondi no es
comparable a un suburbio chico si solo se suman incidentes.

---

## 2026-09-20 — BOCSAR en todos los suburbios del mapa

**Qué:** Safety en cada polígono mapeado, no solo los 20 del prototipo.

**Por qué:** “Ponlo en todos los suburbios que están en el mapa.”

**Sigue igual (entonces):** Housing / households / backgrounds = sample.
Eso cambió el 21 sep (Census 2021 + DCJ).
