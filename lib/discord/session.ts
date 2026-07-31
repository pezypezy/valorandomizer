import type { DiscordSessionPayload } from "./types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const IV_LENGTH = 12;
const MAX_TOKEN_LENGTH = 4096;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function importSessionKey(secret: string): Promise<CryptoKey> {
  if (secret.length < 32) {
    throw new Error("DISCORD_SESSION_SECRET must be at least 32 characters");
  }

  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function isSessionPayload(value: unknown): value is DiscordSessionPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    payload.v === 1 &&
    (payload.mode === "random" || payload.mode === "pro") &&
    typeof payload.applicationId === "string" &&
    typeof payload.interactionToken === "string" &&
    typeof payload.guildId === "string" &&
    typeof payload.channelId === "string" &&
    typeof payload.userId === "string" &&
    typeof payload.displayName === "string" &&
    (payload.locale === "ja" || payload.locale === "en" || payload.locale === "ko") &&
    typeof payload.expiresAt === "number" &&
    Number.isFinite(payload.expiresAt)
  );
}

export async function sealDiscordSession(payload: DiscordSessionPayload, secret: string): Promise<string> {
  const key = await importSessionKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const plaintext = encoder.encode(JSON.stringify(payload));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext));
  const token = new Uint8Array(iv.length + encrypted.length);
  token.set(iv, 0);
  token.set(encrypted, iv.length);
  return bytesToBase64Url(token);
}

export async function openDiscordSession(token: string, secret: string): Promise<DiscordSessionPayload | null> {
  if (!token || token.length > MAX_TOKEN_LENGTH) return null;

  try {
    const bytes = base64UrlToBytes(token);
    if (bytes.length <= IV_LENGTH) return null;

    const iv = bytes.slice(0, IV_LENGTH);
    const ciphertext = bytes.slice(IV_LENGTH);
    const key = await importSessionKey(secret);
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    const parsed: unknown = JSON.parse(decoder.decode(plaintext));
    return isSessionPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
