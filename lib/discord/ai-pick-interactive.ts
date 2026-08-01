import type {
  MetaRecommendation,
  MetaRecommendationCategory,
} from "@/lib/meta-beta/mock-data";
import { META_MAPS, META_RANKS } from "@/lib/meta-beta/mock-data";
import type { MetaStatsResult } from "@/lib/meta-beta/stats";

export type DiscordLocale = "ja" | "en" | "ko";
export type AiPickMap = (typeof META_MAPS)[number];
export type AiPickRank = (typeof META_RANKS)[number];

export type AiPickSelection = {
  map?: string;
  rank?: string;
};

type DiscordEmbed = {
  title: string;
  description: string;
  color: number;
  fields: Array<{ name: string; value: string; inline?: boolean }>;
  footer: { text: string };
  timestamp: string;
};

type SelectOption = {
  label: string;
  value: string;
  default?: boolean;
};

type SelectComponent = {
  type: 3;
  custom_id: string;
  placeholder: string;
  min_values: 1;
  max_values: 1;
  options: SelectOption[];
};

export type AiPickSelectorMessage = {
  content: string;
  components: Array<{ type: 1; components: [SelectComponent] }>;
};

export type AiPickDiscordMessage = {
  content: string;
  allowed_mentions: { parse: string[]; users: string[] };
  embeds: DiscordEmbed[];
  flags?: number;
};

const EPHEMERAL = 1 << 6;
const CATEGORY_ORDER: MetaRecommendationCategory[] = ["theory", "offMeta", "soloQueue"];
const CATEGORY_COLORS: Record<MetaRecommendationCategory, number> = {
  theory: 0xff4655,
  offMeta: 0xf4d35e,
  soloQueue: 0x5eead4,
};

const RANK_LABELS = {
  ja: {
    All: "全ランク",
    Iron: "アイアン",
    Bronze: "ブロンズ",
    Silver: "シルバー",
    Gold: "ゴールド",
    Platinum: "プラチナ",
    Diamond: "ダイヤモンド",
    Ascendant: "アセンダント",
    Immortal: "イモータル",
    Radiant: "レディアント",
  },
  en: Object.fromEntries(META_RANKS.map((rank) => [rank, rank])),
  ko: {
    All: "전체 랭크",
    Iron: "아이언",
    Bronze: "브론즈",
    Silver: "실버",
    Gold: "골드",
    Platinum: "플래티넘",
    Diamond: "다이아몬드",
    Ascendant: "초월자",
    Immortal: "불멸",
    Radiant: "레디언트",
  },
} as const;

const COPY = {
  ja: {
    selector: "マップとランクを選択してください。2つ目を選ぶと、3構成をこのチャンネルへ公開します。",
    mapPlaceholder: "マップを選択",
    rankPlaceholder: "ランクを選択",
    heading: (map: string, rank: string) => `${map}・${rank}のAI構成候補`,
    unavailable: (map: string, rank: string) =>
      `${map}・${rank}は、公開できる実データがまだありません。サンプル構成は表示せず、Riot公式APIの収集完了後に利用可能になります。`,
    categories: { theory: "セオリー構成", offMeta: "オフメタ構成", soloQueue: "野良向け構成" },
    composition: "構成",
    adjustedWinRate: "補正勝率",
    pickRate: "使用率",
    matches: "試合数",
    confidence: "信頼度",
    caution: "注意点",
    confidenceValues: { high: "高", medium: "中", low: "低" },
    matchesValue: (value: number) => `${value.toLocaleString("ja-JP")}試合`,
    sourceD1: "Riot公式API由来の集計データ",
  },
  en: {
    selector: "Select a map and rank. Choosing the second value posts three compositions to this channel.",
    mapPlaceholder: "Select map",
    rankPlaceholder: "Select rank",
    heading: (map: string, rank: string) => `AI composition picks for ${map}・${rank}`,
    unavailable: (map: string, rank: string) =>
      `There is not enough live data to publish ${map}・${rank} yet. Sample compositions are disabled and this option will become available after Riot API collection completes.`,
    categories: { theory: "Theory composition", offMeta: "Off-meta composition", soloQueue: "Solo queue composition" },
    composition: "Composition",
    adjustedWinRate: "Adjusted win rate",
    pickRate: "Pick rate",
    matches: "Matches",
    confidence: "Confidence",
    caution: "Caution",
    confidenceValues: { high: "High", medium: "Medium", low: "Low" },
    matchesValue: (value: number) => `${value.toLocaleString("en-US")} matches`,
    sourceD1: "Aggregated from Riot official API data",
  },
  ko: {
    selector: "맵과 랭크를 선택하세요. 두 번째 항목을 선택하면 세 조합을 채널에 공개합니다.",
    mapPlaceholder: "맵 선택",
    rankPlaceholder: "랭크 선택",
    heading: (map: string, rank: string) => `${map}・${rank} AI 조합 추천`,
    unavailable: (map: string, rank: string) =>
      `${map}・${rank}에 공개할 수 있는 실데이터가 아직 없습니다. 샘플 조합은 표시하지 않으며 Riot 공식 API 수집이 완료되면 사용할 수 있습니다.`,
    categories: { theory: "정석 조합", offMeta: "오프메타 조합", soloQueue: "솔로 랭크 조합" },
    composition: "조합",
    adjustedWinRate: "보정 승률",
    pickRate: "사용률",
    matches: "경기 수",
    confidence: "신뢰도",
    caution: "주의사항",
    confidenceValues: { high: "높음", medium: "보통", low: "낮음" },
    matchesValue: (value: number) => `${value.toLocaleString("ko-KR")}경기`,
    sourceD1: "Riot 공식 API 집계 데이터",
  },
} as const;

