import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { routing } from "./i18n/routing";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Pin the workspace root to this project (a stray lockfile higher up the
  // tree would otherwise be inferred as the root).
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    // Cloudflare Workers has no sharp-based optimizer; serve images as-is.
    // (Our agent portraits are already reasonably sized PNGs.)
    unoptimized: true,
  },
  // No i18n middleware/proxy: Next 16 proxy is Node-runtime only, which
  // OpenNext/Cloudflare can't run. Redirect the bare root to the default
  // locale here; locale rendering is handled by the [locale] segment.
  async redirects() {
    return [
      { source: "/", destination: `/${routing.defaultLocale}`, permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

// Binding emulation is only needed by `next dev`. Avoid opening a remote
// Cloudflare session during a normal `next build` or CI validation run.
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}

export default withNextIntl(nextConfig);
