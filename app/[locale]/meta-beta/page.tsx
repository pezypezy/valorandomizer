import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { MetaBetaDashboard } from "@/components/meta/MetaBetaDashboard";
import { isMetaBetaAuthenticated } from "@/lib/meta-beta/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ranked Meta Private Beta | Valorandomizer",
  description: "Password-protected test page for VALORANT ranked composition statistics and AI advice.",
  robots: { index: false, follow: false },
};

export default async function MetaBetaPage({ params }: PageProps<"/[locale]/meta-beta">) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (!(await isMetaBetaAuthenticated())) {
    redirect(`/${locale}/meta-beta/login`);
  }

  return <MetaBetaDashboard locale={locale} />;
}
