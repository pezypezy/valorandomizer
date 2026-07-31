import type { DiscordSessionPayload } from "./types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const IV_LENGTH = 12;
const MAX_TOKEN_LENGTH = 1024;
const BINARY_VERSION = 2;
const BINARY_HEADER_LENGTH = 26;

type LegacyCompactSession = [
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

function localeToCode(locale: DiscordSessionPayload["locale"]): number {
  if (locale === "ja") return 0;
  if (locale === "ko") return 2;
  return 1;
}

function codeToLocale(code: number): DiscordSessionPayload["locale"] | null {
  if (code === 0) return "ja";
  if (code === 1) return "en";
  if (code === 2) return "ko";
  return null;
}

function serializeSession(payload: DiscordSessionPayload): Uint8Array {
  if (!/^\d+$/.test(payload.applicationId) || !/^\d+$/.test(payload.userId)) {
    throw new Error("Discord session contains an invalid snowflake ID");
  }

  const interactionToken = encoder.encode(payload.interactionToken);
  const bytes = new Uint8Array(BINARY_HEADER_LENGTH + interactionToken.length);
  const view = new DataView(bytes.buffer);
  const flags = (payload.mode === "pro" ? 1 : 0) | (localeToCode(payload.locale) << 1);

  bytes[0] = BINARY_VERSION;
  bytes[1] = flags;
  view.setBigUint64(2, BigInt(payload.applicationId), false);
  view.setBigUint64(10, BigInt(payload.userId), false);
  view.setBigUint64(18, BigInt(Math.trunc(payload.expiresAt)), false);
  bytes.set(interactionToken, BINARY_HEADER_LENGTH);
  return bytes;
}

function deserializeBinarySession(bytes: Uint8Array): DiscordSessionPayload | null {
  if (bytes.length <= BINARY_HEADER_LENGTH || bytes[0] !== BINARY_VERSION) return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const flags = bytes[1];
  const locale = codeToLocale((flags >> 1) & 0b11);
  if (!locale || (flags & 0b11111000) !== 0) return null;

  const interactionToken = decoder.decode(bytes.slice(BINARY_HEADER_LENGTH));
  if (!interactionToken) return null;

  const expiresAtBigInt = view.getBigUint64(18, false);
  if (expiresAtBigInt > BigInt(Number.MAX_SAFE_INTEGER)) return null;

  return {
    v: 1,
    mode: (flags & 1) === 1 ? "pro" : "random",
    applicationId: view.getBigUint64(2, false).toString(),
    interactionToken,
    userId: view.getBigUint64(10, false).toString(),
    locale,
    expiresAt: Number(expiresAtBigInt),
  };
}

function deserializeLegacySession(value: unknown): DiscordSessionPayload | null {
  if (!Array.isArray(value) || value.length !== 10) return null;
  const [version, mode, applicationId, interactionToken, guildId, channelId, userId, displayName, locale, expiresAt] = value as LegacyCompactSession;
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

function deserializeSession(plaintext: ArrayBuffer): DiscordSessionPayload | null {
  const bytes = new Uint8Array(plaintext);
  if (bytes[0] === BINARY_VERSION) return deserializeBinarySession(bytes);

  try {
    return deserializeLegacySession(JSON.parse(decoder.decode(bytes)) as unknown);
  } catch {
    return null;
  }
}

export async function sealDiscordSession(payload: DiscordSessionPayload, secret: string): Promise<string> {
  const key = await importSessionKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const plaintext = serializeSession(payload);
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
    return deserializeSession(plaintext);
  } catch {
    return null;
  }
}
