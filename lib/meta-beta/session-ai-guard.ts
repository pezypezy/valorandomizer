import type { D1DatabaseBinding } from "@/lib/meta-beta/auth";

export const AI_SESSION_BURST_WINDOW_SECONDS = 10;
export const AI_SESSION_BURST_LIMIT = 2;
export const AI_SESSION_MINUTE_LIMIT = 4;
export const AI_SESSION_HOUR_LIMIT = 10;
export const AI_SESSION_LEASE_SECONDS = 90;

export type SessionAiBlockReason =
  | "concurrent"
  | "burst"
  | "minute"
  | "hour"
  | "storage";

interface SessionGuardRow {
  session_key: string;
  burst_bucket: number;
  burst_used: number;
  minute_bucket: number;
  minute_used: number;
  hour_bucket: number;
  hour_used: number;
  in_flight_until: number;
  lease_token: string;
  updated_at: number;
}

export interface SessionAiGuardStatus {
  configured: boolean;
  allowed: boolean;
  blockedBy?: SessionAiBlockReason;
  retryAfterSeconds?: number;
  leaseToken?: string;
  burstLimit: number;
  minuteLimit: number;
  hourLimit: number;
  burstUsed: number | null;
  minuteUsed: number | null;
  hourUsed: number | null;
}

function bucketFor(nowSeconds: number, windowSeconds: number): number {
  return Math.floor(nowSeconds / windowSeconds);
}

function secondsUntilNextBucket(nowSeconds: number, windowSeconds: number): number {
  const elapsed = nowSeconds % windowSeconds;
  return Math.max(1, windowSeconds - elapsed);
}

function effectiveUsed(
  storedBucket: number,
  currentBucket: number,
  storedUsed: number,
): number {
  return storedBucket === currentBucket ? storedUsed : 0;
}

export function classifySessionAiGuardRow(
  row: SessionGuardRow,
  now = Date.now(),
): Pick<SessionAiGuardStatus, "blockedBy" | "retryAfterSeconds" | "burstUsed" | "minuteUsed" | "hourUsed"> {
  const nowSeconds = Math.floor(now / 1000);
  const burstBucket = bucketFor(nowSeconds, AI_SESSION_BURST_WINDOW_SECONDS);
  const minuteBucket = bucketFor(nowSeconds, 60);
  const hourBucket = bucketFor(nowSeconds, 60 * 60);
  const burstUsed = effectiveUsed(row.burst_bucket, burstBucket, row.burst_used);
  const minuteUsed = effectiveUsed(row.minute_bucket, minuteBucket, row.minute_used);
  const hourUsed = effectiveUsed(row.hour_bucket, hourBucket, row.hour_used);

  if (row.in_flight_until > nowSeconds) {
    return {
      blockedBy: "concurrent",
      retryAfterSeconds: Math.max(1, row.in_flight_until - nowSeconds),
      burstUsed,
      minuteUsed,
      hourUsed,
    };
  }
  if (burstUsed >= AI_SESSION_BURST_LIMIT) {
    return {
      blockedBy: "burst",
      retryAfterSeconds: secondsUntilNextBucket(nowSeconds, AI_SESSION_BURST_WINDOW_SECONDS),
      burstUsed,
      minuteUsed,
      hourUsed,
    };
  }
  if (minuteUsed >= AI_SESSION_MINUTE_LIMIT) {
    return {
      blockedBy: "minute",
      retryAfterSeconds: secondsUntilNextBucket(nowSeconds, 60),
      burstUsed,
      minuteUsed,
      hourUsed,
    };
  }
  if (hourUsed >= AI_SESSION_HOUR_LIMIT) {
    return {
      blockedBy: "hour",
      retryAfterSeconds: secondsUntilNextBucket(nowSeconds, 60 * 60),
      burstUsed,
      minuteUsed,
      hourUsed,
    };
  }

  return {
    blockedBy: "storage",
    retryAfterSeconds: 5,
    burstUsed,
    minuteUsed,
    hourUsed,
  };
}

function baseStatus(): Omit<SessionAiGuardStatus, "configured" | "allowed"> {
  return {
    burstLimit: AI_SESSION_BURST_LIMIT,
    minuteLimit: AI_SESSION_MINUTE_LIMIT,
    hourLimit: AI_SESSION_HOUR_LIMIT,
    burstUsed: null,
    minuteUsed: null,
    hourUsed: null,
  };
}

