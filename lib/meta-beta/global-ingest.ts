import type { D1DatabaseBinding, D1PreparedStatement } from "@/lib/meta-beta/auth";
import { rebuildDailyCompositionStats } from "@/lib/meta-beta/daily-stats";
import { normalizeRiotMatch, type NormalizedMatch } from "@/lib/meta-beta/normalize-match";

export const GLOBAL_META_REGION = "global";
export const GLOBAL_RANKED_ROUTES = ["na", "eu", "ap", "kr", "latam", "br"] as const;
export const GLOBAL_SHARD_GROUPS = ["americas", "eu", "ap", "kr"] as const;

export type GlobalRankedRoute = (typeof GLOBAL_RANKED_ROUTES)[number];
export type GlobalShardGroup = (typeof GLOBAL_SHARD_GROUPS)[number];

export interface GlobalRankedMatchEnvelope {
  route: GlobalRankedRoute;
  serverCluster?: string | null;
  payload: unknown;
}

export interface GlobalRankedBatch {
  source: string;
  fetchedAt: number;
  matches: GlobalRankedMatchEnvelope[];
}

export interface NormalizedGlobalRankedMatch {
  route: GlobalRankedRoute;
  shardGroup: GlobalShardGroup;
  serverCluster: string;
  match: NormalizedMatch;
}

export interface GlobalBatchNormalizationResult {
  source: string;
  fetchedAt: number;
  payloadMatches: number;
  rejectedMatches: number;
  matches: NormalizedGlobalRankedMatch[];
}

export interface GlobalIngestResult extends GlobalBatchNormalizationResult {
  matchesInserted: number;
  matchesSkipped: number;
  dailyStatsRebuilt: number;
}

export interface GlobalBatchNormalizationOptions {
  resolveMapName?: (mapId: string) => string | null;
  maximumMatches?: number;
}

const SOURCE_PATTERN = /^[a-z0-9][a-z0-9._-]{1,63}$/u;
const DEFAULT_MAXIMUM_MATCHES = 250;
const UNKNOWN_SERVER_CLUSTER = "unknown";

