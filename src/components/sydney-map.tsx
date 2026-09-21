import type {
  ExpressionSpecification,
  Map as MapLibreMap,
  MapGeoJSONFeature,
  StyleSpecification,
} from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { SuburbShapes } from "@/components/suburb-shapes";
import { SuburbTooltip } from "@/components/suburb-tooltip";
import { suburbsById } from "@/data/suburbs";
import { fillColorExpression } from "@/lib/choropleth";
import { bboxCorners, featureBBox, fitPadding, suburbPolygonCount, suburbsGeoJSON } from "@/lib/geo";
import { useMapStore } from "@/lib/map-store";

const SYDNEY: [number, number] = [151.02, -33.86];
const DEFAULT_ZOOM = 9.4;
const MAX_BOUNDS: [[number, number], [number, number]] = [
  [150.55, -34.22],
  [151.42, -33.52],
];
/** Greater Sydney urban view — Penrith/Blacktown west to Bondi east. */
const ZONE_BOUNDS: [[number, number], [number, number]] = [
  [150.72, -34.06],
  [151.32, -33.7],
];

const BASEMAP: StyleSpecification = {
  version: 8,
  name: "esri-light-gray",
  glyphs: "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
  sources: {
    esri: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Tiles © Esri · Boundaries ABS · Safety BOCSAR",
      maxzoom: 16,
    },
    esriRef: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 16,
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#e8e4dc" },
    },
    {
      id: "esri-base",
      type: "raster",
      source: "esri",
      paint: { "raster-opacity": 0.94 },
    },
    {
      id: "esri-ref",
      type: "raster",
      source: "esriRef",
      paint: { "raster-opacity": 0.88 },
    },
  ],
};

function fillOpacity(selectedId: string): ExpressionSpecification {
  return [
    "case",
    ["==", ["get", "id"], selectedId],
    0.9,
    ["boolean", ["feature-state", "hover"], false],
    0.86,
    ["==", ["get", "hasFigures"], 1],
    selectedId ? 0.62 : 0.72,
    selectedId ? 0.48 : 0.58,
  ];
}

function lineWidth(selectedId: string): ExpressionSpecification {
  return [
    "case",
    ["==", ["get", "id"], selectedId],
    2.55,
    ["boolean", ["feature-state", "hover"], false],
    2.25,
    1.15,
  ];
}

function lineColor(selectedId: string): ExpressionSpecification {
  return [
    "case",
    ["==", ["get", "id"], selectedId],
    "#1C1917",
    ["boolean", ["feature-state", "hover"], false],
    "#1C1917",
    "#4A433C",
  ];
}

