import { useEffect, useRef } from "react";
import { suburbsById } from "@/data/suburbs";
import { track, trackOutbound } from "@/lib/analytics";
import { useMapStore } from "@/lib/map-store";

export function AnalyticsBridge() {
  const choropleth = useMapStore((s) => s.choropleth);
  const safetyMetric = useMapStore((s) => s.safetyMetric);
  const selectedId = useMapStore((s) => s.selectedId);
  const layerKey = choropleth === "safety" ? `safety:${safetyMetric}` : choropleth;
  const lastLayer = useRef<string | null>(null);
  const lastSuburb = useRef<string | null>(null);
  const skipLayerMount = useRef(true);

  useEffect(() => {
    if (skipLayerMount.current) {
      skipLayerMount.current = false;
      lastLayer.current = layerKey;
      return;
    }
    if (lastLayer.current === layerKey) return;
    lastLayer.current = layerKey;
    const props =
      choropleth === "safety" ? { layer: choropleth, metric: safetyMetric } : { layer: choropleth };
    track("layer", props);
  }, [layerKey, choropleth, safetyMetric]);

  useEffect(() => {
    if (!selectedId) {
      lastSuburb.current = null;
      return;
    }
    if (lastSuburb.current === selectedId) return;
    const suburb = suburbsById[selectedId];
    if (!suburb) return;
    lastSuburb.current = selectedId;
    track("suburb_open", { suburb: selectedId, name: suburb.name, layer: choropleth });
  }, [selectedId, choropleth]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const raw = anchor.getAttribute("href");
      if (!raw || !/^https?:/i.test(raw)) return;
      let url: URL;
      try {
        url = new URL(raw);
      } catch {
        return;
      }
      if (url.host === window.location.host) return;
      const label = anchor.textContent?.trim() || undefined;
      trackOutbound(url.href, label);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
