import { setRequestLocale } from "next-intl/server";
import { HomeLanding } from "@/components/HomeLanding";
import { buildLocalizedMetadata } from "@/lib/seo";

const META = {
  ja: {
    title: "VALORANT 構成ツール | Random・Pro・AI | Valorandomizer",
    description: "VALORANTのランダム構成、過去のプロ構成抽選、ランク統計を使ったAI構成相談をまとめたチーム構成ツール。",
  },
  en: {
    title: "VALORANT Composition Tools | Random, Pro and AI | Valorandomizer",
    description: "Choose role-based random squads, past pro compositions, or AI composition advice backed by ranked statistics.",
  },
  ko: {
    title: "VALORANT 조합 도구 | Random・Pro・AI | Valorandomizer",
    description: "VALORANT 랜덤 조합, 과거 프로 조합 추첨, 랭크 통계 기반 AI 조합 상담을 한곳에서 제공합니다.",
  },
} as const;

export async function generateMetadata({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  const meta = META[locale as keyof typeof META] ?? META.en;
  return buildLocalizedMetadata(locale, meta);
}

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HomeLanding locale={locale} />;
}
