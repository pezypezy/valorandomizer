import type { Metadata } from "next";
import { routing, type AppLocale } from "@/i18n/routing";

export const SITE_URL = "https://valo-randomizer.com";
export const SITE_NAME = "Valorandomizer";

const OG_LOCALE: Record<AppLocale, string> = {
  ja: "ja_JP",
  en: "en_US",
  ko: "ko_KR",
};

export function localizedPath(locale: AppLocale, path = "") {
  const normalizedPath = path ? `/${path.replace(/^\//, "")}` : "";
  return `/${locale}${normalizedPath}`;
}

export function localizedUrl(locale: AppLocale, path = "") {
  return `${SITE_URL}${localizedPath(locale, path)}`;
}

export function buildLocalizedMetadata(
  localeValue: string,
  options: { title: string; description: string; path?: string },
): Metadata {
  const locale = (routing.locales.includes(localeValue as AppLocale) ? localeValue : routing.defaultLocale) as AppLocale;
  const path = options.path ?? "";
  const canonical = localizedUrl(locale, path);
  const languages = Object.fromEntries(
    routing.locales.map((item) => [item, localizedUrl(item, path)]),
  );

  return {
    title: options.title,
    description: options.description,
    alternates: {
      canonical,
      languages: {
        ...languages,
        "x-default": localizedUrl(routing.defaultLocale, path),
      },
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: options.title,
      description: options.description,
      url: canonical,
      locale: OG_LOCALE[locale],
      alternateLocale: routing.locales.filter((item) => item !== locale).map((item) => OG_LOCALE[item]),
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: "Valorandomizer — VALORANT Team Randomizer",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: options.title,
      description: options.description,
      images: ["/opengraph-image"],
    },
  };
}
