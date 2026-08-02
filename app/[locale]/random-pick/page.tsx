import { setRequestLocale } from "next-intl/server";
import { BackLink } from "@/components/BackLink";
import { Picker } from "@/components/Picker";
import { AGENTS } from "@/lib/agents";
import { ROLES } from "@/lib/roles";
import {
  DEFAULT_COUNTS,
  countByRole,
  validateCounts,
  type RoleCounts,
} from "@/lib/picker";
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

const AVAILABLE = countByRole(AGENTS);

function readCountParam(
  value: string | string[] | undefined,
  fallback: number,
  maximum: number,
) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= maximum
    ? parsed
    : fallback;
}

function getInitialCounts(
  searchParams: Record<string, string | string[] | undefined>,
): RoleCounts {
  const counts: RoleCounts = {
    Duelist: readCountParam(searchParams.duelist, DEFAULT_COUNTS.Duelist, AVAILABLE.Duelist),
    Initiator: readCountParam(searchParams.initiator, DEFAULT_COUNTS.Initiator, AVAILABLE.Initiator),
    Controller: readCountParam(searchParams.controller, DEFAULT_COUNTS.Controller, AVAILABLE.Controller),
    Sentinel: readCountParam(searchParams.sentinel, DEFAULT_COUNTS.Sentinel, AVAILABLE.Sentinel),
  };
  return validateCounts(AGENTS, counts).ok ? counts : DEFAULT_COUNTS;
}

export default async function RandomPickPage({ params, searchParams }: PageProps<"/[locale]/random-pick">) {
  const { locale } = await params;
  const query = await searchParams;
  const initialCounts = getInitialCounts(query);
  setRequestLocale(locale);
  return (
    <div className="flex flex-col gap-10 pt-2">
      <BackLink />
      <Picker
        key={ROLES.map((role) => initialCounts[role]).join("-")}
        initialCounts={initialCounts}
      />
    </div>
  );
}
