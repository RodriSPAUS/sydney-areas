import { Globe2, Home, MapPin, Shield, Users } from "lucide-react";
import type { Choropleth, SafetyMetric } from "@/lib/map-store";
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
  const servicesOn = useMapStore((s) => s.servicesOn);
  const toggleServices = useMapStore((s) => s.toggleServices);

  return (
    <div className="pointer-events-auto flex max-w-full flex-col items-center gap-2 md:items-start">
      <div className="flex max-w-full items-center gap-2 overflow-x-auto no-scrollbar">
        <div
          role="radiogroup"
          aria-label="Map layer"
          className="flex shrink-0 rounded-2xl bg-surface p-1 shadow-[var(--shadow-border)]"
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
        <button
          type="button"
          aria-pressed={servicesOn}
          onClick={toggleServices}
          className={cn(
            "flex h-11 shrink-0 items-center gap-1 rounded-2xl px-2.5 text-xs font-medium whitespace-nowrap sm:gap-1.5 sm:px-3.5 sm:text-sm",
            "shadow-[var(--shadow-border)] transition-[background-color,color,transform] duration-150 ease-out",
            "active:scale-[0.96]",
            servicesOn ? "bg-primary text-primary-fg" : "bg-surface text-muted hover:text-fg",
          )}
        >
          <MapPin className="size-4 shrink-0" strokeWidth={2} aria-hidden />
          Services
        </button>
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
    </div>
  );
}
