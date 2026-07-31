import type { D1DatabaseBinding, D1PreparedStatement } from "@/lib/meta-beta/auth";
import { rebuildDailyCompositionStats } from "@/lib/meta-beta/daily-stats";
import { META_MAPS } from "@/lib/meta-beta/mock-data";
import { normalizeRiotMatch, type NormalizedMatch } from "@/lib/meta-beta/normalize-match";
import { RiotApiError, type RiotContentResponse, type RiotMatchlistResponse } from "@/lib/meta-beta/riot-client";

interface MatchApi {
  getContent(locale?: string): Promise<RiotContentResponse>;
  getMatchlistByPuuid(puuid: string): Promise<RiotMatchlistResponse>;
  getMatchById(matchId: string): Promise<unknown>;
}

interface TrackedPlayerRow {
  puuid: string;
  routing_region: string;
  dataset_region: string;
}

interface ContentMapRow {
  map_id: string;
  map_name: string;
}

export interface CollectionOptions {
  maximumPlayers?: number;
  maximumMatches?: number;
  pollIntervalSeconds?: number;
  contentRefreshSeconds?: number;
}

export interface CollectionResult {
  trackedPlayers: number;
  matchIdsSeen: number;
  matchesInserted: number;
  matchesSkipped: number;
  errors: number;
  dailyStatsRebuilt: number;
  stoppedForRateLimit: boolean;
}

const DEFAULT_OPTIONS: Required<CollectionOptions> = {
  maximumPlayers: 10,
  maximumMatches: 60,
  pollIntervalSeconds: 60 * 60,
  contentRefreshSeconds: 24 * 60 * 60,
};

