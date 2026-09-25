import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
// @ts-expect-error JS plugin alongside the TS vite config
import { grokPwaPlugin } from "./scripts/grok-pwa-plugin.mjs";

function nitroPreset(): string {
  const fromEnv = process.env.NITRO_PRESET?.trim();
  if (fromEnv) return fromEnv;
  // Cloudflare Pages Git builds set CF_PAGES=1. Keep Vercel as the default
  // so Grok / Vercel deploys still emit .vercel/output.
  if (process.env.CF_PAGES === "1" || process.env.CF_PAGES === "true") {
    return "cloudflare_pages";
  }
  return "vercel";
}

// `0.0.0.0:8080` is the live-preview contract — don't change host/port.
// The dev server starts once `src/router.tsx` and `src/routes/` exist — see
// AGENTS.md § "First scaffold".
export default defineConfig(({ command, isPreview }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
  },
  optimizeDeps: {
    exclude: ["maplibre-gl"],
  },
  preview: {
    host: "127.0.0.1",
    port: 8081,
    strictPort: true,
  },
  // MapLibre 6 loads a module worker. Vite's default IIFE worker is ignored
  // (type: 'module' does not throw, so the IIFE never runs and fills stay empty).
  worker: {
    format: "es",
  },
  resolve: { tsconfigPaths: true },
  plugins: [
    // PWA head + ?install=1 tutorial page; runs before Start/Nitro.
    grokPwaPlugin(),
    tailwindcss(),
    tanstackStart(),
    ...(command === "build" || isPreview
      ? [
          nitro({
            preset: nitroPreset(),
            // Auto-registers server/middleware/* (the PWA install page +
            // manifest + head-tag middleware). Nitro v3 defaults serverDir to
            // false, so removing this silently unwires /?install=1 on deploys.
            serverDir: "./server",
          }),
        ]
      : []),
    viteReact(),
  ],
}));
