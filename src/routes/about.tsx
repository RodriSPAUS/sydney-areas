import { createFileRoute, Link } from "@tanstack/react-router";
import { ABOUT_INTRO, APP_DESCRIPTION, APP_NAME, SOURCE_LINES, TAGLINE } from "@/lib/copy";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: `About · ${APP_NAME}` },
      { name: "description", content: APP_DESCRIPTION },
    ],
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
      </article>
    </main>
  );
}
