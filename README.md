# Sydney Areas

Mapa de 20 suburbios de Greater Sydney. Sin cuenta. Datos inventados para probar el producto — no es salida oficial de ABS ni BOCSAR.

## Qué hace

- Mapa a pantalla completa (MapLibre + OpenStreetMap)
- Formas reales de suburbio (OpenStreetMap)
- Capas: Safety, Housing, Households, Backgrounds
- Pines de servicios (hospital, school, station)
- Hover para ver cifras; clic para el perfil

## Cómo correrlo

```bash
npm install
npm run dev
```

Abrí la URL que imprime Vite (por defecto el puerto 8080).

## Datos

Las cifras viven en `src/data/suburbs.ts`. Los polígonos, en `src/data/suburb-polygons.json`.
Reemplazalos cuando haya API (Census 2021 / BOCSAR).
