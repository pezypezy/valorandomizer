import { setRequestLocale } from "next-intl/server";
import { BackLink } from "@/components/BackLink";
import { ProPickPicker } from "@/components/ProPickPicker";
import { buildLocalizedMetadata } from "@/lib/seo";

const META = {
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
} as const;

export async function generateMetadata({ params }: PageProps<"/[locale]/pro-pick">) {
  const { locale } = await params;
  const meta = META[locale as keyof typeof META] ?? META.en;
  return buildLocalizedMetadata(locale, { ...meta, path: "pro-pick" });
}

function toQueryString(searchParams: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
    else if (value !== undefined) query.set(key, value);
  }
  return query.toString();
}

export default async function ProPickPage({ params, searchParams }: PageProps<"/[locale]/pro-pick">) {
  const { locale } = await params;
  const query = await searchParams;
  const initialQuery = toQueryString(query);
  setRequestLocale(locale);
  return (
    <div className="flex flex-col gap-10 pt-2">
      <BackLink />
      <ProPickPicker key={initialQuery} initialQuery={initialQuery} />
    </div>
  );
}
