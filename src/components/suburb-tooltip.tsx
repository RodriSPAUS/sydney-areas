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
      ? suburb.safety?.band
        ? `Band ${suburb.safety.band} of 5`
        : suburb.safety?.last12Months
          ? "Counts only · no stable rate"
          : "No BOCSAR extract"
      : layer === "housing"
        ? suburb.housing
          ? `${formatAud(suburb.housing.medianWeeklyRent)} / week`
          : "Sample housing not in this extract"
        : layer === "households"
          ? suburb.households
            ? `${suburb.households.pctFamiliesWithChildren}% families with children`
            : "Sample household figures not in this extract"
          : suburb.backgrounds
            ? `${suburb.backgrounds.pctBornAustralia}% born in Australia`
            : "Sample ancestry figures not in this extract";

  const secondary =
    layer === "safety"
      ? suburb.safety?.band
        ? safetyBandLabel(suburb.safety.band)
        : suburb.safety?.population
          ? "Census population too small for a rate"
          : "Boundary only"
      : layer === "housing"
        ? suburb.housing
          ? `Median purchase ${formatAud(suburb.housing.medianPurchase)}`
          : "Click for the name"
        : layer === "households"
          ? suburb.households
            ? `Median age ${suburb.households.medianAge} · ${suburb.households.pctRenting}% renting`
            : "Click for the name"
          : suburb.backgrounds
            ? `${suburb.backgrounds.topAncestries[0].name} ${suburb.backgrounds.topAncestries[0].pct}% · ${suburb.backgrounds.topLanguageOther}`
            : "Click for the name";

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
