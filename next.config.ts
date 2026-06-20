import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { routing } from "./i18n/routing";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
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
};

export default withNextIntl(nextConfig);

// Enables Cloudflare bindings (D1, etc.) when running `next dev` locally.
// No-op outside the OpenNext dev runtime.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
