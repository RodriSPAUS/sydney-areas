import { useState, type FormEvent } from "react";
import { track } from "@/lib/analytics";
import { SIGNUP_BLURB, SIGNUP_PRIVACY } from "@/lib/copy";
import { signupEndpoint } from "@/lib/signup";
import { cn } from "@/lib/utils";

type State = "idle" | "sending" | "done" | "failed";

export function EmailSignup({
  suburbId,
  suburbName,
  className,
}: {
  suburbId: string;
  suburbName: string;
  className?: string;
}) {
  const endpoint = signupEndpoint();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");

  if (!endpoint) return null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (state === "sending") return;
    setState("sending");
    const body = new FormData();
    body.set("email", email.trim());
    // Buttondown tags let one list hold "which suburbs this person follows".
    body.set("tag", `suburb:${suburbId}`);
    try {
      // The embed endpoint answers with a redirect and no CORS headers, so the
      // response is opaque; a network error is the only failure we can see.
      await fetch(endpoint, { method: "POST", body, mode: "no-cors" });
      track("signup", { suburb: suburbId });
      setState("done");
    } catch {
      setState("failed");
    }
  }

  if (state === "done") {
    return (
      <p className={cn("rounded-xl bg-bg px-3 py-2 text-sm", className)} role="status">
        Check your inbox to confirm. We will only write when {suburbName}’s figures update.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className={cn("rounded-xl bg-bg px-3 py-3", className)}>
      <label htmlFor={`signup-${suburbId}`} className="text-sm font-medium text-fg">
        {SIGNUP_BLURB.replace("{suburb}", suburbName)}
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id={`signup-${suburbId}`}
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-fg"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="h-11 shrink-0 rounded-xl bg-ink px-4 text-sm font-medium text-bg disabled:opacity-60"
        >
          {state === "sending" ? "…" : "Notify me"}
        </button>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-muted">
        {state === "failed" ? "That did not go through. Try again in a moment." : SIGNUP_PRIVACY}
      </p>
    </form>
  );
}
