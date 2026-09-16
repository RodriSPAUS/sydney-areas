import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { SuburbShapes } from "@/components/suburb-shapes";
import { suburbsById } from "@/data/suburbs";
import { bboxCorners, featureBBox, fitPadding, servicesGeoJSON } from "@/lib/geo";
import { useMapStore } from "@/lib/map-store";

const SYDNEY: [number, number] = [151.21, -33.87];
const DEFAULT_ZOOM = 10.2;
const MAX_BOUNDS: [[number, number], [number, number]] = [
  [150.48, -34.15],
  [151.42, -33.55],
];

const OSM_RASTER: StyleSpecification = {
  version: 8,
  name: "osm-carto-light",
  glyphs: "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors © CARTO",
      maxzoom: 20,
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#e8e4dc" },
    },
    { id: "carto-basemap", type: "raster", source: "carto" },
  ],
};

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
      maxZoom: 14,
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

export function SydneyMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const fittedFor = useRef<string | null>(null);
  const [mapObj, setMapObj] = useState<MapLibreMap | null>(null);
  const [svgOnly, setSvgOnly] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;
    let ro: ResizeObserver | undefined;
    let map: MapLibreMap | undefined;
    let onResize: (() => void) | undefined;
    const timers: number[] = [];

    const ready = import("maplibre-gl")
      .then((maplibregl) => {
        if (cancelled || !containerRef.current) return;
        const instance = new maplibregl.Map({
          container: containerRef.current,
          style: OSM_RASTER,
          center: SYDNEY,
          zoom: DEFAULT_ZOOM,
          minZoom: 9,
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
          if (!instance.getSource("services")) {
            instance.addSource("services", { type: "geojson", data: servicesGeoJSON() });
            instance.addLayer({
              id: "service-dots",
              type: "circle",
              source: "services",
              layout: {
                visibility: useMapStore.getState().servicesOn ? "visible" : "none",
              },
              paint: {
                "circle-radius": 8,
                "circle-color": [
                  "match",
                  ["get", "type"],
                  "hospital",
                  "#B56A5C",
                  "school",
                  "#3D7A72",
                  "#4A5560",
                ],
                "circle-stroke-width": 2,
                "circle-stroke-color": "#FFFCFF",
              },
            });
          }
          const selected = useMapStore.getState().selectedId;
          if (selected && fittedFor.current !== selected) {
            fittedFor.current = selected;
            fitToSelected(instance);
          }
        };

        instance.on("load", onStyleReady);
        if (instance.loaded()) onStyleReady();
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

  const servicesOn = useMapStore((s) => s.servicesOn);
  const selectedId = useMapStore((s) => s.selectedId);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer("service-dots")) return;
    map.setLayoutProperty("service-dots", "visibility", servicesOn ? "visible" : "none");
  }, [servicesOn]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (selectedId && fittedFor.current !== selectedId) {
      fittedFor.current = selectedId;
      if (map.isStyleLoaded()) fitToSelected(map);
    }
    if (!selectedId) fittedFor.current = null;
  }, [selectedId]);

  return (
    <div className="absolute inset-0 h-full w-full bg-[#e8e4dc]">
      <div
        ref={containerRef}
        className="absolute inset-0 h-full w-full"
        aria-label="Map of Greater Sydney suburbs"
      />
      <SuburbShapes map={svgOnly ? null : mapObj} />
    </div>
  );
}
