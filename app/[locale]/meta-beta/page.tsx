import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CollectionStatusPanel } from "@/components/meta/CollectionStatusPanel";
import { MetaBetaDashboard } from "@/components/meta/MetaBetaDashboard";
import { getD1Database, isMetaBetaAuthenticated } from "@/lib/meta-beta/auth";
import { getCollectionStatus } from "@/lib/meta-beta/collection-status";

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

  const collectionStatus = await getCollectionStatus(getD1Database());
  return (
    <>
      <MetaBetaDashboard locale={locale} />
      <CollectionStatusPanel locale={locale} status={collectionStatus} />
    </>
  );
}
