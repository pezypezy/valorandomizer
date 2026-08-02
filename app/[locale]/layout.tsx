import type { Metadata } from "next";
import { Orbitron, Zen_Kaku_Gothic_New } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { Backdrop } from "@/components/ui/Backdrop";
import { SiteHeader } from "@/components/SiteHeader";
import { MotionProvider } from "@/components/MotionProvider";
import "../globals.css";

const orbitron = Orbitron({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
});

const zenKaku = Zen_Kaku_Gothic_New({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-zen-kaku",
  display: "swap",
});

const metadataByLocale: Record<AppLocale, Pick<Metadata, "title" | "description">> = {
  ja: {
    title: "VALORANDOMIZER | チームランダムピッカー",
    description: "ロール指定のランダム抽選と、プロ構成を使ったVALORANTチームピッカー。",
  },
  en: {
    title: "VALORANDOMIZER | Team Random Picker",
    description: "Build a random VALORANT squad by role or draw from past pro team compositions.",
  },
  ko: {
    title: "VALORANDOMIZER | 팀 랜덤 피커",
    description: "역할별 랜덤 추첨과 프로 팀 조합을 활용하는 VALORANT 팀 피커입니다.",
  },
};

export async function generateMetadata({
  params,
}: Pick<LayoutProps<"/[locale]">, "params">): Promise<Metadata> {
  const { locale: requestedLocale } = await params;
  const locale = hasLocale(routing.locales, requestedLocale)
    ? requestedLocale
    : routing.defaultLocale;

  return {
    ...metadataByLocale[locale],
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(
        routing.locales.map((supportedLocale) => [supportedLocale, `/${supportedLocale}`]),
      ),
    },
  };
}

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

  return (
    <html lang={locale} className={`${orbitron.variable} ${zenKaku.variable}`}>
      <body className="relative min-h-full">
        <NextIntlClientProvider>
          <MotionProvider>
            <Backdrop />
            <div className="relative z-10 flex min-h-screen flex-col">
              <SiteHeader />
              <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 sm:px-6">
                {children}
              </main>
            </div>
          </MotionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
