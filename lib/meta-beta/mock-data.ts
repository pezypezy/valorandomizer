export type MetaRecommendationCategory = "theory" | "offMeta" | "soloQueue";

export interface MetaRecommendation {
  category: MetaRecommendationCategory;
  agents: string[];
  rawWinRate: number;
  adjustedWinRate: number;
  pickRate: number;
  matchCount: number;
  confidence: "high" | "medium" | "low";
  reasons: string[];
  caution: string;
}

export const META_MAPS = ["Ascent", "Bind", "Haven", "Split", "Lotus", "Sunset", "Icebox", "Breeze", "Abyss"] as const;

export const META_RANKS = [
  "All",
  "Iron",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Diamond",
  "Ascendant",
  "Immortal",
  "Radiant",
] as const;

const BASE_RECOMMENDATIONS: Record<MetaRecommendationCategory, MetaRecommendation> = {
  theory: {
    category: "theory",
    agents: ["Jett", "KAY/O", "Sova", "Omen", "Killjoy"],
    rawWinRate: 53.9,
    adjustedWinRate: 53.4,
    pickRate: 7.2,
    matchCount: 4280,
    confidence: "high",
    reasons: [
      "十分な試合数があり、補正後勝率も安定",
      "各ロールの役割が明確で、標準的な連携を組みやすい",
      "日ごとの勝率変動が比較的小さい",
    ],
    caution: "サンプル統計です。Riot API接続後に実データへ置き換わります。",
  },
  offMeta: {
    category: "offMeta",
    agents: ["Yoru", "Breach", "Sova", "Omen", "Cypher"],
    rawWinRate: 55.1,
    adjustedWinRate: 53.0,
    pickRate: 0.8,
    matchCount: 610,
    confidence: "medium",
    reasons: [
      "使用率は低いが、最低試合数を超えている",
      "セオリー構成と複数枠が異なり、奇襲性を持たせられる",
      "5デュエリストなどの役割崩壊構成は除外済み",
    ],
    caution: "連携難度が高いため、パーティー内で役割を共有してください。",
  },
  soloQueue: {
    category: "soloQueue",
    agents: ["Jett", "Sova", "Omen", "Sage", "Killjoy"],
    rawWinRate: 52.8,
    adjustedWinRate: 52.5,
    pickRate: 5.9,
    matchCount: 3510,
    confidence: "high",
    reasons: [
      "個別ピック率の高いエージェントを中心に構成",
      "複雑なダブルコントローラー連携を要求しない",
      "野良でも各自の役割を理解しやすい",
    ],
    caution: "チーム内で索敵とエントリーのタイミングだけは合わせる必要があります。",
  },
};

function rankAdjustment(rank: string): number {
  const adjustments: Record<string, number> = {
    Iron: -0.8,
    Bronze: -0.5,
    Silver: -0.2,
    Gold: 0,
    Platinum: 0.2,
    Diamond: 0.4,
    Ascendant: 0.5,
    Immortal: 0.3,
    Radiant: 0.1,
  };
  return adjustments[rank] ?? 0;
}

function mapAdjustment(map: string): number {
  const index = Math.max(0, META_MAPS.indexOf(map as (typeof META_MAPS)[number]));
  return ((index % 5) - 2) * 0.12;
}

export function getMockRecommendations(map: string, rank: string): MetaRecommendation[] {
  const adjustment = rankAdjustment(rank) + mapAdjustment(map);
  return (Object.values(BASE_RECOMMENDATIONS) as MetaRecommendation[]).map((recommendation, index) => ({
    ...recommendation,
    agents: [...recommendation.agents],
    reasons: [...recommendation.reasons],
    rawWinRate: Number((recommendation.rawWinRate + adjustment - index * 0.08).toFixed(1)),
    adjustedWinRate: Number((recommendation.adjustedWinRate + adjustment - index * 0.05).toFixed(1)),
    matchCount: Math.max(120, Math.round(recommendation.matchCount * (1 - index * 0.08))),
  }));
}
