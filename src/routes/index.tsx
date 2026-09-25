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
import { APP_DESCRIPTION, APP_NAME, CONTACT_EMAIL, FOOTER_LINE, FOOTER_LINE_SHORT, PLACE_LINE, SITE_URL } from "@/lib/copy";
import { useMapStore } from "@/lib/map-store";
import {
  layerFromSearch,
  metricFromSearch,
  searchFromState,
  validateMapSearch,
} from "@/lib/map-url";
import { shareTitle } from "@/lib/share-title";

export const Route = createFileRoute("/")({
  validateSearch: validateMapSearch,
  head: ({ match }) => {
    const title = shareTitle(match.search.s, layerFromSearch(match.search));
    // A shared suburb link keeps its own card URL; search engines get one canonical map.
    const query = new URLSearchParams(
      Object.entries(match.search).filter((e): e is [string, string] => typeof e[1] === "string"),
    ).toString();
    return {
      meta: [
        { title },
        { property: "og:title", content: title },
        { property: "og:description", content: APP_DESCRIPTION },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `${SITE_URL}/${query ? `?${query}` : ""}` },
        { property: "og:image", content: `${SITE_URL}/og.jpg` },
        { name: "twitter:title", content: title },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: `${SITE_URL}/` }],
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
    const write = () => {
      const next = searchFromState(useMapStore.getState());
      const params = new URLSearchParams(window.location.search);
      const rawLayer = params.get("layer") ?? undefined;
      const rawMetric = params.get("metric") ?? undefined;
      const rawId = params.get("s") ?? undefined;
      if (rawId === next.s && rawLayer === next.layer && rawMetric === next.metric) return;
      void navigate({
        search: next,
        replace: true,
      });
    };
    write();
    return useMapStore.subscribe(write);
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
        <div className="pointer-events-auto mx-auto max-w-lg rounded-2xl bg-surface/80 px-3 py-1.5 shadow-[var(--shadow-border)] backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-sm font-semibold tracking-tight text-fg md:text-base">{APP_NAME}</h1>
            <Link
              to="/about"
              className="shrink-0 text-xs font-medium text-muted underline-offset-2 hover:text-fg hover:underline"
            >
              About
            </Link>
          </div>
          <p className="text-[10px] leading-tight text-muted">{PLACE_LINE}</p>
          <div className="mt-1">
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
        <span className="md:hidden">{FOOTER_LINE_SHORT}</span>
        <span className="hidden md:inline">{FOOTER_LINE}</span>{" "}
        <Link
          to="/about"
          className="pointer-events-auto font-medium underline-offset-2 hover:text-fg hover:underline"
        >
          About
        </Link>
        {" · "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="pointer-events-auto font-medium underline-offset-2 hover:text-fg hover:underline"
        >
          Contact
        </a>
      </p>

      <FirstVisitCard />
      <SuburbSheet />
    </main>
  );
}
