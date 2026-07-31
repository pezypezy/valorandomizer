import type { D1DatabaseBinding } from "@/lib/meta-beta/auth";

export type MetaLocale = "ja" | "en" | "ko";
export type CacheablePromptId = "explain-theory" | "compare-solo" | "off-meta-weakness";

const CACHE_TTL_SECONDS = 12 * 60 * 60;

const CACHEABLE_PROMPTS: Record<MetaLocale, Record<CacheablePromptId, string>> = {
  ja: {
    "explain-theory": "セオリー構成を解説して",
    "compare-solo": "野良向けとの違いは？",
    "off-meta-weakness": "オフメタ構成の弱点は？",
  },
  en: {
    "explain-theory": "Explain the theory composition",
    "compare-solo": "How is the solo queue option different?",
    "off-meta-weakness": "What is the off-meta option's weakness?",
  },
  ko: {
    "explain-theory": "정석 조합을 설명해 줘",
    "compare-solo": "솔로 랭크 조합과 차이는?",
    "off-meta-weakness": "오프메타 조합의 약점은?",
  },
};

interface CacheRow {
  response: string;
}

export interface AiCacheContext {
  locale: MetaLocale;
  map: string;
  rank: string;
  promptId: CacheablePromptId;
  statsUpdatedAt: string;
  statsSource: "d1" | "sample";
}

function normalize(value: string): string {
  return value.normalize("NFKC").replace(/\s+/gu, " ").trim();
}

export function getCacheablePromptId(
  locale: MetaLocale,
  message: string,
): CacheablePromptId | null {
  const normalized = normalize(message);
  const prompts = CACHEABLE_PROMPTS[locale];
  const entry = (Object.entries(prompts) as Array<[CacheablePromptId, string]>)
    .find(([, prompt]) => normalize(prompt) === normalized);
  return entry?.[0] ?? null;
}

export function getQuickPromptTexts(locale: MetaLocale): string[] {
  const prompts = CACHEABLE_PROMPTS[locale];
  return [
    prompts["explain-theory"],
    prompts["compare-solo"],
    prompts["off-meta-weakness"],
  ];
}

export function buildAiCacheKey(context: AiCacheContext): string {
  return [
    "meta-ai-v1",
    context.locale,
    context.map,
    context.rank,
    context.promptId,
    context.statsSource,
    context.statsUpdatedAt,
  ].map((value) => encodeURIComponent(value)).join(":");
}

export async function getCachedAiResponse(
  db: D1DatabaseBinding | null,
  cacheKey: string,
  now = Date.now(),
): Promise<string | null> {
  if (!db) return null;
  const row = await db.prepare(
    `SELECT response
       FROM ai_response_cache
      WHERE cache_key = ? AND expires_at > ?
      LIMIT 1`,
  ).bind(cacheKey, Math.floor(now / 1000)).first<CacheRow>();
  return typeof row?.response === "string" && row.response.trim() ? row.response : null;
}

export async function putCachedAiResponse(
  db: D1DatabaseBinding | null,
  context: AiCacheContext,
  response: string,
  now = Date.now(),
): Promise<void> {
  if (!db || !response.trim()) return;
  const createdAt = Math.floor(now / 1000);
  await db.prepare(
    `INSERT INTO ai_response_cache (
       cache_key, locale, map_id, rank_bucket, prompt_id,
       stats_updated_at, response, created_at, expires_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(cache_key) DO UPDATE SET
       response = excluded.response,
       created_at = excluded.created_at,
       expires_at = excluded.expires_at`,
  ).bind(
    buildAiCacheKey(context),
    context.locale,
    context.map,
    context.rank,
    context.promptId,
    context.statsUpdatedAt,
    response.trim(),
    createdAt,
    createdAt + CACHE_TTL_SECONDS,
  ).run();
}
