import type { D1DatabaseBinding } from "@/lib/meta-beta/auth";
import {
  getMockRecommendations,
  META_MAPS,
  META_RANKS,
  type MetaRecommendation,
  type MetaRecommendationCategory,
} from "@/lib/meta-beta/mock-data";

export const DEFAULT_META_REGION = "jp";

interface RecommendationRow {
  stat_date: string;
  region: string;
  patch: string;
  period_start: string;
  period_end: string;
  map_id: string;
  rank_bucket: string;
  category: "theory" | "off_meta" | "solo_queue";
  agents_json: string;
  raw_win_rate: number;
  adjusted_win_rate: number;
  pick_rate: number;
  match_count: number;
  confidence: "high" | "medium" | "low";
  reasons_json: string;
  caution: string;
  updated_at: number;
}

export interface MetaStatsResult {
  source: "d1" | "sample";
  updatedAt: string;
  dataScope: {
    region: string;
    map: string;
    rank: string;
    patch: string;
    periodStart: string;
    periodEnd: string;
  };
  recommendations: MetaRecommendation[];
}

export function isAllowedMap(value: unknown): value is (typeof META_MAPS)[number] {
  return typeof value === "string" && META_MAPS.includes(value as (typeof META_MAPS)[number]);
}

export function isAllowedRank(value: unknown): value is (typeof META_RANKS)[number] {
  return typeof value === "string" && META_RANKS.includes(value as (typeof META_RANKS)[number]);
}

function toCategory(category: RecommendationRow["category"]): MetaRecommendationCategory {
  if (category === "off_meta") return "offMeta";
  if (category === "solo_queue") return "soloQueue";
  return "theory";
}

function parseStringArray(value: string): string[] {
  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
    throw new Error("Expected a JSON string array");
  }
  return parsed;
}

export function recommendationRowToModel(row: RecommendationRow): MetaRecommendation {
  return {
    category: toCategory(row.category),
    agents: parseStringArray(row.agents_json),
    rawWinRate: Number(row.raw_win_rate),
    adjustedWinRate: Number(row.adjusted_win_rate),
    pickRate: Number(row.pick_rate),
    matchCount: Number(row.match_count),
    confidence: row.confidence,
    reasons: parseStringArray(row.reasons_json),
    caution: row.caution,
  };
}

function getJstDate(now: number): string {
  return new Date(now + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function sampleStats(map: string, rank: string, now = Date.now()): MetaStatsResult {
  const periodEnd = getJstDate(now);
  const periodStart = getJstDate(now - 6 * 24 * 60 * 60 * 1000);
  return {
    source: "sample",
    updatedAt: new Date(now).toISOString(),
    dataScope: {
      region: DEFAULT_META_REGION,
      map,
      rank,
      patch: "sample",
      periodStart,
      periodEnd,
    },
    recommendations: getMockRecommendations(map, rank),
  };
}

export async function getMetaStats(
  db: D1DatabaseBinding | null,
  map: string,
  rank: string,
  now = Date.now(),
): Promise<MetaStatsResult> {
  if (!db) return sampleStats(map, rank, now);

  try {
    const result = await db.prepare(
      `SELECT stat_date, region, patch, period_start, period_end,
              map_id, rank_bucket, category, agents_json,
              raw_win_rate, adjusted_win_rate, pick_rate, match_count,
              confidence, reasons_json, caution, updated_at
         FROM recommendation_snapshots
        WHERE region = ?
          AND map_id = ?
          AND rank_bucket = ?
          AND stat_date = (
            SELECT MAX(stat_date)
              FROM recommendation_snapshots
             WHERE region = ? AND map_id = ? AND rank_bucket = ?
          )
        ORDER BY CASE category
          WHEN 'theory' THEN 1
          WHEN 'off_meta' THEN 2
          WHEN 'solo_queue' THEN 3
          ELSE 4
        END`,
    ).bind(
      DEFAULT_META_REGION,
      map,
      rank,
      DEFAULT_META_REGION,
      map,
      rank,
    ).all<RecommendationRow>();

    const rows = result.results ?? [];
    if (rows.length !== 3) return sampleStats(map, rank, now);

    const recommendations = rows.map(recommendationRowToModel);
    const first = rows[0];
    return {
      source: "d1",
      updatedAt: new Date(first.updated_at * 1000).toISOString(),
      dataScope: {
        region: first.region,
        map: first.map_id,
        rank: first.rank_bucket,
        patch: first.patch,
        periodStart: first.period_start,
        periodEnd: first.period_end,
      },
      recommendations,
    };
  } catch (error) {
    console.error("Meta beta D1 recommendation query failed", error);
    return sampleStats(map, rank, now);
  }
}
