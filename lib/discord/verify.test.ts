import assert from "node:assert/strict";
import test from "node:test";
import { verifyDiscordRequest } from "./verify";

const encoder = new TextEncoder();

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function createSignedRequest(body: string, timestamp: string) {
  const keyPair = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  const publicKey = new Uint8Array(await crypto.subtle.exportKey("raw", keyPair.publicKey));
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "Ed25519" },
      keyPair.privateKey,
      encoder.encode(`${timestamp}${body}`),
    ),
  );

  return {
    publicKeyHex: bytesToHex(publicKey),
    signatureHex: bytesToHex(signature),
  };
}

test("Discord signature verification accepts a valid request", async () => {
  const body = JSON.stringify({ type: 2, data: { name: "valorandom" } });
  const timestamp = "1785494547";
  const signed = await createSignedRequest(body, timestamp);

  assert.equal(
    await verifyDiscordRequest(body, signed.signatureHex, timestamp, signed.publicKeyHex),
    true,
  );
});

test("Discord signature verification rejects a modified body", async () => {
  const body = JSON.stringify({ type: 2, data: { name: "valorandom" } });
  const timestamp = "1785494547";
  const signed = await createSignedRequest(body, timestamp);

  assert.equal(
    await verifyDiscordRequest(`${body} `, signed.signatureHex, timestamp, signed.publicKeyHex),
    false,
  );
});

test("Discord signature verification tolerates pasted surrounding whitespace", async () => {
  const body = JSON.stringify({ type: 1 });
  const timestamp = "1785494547";
  const signed = await createSignedRequest(body, timestamp);

  assert.equal(
    await verifyDiscordRequest(
      body,
      `  ${signed.signatureHex}\n`,
      timestamp,
      `\n${signed.publicKeyHex}  `,
    ),
    true,
  );
});

test("Discord signature verification rejects missing or malformed inputs", async () => {
  assert.equal(await verifyDiscordRequest("{}", null, "1", "00".repeat(32)), false);
  assert.equal(await verifyDiscordRequest("{}", "zz", "1", "00".repeat(32)), false);
  assert.equal(await verifyDiscordRequest("{}", "00".repeat(64), "1", "00".repeat(31)), false);
});
