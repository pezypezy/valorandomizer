import assert from "node:assert/strict";
import test from "node:test";
import { RiotApiError, RiotValorantApiClient } from "./meta-beta/riot-client";

test("Riot client calls the documented matchlist path with a server-side token", async () => {
  let requestedUrl = "";
  let riotToken = "";
  const client = new RiotValorantApiClient({
    baseUrl: "https://example.api.riotgames.com",
    apiKey: "secret",
    fetcher: async (input, init) => {
      requestedUrl = String(input);
      riotToken = new Headers(init?.headers).get("X-Riot-Token") ?? "";
      return new Response(JSON.stringify({ history: [{ matchId: "match-1" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });

  const response = await client.getMatchlistByPuuid("player/id");
  assert.equal(requestedUrl, "https://example.api.riotgames.com/val/match/v1/matchlists/by-puuid/player%2Fid");
  assert.equal(riotToken, "secret");
  assert.equal(response.history[0].matchId, "match-1");
});

test("Riot client parses content map aliases", async () => {
  const client = new RiotValorantApiClient({
    baseUrl: "https://example.api.riotgames.com",
    apiKey: "secret",
    fetcher: async () => new Response(JSON.stringify({
      version: "12.08",
      maps: [
        { id: "map-ascent", name: "Ascent", assetName: "Ascent" },
        { id: 123, name: "Malformed" },
      ],
    }), { status: 200, headers: { "content-type": "application/json" } }),
  });

  const content = await client.getContent("en-US");
  assert.equal(content.version, "12.08");
  assert.deepEqual(content.maps, [{ id: "map-ascent", name: "Ascent", assetName: "Ascent" }]);
});

test("Riot client exposes Retry-After on rate-limit errors", async () => {
  const client = new RiotValorantApiClient({
    baseUrl: "https://example.api.riotgames.com",
    apiKey: "secret",
    fetcher: async () => new Response("", { status: 429, headers: { "retry-after": "17" } }),
  });

  await assert.rejects(
    () => client.getMatchById("match-1"),
    (error: unknown) => error instanceof RiotApiError && error.status === 429 && error.retryAfterSeconds === 17,
  );
});

test("Riot client rejects non-HTTPS base URLs", () => {
  assert.throws(() => new RiotValorantApiClient({
    baseUrl: "http://example.test",
    apiKey: "secret",
  }));
});
