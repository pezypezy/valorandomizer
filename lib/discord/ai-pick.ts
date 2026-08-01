import type {
  MetaRecommendation,
  MetaRecommendationCategory,
} from "@/lib/meta-beta/mock-data";
import type { MetaStatsResult } from "@/lib/meta-beta/stats";

export type DiscordLocale = "ja" | "en" | "ko";

type DiscordEmbed = {
  title: string;
  description: string;
  color: number;
  fields: Array<{ name: string; value: string; inline?: boolean }>;
  footer: { text: string };
  timestamp: string;
};

export type AiPickDiscordMessage = {
  content: string;
  allowed_mentions: { parse: string[]; users: string[] };
  embeds: DiscordEmbed[];
};

const CATEGORY_ORDER: MetaRecommendationCategory[] = ["theory", "offMeta", "soloQueue"];

const CATEGORY_COLORS: Record<MetaRecommendationCategory, number> = {
  theory: 0xff4655,
  offMeta: 0xf4d35e,
  soloQueue: 0x5eead4,
};

const COPY = {
  ja: {
    heading: (map: string) => `${map}のAI構成候補（全ランク）`,
    categories: {
      theory: "セオリー構成",
      offMeta: "オフメタ構成",
      soloQueue: "野良向け構成",
    },
    composition: "構成",
    adjustedWinRate: "補正勝率",
    pickRate: "使用率",
    matches: "試合数",
    confidence: "信頼度",
    caution: "注意点",
    confidenceValues: { high: "高", medium: "中", low: "低" },
    matchesValue: (value: number) => `${value.toLocaleString("ja-JP")}試合`,
    sourceD1: "実データ",
    sourceSample: "サンプルデータ（実データ未取得）",
  },
  en: {
    heading: (map: string) => `AI composition picks for ${map} (All ranks)`,
    categories: {
      theory: "Theory composition",
      offMeta: "Off-meta composition",
      soloQueue: "Solo queue composition",
    },
    composition: "Composition",
    adjustedWinRate: "Adjusted win rate",
    pickRate: "Pick rate",
    matches: "Matches",
    confidence: "Confidence",
    caution: "Caution",
    confidenceValues: { high: "High", medium: "Medium", low: "Low" },
    matchesValue: (value: number) => `${value.toLocaleString("en-US")} matches`,
    sourceD1: "Live data",
    sourceSample: "Sample data (live data unavailable)",
  },
  ko: {
    heading: (map: string) => `${map} AI 조합 추천 (전체 랭크)`,
    categories: {
      theory: "정석 조합",
      offMeta: "오프메타 조합",
      soloQueue: "솔로 랭크 조합",
    },
    composition: "조합",
    adjustedWinRate: "보정 승률",
    pickRate: "사용률",
    matches: "경기 수",
    confidence: "신뢰도",
    caution: "주의사항",
    confidenceValues: { high: "높음", medium: "보통", low: "낮음" },
    matchesValue: (value: number) => `${value.toLocaleString("ko-KR")}경기`,
    sourceD1: "실데이터",
    sourceSample: "샘플 데이터 (실데이터 없음)",
  },
} as const;

function recommendationDescription(recommendation: MetaRecommendation): string {
  const reasons = recommendation.reasons.slice(0, 3).map((reason) => `• ${reason}`);
  return reasons.join("\n");
}

function percentage(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

export function buildAiPickDiscordMessage(
  stats: MetaStatsResult,
  userId: string,
  locale: DiscordLocale,
): AiPickDiscordMessage {
  const copy = COPY[locale];
  const byCategory = new Map(stats.recommendations.map((recommendation) => [recommendation.category, recommendation]));
  const source = stats.source === "d1" ? copy.sourceD1 : copy.sourceSample;
  const footer = `${source} • Patch ${stats.dataScope.patch} • ${stats.dataScope.periodStart}〜${stats.dataScope.periodEnd}`;

  const embeds = CATEGORY_ORDER.flatMap((category) => {
    const recommendation = byCategory.get(category);
    if (!recommendation) return [];

    return [{
      title: copy.categories[category],
      description: recommendationDescription(recommendation),
      color: CATEGORY_COLORS[category],
      fields: [
        { name: copy.composition, value: recommendation.agents.join(" / "), inline: false },
        { name: copy.adjustedWinRate, value: percentage(recommendation.adjustedWinRate), inline: true },
        { name: copy.pickRate, value: percentage(recommendation.pickRate, 2), inline: true },
        { name: copy.matches, value: copy.matchesValue(recommendation.matchCount), inline: true },
        { name: copy.confidence, value: copy.confidenceValues[recommendation.confidence], inline: true },
        { name: copy.caution, value: recommendation.caution, inline: false },
      ],
      footer: { text: footer },
      timestamp: stats.updatedAt,
    }];
  });

  return {
    content: `<@${userId}> ${copy.heading(stats.dataScope.map)}`,
    allowed_mentions: { parse: [], users: [userId] },
    embeds,
  };
}
