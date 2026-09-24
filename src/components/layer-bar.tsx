import { Globe2, Home, Shield, TrainFront } from "lucide-react";
import type { Choropleth, SafetyMetric } from "@/lib/map-store";
import { useMapStore } from "@/lib/map-store";
import { cn } from "@/lib/utils";

export const LAYERS: { id: Choropleth; label: string; icon: typeof Shield }[] = [
  { id: "safety", label: "Safety", icon: Shield },
  { id: "housing", label: "Housing", icon: Home },
  { id: "access", label: "Access", icon: TrainFront },
  { id: "backgrounds", label: "Backgrounds", icon: Globe2 },
];

export const METRICS: { id: SafetyMetric; label: string }[] = [
  { id: "all", label: "All" },
  { id: "violence", label: "Violence" },
  { id: "property", label: "Property" },
  { id: "domestic", label: "Domestic" },
];

export function LayerBar() {
  const choropleth = useMapStore((s) => s.choropleth);
  const setChoropleth = useMapStore((s) => s.setChoropleth);
  const safetyMetric = useMapStore((s) => s.safetyMetric);
  const setSafetyMetric = useMapStore((s) => s.setSafetyMetric);

  return (
    <div className="pointer-events-auto flex max-w-full flex-col items-center gap-2 md:items-start">
      <div
        role="radiogroup"
        aria-label="Map layer"
        className="flex max-w-full shrink-0 overflow-x-auto rounded-2xl bg-surface/80 p-1 shadow-[var(--shadow-border)] backdrop-blur-md no-scrollbar"
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
          className="flex rounded-2xl bg-surface/80 p-1 shadow-[var(--shadow-border)] backdrop-blur-md"
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
    </div>
  );
}
