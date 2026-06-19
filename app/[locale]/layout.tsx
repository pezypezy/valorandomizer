import type { Metadata } from "next";
import localFont from "next/font/local";
import { Noto_Sans_JP } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Backdrop } from "@/components/ui/Backdrop";
import { SiteHeader } from "@/components/SiteHeader";
import "../globals.css";

const hikomi = localFont({
  src: [
    { path: "../../public/fonts/HikomiFontS-Regular.ttf", weight: "400", style: "normal" },
    { path: "../../public/fonts/HikomiFontS-Thin.ttf", weight: "200", style: "normal" },
  ],
  variable: "--font-hikomi",
  display: "swap",
});

const noto = Noto_Sans_JP({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-noto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Valorandomizer — Team Random Picker",
  description: "Set your role composition and summon five Valorant agents at random.",
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

  return (
    <html lang={locale} className={`${hikomi.variable} ${noto.variable}`}>
      <body className="relative min-h-full">
        <NextIntlClientProvider>
          <Backdrop />
          <div className="relative z-10 flex min-h-screen flex-col">
            <SiteHeader />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 sm:px-6">
              {children}
            </main>
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
