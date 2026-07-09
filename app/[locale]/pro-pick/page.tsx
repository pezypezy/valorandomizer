import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Picker } from "@/components/Picker";

const META: Record<string, Metadata> = {
  ja: {
    title: "VALORANT Pro Pick | プロ構成ランダム抽選",
    description: "過去のVCT/プロチーム構成からマップ・イベント・地域・チーム条件で抽選。VALORANTカスタムや配信用チャレンジに使えます。",
  },
  en: {
    title: "VALORANT Pro Pick | Pro Composition Randomizer",
    description: "Draw past pro VALORANT compositions by map, event, region, and team. Built for custom games, scrims, and stream challenges.",
  },
  ko: {
    title: "VALORANT Pro Pick | 프로 구성 랜덤 추첨",
    description: "과거 프로 팀 구성을 맵, 이벤트, 지역, 팀 조건으로 추첨해 VALORANT 커스텀 게임과 방송용 챌린지에 활용하세요.",
  },
};

export async function generateMetadata({ params }: PageProps<"/[locale]/pro-pick">): Promise<Metadata> {
  const { locale } = await params;
  return META[locale] ?? META.en;
}

export default async function ProPickPage({ params }: PageProps<"/[locale]/pro-pick">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Picker initialMode="pro" locale={locale} />;
}
