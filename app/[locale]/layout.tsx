import type { Metadata } from "next";
import { M_PLUS_1_Code, Noto_Sans_JP, Orbitron } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { Backdrop } from "@/components/ui/Backdrop";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import "../globals.css";

const orbitron = Orbitron({
  weight: ["500", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
});

const mPlus1Code = M_PLUS_1_Code({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-mplus1code",
  display: "swap",
});

const noto = Noto_Sans_JP({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-noto",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: "Valorandomizer — VALORANT Team Randomizer",
  description: "Create VALORANT custom-game team compositions with random role picks and past pro team setups.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    url: `${SITE_URL}/${locale}`,
    applicationCategory: "GameApplication",
    operatingSystem: "Any",
    description: "A free VALORANT team composition randomizer with Random Pick and Pro Pick modes.",
    inLanguage: locale,
    isAccessibleForFree: true,
  };

  return (
    <html lang={locale} className={`${orbitron.variable} ${mPlus1Code.variable} ${noto.variable}`}>
      <body className="relative min-h-full">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
        <NextIntlClientProvider>
          <Backdrop />
          <div className="relative z-10 flex min-h-screen flex-col">
            <SiteHeader />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 sm:px-6">
              {children}
            </main>
            <SiteFooter locale={locale} />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
