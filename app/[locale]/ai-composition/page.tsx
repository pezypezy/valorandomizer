import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CollectionStatusPanel } from "@/components/meta/CollectionStatusPanel";
import { MetaBetaDashboard } from "@/components/meta/MetaBetaDashboard";
import { getD1Database, isMetaBetaAuthenticated } from "@/lib/meta-beta/auth";
import { getCollectionStatus } from "@/lib/meta-beta/collection-status";
import { buildLocalizedMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

const META = {
  ja: {
    title: "VALORANT AI構成・ランク構成統計 | Valorandomizer",
    description: "現パッチ・直近7日のランク構成統計を使い、セオリー・オフメタ・野良向け構成を比較してAIに相談できる限定ベータ。",
  },
  en: {
    title: "VALORANT AI Composition and Ranked Stats | Valorandomizer",
    description: "Private beta for comparing theory, off-meta, and solo-queue compositions with current-patch ranked statistics and AI advice.",
  },
  ko: {
    title: "VALORANT AI 조합・랭크 조합 통계 | Valorandomizer",
    description: "현 패치・최근 7일 랭크 통계로 정석, 오프메타, 솔로 랭크 조합을 비교하고 AI에게 상담하는 비공개 베타입니다.",
  },
} as const;

export async function generateMetadata({ params }: PageProps<"/[locale]/ai-composition">) {
  const { locale } = await params;
  const meta = META[locale as keyof typeof META] ?? META.en;
  return buildLocalizedMetadata(locale, { ...meta, path: "ai-composition", robots: { index: false, follow: false } });
}

export default async function AiCompositionPage({ params }: PageProps<"/[locale]/ai-composition">) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (!(await isMetaBetaAuthenticated())) {
    redirect(`/${locale}`);
  }

  const collectionStatus = await getCollectionStatus(getD1Database());
  return (
    <>
      <MetaBetaDashboard locale={locale} />
      <CollectionStatusPanel locale={locale} status={collectionStatus} />
    </>
  );
}
