import { setRequestLocale } from "next-intl/server";
import { Picker } from "@/components/Picker";
import { buildLocalizedMetadata } from "@/lib/seo";

const META = {
  ja: {
    title: "VALORANT チーム構成ランダマイザー | Valorandomizer",
    description: "VALORANTの5人チーム構成をランダム生成。ロール指定、個別リロール、プロチーム構成抽選に対応。カスタム・フルパ・配信用のネタ構成に使えます。",
  },
  en: {
    title: "VALORANT Team Randomizer | Valorandomizer",
    description: "Generate VALORANT custom-game team compositions with role-based random picks, rerolls, shareable URLs, and past pro team setups.",
  },
  ko: {
    title: "VALORANT 팀 구성 랜덤 생성기 | Valorandomizer",
    description: "VALORANT 커스텀 게임용 5인 팀 구성을 랜덤 생성합니다. 롤 지정, 개별 재추첨, 프로 팀 구성 추첨, 공유 URL을 지원합니다.",
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
  return <Picker locale={locale} />;
}
