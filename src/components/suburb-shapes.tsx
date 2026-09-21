import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useMemo, useState } from "react";
import { SuburbTooltip } from "@/components/suburb-tooltip";
import { suburbs } from "@/data/suburbs";
import { suburbFill } from "@/lib/choropleth";
import { featureBBox, projectGeometry, suburbGeometry } from "@/lib/geo";
import { useMapStore } from "@/lib/map-store";
import { cn } from "@/lib/utils";

const WORLD: [number, number, number, number] = [150.55, -34.22, 151.42, -33.52];

function geoProject(lng: number, lat: number) {
  const [west, south, east, north] = WORLD;
  return {
    x: ((lng - west) / (east - west)) * 1000,
    y: ((north - lat) / (north - south)) * 1000,
  };
}

function canHover() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export function SuburbShapes({ map }: { map: MapLibreMap | null }) {
  const choropleth = useMapStore((s) => s.choropleth);
  const safetyMetric = useMapStore((s) => s.safetyMetric);
  const selectedId = useMapStore((s) => s.selectedId);
  const selectSuburb = useMapStore((s) => s.selectSuburb);
  const [size, setSize] = useState({ w: 1, h: 1 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [cursor, setCursor] = useState({ x: 24, y: 24 });

  useEffect(() => {
    if (!map) return;
    const bump = () => {
      const el = map.getContainer();
      setSize({ w: Math.max(el.clientWidth, 1), h: Math.max(el.clientHeight, 1) });
    };
    map.on("move", bump);
    map.on("resize", bump);
    bump();
    return () => {
      map.off("move", bump);
      map.off("resize", bump);
    };
  }, [map]);

  const selected = suburbs.find((s) => s.id === selectedId);
  const hovered = suburbs.find((s) => s.id === hoveredId);

  const viewBox = useMemo(() => {
    if (map) return `0 0 ${size.w} ${size.h}`;
    const focus = selected ?? hovered;
    if (!focus) return "0 0 1000 1000";
    const box = featureBBox(focus.id);
    if (!box) return "0 0 1000 1000";
    const [west, south, east, north] = WORLD;
    const [w, s, e, n] = box;
    const padX = (e - w) * 1.8;
    const padY = (n - s) * 1.8;
    const x = ((w - padX - west) / (east - west)) * 1000;
    const y = ((north - (n + padY)) / (north - south)) * 1000;
    const bw = ((e + padX - (w - padX)) / (east - west)) * 1000;
    const bh = ((n + padY - (s - padY)) / (north - south)) * 1000;
    return `${x} ${y} ${bw} ${bh}`;
  }, [map, size.w, size.h, selected, hovered]);

  const ordered = useMemo(() => {
    return [...suburbs].sort((a, b) => {
      const rank = (id: string) => (id === selectedId ? 2 : id === hoveredId ? 1 : 0);
      return rank(a.id) - rank(b.id);
    });
  }, [hoveredId, selectedId]);

  const project = (lng: number, lat: number) => {
    if (map) return map.project({ lng, lat });
    return geoProject(lng, lat);
  };

  return (
    <div
      className="absolute inset-0 z-10"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left + 16;
        const y = e.clientY - rect.top + 18;
        const maxX = rect.width - 244;
        const maxY = rect.height - 128;
        setCursor({ x: Math.max(8, Math.min(x, maxX)), y: Math.max(8, Math.min(y, maxY)) });
      }}
      onMouseLeave={() => setHoveredId(null)}
    >
      <svg
        className={cn("pointer-events-none absolute inset-0 h-full w-full", !map && "bg-[#e8e4dc]")}
        viewBox={viewBox}
        preserveAspectRatio={map ? "none" : "xMidYMid meet"}
        role="img"
        aria-label="Suburb boundaries"
      >
        {ordered.map((suburb) => {
          const geom = suburbGeometry(suburb.id);
          if (!geom) return null;
          const d = projectGeometry(geom, project);
          const on = suburb.id === selectedId;
          const hover = suburb.id === hoveredId;
          const dim = Boolean(selectedId || hoveredId) && !on && !hover;
          return (
            <path
              key={suburb.id}
              d={d}
              fill={suburbFill(suburb, choropleth, safetyMetric)}
              fillRule="evenodd"
              className={cn(
                "suburb-poly pointer-events-auto",
                dim && "is-dim",
                hover && "is-hover",
                on && "is-selected",
              )}
              aria-label={suburb.name}
              onMouseEnter={() => {
                if (canHover()) setHoveredId(suburb.id);
              }}
              onFocus={() => setHoveredId(suburb.id)}
              onClick={(e) => {
                e.stopPropagation();
                selectSuburb(suburb.id);
              }}
            />
          );
        })}
      </svg>
      {hovered && canHover() ? (
        <SuburbTooltip suburb={hovered} layer={choropleth} metric={safetyMetric} x={cursor.x} y={cursor.y} />
      ) : null}
    </div>
  );
}
