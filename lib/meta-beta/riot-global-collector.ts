import type { D1DatabaseBinding, D1PreparedStatement } from "@/lib/meta-beta/auth";
import {
  ingestGlobalRankedBatch,
  shardGroupForRoute,
} from "@/lib/meta-beta/global-ingest";
import { META_MAPS } from "@/lib/meta-beta/mock-data";
import {
  RiotApiError,
  type RiotContentResponse,
  type RiotRecentMatchesResponse,
} from "@/lib/meta-beta/riot-client";

export const RIOT_RECENT_ROUTES = ["na", "eu", "ap", "kr"] as const;
export type RiotRecentRoute = (typeof RIOT_RECENT_ROUTES)[number];

interface RiotRecentApi {
  getRecentMatches(queue?: string): Promise<RiotRecentMatchesResponse>;
  getMatchById(matchId: string): Promise<unknown>;
  getContent(locale?: string): Promise<RiotContentResponse>;
}

interface DiscoveryRow {
  match_id: string;
  source_route: string;
  attempt_count: number;
}

export interface RiotGlobalCollectorOptions {
  maximumDiscoveredPerRoute?: number;
  maximumDetailsPerRun?: number;
  maximumAttempts?: number;
  retryDelaySeconds?: number;
}

export interface RiotGlobalCollectorResult {
  routesRequested: number;
  routesFailed: number;
  matchIdsSeen: number;
  matchIdsQueued: number;
  detailsRequested: number;
  detailsFetched: number;
  detailsFailed: number;
  matchesInserted: number;
  matchesSkipped: number;
  dailyStatsRebuilt: number;
  rateLimitedRoutes: RiotRecentRoute[];
}

const DEFAULT_OPTIONS: Required<RiotGlobalCollectorOptions> = {
  maximumDiscoveredPerRoute: 5_000,
  maximumDetailsPerRun: 120,
  maximumAttempts: 5,
  retryDelaySeconds: 5 * 60,
};

function isRiotRecentRoute(value: string): value is RiotRecentRoute {
  return RIOT_RECENT_ROUTES.includes(value as RiotRecentRoute);
}

async function batchInChunks(
  db: D1DatabaseBinding,
  statements: D1PreparedStatement[],
  chunkSize = 50,
): Promise<void> {
  for (let index = 0; index < statements.length; index += chunkSize) {
    await db.batch(statements.slice(index, index + chunkSize));
  }
}

async function enqueueRecentMatches(
  db: D1DatabaseBinding,
  route: RiotRecentRoute,
  recent: RiotRecentMatchesResponse,
  nowSeconds: number,
  maximum: number,
): Promise<number> {
  const matchIds = recent.matchIds.slice(0, maximum);
  const statements = matchIds.map((matchId) => db.prepare(
    `INSERT INTO global_match_discovery (
       match_id, source_route, shard_group, discovered_at, source_time,
       status, attempt_count, next_attempt_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?)
     ON CONFLICT(match_id) DO UPDATE SET
       updated_at = excluded.updated_at`,
  ).bind(
    matchId,
    route,
    shardGroupForRoute(route),
    nowSeconds,
    recent.currentTime,
    nowSeconds,
    nowSeconds,
  ));
  await batchInChunks(db, statements);
  return matchIds.length;
}

function mapResolver(content: RiotContentResponse): (mapId: string) => string | null {
  const aliases = new Map<string, string>();
  for (const map of content.maps) {
    aliases.set(map.id, map.name);
    if (map.assetName) aliases.set(map.assetName, map.name);
  }
  const recognized = new Set<string>(META_MAPS);
  return (mapId: string): string | null => {
    const mapped = aliases.get(mapId);
    if (mapped && recognized.has(mapped)) return mapped;
    return recognized.has(mapId) ? mapId : null;
  };
}

async function markComplete(
  db: D1DatabaseBinding,
  matchIds: string[],
  nowSeconds: number,
): Promise<void> {
  const statements = matchIds.map((matchId) => db.prepare(
    `UPDATE global_match_discovery
        SET status = 'complete', completed_at = ?, last_error = NULL,
            updated_at = ?
      WHERE match_id = ?`,
  ).bind(nowSeconds, nowSeconds, matchId));
  await batchInChunks(db, statements);
}

