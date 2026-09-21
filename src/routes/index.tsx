import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useLayoutEffect } from "react";
import { LayerBar } from "@/components/layer-bar";
import { MapLegend } from "@/components/map-legend";
import { SuburbSearch } from "@/components/suburb-search";
import { SuburbSheet } from "@/components/suburb-sheet";
import { SydneyMap } from "@/components/sydney-map";
import { suburbsById } from "@/data/suburbs";
import { useMapStore } from "@/lib/map-store";
import {
  layerFromSearch,
  metricFromSearch,
  sameSearch,
  searchFromState,
  validateMapSearch,
} from "@/lib/map-url";

export const Route = createFileRoute("/")({
  validateSearch: validateMapSearch,
  component: Home,
});

function UrlSync() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  useLayoutEffect(() => {
    const selectedId = search.s && suburbsById[search.s] ? search.s : null;
    const choropleth = layerFromSearch(search);
    const safetyMetric = metricFromSearch(search);
    const st = useMapStore.getState();
    if (
      st.selectedId !== selectedId ||
      st.choropleth !== choropleth ||
      st.safetyMetric !== safetyMetric
    ) {
      useMapStore.setState({
        selectedId,
        choropleth,
        safetyMetric,
        ...(selectedId && selectedId !== st.selectedId ? { focusSeq: st.focusSeq + 1 } : {}),
      });
    }
  }, [search.s, search.layer, search.metric]);

  useEffect(() => {
    return useMapStore.subscribe((state) => {
      const next = searchFromState(state);
      void navigate({
        search: (prev) => (sameSearch(prev, next) ? prev : next),
        replace: true,
      });
    });
  }, [navigate]);

  return null;
}

function Home() {
  const selectedId = useMapStore((s) => s.selectedId);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") useMapStore.getState().selectSuburb(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <UrlSync />
      <SydneyMap />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-[max(0.6rem,env(safe-area-inset-top))] md:px-4">
        <div className="pointer-events-auto mx-auto flex max-w-lg items-center gap-2 md:block">
          <h1 className="shrink-0 text-sm font-semibold tracking-tight text-fg md:text-xl">
            Sydney Areas
          </h1>
          <div className="min-w-0 flex-1 md:mt-2">
            <SuburbSearch />
          </div>
        </div>
      </header>

      <div className="pointer-events-none absolute top-[4.25rem] left-3 z-20 md:top-36">
        <MapLegend />
      </div>

      <div
        className={
          selectedId
            ? "pointer-events-none absolute inset-x-0 bottom-[calc(42vh+0.5rem)] z-20 hidden px-3 md:right-[372px] md:bottom-12 md:left-0 md:block md:px-4"
            : "pointer-events-none absolute inset-x-0 bottom-14 z-20 px-3 md:bottom-12 md:px-4"
        }
      >
        <div className="flex justify-center md:justify-start">
          <LayerBar />
        </div>
      </div>

      <p className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-bg/90 px-3 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] text-center text-[10px] leading-tight text-muted md:bg-transparent md:text-left">
        Boundaries: ABS SAL 2021. Safety: BOCSAR. Households and ancestry: Census 2021. Rent: DCJ or
        Census 2021.
      </p>

      <SuburbSheet />
    </main>
  );
}
