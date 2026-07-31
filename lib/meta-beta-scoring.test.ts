import assert from "node:assert/strict";
import test from "node:test";
import {
  bayesianAdjustedWinRate,
  canonicalCompKey,
  scoreComposition,
  selectRecommendations,
  wilsonLowerBound,
  type CompositionCandidate,
} from "./meta-beta/scoring";

function candidate(overrides: Partial<CompositionCandidate> = {}): CompositionCandidate {
  const agents = overrides.agents ?? ["Jett", "Sova", "KAY/O", "Omen", "Killjoy"];
  return {
    compKey: overrides.compKey ?? canonicalCompKey(agents),
    agents,
    roles: overrides.roles ?? ["Duelist", "Initiator", "Initiator", "Controller", "Sentinel"],
    matches: overrides.matches ?? 2000,
    wins: overrides.wins ?? 1080,
    roundsWon: overrides.roundsWon ?? 27000,
    roundsLost: overrides.roundsLost ?? 25000,
    pickRate: overrides.pickRate ?? 0.07,
    averageAgentPickRate: overrides.averageAgentPickRate ?? 0.09,
    activeDays: overrides.activeDays ?? 7,
    dailyWinRateStdDev: overrides.dailyWinRateStdDev ?? 0.018,
  };
}

test("Bayesian adjustment suppresses tiny-sample outliers", () => {
  assert.ok(bayesianAdjustedWinRate(8, 10) < 0.52);
  assert.ok(bayesianAdjustedWinRate(560, 1000) > 0.54);
});

test("Wilson lower bound rewards confidence from larger samples", () => {
  assert.ok(wilsonLowerBound(560, 1000) > wilsonLowerBound(8, 10));
});

test("five-duelist and no-controller compositions are excluded", () => {
  const scored = scoreComposition(candidate({
    agents: ["Jett", "Raze", "Yoru", "Reyna", "Neon"],
    roles: ["Duelist", "Duelist", "Duelist", "Duelist", "Duelist"],
  }));

  assert.equal(scored.eligible, false);
  assert.ok(scored.exclusionReasons.includes("no-controller"));
  assert.ok(scored.exclusionReasons.includes("too-many-duelists"));
});

test("insufficient matches cannot become a recommendation", () => {
  const scored = scoreComposition(candidate({ matches: 40, wins: 36 }));
  assert.equal(scored.eligible, false);
  assert.ok(scored.exclusionReasons.includes("insufficient-matches"));
});

test("selection returns distinct theory, off-meta, and solo queue options", () => {
  const theory = candidate();
  const offMeta = candidate({
    agents: ["Yoru", "Breach", "Sova", "Omen", "Cypher"],
    roles: ["Duelist", "Initiator", "Initiator", "Controller", "Sentinel"],
    matches: 700,
    wins: 390,
    pickRate: 0.009,
    averageAgentPickRate: 0.045,
    dailyWinRateStdDev: 0.028,
  });
  const soloQueue = candidate({
    agents: ["Jett", "Sova", "Gekko", "Omen", "Sage"],
    roles: ["Duelist", "Initiator", "Initiator", "Controller", "Sentinel"],
    matches: 1700,
    wins: 910,
    pickRate: 0.05,
    averageAgentPickRate: 0.115,
    dailyWinRateStdDev: 0.024,
  });

  const selected = selectRecommendations([theory, offMeta, soloQueue]);
  assert.equal(selected.theory?.compKey, theory.compKey);
  assert.equal(selected.offMeta?.compKey, offMeta.compKey);
  assert.equal(selected.soloQueue?.compKey, soloQueue.compKey);
});
