import type { D1DatabaseBinding } from "@/lib/meta-beta/auth";

interface CountRow {
  count: number;
}

interface CollectionRunRow {
  started_at: number;
  finished_at: number | null;
  tracked_players: number;
  match_ids_seen: number;
  matches_inserted: number;
  matches_skipped: number;
  errors: number;
  status: string;
}

interface LatestStatRow {
  stat_date: string | null;
  updated_at: number | null;
}

export interface CollectionStatus {
  configured: boolean;
  trackedPlayers?: number;
  matchesLastSevenDays?: number;
  lastRun?: {
    status: string;
    trackedPlayers: number;
    matchIdsSeen: number;
    matchesInserted: number;
    matchesSkipped: number;
    errors: number;
    startedAt: string;
    finishedAt: string | null;
  } | null;
  latestRecommendationDate?: string | null;
  latestRecommendationUpdatedAt?: string | null;
  error?: "query-failed";
}

export async function getCollectionStatus(
  db: D1DatabaseBinding | null,
  now = Date.now(),
): Promise<CollectionStatus> {
  if (!db) return { configured: false };

  try {
    const [tracked, matches, lastRun, latestStats] = await Promise.all([
      db.prepare("SELECT COUNT(*) AS count FROM tracked_players WHERE enabled = 1").first<CountRow>(),
      db.prepare("SELECT COUNT(*) AS count FROM matches WHERE started_at >= ?")
        .bind(Math.floor(now / 1000) - 7 * 24 * 60 * 60)
        .first<CountRow>(),
      db.prepare(
        `SELECT started_at, finished_at, tracked_players, match_ids_seen,
                matches_inserted, matches_skipped, errors, status
           FROM collection_runs
          ORDER BY started_at DESC
          LIMIT 1`,
      ).first<CollectionRunRow>(),
      db.prepare(
        `SELECT MAX(stat_date) AS stat_date, MAX(updated_at) AS updated_at
           FROM recommendation_snapshots
          WHERE region = 'jp'`,
      ).first<LatestStatRow>(),
    ]);

    return {
      configured: true,
      trackedPlayers: tracked?.count ?? 0,
      matchesLastSevenDays: matches?.count ?? 0,
      lastRun: lastRun ? {
        status: lastRun.status,
        trackedPlayers: lastRun.tracked_players,
        matchIdsSeen: lastRun.match_ids_seen,
        matchesInserted: lastRun.matches_inserted,
        matchesSkipped: lastRun.matches_skipped,
        errors: lastRun.errors,
        startedAt: new Date(lastRun.started_at * 1000).toISOString(),
        finishedAt: lastRun.finished_at ? new Date(lastRun.finished_at * 1000).toISOString() : null,
      } : null,
      latestRecommendationDate: latestStats?.stat_date ?? null,
      latestRecommendationUpdatedAt: latestStats?.updated_at
        ? new Date(latestStats.updated_at * 1000).toISOString()
        : null,
    };
  } catch (error) {
    console.error("Meta beta collection status query failed", error);
    return { configured: true, error: "query-failed" };
  }
}