function jstDateFromEpochSeconds(epochSeconds: number): string {
  return new Date(epochSeconds * 1000 + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function shardGroupForRoute(route: GlobalRankedRoute): GlobalShardGroup {
  if (route === "na" || route === "latam" || route === "br") return "americas";
  return route;
}

export function normalizeServerCluster(value: unknown): string {
  if (typeof value !== "string") return UNKNOWN_SERVER_CLUSTER;
  const normalized = value
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 64);
  return normalized || UNKNOWN_SERVER_CLUSTER;
}

function assertBatch(batch: GlobalRankedBatch, maximumMatches: number): void {
  if (!SOURCE_PATTERN.test(batch.source)) {
    throw new Error("Global ranked data source must be a lowercase stable identifier");
  }
  if (!Number.isInteger(batch.fetchedAt) || batch.fetchedAt <= 0) {
    throw new Error("Global ranked batch fetchedAt must be a positive Unix timestamp in seconds");
  }
  if (!Array.isArray(batch.matches) || batch.matches.length === 0) {
    throw new Error("Global ranked batch must contain at least one match");
  }
  if (batch.matches.length > maximumMatches) {
    throw new Error(`Global ranked batch exceeds the ${maximumMatches} match limit`);
  }
}

export function normalizeGlobalRankedBatch(
  batch: GlobalRankedBatch,
  options: GlobalBatchNormalizationOptions = {},
): GlobalBatchNormalizationResult {
  const maximumMatches = options.maximumMatches ?? DEFAULT_MAXIMUM_MATCHES;
  assertBatch(batch, maximumMatches);

  const matches: NormalizedGlobalRankedMatch[] = [];
  let rejectedMatches = 0;

  for (const envelope of batch.matches) {
    if (!GLOBAL_RANKED_ROUTES.includes(envelope.route)) {
      rejectedMatches += 1;
      continue;
    }

    const normalized = normalizeRiotMatch(envelope.payload, {
      datasetRegion: GLOBAL_META_REGION,
      resolveMapName: options.resolveMapName,
    });
    if (!normalized || normalized.queueId.toLocaleLowerCase("en-US") !== "competitive") {
      rejectedMatches += 1;
      continue;
    }

    matches.push({
      route: envelope.route,
      shardGroup: shardGroupForRoute(envelope.route),
      serverCluster: normalizeServerCluster(envelope.serverCluster),
      match: normalized,
    });
  }

  return {
    source: batch.source,
    fetchedAt: batch.fetchedAt,
    payloadMatches: batch.matches.length,
    rejectedMatches,
    matches,
  };
}

async function matchExists(db: D1DatabaseBinding, matchId: string): Promise<boolean> {
  const row = await db.prepare("SELECT 1 AS present FROM matches WHERE match_id = ? LIMIT 1")
    .bind(matchId)
    .first<{ present: number }>();
  return row?.present === 1;
}

function persistStatements(
  db: D1DatabaseBinding,
  source: string,
  entry: NormalizedGlobalRankedMatch,
  processedAt: number,
): D1PreparedStatement[] {
  const { route, shardGroup, serverCluster, match } = entry;
  return [
    db.prepare(
      `INSERT OR IGNORE INTO matches
        (match_id, region, map_id, patch, queue_id, started_at, processed_at,
         source, source_route, shard_group, server_cluster)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      match.matchId,
      GLOBAL_META_REGION,
      match.mapId,
      match.patch,
      match.queueId,
      match.startedAt,
      processedAt,
      source,
      route,
      shardGroup,
      serverCluster,
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
    ...match.teams.map((team) => db.prepare(
      `INSERT INTO global_dataset_coverage
        (stat_date, source, source_route, shard_group, server_cluster,
         patch, map_id, rank_bucket, team_count, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
       ON CONFLICT(
         stat_date, source, source_route, shard_group, server_cluster,
         patch, map_id, rank_bucket
       )
       DO UPDATE SET
         team_count = global_dataset_coverage.team_count + 1,
         updated_at = excluded.updated_at`,
    ).bind(
      jstDateFromEpochSeconds(match.startedAt),
      source,
      route,
      shardGroup,
      serverCluster,
      match.patch,
      match.mapId,
      team.rankBucket,
      processedAt,
    )),
  ];
}

async function createIngestRun(
  db: D1DatabaseBinding,
  normalized: GlobalBatchNormalizationResult,
  startedAt: number,
): Promise<number | null> {
  const row = await db.prepare(
    `INSERT INTO global_ingest_runs
      (source, fetched_at, started_at, payload_matches, normalized_matches,
       rejected_matches, status)
     VALUES (?, ?, ?, ?, ?, ?, 'running')
     RETURNING id`,
  ).bind(
    normalized.source,
    normalized.fetchedAt,
    startedAt,
    normalized.payloadMatches,
    normalized.matches.length,
    normalized.rejectedMatches,
  ).first<{ id: number }>();
  return row?.id ?? null;
}

async function finishIngestRun(
  db: D1DatabaseBinding,
  runId: number | null,
  finishedAt: number,
  result: GlobalIngestResult,
): Promise<void> {
  if (runId === null) return;
  const status = result.matchesInserted > 0
    ? result.rejectedMatches > 0 ? "partial" : "success"
    : "failed";
  await db.prepare(
    `UPDATE global_ingest_runs
        SET finished_at = ?, matches_inserted = ?, matches_skipped = ?,
            status = ?, detail = ?
      WHERE id = ?`,
  ).bind(
    finishedAt,
    result.matchesInserted,
    result.matchesSkipped,
    status,
    JSON.stringify({ dailyStatsRebuilt: result.dailyStatsRebuilt }),
    runId,
  ).run();
}

export async function ingestGlobalRankedBatch(
  db: D1DatabaseBinding,
  batch: GlobalRankedBatch,
  now = Date.now(),
  options: GlobalBatchNormalizationOptions = {},
): Promise<GlobalIngestResult> {
  const normalized = normalizeGlobalRankedBatch(batch, options);
  const processedAt = Math.floor(now / 1000);
  const runId = await createIngestRun(db, normalized, processedAt);
  const touchedDates = new Set<string>();
  let matchesInserted = 0;
  let matchesSkipped = 0;

  try {
    for (const entry of normalized.matches) {
      if (await matchExists(db, entry.match.matchId)) {
        matchesSkipped += 1;
        continue;
      }
      await db.batch(persistStatements(db, normalized.source, entry, processedAt));
      matchesInserted += 1;
      touchedDates.add(jstDateFromEpochSeconds(entry.match.startedAt));
    }

    let dailyStatsRebuilt = 0;
    for (const statDate of touchedDates) {
      await rebuildDailyCompositionStats(db, GLOBAL_META_REGION, statDate, now);
      dailyStatsRebuilt += 1;
    }

    const result: GlobalIngestResult = {
      ...normalized,
      matchesInserted,
      matchesSkipped,
      dailyStatsRebuilt,
    };
    await finishIngestRun(db, runId, Math.floor(Date.now() / 1000), result);
    return result;
  } catch (error) {
    if (runId !== null) {
      await db.prepare(
        `UPDATE global_ingest_runs
            SET finished_at = ?, matches_inserted = ?, matches_skipped = ?,
                status = 'failed', detail = ?
          WHERE id = ?`,
      ).bind(
        Math.floor(Date.now() / 1000),
        matchesInserted,
        matchesSkipped,
        JSON.stringify({ error: error instanceof Error ? error.message.slice(0, 300) : "Unknown ingest error" }),
        runId,
      ).run();
    }
    throw error;
  }
}
