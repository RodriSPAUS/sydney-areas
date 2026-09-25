import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { EmailSignup } from "@/components/email-signup";
import { suburbsById } from "@/data/suburbs";
import { TRANSIT_MODE_LABEL } from "@/lib/access";
import { formatAud } from "@/lib/choropleth";
import {
  APP_NAME,
  BACKGROUNDS_NOTE,
  HOUSING_CENSUS_NOTE,
  HOUSING_DCJ_NOTE,
  SAFETY_DENOMINATOR_NOTE,
  SAFETY_DISCLAIMER,
  SAFETY_TOO_FEW,
  SAFETY_VISITOR_NOTE,
  SITE_URL,
  TRANSIT_NO_BUS,
  TRANSIT_NOTE,
} from "@/lib/copy";
import { layerRank, rankSentence } from "@/lib/ranks";
import { allCount, VISITOR_HUB_IDS } from "@/lib/safety-counts";
import type { Suburb } from "@/lib/suburb-types";

export const Route = createFileRoute("/suburb/$id")({
  loader: ({ params }) => {
    const suburb = suburbsById[params.id];
    if (!suburb) throw notFound();
    return { id: suburb.id };
  },
  head: ({ params }) => {
    const suburb = suburbsById[params.id];
    if (!suburb) return { meta: [{ title: `Suburb not found · ${APP_NAME}` }] };
    const title = `${suburb.name}: crime, rent and who lives there · ${APP_NAME}`;
    const description = pageDescription(suburb);
    const url = `${SITE_URL}/suburb/${suburb.id}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: `${SITE_URL}/og.jpg` },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: SuburbPage,
  notFoundComponent: SuburbNotFound,
});

/** One plain sentence per figure we have, for the meta description. */
function pageDescription(suburb: Suburb): string {
  const parts: string[] = [];
  const rate = suburb.safety?.allPer1000;
  if (rate != null)
    parts.push(`${rate} recorded violence and property incidents per 1,000 residents`);
  const rent = suburb.housing?.medianWeeklyRent;
  if (rent != null) parts.push(`median rent ${formatAud(rent)} a week`);
  const born = suburb.backgrounds?.pctBornAustralia;
  if (born != null) parts.push(`${born}% born in Australia`);
  const lead = parts.length
    ? `${suburb.name}, Greater Sydney: ${parts.join(", ")}.`
    : `${suburb.name}, Greater Sydney.`;
  return `${lead} Ranked against other Sydney suburbs on open ABS, BOCSAR and DCJ data.`;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-[11px] font-semibold tracking-wide text-primary uppercase">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function Big({ children }: { children: ReactNode }) {
  return <p className="text-2xl font-semibold tracking-tight tabular-nums">{children}</p>;
}

function Note({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted">{children}</p>;
}

function SafetySection({ suburb }: { suburb: Suburb }) {
  const s = suburb.safety;
  if (!s?.last12Months) return <p className="text-muted">No BOCSAR figures for this suburb.</p>;
  const incidents = allCount(s.last12Months);
  const rank = layerRank(suburb.id, "safety", "all");
  return (
    <>
      {s.allPer1000 != null ? (
        <Big>
          {s.allPer1000}
          <span className="ml-1 text-sm font-medium text-muted">
            violence + property incidents per 1,000 residents
          </span>
        </Big>
      ) : (
        <Big>
          {incidents.toLocaleString("en-AU")}
          <span className="ml-1 text-sm font-medium text-muted">recorded incidents</span>
        </Big>
      )}
      <p className="text-muted">
        {incidents.toLocaleString("en-AU")} recorded incidents
        {s.period12 ? `, ${s.period12}` : ""}
        {s.population ? `, ${s.population.toLocaleString("en-AU")} residents (Census 2021)` : ""}.
      </p>
      {rank ? (
        <p className="font-medium">{rankSentence("safety", rank)}.</p>
      ) : (
        <p>{SAFETY_TOO_FEW}</p>
      )}
      {s.violencePer1000 != null ? (
        <p>
          Violence {s.violencePer1000} · Property {s.propertyPer1000 ?? "—"} · Domestic assault{" "}
          {s.domesticPer1000 ?? "—"} per 1,000 residents.
        </p>
      ) : null}
      {VISITOR_HUB_IDS.has(suburb.id) ? <p>{SAFETY_VISITOR_NOTE}</p> : null}
      <Note>{SAFETY_DISCLAIMER}</Note>
      <Note>{SAFETY_DENOMINATOR_NOTE}</Note>
    </>
  );
}

function HousingSection({ suburb }: { suburb: Suburb }) {
  const h = suburb.housing;
  const hh = suburb.households;
  const rank = layerRank(suburb.id, "housing", "all");
  const dcj = h?.source === "dcj";
  const beds =
    dcj && h
      ? (
          [
            ["1 bed", h.rent1Br],
            ["2 bed", h.rent2Br],
            ["3 bed", h.rent3Br],
            ["House", h.rentHouse],
            ["Flat", h.rentFlat],
          ] as [string, number | null | undefined][]
        ).filter((row): row is [string, number] => row[1] != null)
      : [];
  if (!h && !hh) return <p className="text-muted">No rent or household figures for this suburb.</p>;
  return (
    <>
      {h?.medianWeeklyRent != null ? (
        <Big>
          {formatAud(h.medianWeeklyRent)}
          <span className="ml-1 text-sm font-medium text-muted">median weekly rent</span>
        </Big>
      ) : null}
      {rank ? <p className="font-medium">{rankSentence("housing", rank)}.</p> : null}
      {beds.length ? (
        <p>{beds.map(([label, value]) => `${label} ${formatAud(value)}`).join(" · ")}</p>
      ) : null}
      {h?.medianPurchase != null ? (
        <p>Median sale price {formatAud(h.medianPurchase)} (DCJ).</p>
      ) : null}
      {hh ? <p>{householdLine(hh)}</p> : null}
      {h ? (
        <Note>
          {dcj
            ? `${HOUSING_DCJ_NOTE} Postcode ${h.postcode ?? "—"}, ${h.period ?? ""}.`
            : HOUSING_CENSUS_NOTE}
        </Note>
      ) : null}
    </>
  );
}

function householdLine(hh: NonNullable<Suburb["households"]>): string {
  const parts: string[] = [];
  if (hh.medianAge != null) parts.push(`Median age ${hh.medianAge}.`);
  if (hh.pctRenting != null) parts.push(`${hh.pctRenting}% of households rent.`);
  if (hh.pctFamiliesWithChildren != null)
    parts.push(`${hh.pctFamiliesWithChildren}% of families have children.`);
  return parts.length ? `${parts.join(" ")} (Census 2021)` : "";
}

function TransitSection({ suburb }: { suburb: Suburb }) {
  const t = suburb.transit;
  const rank = layerRank(suburb.id, "transit", "all");
  return (
    <>
      <Big>
        {t.walkPct === 0
          ? "No rail, metro, light rail or ferry stop within 800 m"
          : `${t.walkPct}% within 800 m of a stop`}
      </Big>
      {rank ? <p className="font-medium">{rankSentence("transit", rank)}.</p> : null}
      {t.names.length ? (
        <p>
          Nearby:{" "}
          {t.names.map((stop) => `${stop.name} (${TRANSIT_MODE_LABEL[stop.mode]})`).join(", ")}.
        </p>
      ) : null}
      <Note>{TRANSIT_NOTE}</Note>
      <Note>{TRANSIT_NO_BUS}</Note>
    </>
  );
}

function BackgroundsSection({ suburb }: { suburb: Suburb }) {
  const b = suburb.backgrounds;
  const rank = layerRank(suburb.id, "backgrounds", "all");
  if (!b) return <p className="text-muted">No Census 2021 ancestry figures for this suburb.</p>;
  return (
    <>
      <Big>
        {b.pctBornAustralia}%
        <span className="ml-1 text-sm font-medium text-muted">born in Australia</span>
      </Big>
      {rank ? <p className="font-medium">{rankSentence("backgrounds", rank)}.</p> : null}
      <p>Top ancestries: {b.topAncestries.map((a) => `${a.name} ${a.pct}%`).join(", ")}.</p>
      <p>Most common language other than English: {b.topLanguageOther}.</p>
      <Note>{BACKGROUNDS_NOTE}</Note>
    </>
  );
}

function SuburbPage() {
  const { id } = Route.useLoaderData();
  const suburb = suburbsById[id]!;
  return (
    <main className="h-dvh overflow-y-auto bg-bg text-fg">
      <article className="mx-auto max-w-lg px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
        <p className="flex items-center justify-between text-sm">
          <Link to="/" className="font-medium text-primary underline-offset-2 hover:underline">
            ← {APP_NAME} map
          </Link>
          <Link to="/about" className="text-muted underline-offset-2 hover:text-fg hover:underline">
            About
          </Link>
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{suburb.name}</h1>
        <p className="mt-1 text-sm text-muted">
          Greater Sydney · crime, rent, transit and who lives there, ranked against other suburbs.
        </p>
        <p className="mt-4">
          <Link
            to="/"
            search={{ s: suburb.id }}
            className="inline-flex h-11 items-center rounded-xl bg-ink px-4 text-sm font-medium text-bg"
          >
            See {suburb.name} on the map
          </Link>
        </p>

        <Section title="Safety">
          <SafetySection suburb={suburb} />
        </Section>
        <Section title="Housing">
          <HousingSection suburb={suburb} />
        </Section>
        <Section title="Transit">
          <TransitSection suburb={suburb} />
        </Section>
        <Section title="Backgrounds">
          <BackgroundsSection suburb={suburb} />
        </Section>

        <EmailSignup
          suburbId={suburb.id}
          suburbName={suburb.name}
          className="mt-10 bg-surface shadow-[var(--shadow-border)]"
        />

        <p className="mt-10 text-xs text-muted">
          Independent map, not affiliated with ABS, BOCSAR, DCJ or TfNSW.{" "}
          <Link to="/about" className="underline underline-offset-2">
            Sources and licences
          </Link>
          .
        </p>
      </article>
    </main>
  );
}

function SuburbNotFound() {
  return (
    <main className="flex h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <h1 className="text-lg font-semibold">We don’t have that suburb</h1>
      <p className="text-sm text-muted">It may be outside Greater Sydney or spelled differently.</p>
      <Link to="/" className="text-sm font-medium text-primary underline-offset-2 hover:underline">
        Search the map
      </Link>
    </main>
  );
}
