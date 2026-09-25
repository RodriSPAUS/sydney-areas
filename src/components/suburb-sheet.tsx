import { Link } from "@tanstack/react-router";
import { ChevronDown, X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { suburbsById } from "@/data/suburbs";
import { LAYERS } from "@/components/layer-bar";
import { EmailSignup } from "@/components/email-signup";
import { ShareButton } from "@/components/share-button";
import { activeSafetyBand, formatAud, SAFETY_FILL } from "@/lib/choropleth";
import {
  TRANSIT_NO_BUS,
  TRANSIT_NOTE,
  BACKGROUNDS_NOTE,
  HOUSING_CENSUS_NOTE,
  HOUSING_DCJ_NOTE,
  NO_DATA_LABEL,
  SAFETY_DENOMINATOR_NOTE,
  SAFETY_DISCLAIMER,
  SAFETY_TOO_FEW,
  SAFETY_VISITOR_NOTE,
  SAFETY_WINDOW,
} from "@/lib/copy";
import { TRANSIT_MODE_LABEL } from "@/lib/access";
import type { Choropleth, SafetyMetric } from "@/lib/map-store";
import { useMapStore } from "@/lib/map-store";
import { layerRank, rankSentence, safetyRank } from "@/lib/ranks";
import { metricCount, VISITOR_HUB_IDS } from "@/lib/safety-counts";
import type { SafetyBand, SafetyCounts, Suburb } from "@/lib/suburb-types";
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

const SECTION_ORDER: Choropleth[] = ["safety", "housing", "transit", "backgrounds"];

function Block({
  title,
  featured,
  children,
}: {
  title: string;
  featured?: boolean;
  children: ReactNode;
}) {
  if (featured) {
    return (
      <section>
        <h3 className="text-[11px] font-semibold tracking-wide text-primary uppercase">{title}</h3>
        <div className="mt-1.5 space-y-1 text-sm leading-snug text-fg">{children}</div>
      </section>
    );
  }
  return (
    <details className="group border-t border-border pt-1">
      <summary className="flex h-11 cursor-pointer list-none items-center justify-between text-[11px] font-semibold tracking-wide text-primary uppercase">
        {title}
        <ChevronDown
          className="size-4 text-muted transition-transform duration-150 group-open:rotate-180"
          strokeWidth={2}
          aria-hidden
        />
      </summary>
      <div className="space-y-1 pb-2 text-sm leading-snug text-fg">{children}</div>
    </details>
  );
}

function BandBar({ band }: { band: SafetyBand }) {
  return (
    <div className="flex h-2 overflow-hidden rounded-full" aria-hidden>
      {([5, 4, 3, 2, 1] as const).map((b) => (
        <span
          key={b}
          className={cn(
            "h-full flex-1 first:rounded-l-full last:rounded-r-full",
            b === band && "ring-2 ring-fg ring-inset",
          )}
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

function personPctLabel(value: number | null | undefined): string {
  if (value == null || value < 0 || value > 100) return NO_DATA_LABEL;
  return `${value}%`;
}

function metricRate(suburb: Suburb, metric: SafetyMetric): number | null | undefined {
  const safety = suburb.safety;
  if (!safety) return null;
  if (metric === "violence") return safety.violencePer1000;
  if (metric === "property") return safety.propertyPer1000;
  if (metric === "domestic") return safety.domesticPer1000;
  return safety.allPer1000;
}

function headerNote(suburb: Suburb, layer: Choropleth): string {
  if (layer === "housing" && suburb.housing) {
    return suburb.housing.source === "dcj"
      ? `New bonds · ${suburb.housing.period ?? "DCJ"}`
      : "Census 2021 rent";
  }
  if (layer === "backgrounds") return "ABS Census 2021 · ancestry";
  if (layer === "transit") return "Within a short walk";
  return suburb.safety?.period12
    ? `${SAFETY_WINDOW} · ${suburb.safety.period12}`
    : "Suburb boundary · ABS SAL 2021";
}

function SafetyBody({ suburb }: { suburb: Suburb }) {
  const safetyMetric = useMapStore((s) => s.safetyMetric);
  const metricBand = activeSafetyBand(suburb, safetyMetric);
  const sRank = safetyRank(suburb.id, safetyMetric);
  const counts = suburb.safety?.last12Months;

  if (!suburb.safety) {
    return (
      <p className="text-muted">
        No BOCSAR row in this extract. The boundary is from ABS Suburbs and Localities 2021.
      </p>
    );
  }

  const incidents = counts ? metricCount(counts, safetyMetric) : null;
  const population = suburb.safety.population;
  const rate = metricRate(suburb, safetyMetric);

  return (
    <>
      <div className="space-y-2">
        {rate != null ? (
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {rateLabel(rate)}
            <span className="ml-1 text-sm font-medium text-muted">/ 1,000 residents</span>
          </p>
        ) : incidents != null ? (
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {incidents.toLocaleString("en-AU")}
            <span className="ml-1 text-sm font-medium text-muted">recorded incidents</span>
          </p>
        ) : null}
        <p className="text-xs text-muted">
          {rate != null && incidents != null
            ? `${incidents.toLocaleString("en-AU")} recorded incidents`
            : SAFETY_WINDOW}
          {suburb.safety.period12 ? ` · ${suburb.safety.period12}` : ""}
          {population ? ` · ${population.toLocaleString("en-AU")} residents (Census 2021)` : ""}
        </p>
        {metricBand ? (
          <>
            <BandBar band={metricBand} />
            {sRank ? <p className="font-medium">{rankSentence("safety", sRank)}</p> : null}
          </>
        ) : (
          <p className="font-medium">{SAFETY_TOO_FEW}</p>
        )}
        {VISITOR_HUB_IDS.has(suburb.id) ? (
          <p className="rounded-xl bg-bg px-3 py-2 text-xs text-fg">{SAFETY_VISITOR_NOTE}</p>
        ) : null}
        <p className="text-xs text-muted">{SAFETY_DISCLAIMER}</p>
      </div>
      <div className={cn("mt-2 hidden grid-cols-2 gap-2", rate != null && "md:grid")}>
        <Stat label="All / 1,000" value={rateLabel(suburb.safety.allPer1000)} />
        <Stat label="Violence / 1,000" value={rateLabel(suburb.safety.violencePer1000)} />
        <Stat label="Property / 1,000" value={rateLabel(suburb.safety.propertyPer1000)} />
        <Stat label="Domestic / 1,000" value={rateLabel(suburb.safety.domesticPer1000)} />
      </div>
      <details className="group mt-2">
        <summary className="flex h-11 cursor-pointer list-none items-center justify-between text-sm font-medium text-fg">
          Recorded incidents
          <ChevronDown
            className="size-4 text-muted transition-transform duration-150 group-open:rotate-180"
            strokeWidth={2}
            aria-hidden
          />
        </summary>
        {counts ? (
          <ul className="mt-2 divide-y divide-border">
            {COUNT_ROWS.map(({ key, label }) => (
              <li key={key} className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
                <span className="text-muted">{label}</span>
                <span className="tabular-nums text-fg">{counts[key]}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-2 text-xs text-muted">{SAFETY_DENOMINATOR_NOTE}</p>
        <p className="mt-2 text-xs text-muted">
          All is violence + property. Retail theft and domestic assault are not in All. The list is
          the last 12 months. NSW Bureau of Crime Statistics and Research (BOCSAR). CC-BY 3.0 AU.
          Population: ABS Census 2021.
        </p>
      </details>
    </>
  );
}

function HousingBody({ suburb }: { suburb: Suburb }) {
  const h = suburb.housing;
  const hh = suburb.households;
  const hRank = layerRank(suburb.id, "housing", "all");
  if (!h && !hh) return <p className="text-muted">No rent or sale figure for this suburb.</p>;
  const dcj = h?.source === "dcj";
  const beds: { label: string; value: number }[] = [];
  if (dcj && h) {
    if (h.rent1Br != null) beds.push({ label: "1 bed", value: h.rent1Br });
    if (h.rent2Br != null) beds.push({ label: "2 bed", value: h.rent2Br });
    if (h.rent3Br != null) beds.push({ label: "3 bed", value: h.rent3Br });
  }
  const showHouseFlat = Boolean(dcj && h && (h.rentHouse != null || h.rentFlat != null));

  return (
    <>
      {h?.medianWeeklyRent != null ? (
        <p className="text-2xl font-semibold tracking-tight tabular-nums">
          {formatAud(h.medianWeeklyRent)}
          <span className="ml-1 text-sm font-medium text-muted">/ week</span>
        </p>
      ) : (
        <p className="text-muted">No rent figure for this suburb.</p>
      )}
      {dcj && h ? (
        <p className="text-sm text-muted">
          All dwellings · postcode {h.postcode ?? "—"} · {h.period ?? ""}
        </p>
      ) : h ? (
        <p className="text-muted">ABS Census 2021</p>
      ) : null}
      {h ? (
        <p className="text-xs text-muted">{dcj ? HOUSING_DCJ_NOTE : HOUSING_CENSUS_NOTE}</p>
      ) : null}
      {hRank ? <p className="text-xs text-muted">{rankSentence("housing", hRank)}</p> : null}
      {hh ? (
        <>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <Stat
              label="Median age"
              value={hh.medianAge == null ? NO_DATA_LABEL : String(hh.medianAge)}
            />
            <Stat label="Renting" value={personPctLabel(hh.pctRenting)} />
            <Stat label="With children" value={personPctLabel(hh.pctFamiliesWithChildren)} />
          </div>
          <p className="text-xs text-muted">ABS Census 2021</p>
        </>
      ) : null}
      {beds.length ? (
        <div className="mt-1 grid grid-cols-3 gap-2">
          {beds.map(({ label, value }) => (
            <Stat key={label} label={label} value={formatAud(value)} />
          ))}
        </div>
      ) : null}
      {showHouseFlat && h ? (
        <p>
          {h.rentHouse != null ? (
            <>
              House <span className="font-semibold tabular-nums">{formatAud(h.rentHouse)}</span>
            </>
          ) : null}
          {h.rentHouse != null && h.rentFlat != null ? " · " : null}
          {h.rentFlat != null ? (
            <>
              Flat <span className="font-semibold tabular-nums">{formatAud(h.rentFlat)}</span>
            </>
          ) : null}
        </p>
      ) : null}
      {h?.medianPurchase != null ? (
        <p>
          Median purchase{" "}
          <span className="font-semibold tabular-nums">{formatAud(h.medianPurchase)}</span>
          {dcj ? " · DCJ sales" : ""}
        </p>
      ) : null}
      {dcj && h?.medianWeeklyRent2021 != null ? (
        <p className="text-muted">Census 2021 median rent {formatAud(h.medianWeeklyRent2021)}</p>
      ) : null}
      {dcj ? (
        <p className="text-xs text-muted">
          New rental bonds in this postcode, not this suburb alone. Cells with few bonds are
          omitted.
        </p>
      ) : null}
      {h ? (
        <p className="text-xs text-muted">
          {dcj
            ? "NSW Department of Communities and Justice, Rent and Sales Report. CC BY."
            : "Australian Bureau of Statistics, Census 2021. CC BY 4.0."}
        </p>
      ) : null}
    </>
  );
}

function TransitBody({ suburb }: { suburb: Suburb }) {
  const transit = suburb.transit;
  const rank = layerRank(suburb.id, "transit", "all");
  const modes = transit.modesNearby.map((mode) => TRANSIT_MODE_LABEL[mode]);
  const shown = transit.names.slice(0, 12);
  const extra = transit.names.length - shown.length;
  const groups = (["metro", "rail", "lightrail", "ferry"] as const)
    .map((mode) => ({ mode, items: shown.filter((stop) => stop.mode === mode) }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      <p className="text-2xl font-semibold tracking-tight">
        {transit.walkPct === 0 ? (
          "No stop within a short walk"
        ) : (
          <span className="tabular-nums">{transit.walkPct}% within a short walk</span>
        )}
      </p>
      {modes.length ? <p className="text-sm text-muted">{modes.join(" · ")}</p> : null}
      {rank ? <p className="text-xs text-muted">{rankSentence("transit", rank)}</p> : null}
      {groups.map((group) => (
        <div key={group.mode}>
          <p className="text-[10px] tracking-wide text-muted uppercase">
            {TRANSIT_MODE_LABEL[group.mode]}
          </p>
          <ul className="mt-0.5">
            {group.items.map((stop) => (
              <li key={`${group.mode}-${stop.name}`}>{stop.name}</li>
            ))}
          </ul>
        </div>
      ))}
      {extra > 0 ? <p className="text-xs text-muted">+{extra} more</p> : null}
      <p className="text-xs text-muted">{TRANSIT_NOTE}</p>
      <p className="text-xs text-muted">{TRANSIT_NO_BUS}</p>
    </>
  );
}

function BackgroundsBody({ suburb }: { suburb: Suburb }) {
  const rank = layerRank(suburb.id, "backgrounds", "all");
  if (!suburb.backgrounds) return <p className="text-muted">No Census 2021 ancestry figures.</p>;
  const born = suburb.backgrounds.pctBornAustralia;
  const bornOk = born != null && born >= 0 && born <= 100;
  return (
    <>
      {bornOk ? (
        <p className="text-2xl font-semibold tracking-tight tabular-nums">
          {born}% <span className="text-sm font-medium text-muted">born in Australia</span>
        </p>
      ) : (
        <p className="text-2xl font-semibold tracking-tight">{NO_DATA_LABEL}</p>
      )}
      {rank ? <p className="text-xs text-muted">{rankSentence("backgrounds", rank)}</p> : null}
      <p>{suburb.backgrounds.topAncestries.map((a) => `${a.name} ${a.pct}%`).join(" · ")}</p>
      <p className="text-muted">
        Top language other than English: {suburb.backgrounds.topLanguageOther}
      </p>
      <p className="text-xs text-muted">{BACKGROUNDS_NOTE}</p>
    </>
  );
}

export function SuburbSheet() {
  const selectedId = useMapStore((s) => s.selectedId);
  const selectSuburb = useMapStore((s) => s.selectSuburb);
  const choropleth = useMapStore((s) => s.choropleth);
  const setChoropleth = useMapStore((s) => s.setChoropleth);
  const suburb = selectedId ? suburbsById[selectedId] : undefined;
  const open = Boolean(suburb);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [suburb?.id, choropleth]);

  const sections: { id: Choropleth; title: string; body: ReactNode }[] = suburb
    ? [
        { id: "safety", title: "Safety", body: <SafetyBody suburb={suburb} /> },
        { id: "housing", title: "Housing", body: <HousingBody suburb={suburb} /> },
        { id: "transit", title: "Transit", body: <TransitBody suburb={suburb} /> },
        { id: "backgrounds", title: "Backgrounds", body: <BackgroundsBody suburb={suburb} /> },
      ]
    : [];

  const ordered = [...sections].sort((a, b) => {
    if (a.id === choropleth) return -1;
    if (b.id === choropleth) return 1;
    return SECTION_ORDER.indexOf(a.id) - SECTION_ORDER.indexOf(b.id);
  });

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
              <p className="text-xs text-muted">{headerNote(suburb, choropleth)}</p>
            </div>
            <div className="flex shrink-0 items-center">
              <ShareButton label="Share" />
              <button
                type="button"
                aria-label="Close"
                onClick={() => selectSuburb(null)}
                className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-bg hover:text-fg"
              >
                <X className="size-5" strokeWidth={2} />
              </button>
            </div>
          </header>

          <div className="px-5 pb-2 md:hidden">
            <div
              role="radiogroup"
              aria-label="Map layer"
              className="flex gap-1 overflow-x-auto no-scrollbar"
            >
              {LAYERS.map(({ id, label }) => {
                const on = choropleth === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setChoropleth(id)}
                    className={cn(
                      "flex h-11 shrink-0 items-center rounded-xl px-2.5 text-xs font-medium whitespace-nowrap",
                      "transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.96]",
                      on ? "bg-ink text-bg" : "bg-bg text-muted",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            ref={scroller}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            {ordered.map((section) => (
              <Block key={section.id} title={section.title} featured={section.id === choropleth}>
                {section.body}
              </Block>
            ))}
            <p className="border-t border-border pt-3 text-sm">
              <Link
                to="/suburb/$id"
                params={{ id: suburb.id }}
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Full page for {suburb.name} →
              </Link>
            </p>
            <EmailSignup suburbId={suburb.id} suburbName={suburb.name} />
          </div>
        </div>
      ) : null}
    </aside>
  );
}
