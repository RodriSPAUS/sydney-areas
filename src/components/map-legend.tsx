import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { suburbs } from "@/data/suburbs";
import {
  BORN_AU_HIGH,
  BORN_AU_LOW,
  FAMILIES_HIGH,
  FAMILIES_LOW,
  HOUSING_HIGH,
  HOUSING_LOW,
  SAFETY_FILL,
  bornAuRange,
  familyRange,
  formatAud,
  rentRange,
} from "@/lib/choropleth";
import type { Choropleth, SafetyMetric } from "@/lib/map-store";
import { useMapStore } from "@/lib/map-store";
import { cn } from "@/lib/utils";

function Ramp({ from, to, left, right }: { from: string; to: string; left: string; right: string }) {
  return (
    <div>
      <div
        className="h-1.5 rounded-full"
        style={{ background: `linear-gradient(to right, ${from}, ${to})` }}
      />
      <div className="mt-1 flex justify-between text-[10px] tracking-wide text-muted tabular-nums">
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}

function SafetyRamp() {
  return (
    <div className="flex overflow-hidden rounded-full">
      {([5, 4, 3, 2, 1] as const).map((band) => (
        <span
          key={band}
          className="h-1.5 flex-1 first:rounded-l-full last:rounded-r-full"
          style={{ backgroundColor: SAFETY_FILL[band] }}
        />
      ))}
    </div>
  );
}

const SAFETY_TITLE: Record<SafetyMetric, string> = {
  combined: "Street + home incidents / 1,000",
  street: "Street incidents / 1,000",
  dwelling: "Break-ins and theft from homes / 1,000",
  domestic: "Domestic assault / 1,000",
};

function LegendBody({ layer, metric }: { layer: Choropleth; metric: SafetyMetric }) {
  if (layer === "safety") {
    return (
      <div>
        <p className="mb-1.5 text-[11px] font-medium text-fg">{SAFETY_TITLE[metric]}</p>
        <SafetyRamp />
        <div className="mt-1 flex justify-between text-[10px] text-muted">
          <span>Fewer</span>
          <span>More</span>
        </div>
        <p className="mt-1.5 text-[10px] leading-snug text-muted">
          Darker = more incidents. Among Greater Sydney suburbs on this map. Not a live risk score.
        </p>
        {metric === "domestic" ? (
          <p className="mt-1 text-[10px] leading-snug text-muted">
            Recorded domestic-violence assaults. Different pattern from street crime.
          </p>
        ) : null}
      </div>
    );
  }
  if (layer === "housing") {
    const dcj = suburbs.some((s) => s.housing?.source === "dcj");
    return (
      <div>
        <p className="mb-1.5 text-[11px] font-medium text-fg">
          {dcj ? "Weekly rent (new bonds, DCJ)" : "Weekly rent (Census 2021)"}
        </p>
        <Ramp
          from={HOUSING_LOW}
          to={HOUSING_HIGH}
          left={formatAud(rentRange.min)}
          right={formatAud(rentRange.max)}
        />
        <p className="mt-1.5 text-[10px] leading-snug text-muted">
          {dcj
            ? "Darker = higher rent. By postcode. Neighbouring suburbs may share a colour."
            : "Darker = higher rent. ABS Census 2021. Not today’s advertised price."}
        </p>
      </div>
    );
  }
  if (layer === "households") {
    return (
      <div>
        <p className="mb-1.5 text-[11px] font-medium text-fg">Families with children</p>
        <Ramp
          from={FAMILIES_LOW}
          to={FAMILIES_HIGH}
          left={`${familyRange.min}%`}
          right={`${familyRange.max}%`}
        />
        <p className="mt-1.5 text-[10px] leading-snug text-muted">
          Darker = more families. ABS Census 2021
        </p>
      </div>
    );
  }
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium text-fg">Born in Australia</p>
      <Ramp
        from={BORN_AU_LOW}
        to={BORN_AU_HIGH}
        left={`${bornAuRange.min}%`}
        right={`${bornAuRange.max}%`}
      />
      <p className="mt-1.5 text-[10px] leading-snug text-muted">
        Darker = higher share. ABS Census 2021
      </p>
    </div>
  );
}

export function MapLegend() {
  const layer = useMapStore((s) => s.choropleth);
  const metric = useMapStore((s) => s.safetyMetric);
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-auto w-[196px] rounded-xl bg-surface/95 px-3 py-2 shadow-[var(--shadow-border)]">
      <button
        type="button"
        className="flex h-8 w-full items-center justify-between text-[11px] font-medium text-fg md:hidden"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Legend
        <ChevronDown
          className={cn("size-4 text-muted transition-transform duration-150", open && "rotate-180")}
          strokeWidth={2}
          aria-hidden
        />
      </button>
      {!open ? (
        <div className="md:hidden">
          {layer === "safety" ? (
            <SafetyRamp />
          ) : (
            <div
              className="h-1.5 rounded-full"
              style={{
                background: `linear-gradient(to right, ${
                  layer === "housing"
                    ? `${HOUSING_LOW}, ${HOUSING_HIGH}`
                    : layer === "households"
                      ? `${FAMILIES_LOW}, ${FAMILIES_HIGH}`
                      : `${BORN_AU_LOW}, ${BORN_AU_HIGH}`
                })`,
              }}
            />
          )}
        </div>
      ) : null}
      <div className={cn(open ? "mt-2 block" : "hidden md:block")}>
        <LegendBody layer={layer} metric={metric} />
      </div>
    </div>
  );
}
