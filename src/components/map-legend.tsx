import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { suburbs } from "@/data/suburbs";
import {
  BORN_AU_FILL,
  HOUSING_FILL,
  NEUTRAL_FILL,
  SAFETY_FILL,
  TRANSIT_FILL,
  bornAuRange,
  formatAud,
  rentRange,
} from "@/lib/choropleth";
import { TRANSIT_MODE_COLOR, TRANSIT_MODE_LABEL, type TransitMode } from "@/lib/access";
import { NO_DATA_LABEL, SAFETY_WINDOW } from "@/lib/copy";
import type { Choropleth, SafetyMetric } from "@/lib/map-store";
import { useMapStore } from "@/lib/map-store";
import type { SafetyBand } from "@/lib/suburb-types";
import { cn } from "@/lib/utils";

function DiscreteRamp({ fills, order }: { fills: Record<SafetyBand, string>; order: SafetyBand[] }) {
  return (
    <div className="flex overflow-hidden rounded-full">
      {order.map((band) => (
        <span
          key={band}
          className="h-1.5 flex-1 first:rounded-l-full last:rounded-r-full"
          style={{ backgroundColor: fills[band] }}
        />
      ))}
    </div>
  );
}

function NoDataSwatch({ text }: { text?: string }) {
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-[10px] leading-snug text-muted">
      <span
        className="inline-block size-2.5 shrink-0 rounded-sm"
        style={{ backgroundColor: NEUTRAL_FILL }}
        aria-hidden
      />
      {text ?? `${NO_DATA_LABEL} — too few residents or no figure`}
    </p>
  );
}

const SAFETY_TITLE: Record<SafetyMetric, string> = {
  all: "Violence + property / 1,000",
  violence: "Violent incidents / 1,000",
  property: "Property incidents / 1,000",
  domestic: "Domestic assault / 1,000",
};

function LegendBody({ layer, metric }: { layer: Choropleth; metric: SafetyMetric }) {
  if (layer === "safety") {
    const safetyPeriod = suburbs.find((s) => s.safety?.period12)?.safety?.period12;
    return (
      <div>
        <p className="mb-1.5 text-[11px] font-medium text-fg">{SAFETY_TITLE[metric]}</p>
        <DiscreteRamp fills={SAFETY_FILL} order={[5, 4, 3, 2, 1]} />
        <div className="mt-1 flex justify-between text-[10px] text-muted">
          <span>Fewer</span>
          <span>More</span>
        </div>
        <p className="mt-1.5 text-[10px] leading-snug text-muted">
          {SAFETY_WINDOW}
          {safetyPeriod ? ` · ${safetyPeriod}` : ""}. Darker = more incidents. Quintiles among Greater
          Sydney suburbs on this map. Not a live risk score.
        </p>
        {metric === "domestic" ? (
          <p className="mt-1 text-[10px] leading-snug text-muted">
            Recorded domestic-violence assaults. Different pattern from violence and property.
          </p>
        ) : null}
        <NoDataSwatch />
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
        <DiscreteRamp fills={HOUSING_FILL} order={[1, 2, 3, 4, 5]} />
        <div className="mt-1 flex justify-between text-[10px] text-muted tabular-nums">
          <span>{formatAud(rentRange.min)}</span>
          <span>{formatAud(rentRange.max)}</span>
        </div>
        <p className="mt-1.5 text-[10px] leading-snug text-muted">
          {dcj
            ? "All dwellings, by postcode. Darker = higher rent. Neighbouring suburbs may share a colour."
            : "Darker = higher rent. Five equal groups. ABS Census 2021."}
        </p>
        <NoDataSwatch />
      </div>
    );
  }
  if (layer === "transit") {
    const modes: TransitMode[] = ["metro", "rail", "lightrail", "ferry"];
    return (
      <div>
        <p className="mb-1.5 text-[11px] font-medium text-fg">
          Stops inside the suburb (rail, metro, light rail, ferry)
        </p>
        <DiscreteRamp fills={TRANSIT_FILL} order={[1, 2, 3, 4, 5]} />
        <div className="mt-1 flex justify-between text-[10px] text-muted">
          <span>Fewer</span>
          <span>More</span>
        </div>
        <ul className="mt-1.5 space-y-0.5">
          {modes.map((mode) => (
            <li key={mode} className="flex items-center gap-1.5 text-[10px] text-muted">
              <span
                className="inline-block size-2.5 shrink-0 rounded-full border border-white"
                style={{ backgroundColor: TRANSIT_MODE_COLOR[mode] }}
                aria-hidden
              />
              {TRANSIT_MODE_LABEL[mode]}
            </li>
          ))}
        </ul>
        <p className="mt-1.5 text-[10px] leading-snug text-muted">
          Darker = more stops. Lines from zoom 9, dots from zoom 10. Simplified TfNSW GTFS shapes, CC-BY.
        </p>
        <NoDataSwatch text="No data — no rail, metro, light rail or ferry stop in this suburb" />
      </div>
    );
  }
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium text-fg">Born in Australia</p>
      <DiscreteRamp fills={BORN_AU_FILL} order={[1, 2, 3, 4, 5]} />
      <div className="mt-1 flex justify-between text-[10px] text-muted tabular-nums">
        <span>{bornAuRange.min}%</span>
        <span>{bornAuRange.max}%</span>
      </div>
      <p className="mt-1.5 text-[10px] leading-snug text-muted">
        Darker = higher share. Five equal groups. ABS Census 2021
      </p>
      <NoDataSwatch />
    </div>
  );
}

export function MapLegend() {
  const layer = useMapStore((s) => s.choropleth);
  const metric = useMapStore((s) => s.safetyMetric);
  const [open, setOpen] = useState(false);
  const mini =
    layer === "safety"
      ? SAFETY_FILL
      : layer === "housing"
        ? HOUSING_FILL
        : layer === "transit"
          ? TRANSIT_FILL
          : BORN_AU_FILL;
  const miniOrder: SafetyBand[] = layer === "safety" ? [5, 4, 3, 2, 1] : [1, 2, 3, 4, 5];

  return (
    <div className="pointer-events-auto w-[196px] rounded-xl bg-surface/80 px-3 py-2 shadow-[var(--shadow-border)] backdrop-blur-md">
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
          <DiscreteRamp fills={mini} order={miniOrder} />
        </div>
      ) : null}
      <div className={cn(open ? "mt-2 block" : "hidden md:block")}>
        <LegendBody layer={layer} metric={metric} />
      </div>
    </div>
  );
}
