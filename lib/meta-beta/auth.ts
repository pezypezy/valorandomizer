import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cookies } from "next/headers";

export const META_BETA_COOKIE = "valorandomizer_meta_beta";
const SESSION_VERSION = 1;
const DEFAULT_SESSION_SECONDS = 60 * 60 * 24 * 7;

type D1Value = string | number | null;

export interface WorkersAiBinding {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
}

export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface D1Result<T = Record<string, unknown>> {
  success?: boolean;
  results?: T[];
  meta?: {
    changes?: number;
    rows_read?: number;
    rows_written?: number;
  };
}

export interface D1PreparedStatement {
  bind(...values: D1Value[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(columnName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

export interface D1DatabaseBinding {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}

interface MetaBetaEnv {
  META_BETA_PASSWORD?: string;
  META_BETA_AUTH_SECRET?: string;
  AI?: WorkersAiBinding;
  DB?: D1DatabaseBinding;
  META_BETA_LOGIN_LIMITER?: RateLimitBinding;
  META_BETA_CHAT_LIMITER?: RateLimitBinding;
}

export interface MetaBetaSession {
  v: number;
  exp: number;
  nonce: string;
}

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function fromBase64Url(value: string): ArrayBuffer {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return buffer;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function getNodeFallbackEnv(): MetaBetaEnv {
  return {
    META_BETA_PASSWORD: process.env.META_BETA_PASSWORD,
    META_BETA_AUTH_SECRET: process.env.META_BETA_AUTH_SECRET,
  };
}

export function getMetaBetaEnv(): MetaBetaEnv {
  try {
    return getCloudflareContext().env as unknown as MetaBetaEnv;
  } catch {
    return getNodeFallbackEnv();
  }
}

export function getMetaBetaSecrets(): { password: string; authSecret: string } | null {
  const env = getMetaBetaEnv();
  const password = env.META_BETA_PASSWORD?.trim();
  const authSecret = env.META_BETA_AUTH_SECRET?.trim();
  if (!password || !authSecret) return null;
  return { password, authSecret };
}

export async function secureSecretEquals(left: string, right: string): Promise<boolean> {
  const [leftDigest, rightDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftDigest);
  const rightBytes = new Uint8Array(rightDigest);
  if (leftBytes.length !== rightBytes.length) return false;

  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

export async function createMetaBetaSessionToken(
  authSecret: string,
  maxAgeSeconds = DEFAULT_SESSION_SECONDS,
): Promise<string> {
  const payload: MetaBetaSession = {
    v: SESSION_VERSION,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
    nonce: crypto.randomUUID(),
  };
  const encodedPayload = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await importHmacKey(authSecret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(encodedPayload));
  return `${encodedPayload}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function readMetaBetaSessionToken(
  token: string,
  authSecret: string,
): Promise<MetaBetaSession | null> {
  const [encodedPayload, encodedSignature, ...extra] = token.split(".");
  if (!encodedPayload || !encodedSignature || extra.length > 0) return null;

  try {
    const key = await importHmacKey(authSecret);
    const signatureValid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(encodedSignature),
      encoder.encode(encodedPayload),
    );
    if (!signatureValid) return null;

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encodedPayload))) as MetaBetaSession;
    if (
      payload.v !== SESSION_VERSION ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= Date.now() / 1000 ||
      typeof payload.nonce !== "string" ||
      payload.nonce.length < 16
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function verifyMetaBetaSessionToken(token: string, authSecret: string): Promise<boolean> {
  return (await readMetaBetaSessionToken(token, authSecret)) !== null;
}

export async function getMetaBetaSession(): Promise<MetaBetaSession | null> {
  const secrets = getMetaBetaSecrets();
  if (!secrets) return null;
  const cookieStore = await cookies();
  const token = cookieStore.get(META_BETA_COOKIE)?.value;
  if (!token) return null;
  return readMetaBetaSessionToken(token, secrets.authSecret);
}

export async function isMetaBetaAuthenticated(): Promise<boolean> {
  return (await getMetaBetaSession()) !== null;
}

export function getWorkersAiBinding(): WorkersAiBinding | null {
  return getMetaBetaEnv().AI ?? null;
}

export function getD1Database(): D1DatabaseBinding | null {
  return getMetaBetaEnv().DB ?? null;
}

export function getLoginRateLimiter(): RateLimitBinding | null {
  return getMetaBetaEnv().META_BETA_LOGIN_LIMITER ?? null;
}

export function getChatRateLimiter(): RateLimitBinding | null {
  return getMetaBetaEnv().META_BETA_CHAT_LIMITER ?? null;
}
