import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { suburbsById } from "@/data/suburbs";
import { formatAud, safetyBandLabel } from "@/lib/choropleth";
import { useMapStore } from "@/lib/map-store";
import type { SafetyCounts } from "@/lib/suburb-types";
import { cn } from "@/lib/utils";

const COUNT_ROWS: { key: keyof SafetyCounts; label: string }[] = [
  { key: "assaultNonDv", label: "Non-DV assault" },
  { key: "assaultDv", label: "Domestic assault" },
  { key: "breakEnterDwelling", label: "Break and enter (home)" },
  { key: "stealFromDwelling", label: "Theft from home" },
  { key: "stealFromVehicle", label: "Theft from vehicle" },
  { key: "motorVehicleTheft", label: "Stolen vehicles" },
  { key: "robbery", label: "Robbery" },
  { key: "maliciousDamage", label: "Property damage" },
  { key: "stealRetail", label: "Retail theft" },
];

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-border pt-3">
      <h3 className="text-[11px] font-semibold tracking-wide text-primary uppercase">{title}</h3>
      <div className="mt-1.5 space-y-1 text-sm leading-snug text-fg">{children}</div>
    </section>
  );
}

export function SuburbSheet() {
  const selectedId = useMapStore((s) => s.selectedId);
  const selectSuburb = useMapStore((s) => s.selectSuburb);
  const feedback = useMapStore((s) => s.feedback);
  const setFeedback = useMapStore((s) => s.setFeedback);
  const suburb = selectedId ? suburbsById[selectedId] : undefined;
  const open = Boolean(suburb);
  const vote = suburb ? feedback[suburb.id] : undefined;
  const [period, setPeriod] = useState<"12" | "6">("12");

  useEffect(() => {
    setPeriod("12");
  }, [suburb?.id]);

  const counts =
    period === "6" ? suburb?.safety?.last6Months : suburb?.safety?.last12Months;

  return (
    <aside
      aria-hidden={!open}
      className={cn(
        "pointer-events-none fixed z-40 flex flex-col bg-surface",
        "inset-x-0 bottom-0 max-h-[46vh] rounded-t-2xl shadow-[var(--shadow-sheet)]",
        "md:inset-y-0 md:right-0 md:left-auto md:h-full md:max-h-none md:w-[360px] md:rounded-none md:shadow-[var(--shadow-drawer)]",
        "transition-transform duration-[400ms] ease-[var(--ease-out)]",
        "motion-reduce:transition-none",
        open
          ? "pointer-events-auto translate-y-0 md:translate-x-0"
          : "translate-y-full md:translate-y-0 md:translate-x-full",
      )}
    >
      <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border md:hidden" aria-hidden />
      {suburb ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <header className="flex items-start justify-between gap-3 px-5 pt-3 pb-2">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-fg">{suburb.name}</h2>
              <p className="text-xs text-muted">
                {suburb.safety?.last12Months
                  ? `BOCSAR recorded incidents · ${suburb.safety.period12 ?? ""}`
                  : "Suburb boundary · ABS SAL 2021"}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => selectSuburb(null)}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-bg hover:text-fg"
            >
              <X className="size-5" strokeWidth={2} />
            </button>
          </header>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-4">
            <Block title="Safety">
              {suburb.safety ? (
                <>
                  {suburb.safety.band ? (
                    <p className="font-medium">
                      Band {suburb.safety.band} of 5 · {safetyBandLabel(suburb.safety.band)}
                    </p>
                  ) : (
                    <p className="font-medium">No map colour — too few Census 2021 residents for a stable rate</p>
                  )}
                  <p className="text-muted">{suburb.safety.summary}</p>
                  {suburb.safety.population ? (
                    <p className="text-muted">
                      Census 2021 usual residents {suburb.safety.population.toLocaleString("en-AU")}
                      {suburb.safety.housingPer1000 != null && suburb.safety.streetPer1000 != null
                        ? ` · dwelling ${suburb.safety.housingPer1000} and street ${suburb.safety.streetPer1000} per 1,000`
                        : ""}
                    </p>
                  ) : null}
                  <div
                    role="radiogroup"
                    aria-label="Incident period"
                    className="mt-2 flex rounded-xl bg-bg p-1"
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={period === "12"}
                      onClick={() => setPeriod("12")}
                      className={cn(
                        "flex h-11 flex-1 items-center justify-center rounded-lg text-sm font-medium",
                        "transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.96]",
                        period === "12" ? "bg-ink text-bg" : "text-muted hover:text-fg",
                      )}
                    >
                      12 months
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={period === "6"}
                      onClick={() => setPeriod("6")}
                      className={cn(
                        "flex h-11 flex-1 items-center justify-center rounded-lg text-sm font-medium",
                        "transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.96]",
                        period === "6" ? "bg-ink text-bg" : "text-muted hover:text-fg",
                      )}
                    >
                      6 months
                    </button>
                  </div>
                  {counts ? (
                    <ul className="mt-2 divide-y divide-border">
                      {COUNT_ROWS.map(({ key, label }) => (
                        <li
                          key={key}
                          className="flex items-baseline justify-between gap-3 py-1.5 text-sm"
                        >
                          <span className="text-muted">{label}</span>
                          <span className="tabular-nums text-fg">{counts[key]}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="text-xs text-muted">
                    The map colour uses dwelling and street incidents per 1,000 residents. The list
                    is raw counts. Retail theft and domestic assault are not used for the colour.
                  </p>
                  <p className="text-xs text-muted">
                    NSW Bureau of Crime Statistics and Research (BOCSAR). CC-BY 3.0 AU. Population:
                    ABS Census 2021.
                  </p>
                </>
              ) : (
                <p className="text-muted">
                  No BOCSAR row in this prototype extract. The boundary is from ABS Suburbs and
                  Localities 2021.
                </p>
              )}
            </Block>

            {suburb.housing ? (
              <Block title="Housing">
                <p>
                  Median weekly rent {formatAud(suburb.housing.medianWeeklyRent)}{" "}
                  <span className="text-muted">· Sample figures · not official</span>
                </p>
                <p>
                  Median purchase {formatAud(suburb.housing.medianPurchase)}{" "}
                  <span className="text-muted">· Sample figures · not official</span>
                </p>
                <p className="text-muted">
                  2026 advertised rents city-wide are higher; use this to compare suburbs, not as
                  today’s price.
                </p>
              </Block>
            ) : null}

            {suburb.households ? (
              <Block title="Households">
                <p>Median age {suburb.households.medianAge}</p>
                <p>{suburb.households.pctRenting}% renting</p>
                <p>{suburb.households.pctFamiliesWithChildren}% families with children</p>
                <p className="text-xs text-muted">Sample figures · not official</p>
              </Block>
            ) : null}

            {suburb.backgrounds ? (
              <Block title="Backgrounds">
                <p>{suburb.backgrounds.pctBornAustralia}% born in Australia</p>
                <p>
                  Top ancestries:{" "}
                  {suburb.backgrounds.topAncestries
                    .map((a) => `${a.name} ${a.pct}%`)
                    .join(" · ")}
                </p>
                <p>Top language other than English: {suburb.backgrounds.topLanguageOther}</p>
                <p className="text-xs text-muted">
                  Sample figures · not official. Ancestry is self-reported; people can choose two.
                </p>
              </Block>
            ) : null}
          </div>

          <footer className="border-t border-border px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {vote ? (
              <p className="py-2 text-center text-sm text-muted">Thanks — noted.</p>
            ) : (
              <div>
                <p className="mb-2 text-center text-sm text-muted">Useful?</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFeedback(suburb.id, "yes")}
                    className="flex h-11 items-center justify-center rounded-xl bg-ink text-sm font-medium text-bg transition-transform duration-150 ease-out active:scale-[0.96]"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedback(suburb.id, "no")}
                    className="flex h-11 items-center justify-center rounded-xl bg-bg text-sm font-medium text-fg shadow-[var(--shadow-border)] transition-transform duration-150 ease-out active:scale-[0.96]"
                  >
                    No
                  </button>
                </div>
              </div>
            )}
          </footer>
        </div>
      ) : null}
    </aside>
  );
}