function jstDateFromEpochSeconds(epochSeconds: number): string {
  return new Date(epochSeconds * 1000 + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function batchInChunks(db: D1DatabaseBinding, statements: D1PreparedStatement[], size = 50): Promise<void> {
  for (let index = 0; index < statements.length; index += size) {
    await db.batch(statements.slice(index, index + size));
  }
}

async function syncContentMaps(
  db: D1DatabaseBinding,
  api: MatchApi,
  nowSeconds: number,
  refreshSeconds: number,
): Promise<Map<string, string>> {
  const freshness = await db.prepare("SELECT MAX(updated_at) AS updated_at FROM content_maps").first<{ updated_at: number | null }>();
  const stale = !freshness?.updated_at || nowSeconds - freshness.updated_at >= refreshSeconds;
  if (stale) {
    const content = await api.getContent("en-US");
    const statements = content.maps.map((map) => db.prepare(
      `INSERT INTO content_maps (map_id, map_name, asset_name, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(map_id) DO UPDATE SET
         map_name = excluded.map_name,
         asset_name = excluded.asset_name,
         updated_at = excluded.updated_at`,
    ).bind(map.id, map.name, map.assetName ?? null, nowSeconds));
    if (statements.length > 0) await batchInChunks(db, statements);
  }

  const result = await db.prepare("SELECT map_id, map_name FROM content_maps").all<ContentMapRow>();
  return new Map((result.results ?? []).map((row) => [row.map_id, row.map_name]));
}

async function matchExists(db: D1DatabaseBinding, matchId: string): Promise<boolean> {
  const row = await db.prepare("SELECT 1 AS present FROM matches WHERE match_id = ? LIMIT 1")
    .bind(matchId)
    .first<{ present: number }>();
  return row?.present === 1;
}

async function persistMatch(
  db: D1DatabaseBinding,
  match: NormalizedMatch,
  processedAt: number,
): Promise<void> {
  const statements: D1PreparedStatement[] = [
    db.prepare(
      `INSERT OR IGNORE INTO matches
        (match_id, region, map_id, patch, queue_id, started_at, processed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      match.matchId,
      match.region,
      match.mapId,
      match.patch,
      match.queueId,
      match.startedAt,
      processedAt,
    ),
    ...match.teams.map((team) => db.prepare(
      `INSERT OR IGNORE INTO team_results
        (match_id, team_side, rank_bucket, comp_key, agents_json, won,
         rounds_won, rounds_lost, role_pattern, eligible_for_recommendation,
         exclusion_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      match.matchId,
      team.teamSide,
      team.rankBucket,
      team.compKey,
      JSON.stringify(team.agents),
      team.won ? 1 : 0,
      team.roundsWon,
      team.roundsLost,
      team.rolePattern,
      team.eligibleForRecommendation ? 1 : 0,
      team.exclusionReason,
    )),
  ];
  await db.batch(statements);
}

async function updateTrackedPlayer(
  db: D1DatabaseBinding,
  puuid: string,
  nowSeconds: number,
  nextPollAt: number,
  error: string | null,
): Promise<void> {
  await db.prepare(
    `UPDATE tracked_players
        SET last_polled_at = ?, next_poll_at = ?, last_error = ?, updated_at = ?
      WHERE puuid = ?`,
  ).bind(nowSeconds, nextPollAt, error, nowSeconds, puuid).run();
}

async function createCollectionRun(db: D1DatabaseBinding, nowSeconds: number): Promise<number | null> {
  const row = await db.prepare(
    `INSERT INTO collection_runs (started_at, source, status)
     VALUES (?, 'riot-opt-in', 'running')
     RETURNING id`,
  ).bind(nowSeconds).first<{ id: number }>();
  return row?.id ?? null;
}

async function finishCollectionRun(
  db: D1DatabaseBinding,
  runId: number | null,
  nowSeconds: number,
  result: CollectionResult,
): Promise<void> {
  if (runId === null) return;
  const status = result.errors === 0 ? "success" : result.matchesInserted > 0 ? "partial" : "failed";
  await db.prepare(
    `UPDATE collection_runs
        SET finished_at = ?, tracked_players = ?, match_ids_seen = ?,
            matches_inserted = ?, matches_skipped = ?, errors = ?, status = ?, detail = ?
      WHERE id = ?`,
  ).bind(
    nowSeconds,
    result.trackedPlayers,
    result.matchIdsSeen,
    result.matchesInserted,
    result.matchesSkipped,
    result.errors,
    status,
    JSON.stringify({ dailyStatsRebuilt: result.dailyStatsRebuilt, stoppedForRateLimit: result.stoppedForRateLimit }),
    runId,
  ).run();
}

export async function collectOptInMatches(
  db: D1DatabaseBinding,
  api: MatchApi,
  now = Date.now(),
  options: CollectionOptions = {},
): Promise<CollectionResult> {
  const resolved = { ...DEFAULT_OPTIONS, ...options };
  const nowSeconds = Math.floor(now / 1000);
  const runId = await createCollectionRun(db, nowSeconds);
  const result: CollectionResult = {
    trackedPlayers: 0,
    matchIdsSeen: 0,
    matchesInserted: 0,
    matchesSkipped: 0,
    errors: 0,
    dailyStatsRebuilt: 0,
    stoppedForRateLimit: false,
  };
  const touchedDates = new Map<string, Set<string>>();

  try {
    const mapAliases = await syncContentMaps(db, api, nowSeconds, resolved.contentRefreshSeconds);
    const recognizedMaps = new Set<string>(META_MAPS);
    const resolveMapName = (mapId: string): string | null => {
      const mapped = mapAliases.get(mapId);
      if (mapped && recognizedMaps.has(mapped)) return mapped;
      return recognizedMaps.has(mapId) ? mapId : null;
    };

    const playersResult = await db.prepare(
      `SELECT puuid, routing_region, dataset_region
         FROM tracked_players
        WHERE enabled = 1 AND next_poll_at <= ?
        ORDER BY next_poll_at ASC
        LIMIT ?`,
    ).bind(nowSeconds, resolved.maximumPlayers).all<TrackedPlayerRow>();
    const players = playersResult.results ?? [];
    result.trackedPlayers = players.length;

    for (const player of players) {
      if (result.matchesInserted >= resolved.maximumMatches || result.stoppedForRateLimit) break;
      try {
        const matchlist = await api.getMatchlistByPuuid(player.puuid);
        const history = [...matchlist.history].sort(
          (left, right) => (right.gameStartTimeMillis ?? 0) - (left.gameStartTimeMillis ?? 0),
        );

        for (const entry of history) {
          if (result.matchesInserted >= resolved.maximumMatches) break;
          if (entry.queueId && entry.queueId.toLocaleLowerCase("en-US") !== "competitive") continue;
          result.matchIdsSeen += 1;
          if (await matchExists(db, entry.matchId)) {
            result.matchesSkipped += 1;
            continue;
          }

          const payload = await api.getMatchById(entry.matchId);
          const normalized = normalizeRiotMatch(payload, {
            datasetRegion: player.dataset_region,
            resolveMapName,
          });
          if (!normalized) {
            result.matchesSkipped += 1;
            continue;
          }

          await persistMatch(db, normalized, nowSeconds);
          result.matchesInserted += 1;
          const dates = touchedDates.get(normalized.region) ?? new Set<string>();
          dates.add(jstDateFromEpochSeconds(normalized.startedAt));
          touchedDates.set(normalized.region, dates);
        }

        await updateTrackedPlayer(
          db,
          player.puuid,
          nowSeconds,
          nowSeconds + resolved.pollIntervalSeconds,
          null,
        );
      } catch (error) {
        result.errors += 1;
        const retryAfter = error instanceof RiotApiError ? error.retryAfterSeconds : null;
        const nextPollAt = nowSeconds + Math.max(retryAfter ?? resolved.pollIntervalSeconds, 60);
        const message = error instanceof Error ? error.message.slice(0, 300) : "Unknown collection error";
        await updateTrackedPlayer(db, player.puuid, nowSeconds, nextPollAt, message);
        if (error instanceof RiotApiError && error.status === 429) {
          result.stoppedForRateLimit = true;
        }
      }
    }

    for (const [region, dates] of touchedDates) {
      for (const statDate of dates) {
        await rebuildDailyCompositionStats(db, region, statDate, now);
        result.dailyStatsRebuilt += 1;
      }
    }
  } catch (error) {
    result.errors += 1;
    console.error("Opt-in match collection failed", error);
  } finally {
    await finishCollectionRun(db, runId, Math.floor(Date.now() / 1000), result);
  }

  return result;
}
