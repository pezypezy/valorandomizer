import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { localizedUrl } from "@/lib/seo";

const ROUTES = [
  { path: "", priority: 1, changeFrequency: "weekly" as const },
  { path: "random-pick", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "pro-pick", priority: 0.9, changeFrequency: "daily" as const },
  { path: "legal", priority: 0.2, changeFrequency: "yearly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.flatMap((route) =>
    routing.locales.map((locale) => ({
      url: localizedUrl(locale, route.path),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: {
        languages: {
          ...Object.fromEntries(
            routing.locales.map((item) => [item, localizedUrl(item, route.path)]),
          ),
          "x-default": localizedUrl(routing.defaultLocale, route.path),
        },
      },
    })),
  );
}