function canHover() {
  return typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function fitToSelected(map: MapLibreMap) {
  const id = useMapStore.getState().selectedId;
  if (!id) return;
  const suburb = suburbsById[id];
  if (!suburb) return;
  const box = featureBBox(id) ?? suburb.bbox;
  const padding = fitPadding(true);
  try {
    map.fitBounds(bboxCorners(box), {
      padding,
      duration: 650,
      maxZoom: 13,
      essential: true,
    });
  } catch {
    const [west, south, east, north] = box;
    map.easeTo({
      center: [(west + east) / 2, (south + north) / 2],
      zoom: 13.2,
      duration: 650,
      essential: true,
    });
  }
}

function addLayers(map: MapLibreMap) {
  if (map.getSource("suburbs")) return;
  map.addSource("suburbs", {
    type: "geojson",
    data: suburbsGeoJSON(),
    promoteId: "id",
  });

  const choropleth = useMapStore.getState().choropleth;
  const selectedId = useMapStore.getState().selectedId ?? "";

  map.addLayer({
    id: "suburbs-fill",
    type: "fill",
    source: "suburbs",
    paint: {
      "fill-color": fillColorExpression(choropleth, useMapStore.getState().safetyMetric),
      "fill-opacity": fillOpacity(selectedId),
      "fill-opacity-transition": { duration: 160 },
      "fill-antialias": true,
    },
  });
  map.addLayer({
    id: "suburbs-casing",
    type: "line",
    source: "suburbs",
    paint: {
      "line-color": "#FFFCFF",
      "line-width": ["interpolate", ["linear"], ["zoom"], 9, 1.8, 12, 2.6],
      "line-opacity": 0.55,
    },
  });
  map.addLayer({
    id: "suburbs-outline",
    type: "line",
    source: "suburbs",
    paint: {
      "line-color": lineColor(selectedId),
      "line-width": lineWidth(selectedId),
      "line-opacity": 0.95,
    },
  });
  map.addLayer({
    id: "suburb-labels",
    type: "symbol",
    source: "suburbs",
    minzoom: 12,
    layout: {
      "text-field": ["get", "name"],
      "text-size": 11,
      "text-font": ["Noto Sans Regular"],
      "text-padding": 4,
    },
    paint: {
      "text-color": "#1C1917",
      "text-halo-color": "#FFFCFF",
      "text-halo-width": 1.2,
    },
  });
}

export function SydneyMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const fittedFor = useRef<string | null>(null);
  const hoveredRef = useRef<string | null>(null);
  const [mapObj, setMapObj] = useState<MapLibreMap | null>(null);
  const [svgOnly, setSvgOnly] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [cursor, setCursor] = useState({ x: 24, y: 24 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;
    let ro: ResizeObserver | undefined;
    let map: MapLibreMap | undefined;
    let onResize: (() => void) | undefined;
    const timers: number[] = [];

    const ready = Promise.all([
      import("maplibre-gl"),
      import("maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"),
    ])
      .then(([maplibregl, worker]) => {
        if (cancelled || !containerRef.current) return;
        maplibregl.setWorkerUrl(worker.default);
        const instance = new maplibregl.Map({
          container: containerRef.current,
          style: BASEMAP,
          center: SYDNEY,
          zoom: DEFAULT_ZOOM,
          minZoom: 8.5,
          maxZoom: 16,
          maxBounds: MAX_BOUNDS,
          attributionControl: { compact: true },
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          maxPitch: 0,
        });
        map = instance;
        mapRef.current = instance;
        setMapObj(instance);

        onResize = () => {
          if (!instance.getContainer().clientWidth) return;
          instance.resize();
        };

        const onStyleReady = () => {
          onResize?.();
          addLayers(instance);
          if (!useMapStore.getState().selectedId) {
            try {
              instance.fitBounds(ZONE_BOUNDS, {
                padding: 28,
                duration: 0,
                essential: true,
              });
            } catch {
              /* keep default center */
            }
          }
          const selected = useMapStore.getState().selectedId;
          if (selected && fittedFor.current !== selected) {
            fittedFor.current = selected;
            fitToSelected(instance);
          }
        };

        instance.on("load", onStyleReady);
        if (instance.loaded()) onStyleReady();

        let skipDeselect = false;
        instance.on("click", "suburbs-fill", (e) => {
          skipDeselect = true;
          const id = e.features?.[0]?.properties?.id as string | undefined;
          useMapStore.getState().selectSuburb(id ?? null);
        });
        instance.on("click", () => {
          if (skipDeselect) {
            skipDeselect = false;
            return;
          }
          useMapStore.getState().selectSuburb(null);
        });
        instance.on("mousemove", "suburbs-fill", (e) => {
          if (!canHover()) return;
          const feat = e.features?.[0] as MapGeoJSONFeature | undefined;
          const id = (feat?.properties?.id as string | undefined) ?? null;
          instance.getCanvas().style.cursor = id ? "pointer" : "";
          if (hoveredRef.current && hoveredRef.current !== id) {
            instance.setFeatureState({ source: "suburbs", id: hoveredRef.current }, { hover: false });
          }
          if (id) instance.setFeatureState({ source: "suburbs", id }, { hover: true });
          hoveredRef.current = id;
          setHoverId(id);
          const rect = instance.getContainer().getBoundingClientRect();
          setCursor({
            x: Math.min(e.point.x + 16, rect.width - 244),
            y: Math.min(e.point.y + 16, rect.height - 128),
          });
        });
        instance.on("mouseleave", "suburbs-fill", () => {
          if (hoveredRef.current) {
            instance.setFeatureState({ source: "suburbs", id: hoveredRef.current }, { hover: false });
          }
          hoveredRef.current = null;
          setHoverId(null);
          instance.getCanvas().style.cursor = "";
        });
        instance.on("webglcontextlost", () => {
          setSvgOnly(true);
          setMapObj(null);
        });

        ro = new ResizeObserver(() => onResize?.());
        ro.observe(containerRef.current);
        window.addEventListener("resize", onResize);
        timers.push(window.setTimeout(() => onResize?.(), 80));
        timers.push(window.setTimeout(() => onResize?.(), 300));
        timers.push(window.setTimeout(() => onResize?.(), 1000));
      })
      .catch(() => {
        if (!cancelled) setSvgOnly(true);
      });

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
      ro?.disconnect();
      if (onResize) window.removeEventListener("resize", onResize);
      void ready.then(() => {
        map?.remove();
        if (mapRef.current === map) mapRef.current = null;
      });
      setMapObj(null);
    };
  }, []);

  const choropleth = useMapStore((s) => s.choropleth);
  const safetyMetric = useMapStore((s) => s.safetyMetric);
  const selectedId = useMapStore((s) => s.selectedId);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer("suburbs-fill")) return;
    map.setPaintProperty("suburbs-fill", "fill-color", fillColorExpression(choropleth, safetyMetric));
  }, [choropleth, safetyMetric]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer("suburbs-fill")) return;
    const id = selectedId ?? "";
    map.setPaintProperty("suburbs-fill", "fill-opacity", fillOpacity(id));
    map.setPaintProperty("suburbs-outline", "line-color", lineColor(id));
    map.setPaintProperty("suburbs-outline", "line-width", lineWidth(id));
    if (selectedId && fittedFor.current !== selectedId) {
      fittedFor.current = selectedId;
      if (map.isStyleLoaded()) fitToSelected(map);
    }
    if (!selectedId) fittedFor.current = null;
  }, [selectedId]);

  const hovered = hoverId ? suburbsById[hoverId] : undefined;

  return (
    <div className="absolute inset-0 h-full w-full bg-[#e8e4dc]">
      <div
        ref={containerRef}
        className="absolute inset-0 h-full w-full"
        aria-label="Map of Greater Sydney suburbs"
        data-suburb-count={suburbPolygonCount}
      />
      {svgOnly ? <SuburbShapes map={mapObj} /> : null}
      {!svgOnly && hovered ? (
        <SuburbTooltip suburb={hovered} layer={choropleth} metric={safetyMetric} x={cursor.x} y={cursor.y} />
      ) : null}
    </div>
  );
}
