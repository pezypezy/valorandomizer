import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Pin the workspace root to this project (a stray lockfile higher up the
  // tree would otherwise be inferred as the root).
  turbopack: {
    root: import.meta.dirname,
  },
};

export default withNextIntl(nextConfig);
