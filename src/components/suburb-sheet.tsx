import { X } from "lucide-react";
import type { ReactNode } from "react";
import { suburbsById } from "@/data/suburbs";
import { formatAud, safetyBandLabel } from "@/lib/choropleth";
import { useMapStore } from "@/lib/map-store";
import { cn } from "@/lib/utils";

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
              <p className="text-xs text-muted">Datos inventados · no oficiales</p>
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
              <p className="font-medium">
                Band {suburb.safety.band} of 5 · {safetyBandLabel(suburb.safety.band)}
              </p>
              <p className="text-muted">{suburb.safety.summary}</p>
            </Block>

            <Block title="Housing">
              <p>
                Median weekly rent {formatAud(suburb.housing.medianWeeklyRent)}{" "}
                <span className="text-muted">· 2021 Census sample</span>
              </p>
              <p>
                Median purchase {formatAud(suburb.housing.medianPurchase)}{" "}
                <span className="text-muted">· 2021 Census sample</span>
              </p>
              <p className="text-muted">
                2026 advertised rents city-wide are higher; use this to compare suburbs, not as
                today’s price.
              </p>
            </Block>

            <Block title="Households">
              <p>Median age {suburb.households.medianAge}</p>
              <p>{suburb.households.pctRenting}% renting</p>
              <p>{suburb.households.pctFamiliesWithChildren}% families with children</p>
            </Block>

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
                Ancestry is self-reported; people can choose two. Figures are Census 2021 sample
                data.
              </p>
            </Block>
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