async function markFailure(
  db: D1DatabaseBinding,
  row: DiscoveryRow,
  error: unknown,
  nowSeconds: number,
  options: Required<RiotGlobalCollectorOptions>,
): Promise<void> {
  const attemptCount = row.attempt_count + 1;
  const retryAfter = error instanceof RiotApiError ? error.retryAfterSeconds : null;
  const delay = Math.max(retryAfter ?? options.retryDelaySeconds * attemptCount, 60);
  const status = attemptCount >= options.maximumAttempts ? "failed" : "pending";
  const message = error instanceof Error ? error.message.slice(0, 300) : "Unknown Riot match detail error";
  await db.prepare(
    `UPDATE global_match_discovery
        SET status = ?, attempt_count = ?, next_attempt_at = ?,
            last_error = ?, updated_at = ?
      WHERE match_id = ?`,
  ).bind(status, attemptCount, nowSeconds + delay, message, nowSeconds, row.match_id).run();
}

export async function collectRiotRecentCompetitiveMatches(
  db: D1DatabaseBinding,
  apiForRoute: (route: RiotRecentRoute) => RiotRecentApi,
  now = Date.now(),
  options: RiotGlobalCollectorOptions = {},
): Promise<RiotGlobalCollectorResult> {
  const resolved = { ...DEFAULT_OPTIONS, ...options };
  const nowSeconds = Math.floor(now / 1000);
  const result: RiotGlobalCollectorResult = {
    routesRequested: 0,
    routesFailed: 0,
    matchIdsSeen: 0,
    matchIdsQueued: 0,
    detailsRequested: 0,
    detailsFetched: 0,
    detailsFailed: 0,
    matchesInserted: 0,
    matchesSkipped: 0,
    dailyStatsRebuilt: 0,
    rateLimitedRoutes: [],
  };

  for (const route of RIOT_RECENT_ROUTES) {
    result.routesRequested += 1;
    try {
      const recent = await apiForRoute(route).getRecentMatches("competitive");
      result.matchIdsSeen += recent.matchIds.length;
      result.matchIdsQueued += await enqueueRecentMatches(
        db,
        route,
        recent,
        nowSeconds,
        resolved.maximumDiscoveredPerRoute,
      );
    } catch (error) {
      result.routesFailed += 1;
      if (error instanceof RiotApiError && error.status === 429) {
        result.rateLimitedRoutes.push(route);
      }
      console.error(`Riot recent-match discovery failed for ${route}`, error);
    }
  }

  let resolveMapName: (mapId: string) => string | null = (mapId) =>
    META_MAPS.includes(mapId as (typeof META_MAPS)[number]) ? mapId : null;
  try {
    resolveMapName = mapResolver(await apiForRoute("ap").getContent("en-US"));
  } catch (error) {
    console.error("Riot content map refresh failed during global collection", error);
  }

  const pending = await db.prepare(
    `SELECT match_id, source_route, attempt_count
       FROM global_match_discovery
      WHERE status = 'pending' AND next_attempt_at <= ?
      ORDER BY discovered_at ASC
      LIMIT ?`,
  ).bind(nowSeconds, resolved.maximumDetailsPerRun).all<DiscoveryRow>();

  const fetched: Array<{ row: DiscoveryRow; route: RiotRecentRoute; payload: unknown }> = [];
  const limitedRoutes = new Set<RiotRecentRoute>(result.rateLimitedRoutes);

  for (const row of pending.results ?? []) {
    if (!isRiotRecentRoute(row.source_route)) {
      result.detailsFailed += 1;
      await markFailure(db, row, new Error("Unsupported Riot source route"), nowSeconds, resolved);
      continue;
    }
    if (limitedRoutes.has(row.source_route)) continue;

    result.detailsRequested += 1;
    try {
      const payload = await apiForRoute(row.source_route).getMatchById(row.match_id);
      fetched.push({ row, route: row.source_route, payload });
      result.detailsFetched += 1;
    } catch (error) {
      result.detailsFailed += 1;
      await markFailure(db, row, error, nowSeconds, resolved);
      if (error instanceof RiotApiError && error.status === 429) {
        limitedRoutes.add(row.source_route);
      }
    }
  }

  result.rateLimitedRoutes = [...limitedRoutes];
  if (fetched.length === 0) return result;

  try {
    const ingested = await ingestGlobalRankedBatch(db, {
      source: "riot-recent-matches",
      fetchedAt: nowSeconds,
      matches: fetched.map(({ route, payload }) => ({
        route,
        serverCluster: null,
        payload,
      })),
    }, now, {
      maximumMatches: resolved.maximumDetailsPerRun,
      resolveMapName,
    });
    result.matchesInserted = ingested.matchesInserted;
    result.matchesSkipped = ingested.matchesSkipped;
    result.dailyStatsRebuilt = ingested.dailyStatsRebuilt;
    await markComplete(db, fetched.map(({ row }) => row.match_id), nowSeconds);
  } catch (error) {
    for (const { row } of fetched) {
      await markFailure(db, row, error, nowSeconds, resolved);
    }
    throw error;
  }

  return result;
}
