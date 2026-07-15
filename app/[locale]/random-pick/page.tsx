import { setRequestLocale } from "next-intl/server";
import { Picker } from "@/components/Picker";
import { buildLocalizedMetadata } from "@/lib/seo";

const META = {
  ja: {
    title: "VALORANT Random Pick | ロール指定チーム構成ランダマイザー",
    description: "デュエリスト、イニシエーター、コントローラー、センチネルの人数を指定してVALORANTの5人構成をランダム生成。共有URLにも対応。",
  },
  en: {
    title: "VALORANT Random Pick | Role-Based Team Randomizer",
    description: "Set Duelist, Initiator, Controller, and Sentinel counts to generate a random five-agent VALORANT squad with a shareable URL.",
  },
  ko: {
    title: "VALORANT Random Pick | 롤 지정 팀 랜덤 생성기",
    description: "타격대, 척후대, 전략가, 감시자 인원수를 지정해 VALORANT 5인 구성을 랜덤 생성하고 URL로 공유하세요.",
  },
} as const;

export async function generateMetadata({ params }: PageProps<"/[locale]/random-pick">) {
  const { locale } = await params;
  const meta = META[locale as keyof typeof META] ?? META.en;
  return buildLocalizedMetadata(locale, { ...meta, path: "random-pick" });
}

export default async function RandomPickPage({ params }: PageProps<"/[locale]/random-pick">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Picker initialMode="random" locale={locale} />;
}
