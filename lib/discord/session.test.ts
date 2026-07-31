import assert from "node:assert/strict";
import test from "node:test";
import { openDiscordSession, sealDiscordSession } from "./session";
import type { DiscordSessionPayload } from "./types";

const secret = "test-secret-that-is-definitely-longer-than-32-characters";
const encoder = new TextEncoder();
const payload: DiscordSessionPayload = {
  v: 1,
  mode: "random",
  applicationId: "1532626911568728094",
  interactionToken: "interaction-token",
  userId: "1234567890123456789",
  locale: "ja",
  expiresAt: Date.now() + 60_000,
};

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sealLegacySession(payloadToSeal: Required<DiscordSessionPayload>): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  const key = await crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const legacy = [
    1,
    payloadToSeal.mode === "random" ? "r" : "p",
    payloadToSeal.applicationId,
    payloadToSeal.interactionToken,
    payloadToSeal.guildId,
    payloadToSeal.channelId,
    payloadToSeal.userId,
    payloadToSeal.displayName,
    payloadToSeal.locale,
    payloadToSeal.expiresAt,
  ];
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(JSON.stringify(legacy))),
  );
  const token = new Uint8Array(iv.length + encrypted.length);
  token.set(iv, 0);
  token.set(encrypted, iv.length);
  return bytesToBase64Url(token);
}

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

test("Discord session fits within a 512-character button URL with a 300-character interaction token", async () => {
  const realistic: DiscordSessionPayload = {
    ...payload,
    interactionToken: "x".repeat(300),
  };
  const token = await sealDiscordSession(realistic, secret);
  const url = `https://valo-randomizer.com/ja/discord/${token}`;
  assert.ok(url.length <= 512, `URL length was ${url.length}`);
});

test("Discord session reader remains compatible with legacy links", async () => {
  const legacyPayload: Required<DiscordSessionPayload> = {
    ...payload,
    guildId: "1148945042510196806",
    channelId: "1234567890123456789",
    displayName: "Tester",
  };
  const token = await sealLegacySession(legacyPayload);
  assert.deepEqual(await openDiscordSession(token, secret), legacyPayload);
});
