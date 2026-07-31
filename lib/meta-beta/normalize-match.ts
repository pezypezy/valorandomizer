import { AGENTS } from "@/lib/agents";
import {
  canonicalCompKey,
  getCompositionExclusionReasons,
  type AgentRole,
  type CompositionCandidate,
} from "@/lib/meta-beta/scoring";

interface RiotMatchInfoLike {
  matchId?: unknown;
  mapId?: unknown;
  gameStartMillis?: unknown;
  gameLengthMillis?: unknown;
  queueId?: unknown;
  gameVersion?: unknown;
}

interface RiotPlayerLike {
  puuid?: unknown;
  teamId?: unknown;
  characterId?: unknown;
  competitiveTier?: unknown;
}

interface RiotTeamLike {
  teamId?: unknown;
  won?: unknown;
  roundsPlayed?: unknown;
  roundsWon?: unknown;
}

interface RiotMatchLike {
  matchInfo?: RiotMatchInfoLike;
  players?: RiotPlayerLike[];
  teams?: RiotTeamLike[];
}

export interface NormalizedTeamResult {
  teamSide: string;
  rankBucket: string;
  compKey: string;
  agents: string[];
  roles: AgentRole[];
  won: boolean;
  roundsWon: number;
  roundsLost: number;
  rolePattern: string;
  eligibleForRecommendation: boolean;
  exclusionReason: string | null;
}

export interface NormalizedMatch {
  matchId: string;
  region: string;
  mapId: string;
  patch: string;
  queueId: string;
  startedAt: number;
  teams: NormalizedTeamResult[];
}

export interface MatchNormalizationOptions {
  datasetRegion: string;
  resolveMapName?: (mapId: string) => string | null;
}

const AGENT_BY_ID = new Map(
  AGENTS.map((agent) => [agent.id.toLocaleLowerCase("en-US"), agent]),
);

const RANK_BUCKETS: Array<{ minimumTier: number; maximumTier: number; name: string }> = [
  { minimumTier: 3, maximumTier: 5, name: "Iron" },
  { minimumTier: 6, maximumTier: 8, name: "Bronze" },
  { minimumTier: 9, maximumTier: 11, name: "Silver" },
  { minimumTier: 12, maximumTier: 14, name: "Gold" },
  { minimumTier: 15, maximumTier: 17, name: "Platinum" },
  { minimumTier: 18, maximumTier: 20, name: "Diamond" },
  { minimumTier: 21, maximumTier: 23, name: "Ascendant" },
  { minimumTier: 24, maximumTier: 26, name: "Immortal" },
  { minimumTier: 27, maximumTier: Number.POSITIVE_INFINITY, name: "Radiant" },
];

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

export function rankBucketFromTier(tier: number): string | null {
  return RANK_BUCKETS.find((bucket) => tier >= bucket.minimumTier && tier <= bucket.maximumTier)?.name ?? null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}

function patchFromVersion(gameVersion: string): string {
  const releaseMatch = gameVersion.match(/(?:release-|^)(\d{1,2}\.\d{1,2})/iu);
  return releaseMatch?.[1] ?? gameVersion.slice(0, 64);
}

function structuralCandidate(agents: string[], roles: AgentRole[]): CompositionCandidate {
  return {
    compKey: canonicalCompKey(agents),
    agents,
    roles,
    matches: 1,
    wins: 0,
    roundsWon: 0,
    roundsLost: 0,
    pickRate: 0,
    averageAgentPickRate: 0,
    activeDays: 1,
    dailyWinRateStdDev: 0,
  };
}

function rolePattern(roles: AgentRole[]): string {
  const counts: Record<AgentRole, number> = {
    Duelist: 0,
    Initiator: 0,
    Controller: 0,
    Sentinel: 0,
  };
  for (const role of roles) counts[role] += 1;
  return `D${counts.Duelist}-I${counts.Initiator}-C${counts.Controller}-S${counts.Sentinel}`;
}

