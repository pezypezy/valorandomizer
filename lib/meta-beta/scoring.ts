export type AgentRole = "Duelist" | "Initiator" | "Controller" | "Sentinel";
export type RecommendationCategory = "theory" | "off_meta" | "solo_queue";

export interface CompositionCandidate {
  compKey: string;
  agents: string[];
  roles: AgentRole[];
  matches: number;
  wins: number;
  roundsWon: number;
  roundsLost: number;
  pickRate: number;
  averageAgentPickRate: number;
  activeDays: number;
  dailyWinRateStdDev: number;
}

export interface ScoredComposition extends CompositionCandidate {
  rawWinRate: number;
  adjustedWinRate: number;
  confidenceLower: number;
  roundWinRate: number;
  eligible: boolean;
  exclusionReasons: string[];
  theoryScore: number;
  offMetaScore: number;
  soloQueueScore: number;
}

export interface RecommendationSelection {
  theory: ScoredComposition | null;
  offMeta: ScoredComposition | null;
  soloQueue: ScoredComposition | null;
}

export interface ScoringOptions {
  minimumMatches?: number;
  minimumActiveDays?: number;
  priorMatches?: number;
  globalAverageWinRate?: number;
  maximumOffMetaPickRate?: number;
}

const DEFAULT_OPTIONS: Required<ScoringOptions> = {
  minimumMatches: 300,
  minimumActiveDays: 3,
  priorMatches: 200,
  globalAverageWinRate: 0.5,
  maximumOffMetaPickRate: 0.025,
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function safeRatio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function countRole(roles: AgentRole[], role: AgentRole): number {
  return roles.filter((candidate) => candidate === role).length;
}

export function canonicalCompKey(agents: string[]): string {
  return [...agents]
    .map((agent) => agent.trim().toLocaleLowerCase("en-US"))
    .sort((left, right) => left.localeCompare(right))
    .join("|");
}

export function wilsonLowerBound(wins: number, matches: number, z = 1.96): number {
  if (matches <= 0) return 0;
  const proportion = clamp(wins / matches, 0, 1);
  const zSquared = z * z;
  const denominator = 1 + zSquared / matches;
  const centre = proportion + zSquared / (2 * matches);
  const margin = z * Math.sqrt(
    (proportion * (1 - proportion) + zSquared / (4 * matches)) / matches,
  );
  return clamp((centre - margin) / denominator, 0, 1);
}

export function bayesianAdjustedWinRate(
  wins: number,
  matches: number,
  priorMatches = DEFAULT_OPTIONS.priorMatches,
  globalAverageWinRate = DEFAULT_OPTIONS.globalAverageWinRate,
): number {
  const priorWins = priorMatches * globalAverageWinRate;
  return clamp((Math.max(0, wins) + priorWins) / (Math.max(0, matches) + priorMatches), 0, 1);
}

export function getCompositionExclusionReasons(
  candidate: CompositionCandidate,
  options: ScoringOptions = {},
): string[] {
  const resolved = { ...DEFAULT_OPTIONS, ...options };
  const reasons: string[] = [];
  const normalizedAgents = candidate.agents.map((agent) => agent.trim().toLocaleLowerCase("en-US"));
  const uniqueAgents = new Set(normalizedAgents);
  const duelists = countRole(candidate.roles, "Duelist");
  const initiators = countRole(candidate.roles, "Initiator");
  const controllers = countRole(candidate.roles, "Controller");
  const sentinels = countRole(candidate.roles, "Sentinel");

  if (candidate.agents.length !== 5 || candidate.roles.length !== 5) reasons.push("invalid-team-size");
  if (uniqueAgents.size !== candidate.agents.length) reasons.push("duplicate-agent");
  if (candidate.matches < resolved.minimumMatches) reasons.push("insufficient-matches");
  if (candidate.activeDays < resolved.minimumActiveDays) reasons.push("insufficient-active-days");
  if (controllers === 0) reasons.push("no-controller");
  if (duelists >= 3) reasons.push("too-many-duelists");
  if (initiators === 0 && sentinels === 0) reasons.push("no-information-or-anchor-role");
  if (candidate.wins < 0 || candidate.wins > candidate.matches) reasons.push("invalid-win-count");
  if (candidate.roundsWon < 0 || candidate.roundsLost < 0) reasons.push("invalid-round-count");
  if (!Number.isFinite(candidate.pickRate) || candidate.pickRate < 0) reasons.push("invalid-pick-rate");

  return reasons;
}

function roleBalanceScore(roles: AgentRole[]): number {
  const duelists = countRole(roles, "Duelist");
  const initiators = countRole(roles, "Initiator");
  const controllers = countRole(roles, "Controller");
  const sentinels = countRole(roles, "Sentinel");
  let score = 1;

  if (controllers === 1) score += 0.35;
  if (controllers === 2) score += 0.2;
  if (duelists === 1) score += 0.3;
  if (initiators >= 1) score += 0.25;
  if (sentinels >= 1) score += 0.2;
  if (duelists === 2) score -= 0.08;
  if (controllers >= 2) score -= 0.05;

  return clamp(score / 2.1, 0, 1);
}

function stabilityScore(candidate: CompositionCandidate): number {
  const dayCoverage = clamp(candidate.activeDays / 7, 0, 1);
  const volatility = clamp(candidate.dailyWinRateStdDev / 0.12, 0, 1);
  return clamp(dayCoverage * 0.6 + (1 - volatility) * 0.4, 0, 1);
}

function sampleScore(matches: number, minimumMatches: number): number {
  if (matches <= 0) return 0;
  return clamp(Math.log1p(matches) / Math.log1p(Math.max(minimumMatches * 12, 1)), 0, 1);
}

function pickPopularityScore(pickRate: number): number {
  return clamp(Math.sqrt(Math.max(0, pickRate) / 0.12), 0, 1);
}

function offMetaRarityScore(pickRate: number, maximumOffMetaPickRate: number): number {
  if (pickRate <= 0) return 0;
  return clamp(1 - pickRate / maximumOffMetaPickRate, 0, 1);
}

export function scoreComposition(
  candidate: CompositionCandidate,
  options: ScoringOptions = {},
): ScoredComposition {
  const resolved = { ...DEFAULT_OPTIONS, ...options };
  const exclusionReasons = getCompositionExclusionReasons(candidate, resolved);
  const rawWinRate = safeRatio(candidate.wins, candidate.matches);
  const adjustedWinRate = bayesianAdjustedWinRate(
    candidate.wins,
    candidate.matches,
    resolved.priorMatches,
    resolved.globalAverageWinRate,
  );
  const confidenceLower = wilsonLowerBound(candidate.wins, candidate.matches);
  const roundWinRate = safeRatio(candidate.roundsWon, candidate.roundsWon + candidate.roundsLost);
  const roleScore = roleBalanceScore(candidate.roles);
  const stableScore = stabilityScore(candidate);
  const volumeScore = sampleScore(candidate.matches, resolved.minimumMatches);
  const popularityScore = pickPopularityScore(candidate.pickRate);
  const individualPopularity = clamp(candidate.averageAgentPickRate / 0.12, 0, 1);
  const rarityScore = offMetaRarityScore(candidate.pickRate, resolved.maximumOffMetaPickRate);
  const controllerCount = countRole(candidate.roles, "Controller");
  const executionPenalty = controllerCount >= 2 ? 0.08 : 0;

  const theoryScore =
    confidenceLower * 0.34 +
    adjustedWinRate * 0.2 +
    roundWinRate * 0.08 +
    volumeScore * 0.14 +
    popularityScore * 0.1 +
    roleScore * 0.08 +
    stableScore * 0.06;

  const offMetaScore =
    confidenceLower * 0.35 +
    adjustedWinRate * 0.25 +
    rarityScore * 0.18 +
    volumeScore * 0.1 +
    roleScore * 0.07 +
    stableScore * 0.05;

  const soloQueueScore =
    confidenceLower * 0.27 +
    adjustedWinRate * 0.18 +
    individualPopularity * 0.22 +
    popularityScore * 0.13 +
    roleScore * 0.12 +
    stableScore * 0.08 -
    executionPenalty;

  return {
    ...candidate,
    compKey: candidate.compKey || canonicalCompKey(candidate.agents),
    rawWinRate,
    adjustedWinRate,
    confidenceLower,
    roundWinRate,
    eligible: exclusionReasons.length === 0,
    exclusionReasons,
    theoryScore,
    offMetaScore,
    soloQueueScore,
  };
}

function agentDifference(left: ScoredComposition, right: ScoredComposition): number {
  const rightAgents = new Set(right.agents.map((agent) => agent.toLocaleLowerCase("en-US")));
  return left.agents.filter((agent) => !rightAgents.has(agent.toLocaleLowerCase("en-US"))).length;
}

function bestBy(
  candidates: ScoredComposition[],
  score: (candidate: ScoredComposition) => number,
): ScoredComposition | null {
  return candidates.reduce<ScoredComposition | null>((best, candidate) => {
    if (!best || score(candidate) > score(best)) return candidate;
    if (score(candidate) === score(best) && candidate.matches > best.matches) return candidate;
    return best;
  }, null);
}

export function selectRecommendations(
  candidates: CompositionCandidate[],
  options: ScoringOptions = {},
): RecommendationSelection {
  const resolved = { ...DEFAULT_OPTIONS, ...options };
  const scored = candidates.map((candidate) => scoreComposition(candidate, resolved));
  const eligible = scored.filter((candidate) => candidate.eligible);
  const theory = bestBy(eligible, (candidate) => candidate.theoryScore);

  const offMetaPool = eligible.filter((candidate) =>
    candidate.pickRate <= resolved.maximumOffMetaPickRate &&
    (!theory || candidate.compKey !== theory.compKey) &&
    (!theory || agentDifference(candidate, theory) >= 2),
  );
  const offMeta = bestBy(offMetaPool, (candidate) => candidate.offMetaScore);

  const soloQueuePool = eligible.filter((candidate) =>
    candidate.compKey !== theory?.compKey && candidate.compKey !== offMeta?.compKey,
  );
  const soloQueue = bestBy(
    soloQueuePool.length > 0 ? soloQueuePool : eligible,
    (candidate) => candidate.soloQueueScore,
  );

  return { theory, offMeta, soloQueue };
}
