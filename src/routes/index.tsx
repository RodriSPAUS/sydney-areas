import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { LayerBar } from "@/components/layer-bar";
import { MapLegend } from "@/components/map-legend";
import { SuburbSearch } from "@/components/suburb-search";
import { SuburbSheet } from "@/components/suburb-sheet";
import { SydneyMap } from "@/components/sydney-map";
import { useMapStore } from "@/lib/map-store";

export const Route = createFileRoute("/")({ component: Home });

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
      <SydneyMap />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-4">
        <div className="pointer-events-auto mx-auto max-w-lg">
          <h1 className="text-xl font-semibold tracking-tight text-fg">Sydney Areas</h1>
          <div className="mt-2">
            <SuburbSearch />
          </div>
          <p className="mt-1.5 text-xs font-medium text-muted">
            Pasá el mouse sobre un suburbio. Toda esta zona, suburbio por suburbio.
          </p>
        </div>
      </header>

      <div className="pointer-events-none absolute top-36 left-3 z-20 md:top-40">
        <MapLegend />
      </div>

      <div
        className={
          selectedId
            ? "pointer-events-none absolute inset-x-0 bottom-16 z-20 hidden px-3 md:right-[372px] md:bottom-12 md:left-0 md:block md:px-4"
            : "pointer-events-none absolute inset-x-0 bottom-16 z-20 px-3 md:bottom-12 md:px-4"
        }
      >
        <div className="flex justify-center md:justify-start">
          <LayerBar />
        </div>
      </div>

      <p className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-bg/90 px-3 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] text-center text-[10px] leading-tight text-muted md:bg-transparent md:text-left">
        Límites: ABS SAL 2021. Seguridad: BOCSAR por 1.000 habitantes (Censo 2021). Vivienda y
        hogares: cifras de muestra.
      </p>

      <SuburbSheet />
    </main>
  );
}
