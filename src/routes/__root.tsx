import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/copy";
import { plausibleDomain } from "@/lib/analytics";
import appCss from "../styles.css?url";

const PLAUSIBLE_STUB =
  "window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)}";

export const Route = createRootRoute({
  head: () => {
    const domain = plausibleDomain();
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
        { title: APP_NAME },
        {
          name: "description",
          content: APP_DESCRIPTION,
        },
        { name: "theme-color", content: "#F4F1EA" },
      ],
      links: [
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "stylesheet", href: appCss },
        { rel: "manifest", href: "/__grok/manifest.webmanifest" },
        { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap",
        },
      ],
      scripts: domain
        ? [
            { children: PLAUSIBLE_STUB },
            {
              defer: true,
              src: "https://plausible.io/js/script.tagged-events.js",
              "data-domain": domain,
            },
          ]
        : [],
    };
  },
  component: () => (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="font-sans">
        <PreviewHostBridge />
        <Outlet />
        <Scripts />
      </body>
    </html>
  ),
});
