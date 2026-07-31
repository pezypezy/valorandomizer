import assert from "node:assert/strict";
import test from "node:test";
import { AGENTS } from "./agents";
import { normalizeRiotMatch, rankBucketFromTier } from "./meta-beta/normalize-match";

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

test("competitive tiers map to rank buckets", () => {
  assert.equal(rankBucketFromTier(3), "Iron");
  assert.equal(rankBucketFromTier(19), "Diamond");
  assert.equal(rankBucketFromTier(22), "Ascendant");
  assert.equal(rankBucketFromTier(27), "Radiant");
  assert.equal(rankBucketFromTier(0), null);
});

test("Riot match payload normalizes without storing player identity", () => {
  const normalized = normalizeRiotMatch({
    matchInfo: {
      matchId: "match-1",
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
  }, {
    datasetRegion: "jp",
    resolveMapName: (mapId) => mapId === "map-ascent" ? "Ascent" : null,
  });

  assert.ok(normalized);
  assert.equal(normalized.mapId, "Ascent");
  assert.equal(normalized.patch, "12.08");
  assert.equal(normalized.teams.length, 2);
  assert.equal(normalized.teams[0].rankBucket, "Ascendant");
  assert.equal(normalized.teams[0].eligibleForRecommendation, true);
  assert.equal("puuid" in normalized.teams[0], false);
});

test("role-collapse compositions remain storable but are recommendation-ineligible", () => {
  const duelists = ["Jett", "Raze", "Yoru", "Reyna", "Neon"];
  const normalized = normalizeRiotMatch({
    matchInfo: {
      matchId: "match-2",
      mapId: "Ascent",
      gameStartMillis: 1_775_000_000_000,
      queueId: "competitive",
      gameVersion: "release-12.08-shipping",
    },
    players: [
      ...duelists.map((name) => player("Blue", name, 16)),
      player("Red", "Jett", 16),
      player("Red", "Sova", 16),
      player("Red", "KAY/O", 16),
      player("Red", "Omen", 16),
      player("Red", "Killjoy", 16),
    ],
    teams: [
      { teamId: "Blue", won: false, roundsPlayed: 18, roundsWon: 5 },
      { teamId: "Red", won: true, roundsPlayed: 18, roundsWon: 13 },
    ],
  }, { datasetRegion: "jp" });

  assert.ok(normalized);
  assert.equal(normalized.teams[0].eligibleForRecommendation, false);
  assert.match(normalized.teams[0].exclusionReason ?? "", /no-controller/);
});

test("non-competitive and remake-like matches are excluded", () => {
  assert.equal(normalizeRiotMatch({
    matchInfo: {
      matchId: "match-3",
      mapId: "Ascent",
      gameStartMillis: 1_775_000_000_000,
      queueId: "unrated",
      gameVersion: "12.08",
    },
    players: [],
    teams: [],
  }, { datasetRegion: "jp" }), null);
});