export async function reserveSessionAiRequest(
  db: D1DatabaseBinding | null,
  sessionKey: string,
  now = Date.now(),
): Promise<SessionAiGuardStatus> {
  if (!db) {
    return {
      ...baseStatus(),
      configured: false,
      allowed: false,
      blockedBy: "storage",
      retryAfterSeconds: 60,
    };
  }

  const nowSeconds = Math.floor(now / 1000);
  const burstBucket = bucketFor(nowSeconds, AI_SESSION_BURST_WINDOW_SECONDS);
  const minuteBucket = bucketFor(nowSeconds, 60);
  const hourBucket = bucketFor(nowSeconds, 60 * 60);
  const leaseToken = crypto.randomUUID();
  const leaseUntil = nowSeconds + AI_SESSION_LEASE_SECONDS;

  const result = await db.prepare(
    `INSERT INTO ai_session_guard (
       session_key,
       burst_bucket,
       burst_used,
       minute_bucket,
       minute_used,
       hour_bucket,
       hour_used,
       in_flight_until,
       lease_token,
       updated_at
     ) VALUES (?, ?, 1, ?, 1, ?, 1, ?, ?, ?)
     ON CONFLICT(session_key) DO UPDATE SET
       burst_bucket = excluded.burst_bucket,
       burst_used = CASE
         WHEN ai_session_guard.burst_bucket = excluded.burst_bucket
           THEN ai_session_guard.burst_used + 1
         ELSE 1
       END,
       minute_bucket = excluded.minute_bucket,
       minute_used = CASE
         WHEN ai_session_guard.minute_bucket = excluded.minute_bucket
           THEN ai_session_guard.minute_used + 1
         ELSE 1
       END,
       hour_bucket = excluded.hour_bucket,
       hour_used = CASE
         WHEN ai_session_guard.hour_bucket = excluded.hour_bucket
           THEN ai_session_guard.hour_used + 1
         ELSE 1
       END,
       in_flight_until = excluded.in_flight_until,
       lease_token = excluded.lease_token,
       updated_at = excluded.updated_at
     WHERE ai_session_guard.in_flight_until <= ?
       AND (CASE
         WHEN ai_session_guard.burst_bucket = excluded.burst_bucket
           THEN ai_session_guard.burst_used
         ELSE 0
       END) < ?
       AND (CASE
         WHEN ai_session_guard.minute_bucket = excluded.minute_bucket
           THEN ai_session_guard.minute_used
         ELSE 0
       END) < ?
       AND (CASE
         WHEN ai_session_guard.hour_bucket = excluded.hour_bucket
           THEN ai_session_guard.hour_used
         ELSE 0
       END) < ?
     RETURNING
       session_key,
       burst_bucket,
       burst_used,
       minute_bucket,
       minute_used,
       hour_bucket,
       hour_used,
       in_flight_until,
       lease_token,
       updated_at`,
  ).bind(
    sessionKey,
    burstBucket,
    minuteBucket,
    hourBucket,
    leaseUntil,
    leaseToken,
    nowSeconds,
    nowSeconds,
    AI_SESSION_BURST_LIMIT,
    AI_SESSION_MINUTE_LIMIT,
    AI_SESSION_HOUR_LIMIT,
  ).all<SessionGuardRow>();

  const reserved = result.results?.[0];
  if (reserved) {
    return {
      ...baseStatus(),
      configured: true,
      allowed: true,
      leaseToken,
      burstUsed: reserved.burst_used,
      minuteUsed: reserved.minute_used,
      hourUsed: reserved.hour_used,
    };
  }

  const current = await db.prepare(
    `SELECT
       session_key,
       burst_bucket,
       burst_used,
       minute_bucket,
       minute_used,
       hour_bucket,
       hour_used,
       in_flight_until,
       lease_token,
       updated_at
     FROM ai_session_guard
     WHERE session_key = ?`,
  ).bind(sessionKey).first<SessionGuardRow>();

  if (!current) {
    return {
      ...baseStatus(),
      configured: true,
      allowed: false,
      blockedBy: "storage",
      retryAfterSeconds: 5,
    };
  }

  return {
    ...baseStatus(),
    configured: true,
    allowed: false,
    ...classifySessionAiGuardRow(current, now),
  };
}

export async function releaseSessionAiRequest(
  db: D1DatabaseBinding | null,
  sessionKey: string,
  leaseToken: string | undefined,
  now = Date.now(),
): Promise<void> {
  if (!db || !leaseToken) return;
  await db.prepare(
    `UPDATE ai_session_guard
        SET in_flight_until = 0,
            lease_token = '',
            updated_at = ?
      WHERE session_key = ?
        AND lease_token = ?`,
  ).bind(Math.floor(now / 1000), sessionKey, leaseToken).run();
}
