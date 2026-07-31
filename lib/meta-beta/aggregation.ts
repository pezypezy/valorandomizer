import { AGENTS } from "@/lib/agents";
import type { D1DatabaseBinding, D1PreparedStatement } from "@/lib/meta-beta/auth";
import {
  selectRecommendations,
  type AgentRole,
  type CompositionCandidate,
  type RecommendationCategory,
  type ScoredComposition,
} from "@/lib/meta-beta/scoring";

interface DailyCompositionRow {
  stat_date: string;
  region: string;
  patch: string;
  map_id: string;
  rank_bucket: string;
  comp_key: string;
  agents_json: string;
  match_count: number;
  wins: number;
  rounds_won: number;
  rounds_lost: number;
  pick_rate: number;
  average_agent_pick_rate: number;
  eligible_for_recommendation: number;
}

interface CandidateAccumulator {
  compKey: string;
  agents: string[];
  roles: AgentRole[];
  matches: number;
  wins: number;
  roundsWon: number;
  roundsLost: number;
  pickRateTotal: number;
  averageAgentPickRateTotal: number;
  dailyWinRates: number[];
  activeDates: Set<string>;
}

export interface RebuildResult {
  region: string;
  patch: string;
  periodStart: string;
  periodEnd: string;
  scopesProcessed: number;
  snapshotsWritten: number;
  scopesSkipped: number;
}

const AGENT_ROLE_BY_NAME = new Map(
  AGENTS.map((agent) => [agent.name.toLocaleLowerCase("en-US"), agent.role as AgentRole]),
);

