import { formatAud, safetyBandLabel } from "@/lib/choropleth";
import type { Choropleth } from "@/lib/map-store";
import type { Suburb } from "@/lib/suburb-types";

export function SuburbTooltip({
  suburb,
  layer,
  x,
  y,
}: {
  suburb: Suburb;
  layer: Choropleth;
  x: number;
  y: number;
}) {
  const primary =
    layer === "safety"
      ? `Band ${suburb.safety.band} of 5`
      : layer === "housing"
        ? `${formatAud(suburb.housing.medianWeeklyRent)} / week`
        : layer === "households"
          ? `${suburb.households.pctFamiliesWithChildren}% families with children`
          : `${suburb.backgrounds.pctBornAustralia}% born in Australia`;

  const secondary =
    layer === "safety"
      ? safetyBandLabel(suburb.safety.band)
      : layer === "housing"
        ? `Median purchase ${formatAud(suburb.housing.medianPurchase)}`
        : layer === "households"
          ? `Median age ${suburb.households.medianAge} · ${suburb.households.pctRenting}% renting`
          : `${suburb.backgrounds.topAncestries[0].name} ${suburb.backgrounds.topAncestries[0].pct}% · ${suburb.backgrounds.topLanguageOther}`;

  return (
    <div
      className="suburb-tooltip pointer-events-none absolute z-30 w-[228px] rounded-xl bg-surface px-3.5 py-3 shadow-[var(--shadow-border-hover)]"
      style={{ left: x, top: y }}
      role="status"
    >
      <p className="text-sm font-semibold tracking-tight text-fg">{suburb.name}</p>
      <p className="mt-1 text-sm text-fg">{primary}</p>
      <p className="mt-0.5 text-xs leading-snug text-muted">{secondary}</p>
      <p className="mt-2 text-[10px] tracking-wide text-subtle uppercase">Click for the full profile</p>
    </div>
  );
}
