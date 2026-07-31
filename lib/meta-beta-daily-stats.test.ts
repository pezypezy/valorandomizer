import assert from "node:assert/strict";
import test from "node:test";
import { teamRowsToDailyStats } from "./meta-beta/daily-stats";

const compA = JSON.stringify(["Jett", "Sova", "KAY/O", "Omen", "Killjoy"]);
const compB = JSON.stringify(["Raze", "Gekko", "Breach", "Brimstone", "Cypher"]);

test("daily stats create rank-specific and All buckets", () => {
  const stats = teamRowsToDailyStats([
    {
      patch: "12.08",
      map_id: "Ascent",
      rank_bucket: "Ascendant",
      comp_key: "comp-a",
      agents_json: compA,
      won: 1,
      rounds_won: 13,
      rounds_lost: 8,
      eligible_for_recommendation: 1,
    },
    {
      patch: "12.08",
      map_id: "Ascent",
      rank_bucket: "Ascendant",
      comp_key: "comp-b",
      agents_json: compB,
      won: 0,
      rounds_won: 8,
      rounds_lost: 13,
      eligible_for_recommendation: 1,
    },
  ], "2026-07-31", "jp");

  assert.equal(stats.length, 4);
  const rankCompA = stats.find((stat) => stat.rankBucket === "Ascendant" && stat.compKey === "comp-a");
  const allCompA = stats.find((stat) => stat.rankBucket === "All" && stat.compKey === "comp-a");
  assert.ok(rankCompA);
  assert.ok(allCompA);
  assert.equal(rankCompA.pickRate, 0.5);
  assert.equal(rankCompA.rawWinRate, 1);
});

test("average agent pick rate reflects agent popularity in the scope", () => {
  const stats = teamRowsToDailyStats([
    {
      patch: "12.08",
      map_id: "Ascent",
      rank_bucket: "Diamond",
      comp_key: "comp-a",
      agents_json: compA,
      won: 1,
      rounds_won: 13,
      rounds_lost: 10,
      eligible_for_recommendation: 1,
    },
    {
      patch: "12.08",
      map_id: "Ascent",
      rank_bucket: "Diamond",
      comp_key: "comp-a",
      agents_json: compA,
      won: 0,
      rounds_won: 10,
      rounds_lost: 13,
      eligible_for_recommendation: 1,
    },
    {
      patch: "12.08",
      map_id: "Ascent",
      rank_bucket: "Diamond",
      comp_key: "comp-b",
      agents_json: compB,
      won: 1,
      rounds_won: 13,
      rounds_lost: 6,
      eligible_for_recommendation: 1,
    },
  ], "2026-07-31", "jp");

  const comp = stats.find((stat) => stat.rankBucket === "Diamond" && stat.compKey === "comp-a");
  assert.ok(comp);
  assert.equal(comp.matchCount, 2);
  assert.equal(comp.pickRate, 2 / 3);
  assert.ok(comp.averageAgentPickRate >= 2 / 3);
});
