import { NextResponse } from "next/server";
import {
  createMetaBetaSessionToken,
  getLoginRateLimiter,
  getMetaBetaEnv,
  isMetaBetaAuthenticated,
  META_BETA_COOKIE,
  secureSecretEquals,
} from "@/lib/meta-beta/auth";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

type AccessRequest = {
  password?: unknown;
};

type MetaBetaSecretName = "META_BETA_PASSWORD" | "META_BETA_AUTH_SECRET";

type MetaBetaRuntimeEnv = {
  META_BETA_PASSWORD?: string;
  META_BETA_AUTH_SECRET?: string;
};

function requestActorKey(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function readRuntimeSecrets() {
  const env = getMetaBetaEnv() as MetaBetaRuntimeEnv;
  const password = env.META_BETA_PASSWORD?.trim() ?? "";
  const authSecret = env.META_BETA_AUTH_SECRET?.trim() ?? "";
  const missing: MetaBetaSecretName[] = [];

  if (!password) missing.push("META_BETA_PASSWORD");
  if (!authSecret) missing.push("META_BETA_AUTH_SECRET");

  return { password, authSecret, missing };
}

export async function GET() {
  const { missing } = readRuntimeSecrets();
  return json({
    authenticated: missing.length === 0 ? await isMetaBetaAuthenticated() : false,
    configured: missing.length === 0,
    missing,
  });
}

export async function POST(request: Request) {
  let input: AccessRequest;
  try {
    input = (await request.json()) as AccessRequest;
  } catch {
    return json({ ok: false, error: "invalid" }, 400);
  }

  const limiter = getLoginRateLimiter();
  if (limiter) {
    const { success } = await limiter.limit({ key: `login:${requestActorKey(request)}` });
    if (!success) return json({ ok: false, error: "rate-limit" }, 429);
  }

  const { password, authSecret, missing } = readRuntimeSecrets();
  if (missing.length > 0) {
    console.warn(`Meta beta authentication is missing runtime secrets: ${missing.join(", ")}`);
    return json({ ok: false, error: "configuration", missing }, 500);
  }

  if (
    typeof input.password !== "string" ||
    !(await secureSecretEquals(input.password, password))
  ) {
    return json({ ok: false, error: "invalid" }, 401);
  }

  const token = await createMetaBetaSessionToken(authSecret, SESSION_MAX_AGE);
  const response = json({ ok: true });
  response.cookies.set(META_BETA_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
