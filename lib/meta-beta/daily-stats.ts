import type { D1DatabaseBinding, D1PreparedStatement } from "@/lib/meta-beta/auth";
import { bayesianAdjustedWinRate, wilsonLowerBound } from "@/lib/meta-beta/scoring";

interface TeamResultRow {
  patch: string;
  map_id: string;
  rank_bucket: string;
  comp_key: string;
  agents_json: string;
  won: number;
  rounds_won: number;
  rounds_lost: number;
  eligible_for_recommendation: number;
}

interface Accumulator {
  patch: string;
  mapId: string;
  rankBucket: string;
  compKey: string;
  agents: string[];
  matches: number;
  wins: number;
  roundsWon: number;
  roundsLost: number;
  eligible: boolean;
}

export interface DailyCompositionStat {
  statDate: string;
  region: string;
  patch: string;
  mapId: string;
  rankBucket: string;
  compKey: string;
  agents: string[];
  matchCount: number;
  wins: number;
  roundsWon: number;
  roundsLost: number;
  rawWinRate: number;
  adjustedWinRate: number;
  confidenceLower: number;
  pickRate: number;
  averageAgentPickRate: number;
  eligibleForRecommendation: boolean;
}

function parseAgents(value: string): string[] | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) && parsed.length === 5 && parsed.every((agent) => typeof agent === "string")
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function groupKey(patch: string, mapId: string, rankBucket: string, compKey: string): string {
  return `${patch}\u0000${mapId}\u0000${rankBucket}\u0000${compKey}`;
}

function scopeKey(patch: string, mapId: string, rankBucket: string): string {
  return `${patch}\u0000${mapId}\u0000${rankBucket}`;
}

function addRow(
  accumulators: Map<string, Accumulator>,
  row: TeamResultRow,
  rankBucket: string,
  agents: string[],
): void {
  const key = groupKey(row.patch, row.map_id, rankBucket, row.comp_key);
  const accumulator = accumulators.get(key) ?? {
    patch: row.patch,
    mapId: row.map_id,
    rankBucket,
    compKey: row.comp_key,
    agents,
    matches: 0,
    wins: 0,
    roundsWon: 0,
    roundsLost: 0,
    eligible: true,
  };
  accumulator.matches += 1;
  accumulator.wins += row.won === 1 ? 1 : 0;
  accumulator.roundsWon += row.rounds_won;
  accumulator.roundsLost += row.rounds_lost;
  accumulator.eligible = accumulator.eligible && row.eligible_for_recommendation === 1;
  accumulators.set(key, accumulator);
}

export function teamRowsToDailyStats(
  rows: TeamResultRow[],
  statDate: string,
  region: string,
): DailyCompositionStat[] {
  const accumulators = new Map<string, Accumulator>();
  for (const row of rows) {
    const agents = parseAgents(row.agents_json);
    if (!agents) continue;
    addRow(accumulators, row, row.rank_bucket, agents);
    addRow(accumulators, row, "All", agents);
  }

  const scopeTotals = new Map<string, number>();
  const scopeAgentCounts = new Map<string, Map<string, number>>();
  for (const accumulator of accumulators.values()) {
    const scope = scopeKey(accumulator.patch, accumulator.mapId, accumulator.rankBucket);
    scopeTotals.set(scope, (scopeTotals.get(scope) ?? 0) + accumulator.matches);
    const agentCounts = scopeAgentCounts.get(scope) ?? new Map<string, number>();
    for (const agent of accumulator.agents) {
      agentCounts.set(agent, (agentCounts.get(agent) ?? 0) + accumulator.matches);
    }
    scopeAgentCounts.set(scope, agentCounts);
  }

  return [...accumulators.values()].map((accumulator) => {
    const scope = scopeKey(accumulator.patch, accumulator.mapId, accumulator.rankBucket);
    const total = scopeTotals.get(scope) ?? accumulator.matches;
    const agentCounts = scopeAgentCounts.get(scope) ?? new Map<string, number>();
    const averageAgentPickRate = accumulator.agents.reduce(
      (sum, agent) => sum + (agentCounts.get(agent) ?? 0) / Math.max(total, 1),
      0,
    ) / accumulator.agents.length;

    return {
      statDate,
      region,
      patch: accumulator.patch,
      mapId: accumulator.mapId,
      rankBucket: accumulator.rankBucket,
      compKey: accumulator.compKey,
      agents: accumulator.agents,
      matchCount: accumulator.matches,
      wins: accumulator.wins,
      roundsWon: accumulator.roundsWon,
      roundsLost: accumulator.roundsLost,
      rawWinRate: accumulator.wins / accumulator.matches,
      adjustedWinRate: bayesianAdjustedWinRate(accumulator.wins, accumulator.matches),
      confidenceLower: wilsonLowerBound(accumulator.wins, accumulator.matches),
      pickRate: accumulator.matches / Math.max(total, 1),
      averageAgentPickRate,
      eligibleForRecommendation: accumulator.eligible,
    };
  });
}

