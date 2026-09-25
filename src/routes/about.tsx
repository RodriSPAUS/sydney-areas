import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ABOUT_INTRO,
  APP_DESCRIPTION,
  APP_NAME,
  CONTACT_BLURB,
  CONTACT_EMAIL,
  CONTACT_HEADING,
  SITE_URL,
  SOURCE_LINES,
  TAGLINE,
} from "@/lib/copy";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: `About · ${APP_NAME}` },
      { name: "description", content: APP_DESCRIPTION },
      { property: "og:title", content: `About · ${APP_NAME}` },
      { property: "og:url", content: `${SITE_URL}/about` },
      { property: "og:image", content: `${SITE_URL}/og.jpg` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/about` }],
  }),
  component: About,
});

function About() {
  return (
    <main className="h-dvh overflow-y-auto bg-bg text-fg">
      <article className="mx-auto max-w-lg px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
        <p className="text-sm">
          <Link to="/" className="font-medium text-primary underline-offset-2 hover:underline">
            ← Map
          </Link>
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{APP_NAME}</h1>
        <p className="mt-1 text-sm text-muted">{TAGLINE}</p>

        <p className="mt-4 text-sm leading-relaxed">{ABOUT_INTRO}</p>

        <h2 className="mt-8 text-[11px] font-semibold tracking-wide text-primary uppercase">Sources</h2>
        <dl className="mt-3 space-y-4">
          {SOURCE_LINES.map((row) => (
            <div key={row.name}>
              <dt className="text-sm font-semibold text-fg">{row.name}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted">{row.detail}</dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-8 text-[11px] font-semibold tracking-wide text-primary uppercase">Licences</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          BOCSAR CC-BY 3.0 AU. ABS Census 2021 and SAL CC BY 4.0. DCJ Rent and Sales Report CC BY.
        </p>

        <h2 className="mt-8 text-[11px] font-semibold tracking-wide text-primary uppercase">
          Privacy
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          No account and no cookies. Visits are counted with Plausible, which stores no personal
          data. If you ask for update emails, your address and the suburbs you follow are kept by
          Buttondown for those notices only.
        </p>

        <h2 className="mt-8 text-[11px] font-semibold tracking-wide text-primary uppercase">
          {CONTACT_HEADING}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{CONTACT_BLURB}</p>
        <p className="mt-2 text-sm">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </article>
    </main>
  );
}