function jstDate(now: number): string {
  return new Date(now + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function parseAgents(value: string): string[] | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== 5 || !parsed.every((item) => typeof item === "string")) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function rolesForAgents(agents: string[]): AgentRole[] | null {
  const roles = agents.map((agent) => AGENT_ROLE_BY_NAME.get(agent.toLocaleLowerCase("en-US")));
  return roles.every((role): role is AgentRole => Boolean(role)) ? roles : null;
}

function standardDeviation(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function scopeKey(row: DailyCompositionRow): string {
  return `${row.map_id}\u0000${row.rank_bucket}`;
}

function candidateKey(row: DailyCompositionRow): string {
  return `${scopeKey(row)}\u0000${row.comp_key}`;
}

export function dailyRowsToCandidates(rows: DailyCompositionRow[]): Map<string, CompositionCandidate[]> {
  const accumulators = new Map<string, CandidateAccumulator>();

  for (const row of rows) {
    if (row.eligible_for_recommendation !== 1 || row.match_count <= 0) continue;
    const agents = parseAgents(row.agents_json);
    if (!agents) continue;
    const roles = rolesForAgents(agents);
    if (!roles) continue;

    const key = candidateKey(row);
    const accumulator = accumulators.get(key) ?? {
      compKey: row.comp_key,
      agents,
      roles,
      matches: 0,
      wins: 0,
      roundsWon: 0,
      roundsLost: 0,
      pickRateTotal: 0,
      averageAgentPickRateTotal: 0,
      dailyWinRates: [],
      activeDates: new Set<string>(),
    };

    accumulator.matches += row.match_count;
    accumulator.wins += row.wins;
    accumulator.roundsWon += row.rounds_won;
    accumulator.roundsLost += row.rounds_lost;
    accumulator.pickRateTotal += row.pick_rate;
    accumulator.averageAgentPickRateTotal += row.average_agent_pick_rate;
    accumulator.dailyWinRates.push(row.wins / row.match_count);
    accumulator.activeDates.add(row.stat_date);
    accumulators.set(key, accumulator);
  }

  const scopes = new Map<string, CompositionCandidate[]>();
  for (const [key, accumulator] of accumulators) {
    const [mapId, rankBucket] = key.split("\u0000");
    const scope = `${mapId}\u0000${rankBucket}`;
    const activeDays = accumulator.activeDates.size;
    const candidate: CompositionCandidate = {
      compKey: accumulator.compKey,
      agents: accumulator.agents,
      roles: accumulator.roles,
      matches: accumulator.matches,
      wins: accumulator.wins,
      roundsWon: accumulator.roundsWon,
      roundsLost: accumulator.roundsLost,
      pickRate: accumulator.pickRateTotal / Math.max(activeDays, 1),
      averageAgentPickRate: accumulator.averageAgentPickRateTotal / Math.max(activeDays, 1),
      activeDays,
      dailyWinRateStdDev: standardDeviation(accumulator.dailyWinRates),
    };
    scopes.set(scope, [...(scopes.get(scope) ?? []), candidate]);
  }

  return scopes;
}

function confidence(candidate: ScoredComposition): "high" | "medium" | "low" {
  if (candidate.matches >= 1000 && candidate.activeDays >= 5) return "high";
  if (candidate.matches >= 300 && candidate.activeDays >= 3) return "medium";
  return "low";
}

function reasons(category: RecommendationCategory, candidate: ScoredComposition): string[] {
  const sample = `${candidate.matches.toLocaleString("en-US")}試合・${candidate.activeDays}日分`;
  if (category === "theory") {
    return [
      `${sample}でWilson下限と補正勝率が安定`,
      "役割バランスと構成使用率を含めたセオリー採点で首位",
      `日別勝率の標準偏差 ${(candidate.dailyWinRateStdDev * 100).toFixed(1)}pt`,
    ];
  }
  if (category === "off_meta") {
    return [
      `${sample}を確保しながらピック率 ${(candidate.pickRate * 100).toFixed(2)}%`,
      "セオリー構成と2体以上異なる候補から選定",
      "少数試合の上振れをベイズ補正とWilson下限で抑制",
    ];
  }
  return [
    `${sample}で補正勝率と再現性を両立`,
    `採用エージェントの平均ピック率 ${(candidate.averageAgentPickRate * 100).toFixed(1)}%`,
    "複雑な連携への依存と役割崩壊構成を減点・除外",
  ];
}

function caution(category: RecommendationCategory): string {
  if (category === "off_meta") return "低使用率構成のため、試合前に役割とセットアップを共有してください。";
  if (category === "solo_queue") return "再現性を優先した推薦であり、純粋な補正勝率1位とは限りません。";
  return "統計的な推薦です。使用可能エージェントとチーム内ロールを優先してください。";
}

function scoreForCategory(category: RecommendationCategory, candidate: ScoredComposition): number {
  if (category === "off_meta") return candidate.offMetaScore;
  if (category === "solo_queue") return candidate.soloQueueScore;
  return candidate.theoryScore;
}

function snapshotStatement(
  db: D1DatabaseBinding,
  input: {
    statDate: string;
    region: string;
    patch: string;
    periodStart: string;
    periodEnd: string;
    mapId: string;
    rankBucket: string;
    category: RecommendationCategory;
    candidate: ScoredComposition;
    updatedAt: number;
  },
): D1PreparedStatement {
  const { candidate } = input;
  return db.prepare(
    `INSERT INTO recommendation_snapshots (
       stat_date, region, patch, period_start, period_end, map_id, rank_bucket,
       category, comp_key, agents_json, raw_win_rate, adjusted_win_rate,
       pick_rate, match_count, confidence, reasons_json, caution, score, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(stat_date, region, patch, map_id, rank_bucket, category)
     DO UPDATE SET
       period_start = excluded.period_start,
       period_end = excluded.period_end,
       comp_key = excluded.comp_key,
       agents_json = excluded.agents_json,
       raw_win_rate = excluded.raw_win_rate,
       adjusted_win_rate = excluded.adjusted_win_rate,
       pick_rate = excluded.pick_rate,
       match_count = excluded.match_count,
       confidence = excluded.confidence,
       reasons_json = excluded.reasons_json,
       caution = excluded.caution,
       score = excluded.score,
       updated_at = excluded.updated_at`,
  ).bind(
    input.statDate,
    input.region,
    input.patch,
    input.periodStart,
    input.periodEnd,
    input.mapId,
    input.rankBucket,
    input.category,
    candidate.compKey,
    JSON.stringify(candidate.agents),
    candidate.rawWinRate * 100,
    candidate.adjustedWinRate * 100,
    candidate.pickRate * 100,
    candidate.matches,
    confidence(candidate),
    JSON.stringify(reasons(input.category, candidate)),
    caution(input.category),
    scoreForCategory(input.category, candidate),
    input.updatedAt,
  );
}

async function runInChunks(db: D1DatabaseBinding, statements: D1PreparedStatement[], chunkSize = 50): Promise<void> {
  for (let index = 0; index < statements.length; index += chunkSize) {
    await db.batch(statements.slice(index, index + chunkSize));
  }
}

export async function rebuildLatestRecommendationSnapshots(
  db: D1DatabaseBinding,
  region = "jp",
  now = Date.now(),
): Promise<RebuildResult> {
  const latest = await db.prepare(
    `SELECT patch
       FROM daily_comp_stats
      WHERE region = ?
      ORDER BY stat_date DESC, updated_at DESC
      LIMIT 1`,
  ).bind(region).first<{ patch: string }>();

  const periodEnd = jstDate(now);
  const periodStart = jstDate(now - 6 * 24 * 60 * 60 * 1000);
  if (!latest?.patch) {
    return { region, patch: "", periodStart, periodEnd, scopesProcessed: 0, snapshotsWritten: 0, scopesSkipped: 0 };
  }

  const result = await db.prepare(
    `SELECT stat_date, region, patch, map_id, rank_bucket, comp_key, agents_json,
            match_count, wins, rounds_won, rounds_lost, pick_rate,
            average_agent_pick_rate, eligible_for_recommendation
       FROM daily_comp_stats
      WHERE region = ?
        AND patch = ?
        AND stat_date BETWEEN ? AND ?`,
  ).bind(region, latest.patch, periodStart, periodEnd).all<DailyCompositionRow>();

  const scopes = dailyRowsToCandidates(result.results ?? []);
  const statements: D1PreparedStatement[] = [];
  let scopesSkipped = 0;
  const updatedAt = Math.floor(now / 1000);

  for (const [scope, candidates] of scopes) {
    const [mapId, rankBucket] = scope.split("\u0000");
    const selected = selectRecommendations(candidates);
    const selections: Array<[RecommendationCategory, ScoredComposition | null]> = [
      ["theory", selected.theory],
      ["off_meta", selected.offMeta],
      ["solo_queue", selected.soloQueue],
    ];
    if (selections.some(([, candidate]) => !candidate)) {
      scopesSkipped += 1;
      continue;
    }

    statements.push(
      db.prepare(
        `DELETE FROM recommendation_snapshots
          WHERE stat_date = ? AND region = ? AND patch = ? AND map_id = ? AND rank_bucket = ?`,
      ).bind(periodEnd, region, latest.patch, mapId, rankBucket),
    );
    for (const [category, candidate] of selections) {
      if (!candidate) continue;
      statements.push(snapshotStatement(db, {
        statDate: periodEnd,
        region,
        patch: latest.patch,
        periodStart,
        periodEnd,
        mapId,
        rankBucket,
        category,
        candidate,
        updatedAt,
      }));
    }
  }

  await runInChunks(db, statements);
  const snapshotsWritten = statements.filter((_, index) => index % 4 !== 0).length;
  return {
    region,
    patch: latest.patch,
    periodStart,
    periodEnd,
    scopesProcessed: scopes.size - scopesSkipped,
    snapshotsWritten,
    scopesSkipped,
  };
}
