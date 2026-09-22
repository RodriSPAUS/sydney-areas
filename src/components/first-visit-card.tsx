import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  FIRST_VISIT_BULLETS,
  FIRST_VISIT_KEY,
  SOURCE_LINES,
} from "@/lib/copy";

export function FirstVisitCard() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(FIRST_VISIT_KEY) !== "1") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(FIRST_VISIT_KEY, "1");
    } catch {
      /* private mode */
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-end justify-center p-3 pb-[max(5.5rem,env(safe-area-inset-bottom))] md:items-center md:pb-3">
      <div
        role="dialog"
        aria-labelledby="first-visit-title"
        className="pointer-events-auto w-full max-w-sm rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)] md:p-5"
      >
        <h2 id="first-visit-title" className="text-base font-semibold tracking-tight text-fg">
          How to read the map
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-4 text-sm leading-snug text-fg">
          {FIRST_VISIT_BULLETS.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] font-semibold tracking-wide text-primary uppercase">Sources</p>
        <ul className="mt-1 space-y-0.5 text-xs leading-snug text-muted">
          {SOURCE_LINES.map((row) => (
            <li key={row.name}>{row.name}</li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between gap-3">
          <Link
            to="/about"
            className="text-sm font-medium text-muted underline-offset-2 hover:text-fg hover:underline"
          >
            Full sources
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="flex h-11 items-center justify-center rounded-xl bg-ink px-4 text-sm font-medium text-bg transition-transform duration-150 ease-out active:scale-[0.96]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