function rankLabel(locale: DiscordLocale, rank: string): string {
  const labels = RANK_LABELS[locale] as Record<string, string>;
  return labels[rank] ?? rank;
}

function storedValue(value?: string): string {
  return value ? encodeURIComponent(value) : "-";
}

function restoredValue(value: string | undefined): string | undefined {
  if (!value || value === "-") return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

export function buildAiPickSelectorMessage(
  locale: DiscordLocale,
  selection: AiPickSelection = {},
): AiPickSelectorMessage {
  const copy = COPY[locale];
  const mapOptions = META_MAPS.map((map) => ({
    label: map,
    value: map,
    ...(selection.map === map ? { default: true } : {}),
  }));
  const rankOptions = META_RANKS.map((rank) => ({
    label: rankLabel(locale, rank),
    value: rank,
    ...(selection.rank === rank ? { default: true } : {}),
  }));

  return {
    content: copy.selector,
    components: [
      {
        type: 1,
        components: [{
          type: 3,
          custom_id: `aipick:map:${storedValue(selection.rank)}`,
          placeholder: copy.mapPlaceholder,
          min_values: 1,
          max_values: 1,
          options: mapOptions,
        }],
      },
      {
        type: 1,
        components: [{
          type: 3,
          custom_id: `aipick:rank:${storedValue(selection.map)}`,
          placeholder: copy.rankPlaceholder,
          min_values: 1,
          max_values: 1,
          options: rankOptions,
        }],
      },
    ],
  };
}

export function resolveAiPickComponentSelection(
  customId: string | undefined,
  values: string[] | undefined,
): AiPickSelection | null {
  const selected = values?.[0];
  if (!selected) return null;
  const [prefix, kind, stored] = customId?.split(":") ?? [];
  if (prefix !== "aipick" || (kind !== "map" && kind !== "rank")) return null;

  if (kind === "map") {
    return { map: selected, rank: restoredValue(stored) };
  }
  return { map: restoredValue(stored), rank: selected };
}

function recommendationDescription(recommendation: MetaRecommendation): string {
  return recommendation.reasons.slice(0, 3).map((reason) => `• ${reason}`).join("\n");
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
  const localizedRank = rankLabel(locale, stats.dataScope.rank);

  if (stats.source !== "d1") {
    return {
      content: copy.unavailable(stats.dataScope.map, localizedRank),
      allowed_mentions: { parse: [], users: [] },
      embeds: [],
      flags: EPHEMERAL,
    };
  }

  const byCategory = new Map(stats.recommendations.map((recommendation) => [recommendation.category, recommendation]));
  const footer = `${copy.sourceD1} • Patch ${stats.dataScope.patch} • ${stats.dataScope.periodStart}〜${stats.dataScope.periodEnd}`;

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
    content: `<@${userId}> ${copy.heading(stats.dataScope.map, localizedRank)}`,
    allowed_mentions: { parse: [], users: [userId] },
    embeds,
  };
}
