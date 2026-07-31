import type { D1DatabaseBinding } from "@/lib/meta-beta/auth";

export const AI_GLOBAL_DAILY_LIMIT = 150;
export const AI_SESSION_DAILY_LIMIT = 20;

interface UsageRow {
  scope: "global" | "session";
  scope_key: string;
  used: number;
}

export interface AiQuotaStatus {
  configured: boolean;
  usageDate: string;
  resetAt: string;
  globalLimit: number;
  globalUsed: number | null;
  globalRemaining: number | null;
  sessionLimit: number;
  sessionUsed: number | null;
  sessionRemaining: number | null;
}

export interface AiQuotaReservation extends AiQuotaStatus {
  allowed: boolean;
  blockedBy?: "global" | "session";
}

/**
 * Workers AI's free daily allowance resets at 00:00 UTC (09:00 JST), so the
 * quota key deliberately follows the UTC calendar date rather than midnight JST.
 */
export function getAiQuotaDate(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function getNextAiQuotaResetAt(now = Date.now()): string {
  const current = new Date(now);
  return new Date(Date.UTC(
    current.getUTCFullYear(),
    current.getUTCMonth(),
    current.getUTCDate() + 1,
    0,
    0,
    0,
  )).toISOString();
}

function remaining(limit: number, used: number): number {
  return Math.max(0, limit - used);
}

function unconfiguredStatus(now = Date.now()): AiQuotaStatus {
  return {
    configured: false,
    usageDate: getAiQuotaDate(now),
    resetAt: getNextAiQuotaResetAt(now),
    globalLimit: AI_GLOBAL_DAILY_LIMIT,
    globalUsed: null,
    globalRemaining: null,
    sessionLimit: AI_SESSION_DAILY_LIMIT,
    sessionUsed: null,
    sessionRemaining: null,
  };
}

export async function getAiQuotaStatus(
  db: D1DatabaseBinding | null,
  sessionKey: string,
  now = Date.now(),
): Promise<AiQuotaStatus> {
  if (!db) return unconfiguredStatus(now);

  const usageDate = getAiQuotaDate(now);
  const result = await db.prepare(
    `SELECT scope, scope_key, used
       FROM ai_usage_daily
      WHERE usage_date = ?
        AND ((scope = 'global' AND scope_key = 'all')
          OR (scope = 'session' AND scope_key = ?))`,
  ).bind(usageDate, sessionKey).all<UsageRow>();

  const rows = result.results ?? [];
  const globalUsed = rows.find((row) => row.scope === "global")?.used ?? 0;
  const sessionUsed = rows.find((row) => row.scope === "session")?.used ?? 0;

  return {
    configured: true,
    usageDate,
    resetAt: getNextAiQuotaResetAt(now),
    globalLimit: AI_GLOBAL_DAILY_LIMIT,
    globalUsed,
    globalRemaining: remaining(AI_GLOBAL_DAILY_LIMIT, globalUsed),
    sessionLimit: AI_SESSION_DAILY_LIMIT,
    sessionUsed,
    sessionRemaining: remaining(AI_SESSION_DAILY_LIMIT, sessionUsed),
  };
}

export async function reserveAiQuota(
  db: D1DatabaseBinding | null,
  sessionKey: string,
  now = Date.now(),
): Promise<AiQuotaReservation> {
  if (!db) {
    return { ...unconfiguredStatus(now), allowed: true };
  }

  const usageDate = getAiQuotaDate(now);
  const updatedAt = Math.floor(now / 1000);
  const batch = await db.batch([
    db.prepare(
      `INSERT OR IGNORE INTO ai_usage_daily
        (usage_date, scope, scope_key, used, updated_at)
       VALUES (?, 'global', 'all', 0, ?)`,
    ).bind(usageDate, updatedAt),
    db.prepare(
      `INSERT OR IGNORE INTO ai_usage_daily
        (usage_date, scope, scope_key, used, updated_at)
       VALUES (?, 'session', ?, 0, ?)`,
    ).bind(usageDate, sessionKey, updatedAt),
    db.prepare(
      `UPDATE ai_usage_daily
          SET used = used + 1,
              updated_at = ?
        WHERE usage_date = ?
          AND ((scope = 'global' AND scope_key = 'all')
            OR (scope = 'session' AND scope_key = ?))
          AND (SELECT used FROM ai_usage_daily
                WHERE usage_date = ? AND scope = 'global' AND scope_key = 'all') < ?
          AND (SELECT used FROM ai_usage_daily
                WHERE usage_date = ? AND scope = 'session' AND scope_key = ?) < ?
       RETURNING scope, scope_key, used`,
    ).bind(
      updatedAt,
      usageDate,
      sessionKey,
      usageDate,
      AI_GLOBAL_DAILY_LIMIT,
      usageDate,
      sessionKey,
      AI_SESSION_DAILY_LIMIT,
    ),
  ]);

  const updatedRows = (batch[2]?.results ?? []) as unknown as UsageRow[];
  const status = await getAiQuotaStatus(db, sessionKey, now);
  if (updatedRows.length === 2) {
    return { ...status, allowed: true };
  }

  const blockedBy =
    status.globalRemaining === 0
      ? "global"
      : status.sessionRemaining === 0
        ? "session"
        : "global";
  return { ...status, allowed: false, blockedBy };
}
