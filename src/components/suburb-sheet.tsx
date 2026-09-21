import { ChevronDown, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { suburbsById } from "@/data/suburbs";
import { activeSafetyBand, formatAud, SAFETY_FILL } from "@/lib/choropleth";
import { useMapStore } from "@/lib/map-store";
import { layerRank, rankCaption, safetyRank } from "@/lib/ranks";
import { metricCount } from "@/lib/safety-counts";
import type { SafetyBand, SafetyCounts } from "@/lib/suburb-types";
import { cn } from "@/lib/utils";

const COUNT_ROWS: { key: keyof SafetyCounts; label: string }[] = [
  { key: "homicide", label: "Homicide" },
  { key: "sexualAssault", label: "Sexual assault" },
  { key: "otherSexual", label: "Other sexual offences" },
  { key: "robbery", label: "Robbery" },
  { key: "assaultNonDv", label: "Non-DV assault" },
  { key: "assaultPolice", label: "Assault on police" },
  { key: "stealFromPerson", label: "Theft from person" },
  { key: "breakEnterDwelling", label: "Break and enter (home)" },
  { key: "motorVehicleTheft", label: "Stolen vehicles" },
  { key: "stealFromDwelling", label: "Theft from home" },
  { key: "stealFromVehicle", label: "Theft from vehicle" },
  { key: "maliciousDamage", label: "Property damage" },
  { key: "assaultDv", label: "Domestic assault" },
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

function BandBar({ band }: { band: SafetyBand }) {
  return (
    <div className="flex h-2 overflow-hidden rounded-full" aria-hidden>
      {([5, 4, 3, 2, 1] as const).map((b) => (
        <span
          key={b}
          className={cn("h-full flex-1 first:rounded-l-full last:rounded-r-full", b === band && "ring-2 ring-fg ring-inset")}
          style={{ backgroundColor: SAFETY_FILL[b], opacity: b === band ? 1 : 0.45 }}
        />
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-bg px-3 py-2">
      <p className="text-[10px] tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-0.5 text-base font-semibold tracking-tight text-fg tabular-nums">{value}</p>
    </div>
  );
}

function rateLabel(value: number | null | undefined): string {
  return value == null ? "—" : String(value);
}

export function SuburbSheet() {
  const selectedId = useMapStore((s) => s.selectedId);
  const selectSuburb = useMapStore((s) => s.selectSuburb);
  const safetyMetric = useMapStore((s) => s.safetyMetric);
  const choropleth = useMapStore((s) => s.choropleth);
  const feedback = useMapStore((s) => s.feedback);
  const setFeedback = useMapStore((s) => s.setFeedback);
  const suburb = selectedId ? suburbsById[selectedId] : undefined;
  const open = Boolean(suburb);
  const vote = suburb ? feedback[suburb.id] : undefined;
  const [period, setPeriod] = useState<"12" | "6">("12");

  useEffect(() => {
    setPeriod("12");
  }, [suburb?.id]);

  const counts = period === "6" ? suburb?.safety?.last6Months : suburb?.safety?.last12Months;
  const metricBand = suburb ? activeSafetyBand(suburb, safetyMetric) : undefined;
  const sRank = suburb ? safetyRank(suburb.id, safetyMetric) : undefined;
  const lRank = suburb ? layerRank(suburb.id, choropleth, safetyMetric) : undefined;
  const count12 = suburb?.safety?.last12Months;
  const count6 = suburb?.safety?.last6Months;

  return (
    <aside
      aria-hidden={!open}
      className={cn(
        "pointer-events-none fixed z-40 flex flex-col bg-surface",
        "inset-x-0 bottom-0 max-h-[42vh] rounded-t-2xl shadow-[var(--shadow-sheet)]",
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
                {suburb.safety?.period12
                  ? `BOCSAR · ${suburb.safety.period12}`
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
                  {metricBand ? (
                    <div className="space-y-2">
                      <BandBar band={metricBand} />
                      <p className="font-medium">
                        Band {metricBand} of 5
                        {sRank ? (
                          <span className="text-muted">
                            {" "}
                            · #{sRank.rank} of {sRank.of}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted">{rankCaption("safety", safetyMetric)}</p>
                    </div>
                  ) : (
                    <p className="font-medium">
                      No map colour — too few Census 2021 residents for a stable rate
                    </p>
                  )}
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Stat label="Street / 1,000" value={rateLabel(suburb.safety.streetPer1000)} />
                    <Stat label="Homes / 1,000" value={rateLabel(suburb.safety.dwellingPer1000)} />
                    <Stat label="Combined / 1,000" value={rateLabel(suburb.safety.combinedPer1000)} />
                    <Stat label="Domestic / 1,000" value={rateLabel(suburb.safety.domesticPer1000)} />
                  </div>
                  {suburb.safety.population ? (
                    <p className="text-xs text-muted">
                      Census 2021 usual residents {suburb.safety.population.toLocaleString("en-AU")}
                    </p>
                  ) : null}
                  {count12 && count6 ? (
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-xl bg-bg px-3 py-2">
                        <p className="text-[10px] tracking-wide text-muted uppercase">12 months</p>
                        <p className="font-semibold tabular-nums">
                          {metricCount(count12, safetyMetric)}
                        </p>
                        <p className="text-[10px] text-muted">recorded, this metric</p>
                      </div>
                      <div className="rounded-xl bg-bg px-3 py-2">
                        <p className="text-[10px] tracking-wide text-muted uppercase">6 months</p>
                        <p className="font-semibold tabular-nums">
                          {metricCount(count6, safetyMetric)}
                        </p>
                        <p className="text-[10px] text-muted">shorter window, not half-year rate</p>
                      </div>
                    </div>
                  ) : null}
                  <details className="group mt-2">
                    <summary className="flex h-11 cursor-pointer list-none items-center justify-between text-sm font-medium text-fg">
                      Recorded incidents
                      <ChevronDown
                        className="size-4 text-muted transition-transform duration-150 group-open:rotate-180"
                        strokeWidth={2}
                        aria-hidden
                      />
                    </summary>
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
                    <p className="mt-2 text-xs text-muted">
                      Combined is street + home and ignores retail theft and domestic assault. The
                      list is raw counts. NSW Bureau of Crime Statistics and Research (BOCSAR).
                      CC-BY 3.0 AU. Population: ABS Census 2021.
                    </p>
                  </details>
                </>
              ) : (
                <p className="text-muted">
                  No BOCSAR row in this extract. The boundary is from ABS Suburbs and Localities
                  2021.
                </p>
              )}
            </Block>

            {suburb.housing ? (
              <Block title="Housing">
                {suburb.housing.medianWeeklyRent != null ? (
                  <p className="text-2xl font-semibold tracking-tight tabular-nums">
                    {formatAud(suburb.housing.medianWeeklyRent)}
                    <span className="ml-1 text-sm font-medium text-muted">/ week</span>
                  </p>
                ) : null}
                {lRank && choropleth === "housing" ? (
                  <p className="text-xs text-muted">
                    #{lRank.rank} of {lRank.of} · {rankCaption("housing", safetyMetric)}
                  </p>
                ) : null}
                <p className="text-muted">
                  {suburb.housing.source === "dcj"
                    ? `New bonds · postcode ${suburb.housing.postcode ?? "—"} · ${suburb.housing.period ?? ""}`
                    : "ABS Census 2021"}
                </p>
                {suburb.housing.medianPurchase != null ? (
                  <p>
                    Median purchase{" "}
                    <span className="font-semibold tabular-nums">
                      {formatAud(suburb.housing.medianPurchase)}
                    </span>
                    {suburb.housing.source === "dcj" ? " · DCJ sales" : ""}
                  </p>
                ) : null}
                {suburb.housing.source === "dcj" && suburb.housing.medianWeeklyRent2021 != null ? (
                  <p className="text-muted">
                    Census 2021 median rent {formatAud(suburb.housing.medianWeeklyRent2021)}
                  </p>
                ) : null}
                {suburb.housing.rentNote ? (
                  <p className="text-xs text-muted">{suburb.housing.rentNote}</p>
                ) : null}
                <p className="text-xs text-muted">
                  {suburb.housing.source === "dcj"
                    ? "NSW Department of Communities and Justice, Rent and Sales Report. CC BY."
                    : "Australian Bureau of Statistics, Census 2021. CC BY 4.0."}
                </p>
              </Block>
            ) : null}

            {suburb.households ? (
              <Block title="Households">
                <div className="grid grid-cols-3 gap-2">
                  <Stat label="Median age" value={String(suburb.households.medianAge)} />
                  <Stat label="Renting" value={`${suburb.households.pctRenting}%`} />
                  <Stat
                    label="With children"
                    value={`${suburb.households.pctFamiliesWithChildren}%`}
                  />
                </div>
                {lRank && choropleth === "households" ? (
                  <p className="text-xs text-muted">
                    #{lRank.rank} of {lRank.of} · {rankCaption("households", safetyMetric)}
                  </p>
                ) : null}
                <p className="text-xs text-muted">ABS Census 2021</p>
              </Block>
            ) : null}

            {suburb.backgrounds ? (
              <Block title="Backgrounds">
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  {suburb.backgrounds.pctBornAustralia}%{" "}
                  <span className="text-sm font-medium text-muted">born in Australia</span>
                </p>
                {lRank && choropleth === "backgrounds" ? (
                  <p className="text-xs text-muted">
                    #{lRank.rank} of {lRank.of} · {rankCaption("backgrounds", safetyMetric)}
                  </p>
                ) : null}
                <p>
                  {suburb.backgrounds.topAncestries
                    .map((a) => `${a.name} ${a.pct}%`)
                    .join(" · ")}
                </p>
                <p className="text-muted">
                  Top language other than English: {suburb.backgrounds.topLanguageOther}
                </p>
                <p className="text-xs text-muted">
                  ABS Census 2021. Ancestry is self-reported; people can choose two.
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
