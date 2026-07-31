import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cookies } from "next/headers";

export const META_BETA_COOKIE = "valorandomizer_meta_beta";
const SESSION_VERSION = 1;
const DEFAULT_SESSION_SECONDS = 60 * 60 * 24 * 7;

export interface WorkersAiBinding {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
}

interface MetaBetaEnv {
  META_BETA_PASSWORD?: string;
  META_BETA_AUTH_SECRET?: string;
  AI?: WorkersAiBinding;
}

interface SessionPayload {
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

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
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
  const payload: SessionPayload = {
    v: SESSION_VERSION,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
    nonce: crypto.randomUUID(),
  };
  const encodedPayload = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await importHmacKey(authSecret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(encodedPayload));
  return `${encodedPayload}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifyMetaBetaSessionToken(token: string, authSecret: string): Promise<boolean> {
  const [encodedPayload, encodedSignature, ...extra] = token.split(".");
  if (!encodedPayload || !encodedSignature || extra.length > 0) return false;

  try {
    const key = await importHmacKey(authSecret);
    const signatureValid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(encodedSignature),
      encoder.encode(encodedPayload),
    );
    if (!signatureValid) return false;

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encodedPayload))) as SessionPayload;
    return payload.v === SESSION_VERSION && Number.isFinite(payload.exp) && payload.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

export async function isMetaBetaAuthenticated(): Promise<boolean> {
  const secrets = getMetaBetaSecrets();
  if (!secrets) return false;
  const cookieStore = await cookies();
  const token = cookieStore.get(META_BETA_COOKIE)?.value;
  if (!token) return false;
  return verifyMetaBetaSessionToken(token, secrets.authSecret);
}

export function getWorkersAiBinding(): WorkersAiBinding | null {
  return getMetaBetaEnv().AI ?? null;
}
