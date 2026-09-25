import { Check, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { useMapStore } from "@/lib/map-store";
import { shareTitle } from "@/lib/share-title";
import { cn } from "@/lib/utils";

type Outcome = "idle" | "copied" | "failed";

/**
 * Shares the current view. The URL already carries suburb, layer and metric
 * (see UrlSync), so the link is simply the address bar. Touch devices get the
 * native share sheet; everything else copies the link.
 */
export function ShareButton({ className, label }: { className?: string; label?: string }) {
  const [outcome, setOutcome] = useState<Outcome>("idle");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function flash(next: Outcome) {
    setOutcome(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOutcome("idle"), 2000);
  }

  async function onClick() {
    const { selectedId, choropleth } = useMapStore.getState();
    const url = window.location.href;
    const title = shareTitle(selectedId, choropleth);
    const props = { layer: choropleth, suburb: selectedId ?? undefined };

    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        track("share", { ...props, method: "native" });
      } catch {
        /* dismissed the sheet */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      track("share", { ...props, method: "copy" });
      flash("copied");
    } catch {
      flash("failed");
    }
  }

  const text =
    outcome === "copied" ? "Link copied" : outcome === "failed" ? "Copy the address bar" : label;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label ? undefined : "Share this view"}
      className={cn(
        "flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl text-muted transition-colors hover:bg-bg hover:text-fg",
        text ? "px-2.5 text-xs font-medium" : "size-11",
        className,
      )}
    >
      {outcome === "copied" ? (
        <Check className="size-4" strokeWidth={2} aria-hidden />
      ) : (
        <Share2 className="size-4" strokeWidth={2} aria-hidden />
      )}
      {text ? <span aria-live="polite">{text}</span> : null}
    </button>
  );
}
