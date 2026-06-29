import { test } from "node:test";
import assert from "node:assert/strict";
import { balanceTeams, generateBalancedTeamCandidates, type TeamParticipant } from "./team-balancer";

function member(name: string, rank: TeamParticipant["rank"]): TeamParticipant {
  return {
    id: name,
    name,
    rank,
    joinedAt: "2026-01-01T00:00:00.000Z",
  };
}

test("balanceTeams splits players into two near-even score teams", () => {
  const result = balanceTeams([
    member("A", "diamond3"),
    member("B", "diamond1"),
    member("C", "gold3"),
    member("D", "gold1"),
    member("E", "silver3"),
    member("F", "silver1"),
  ]);

  assert.equal(result.teamA.length, 3);
  assert.equal(result.teamB.length, 3);
  assert.ok(result.scoreDiff <= 2);
});

test("generateBalancedTeamCandidates returns up to three unique candidates", () => {
  const candidates = generateBalancedTeamCandidates([
    member("A", "diamond3"),
    member("B", "diamond2"),
    member("C", "platinum3"),
    member("D", "platinum2"),
    member("E", "gold3"),
    member("F", "gold2"),
  ]);

  assert.equal(candidates.length, 3);
  assert.ok(candidates[0].scoreDiff <= candidates[1].scoreDiff);
  assert.ok(candidates[1].scoreDiff <= candidates[2].scoreDiff);
});