function utcBoundsForJstDate(statDate: string): { start: number; end: number } {
  const startMillis = Date.parse(`${statDate}T00:00:00+09:00`);
  if (!Number.isFinite(startMillis)) throw new Error(`Invalid stat date: ${statDate}`);
  return {
    start: Math.floor(startMillis / 1000),
    end: Math.floor((startMillis + 24 * 60 * 60 * 1000) / 1000),
  };
}

function insertStatement(
  db: D1DatabaseBinding,
  stat: DailyCompositionStat,
  updatedAt: number,
): D1PreparedStatement {
  return db.prepare(
    `INSERT INTO daily_comp_stats (
       stat_date, region, patch, map_id, rank_bucket, comp_key, agents_json,
       match_count, wins, rounds_won, rounds_lost, raw_win_rate,
       adjusted_win_rate, confidence_lower, pick_rate, average_agent_pick_rate,
       eligible_for_recommendation, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(stat_date, region, patch, map_id, rank_bucket, comp_key)
     DO UPDATE SET
       agents_json = excluded.agents_json,
       match_count = excluded.match_count,
       wins = excluded.wins,
       rounds_won = excluded.rounds_won,
       rounds_lost = excluded.rounds_lost,
       raw_win_rate = excluded.raw_win_rate,
       adjusted_win_rate = excluded.adjusted_win_rate,
       confidence_lower = excluded.confidence_lower,
       pick_rate = excluded.pick_rate,
       average_agent_pick_rate = excluded.average_agent_pick_rate,
       eligible_for_recommendation = excluded.eligible_for_recommendation,
       updated_at = excluded.updated_at`,
  ).bind(
    stat.statDate,
    stat.region,
    stat.patch,
    stat.mapId,
    stat.rankBucket,
    stat.compKey,
    JSON.stringify(stat.agents),
    stat.matchCount,
    stat.wins,
    stat.roundsWon,
    stat.roundsLost,
    stat.rawWinRate,
    stat.adjustedWinRate,
    stat.confidenceLower,
    stat.pickRate,
    stat.averageAgentPickRate,
    stat.eligibleForRecommendation ? 1 : 0,
    updatedAt,
  );
}

async function batchInChunks(db: D1DatabaseBinding, statements: D1PreparedStatement[], size = 50): Promise<void> {
  for (let index = 0; index < statements.length; index += size) {
    await db.batch(statements.slice(index, index + size));
  }
}

export async function rebuildDailyCompositionStats(
  db: D1DatabaseBinding,
  region: string,
  statDate: string,
  now = Date.now(),
): Promise<{ rowsRead: number; statsWritten: number }> {
  const bounds = utcBoundsForJstDate(statDate);
  const result = await db.prepare(
    `SELECT m.patch, m.map_id, tr.rank_bucket, tr.comp_key, tr.agents_json,
            tr.won, tr.rounds_won, tr.rounds_lost, tr.eligible_for_recommendation
       FROM team_results tr
       JOIN matches m ON m.match_id = tr.match_id
      WHERE m.region = ?
        AND m.started_at >= ?
        AND m.started_at < ?`,
  ).bind(region, bounds.start, bounds.end).all<TeamResultRow>();

  const rows = result.results ?? [];
  const stats = teamRowsToDailyStats(rows, statDate, region);
  const updatedAt = Math.floor(now / 1000);
  const statements: D1PreparedStatement[] = [
    db.prepare("DELETE FROM daily_comp_stats WHERE stat_date = ? AND region = ?").bind(statDate, region),
    ...stats.map((stat) => insertStatement(db, stat, updatedAt)),
  ];
  await batchInChunks(db, statements);
  return { rowsRead: rows.length, statsWritten: stats.length };
}
