import { activeSafetyBand, formatAud, safetyBandLabel } from "@/lib/choropleth";
import type { Choropleth, SafetyMetric } from "@/lib/map-store";
import type { Suburb } from "@/lib/suburb-types";

export function SuburbTooltip({
  suburb,
  layer,
  metric = "all",
  x,
  y,
}: {
  suburb: Suburb;
  layer: Choropleth;
  metric?: SafetyMetric;
  x: number;
  y: number;
}) {
  const safetyBand = activeSafetyBand(suburb, metric);
  const accessLine = (suburb: Suburb) => {
    const access = suburb.access;
    if (access.total === 0) return "No rail, light rail or ferry stop";
    const parts = [
      access.rail ? `${access.rail} rail` : null,
      access.lightrail ? `${access.lightrail} light rail` : null,
      access.ferry ? `${access.ferry} ferry` : null,
    ].filter(Boolean);
    return parts.join(" · ");
  };

  const primary =
    layer === "safety"
      ? safetyBand
        ? `Band ${safetyBand} of 5`
        : suburb.safety?.last12Months
          ? "Counts only · no stable rate"
          : "No BOCSAR extract"
      : layer === "housing"
        ? suburb.housing?.medianWeeklyRent != null
          ? `${formatAud(suburb.housing.medianWeeklyRent)} / week`
          : "No rent figure in this extract"
        : layer === "access"
          ? suburb.access.total === 0
            ? "No stop in this suburb"
            : suburb.access.total === 1
              ? "1 stop"
              : `${suburb.access.total} stops`
          : suburb.backgrounds
            ? `${suburb.backgrounds.pctBornAustralia}% born in Australia`
            : "No Census 2021 ancestry figures";

  const secondary =
    layer === "safety"
      ? safetyBand
        ? safetyBandLabel(safetyBand)
        : suburb.safety?.population
          ? "Census population too small for a rate"
          : "Boundary only"
      : layer === "housing"
        ? suburb.housing?.medianPurchase != null
          ? `Median purchase ${formatAud(suburb.housing.medianPurchase)}`
          : suburb.housing?.source === "dcj"
            ? `Postcode ${suburb.housing.postcode ?? ""} · ${suburb.housing.period ?? ""}`
            : suburb.housing
              ? "ABS Census 2021"
              : "Click for the name"
        : layer === "access"
          ? accessLine(suburb)
          : suburb.backgrounds
            ? `${suburb.backgrounds.topAncestries[0]?.name ?? ""} ${suburb.backgrounds.topAncestries[0]?.pct ?? ""}% · ${suburb.backgrounds.topLanguageOther}`
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
