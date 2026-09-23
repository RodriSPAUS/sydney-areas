type Props = Record<string, string | number | boolean | undefined>;

type PlausibleFn = (name: string, options?: { props?: Record<string, string | number | boolean> }) => void;

declare global {
  interface Window {
    plausible?: PlausibleFn & { q?: IArguments[] };
  }
}

export function plausibleDomain(): string {
  const value = import.meta.env.VITE_PLAUSIBLE_DOMAIN;
  return typeof value === "string" ? value.trim() : "";
}

function clean(props?: Props): Record<string, string | number | boolean> | undefined {
  if (!props) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(props)) {
    if (value !== undefined) out[key] = value;
  }
  return Object.keys(out).length ? out : undefined;
}

export function track(name: string, props?: Props): void {
  if (!plausibleDomain()) return;
  if (typeof window === "undefined") return;
  const fn = window.plausible;
  if (typeof fn !== "function") return;
  const payload = clean(props);
  if (payload) fn(name, { props: payload });
  else fn(name);
}

export function trackOutbound(href: string, label?: string): void {
  track("outbound", { href, label });
}