export function normalizeRiotMatch(
  value: unknown,
  options: MatchNormalizationOptions,
): NormalizedMatch | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as RiotMatchLike;
  const matchInfo = candidate.matchInfo;
  const rawPlayers = candidate.players;
  const rawTeams = candidate.teams;
  if (!matchInfo || !Array.isArray(rawPlayers) || !Array.isArray(rawTeams)) return null;

  const matchId = asString(matchInfo.matchId);
  const rawMapId = asString(matchInfo.mapId);
  const queueId = asString(matchInfo.queueId);
  const gameVersion = asString(matchInfo.gameVersion);
  const gameStartMillis = asNumber(matchInfo.gameStartMillis);
  if (!matchId || !rawMapId || !queueId || !gameVersion || gameStartMillis === null) return null;
  if (queueId.toLocaleLowerCase("en-US") !== "competitive") return null;

  const mapId = options.resolveMapName?.(rawMapId) ?? rawMapId;
  if (!mapId) return null;

  const playersByTeam = new Map<string, Array<{ agent: string; role: AgentRole; tier: number }>>();
  for (const player of rawPlayers) {
    const teamId = asString(player.teamId);
    const characterId = asString(player.characterId)?.toLocaleLowerCase("en-US");
    const tier = asNumber(player.competitiveTier);
    const agent = characterId ? AGENT_BY_ID.get(characterId) : null;
    if (!teamId || !agent || tier === null) continue;
    playersByTeam.set(teamId, [
      ...(playersByTeam.get(teamId) ?? []),
      { agent: agent.name, role: agent.role as AgentRole, tier },
    ]);
  }

  const teamSummaries = new Map<string, { won: boolean; roundsWon: number; roundsPlayed: number }>();
  for (const team of rawTeams) {
    const teamId = asString(team.teamId);
    const won = asBoolean(team.won);
    const roundsWon = asNumber(team.roundsWon);
    const roundsPlayed = asNumber(team.roundsPlayed);
    if (!teamId || won === null || roundsWon === null || roundsPlayed === null) continue;
    teamSummaries.set(teamId, { won, roundsWon, roundsPlayed });
  }

  if (playersByTeam.size !== 2 || teamSummaries.size !== 2) return null;
  const teamIds = [...playersByTeam.keys()];
  if (teamIds.some((teamId) => playersByTeam.get(teamId)?.length !== 5 || !teamSummaries.has(teamId))) return null;

  const totalRounds = [...teamSummaries.values()].reduce((maximum, team) => Math.max(maximum, team.roundsPlayed), 0);
  if (totalRounds < 5) return null;

  const teams: NormalizedTeamResult[] = [];
  for (const teamId of teamIds) {
    const players = playersByTeam.get(teamId) ?? [];
    const summary = teamSummaries.get(teamId);
    const opponentId = teamIds.find((candidateId) => candidateId !== teamId);
    const opponent = opponentId ? teamSummaries.get(opponentId) : null;
    if (!summary || !opponent) return null;

    const agents = players.map((player) => player.agent);
    const roles = players.map((player) => player.role);
    const medianTier = median(players.map((player) => player.tier).filter((tier) => tier > 0));
    const rankBucket = medianTier === null ? null : rankBucketFromTier(medianTier);
    if (!rankBucket) return null;

    const exclusionReasons = getCompositionExclusionReasons(structuralCandidate(agents, roles), {
      minimumMatches: 0,
      minimumActiveDays: 0,
    }).filter((reason) => reason !== "invalid-round-count");

    teams.push({
      teamSide: teamId,
      rankBucket,
      compKey: canonicalCompKey(agents),
      agents,
      roles,
      won: summary.won,
      roundsWon: summary.roundsWon,
      roundsLost: opponent.roundsWon,
      rolePattern: rolePattern(roles),
      eligibleForRecommendation: exclusionReasons.length === 0,
      exclusionReason: exclusionReasons.length > 0 ? exclusionReasons.join(",") : null,
    });
  }

  return {
    matchId,
    region: options.datasetRegion,
    mapId,
    patch: patchFromVersion(gameVersion),
    queueId,
    startedAt: Math.floor(gameStartMillis / 1000),
    teams,
  };
}
