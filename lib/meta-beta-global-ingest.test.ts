import assert from "node:assert/strict";
import test from "node:test";
import { AGENTS } from "./agents";
import {
  GLOBAL_META_REGION,
  normalizeGlobalRankedBatch,
  normalizeServerCluster,
  shardGroupForRoute,
  type GlobalRankedBatch,
} from "./meta-beta/global-ingest";

function agentId(name: string): string {
  const agent = AGENTS.find((candidate) => candidate.name === name);
  if (!agent) throw new Error(`Missing test agent: ${name}`);
  return agent.id;
}

function player(teamId: string, name: string, competitiveTier: number) {
  return {
    puuid: crypto.randomUUID(),
    teamId,
    characterId: agentId(name),
    competitiveTier,
  };
}

function competitivePayload(matchId = "global-match-1") {
  return {
    matchInfo: {
      matchId,
      mapId: "map-ascent",
      gameStartMillis: 1_775_000_000_000,
      gameLengthMillis: 2_100_000,
      queueId: "competitive",
      gameVersion: "release-12.08-shipping-12-08-123456",
    },
    players: [
      player("Blue", "Jett", 22),
      player("Blue", "Sova", 21),
      player("Blue", "KAY/O", 22),
      player("Blue", "Omen", 23),
      player("Blue", "Killjoy", 22),
      player("Red", "Raze", 22),
      player("Red", "Gekko", 21),
      player("Red", "Breach", 22),
      player("Red", "Brimstone", 21),
      player("Red", "Cypher", 22),
    ],
    teams: [
      { teamId: "Blue", won: true, roundsPlayed: 21, roundsWon: 13 },
      { teamId: "Red", won: false, roundsPlayed: 21, roundsWon: 8 },
    ],
  };
}

test("global ranked batches normalize route, group and server cluster", () => {
  const batch: GlobalRankedBatch = {
    source: "licensed-match-feed",
    fetchedAt: 1_775_000_100,
    matches: [{ route: "ap", serverCluster: " Tokyo ", payload: competitivePayload() }],
  };

  const result = normalizeGlobalRankedBatch(batch, {
    resolveMapName: (mapId) => mapId === "map-ascent" ? "Ascent" : null,
  });

  assert.equal(result.payloadMatches, 1);
  assert.equal(result.rejectedMatches, 0);
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].route, "ap");
  assert.equal(result.matches[0].shardGroup, "ap");
  assert.equal(result.matches[0].serverCluster, "tokyo");
  assert.equal(result.matches[0].match.region, GLOBAL_META_REGION);
  assert.equal(result.matches[0].match.mapId, "Ascent");
  assert.equal(result.matches[0].match.teams[0].rankBucket, "Ascendant");
  assert.equal("puuid" in result.matches[0].match.teams[0], false);
});

test("americas routes share one shard group", () => {
  assert.equal(shardGroupForRoute("na"), "americas");
  assert.equal(shardGroupForRoute("latam"), "americas");
  assert.equal(shardGroupForRoute("br"), "americas");
  assert.equal(shardGroupForRoute("eu"), "eu");
});

test("missing or unsafe cluster labels become stable keys", () => {
  assert.equal(normalizeServerCluster(null), "unknown");
  assert.equal(normalizeServerCluster("US Central (Illinois)"), "us-central-illinois");
  assert.equal(normalizeServerCluster("  "), "unknown");
});

test("global ranked batches reject unusable matches without inventing statistics", () => {
  const payload = competitivePayload("unrated-match");
  payload.matchInfo.queueId = "unrated";

  const result = normalizeGlobalRankedBatch({
    source: "licensed-match-feed",
    fetchedAt: 1_775_000_100,
    matches: [{ route: "eu", serverCluster: "London", payload }],
  }, {
    resolveMapName: () => "Ascent",
  });

  assert.equal(result.matches.length, 0);
  assert.equal(result.rejectedMatches, 1);
});

test("global ranked batches require a stable source identifier", () => {
  assert.throws(() => normalizeGlobalRankedBatch({
    source: "Third Party Feed",
    fetchedAt: 1_775_000_100,
    matches: [{ route: "na", payload: competitivePayload() }],
  }), /source/u);
});
