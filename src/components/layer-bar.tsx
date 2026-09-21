import { Globe2, Home, Shield, Users } from "lucide-react";
import { FILTER_CHIPS, filterMatchCount } from "@/lib/filters";
import type { Choropleth, LayerFilter, SafetyMetric } from "@/lib/map-store";
import { useMapStore } from "@/lib/map-store";
import { cn } from "@/lib/utils";

const LAYERS: { id: Choropleth; label: string; icon: typeof Shield }[] = [
  { id: "safety", label: "Safety", icon: Shield },
  { id: "housing", label: "Housing", icon: Home },
  { id: "households", label: "Households", icon: Users },
  { id: "backgrounds", label: "Backgrounds", icon: Globe2 },
];

const METRICS: { id: SafetyMetric; label: string }[] = [
  { id: "combined", label: "Combined" },
  { id: "street", label: "Street" },
  { id: "dwelling", label: "Homes" },
  { id: "domestic", label: "Domestic" },
];

export function LayerBar() {
  const choropleth = useMapStore((s) => s.choropleth);
  const setChoropleth = useMapStore((s) => s.setChoropleth);
  const safetyMetric = useMapStore((s) => s.safetyMetric);
  const setSafetyMetric = useMapStore((s) => s.setSafetyMetric);
  const layerFilter = useMapStore((s) => s.layerFilter);
  const setLayerFilter = useMapStore((s) => s.setLayerFilter);
  const chips = FILTER_CHIPS[choropleth];
  const matchCount = filterMatchCount(choropleth, safetyMetric, layerFilter);

  return (
    <div className="pointer-events-auto flex max-w-full flex-col items-center gap-2 md:items-start">
      <div
        role="radiogroup"
        aria-label="Map layer"
        className="flex max-w-full shrink-0 overflow-x-auto rounded-2xl bg-surface p-1 shadow-[var(--shadow-border)] no-scrollbar"
      >
        {LAYERS.map(({ id, label, icon: Icon }) => {
          const on = choropleth === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setChoropleth(id)}
              className={cn(
                "flex h-11 min-w-11 shrink-0 items-center gap-1 rounded-xl px-2.5 text-xs font-medium whitespace-nowrap sm:gap-1.5 sm:px-3 sm:text-sm",
                "transition-[background-color,color,transform] duration-150 ease-out",
                "active:scale-[0.96]",
                on ? "bg-ink text-bg" : "text-muted hover:text-fg",
              )}
            >
              <Icon className="hidden size-4 shrink-0 sm:block" strokeWidth={2} aria-hidden />
              {label}
            </button>
          );
        })}
      </div>
      {choropleth === "safety" ? (
        <div
          role="radiogroup"
          aria-label="Safety metric"
          className="flex rounded-2xl bg-surface p-1 shadow-[var(--shadow-border)]"
        >
          {METRICS.map(({ id, label }) => {
            const on = safetyMetric === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setSafetyMetric(id)}
                className={cn(
                  "flex h-9 min-w-11 shrink-0 items-center justify-center rounded-xl px-2.5 text-[11px] font-medium sm:px-3 sm:text-xs",
                  "transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.96]",
                  on ? "bg-ink text-bg" : "text-muted hover:text-fg",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : null}
      <div
        role="radiogroup"
        aria-label="Filter suburbs"
        className="flex max-w-full overflow-x-auto rounded-2xl bg-surface p-1 shadow-[var(--shadow-border)] no-scrollbar"
      >
        {chips.map(({ id, label }) => {
          const on = layerFilter === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setLayerFilter(id as LayerFilter)}
              className={cn(
                "flex h-9 min-w-11 shrink-0 items-center justify-center rounded-xl px-2.5 text-[11px] font-medium whitespace-nowrap sm:px-3 sm:text-xs",
                "transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.96]",
                on ? "bg-ink text-bg" : "text-muted hover:text-fg",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
      {layerFilter !== "all" ? (
        <p className="px-1 text-[10px] tracking-wide text-muted tabular-nums">
          {matchCount} suburbs match
        </p>
      ) : null}
    </div>
  );
}
