import type { DiscordSessionPayload } from "./types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const IV_LENGTH = 12;
const MAX_TOKEN_LENGTH = 1024;

type CompactSession = [
  1,
  "r" | "p",
  string,
  string,
  string,
  string,
  string,
  string,
  "ja" | "en" | "ko",
  number,
];

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

function serializeSession(payload: DiscordSessionPayload): CompactSession {
  return [
    1,
    payload.mode === "random" ? "r" : "p",
    payload.applicationId,
    payload.interactionToken,
    payload.guildId,
    payload.channelId,
    payload.userId,
    payload.displayName,
    payload.locale,
    payload.expiresAt,
  ];
}

function deserializeSession(value: unknown): DiscordSessionPayload | null {
  if (!Array.isArray(value) || value.length !== 10) return null;
  const [version, mode, applicationId, interactionToken, guildId, channelId, userId, displayName, locale, expiresAt] = value;
  if (
    version !== 1 ||
    (mode !== "r" && mode !== "p") ||
    typeof applicationId !== "string" ||
    typeof interactionToken !== "string" ||
    typeof guildId !== "string" ||
    typeof channelId !== "string" ||
    typeof userId !== "string" ||
    typeof displayName !== "string" ||
    (locale !== "ja" && locale !== "en" && locale !== "ko") ||
    typeof expiresAt !== "number" ||
    !Number.isFinite(expiresAt)
  ) {
    return null;
  }

  return {
    v: 1,
    mode: mode === "r" ? "random" : "pro",
    applicationId,
    interactionToken,
    guildId,
    channelId,
    userId,
    displayName,
    locale,
    expiresAt,
  };
}

export async function sealDiscordSession(payload: DiscordSessionPayload, secret: string): Promise<string> {
  const key = await importSessionKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const plaintext = encoder.encode(JSON.stringify(serializeSession(payload)));
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
    return deserializeSession(JSON.parse(decoder.decode(plaintext)) as unknown);
  } catch {
    return null;
  }
}
