import { NextResponse } from "next/server";
import { getD1Database, isMetaBetaAuthenticated } from "@/lib/meta-beta/auth";

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

export async function GET() {
  if (!(await isMetaBetaAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getD1Database();
  if (!db) {
    return NextResponse.json({ configured: false }, { headers: { "cache-control": "no-store" } });
  }

  try {
    const [tracked, matches, lastRun, latestStats] = await Promise.all([
      db.prepare("SELECT COUNT(*) AS count FROM tracked_players WHERE enabled = 1").first<CountRow>(),
      db.prepare("SELECT COUNT(*) AS count FROM matches WHERE started_at >= ?")
        .bind(Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60)
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

    return NextResponse.json({
      configured: true,
      trackedPlayers: tracked?.count ?? 0,
      matchesLastSevenDays: matches?.count ?? 0,
      lastRun: lastRun ? {
        ...lastRun,
        startedAt: new Date(lastRun.started_at * 1000).toISOString(),
        finishedAt: lastRun.finished_at ? new Date(lastRun.finished_at * 1000).toISOString() : null,
      } : null,
      latestRecommendationDate: latestStats?.stat_date ?? null,
      latestRecommendationUpdatedAt: latestStats?.updated_at
        ? new Date(latestStats.updated_at * 1000).toISOString()
        : null,
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("Meta beta collection status query failed", error);
    return NextResponse.json({ configured: true, error: "query-failed" }, { status: 500 });
  }
}
