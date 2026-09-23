import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnalyticsBridge } from "@/components/analytics-bridge";
import { FirstVisitCard } from "@/components/first-visit-card";
import { LayerBar } from "@/components/layer-bar";
import { MapLegend } from "@/components/map-legend";
import { SuburbSearch } from "@/components/suburb-search";
import { SuburbSheet } from "@/components/suburb-sheet";
import { SydneyMap } from "@/components/sydney-map";
import { suburbsById } from "@/data/suburbs";
import { AFFILIATION_LINE, APP_DESCRIPTION, APP_NAME, FOOTER_LINE, PLACE_LINE, TAGLINE } from "@/lib/copy";
import { useMapStore } from "@/lib/map-store";
import {
  layerFromSearch,
  metricFromSearch,
  sameSearch,
  searchFromState,
  validateMapSearch,
} from "@/lib/map-url";
import { shareTitle } from "@/lib/share-title";

export const Route = createFileRoute("/")({
  validateSearch: validateMapSearch,
  head: ({ match }) => {
    const title = shareTitle(match.search.s, layerFromSearch(match.search));
    return {
      meta: [
        { title },
        { property: "og:title", content: title },
        { property: "og:description", content: APP_DESCRIPTION },
        { property: "og:image", content: "/og.jpg" },
        { name: "twitter:title", content: title },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
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
  const headerRef = useRef<HTMLElement>(null);
  const [legendTop, setLegendTop] = useState(156);

  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const update = () => setLegendTop(Math.round(el.getBoundingClientRect().bottom + 8));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

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
      <AnalyticsBridge />
      <SydneyMap />

      <header
        ref={headerRef}
        className="pointer-events-none absolute inset-x-0 top-0 z-30 px-3 pt-[max(0.6rem,env(safe-area-inset-top))] md:px-4"
      >
        <div className="pointer-events-auto mx-auto max-w-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-sm font-semibold tracking-tight text-fg md:text-xl">{APP_NAME}</h1>
              <p className="text-[10px] leading-tight text-muted">{PLACE_LINE}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted md:text-xs">{TAGLINE}</p>
              <p className="mt-0.5 text-[10px] leading-snug text-muted md:text-[11px]">
                {AFFILIATION_LINE}
              </p>
            </div>
            <Link
              to="/about"
              className="mt-0.5 shrink-0 text-xs font-medium text-muted underline-offset-2 hover:text-fg hover:underline"
            >
              About
            </Link>
          </div>
          <div className="mt-2">
            <SuburbSearch />
          </div>
        </div>
      </header>

      <div className="pointer-events-none absolute left-3 z-20" style={{ top: legendTop }}>
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
        {FOOTER_LINE}{" "}
        <Link
          to="/about"
          className="pointer-events-auto font-medium underline-offset-2 hover:text-fg hover:underline"
        >
          About
        </Link>
      </p>

      <FirstVisitCard />
      <SuburbSheet />
    </main>
  );
}
