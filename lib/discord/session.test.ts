import assert from "node:assert/strict";
import test from "node:test";
import { openDiscordSession, sealDiscordSession } from "./session";
import type { DiscordSessionPayload } from "./types";

const secret = "test-secret-that-is-definitely-longer-than-32-characters";
const payload: DiscordSessionPayload = {
  v: 1,
  mode: "random",
  applicationId: "application-id",
  interactionToken: "interaction-token",
  guildId: "guild-id",
  channelId: "channel-id",
  userId: "user-id",
  displayName: "Tester",
  locale: "ja",
  expiresAt: Date.now() + 60_000,
};

test("Discord session token round-trips", async () => {
  const token = await sealDiscordSession(payload, secret);
  assert.match(token, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(await openDiscordSession(token, secret), payload);
});

test("Discord session token rejects tampering", async () => {
  const token = await sealDiscordSession(payload, secret);
  const replacement = token.endsWith("A") ? "B" : "A";
  assert.equal(await openDiscordSession(`${token.slice(0, -1)}${replacement}`, secret), null);
});
