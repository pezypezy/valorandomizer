import { NextResponse } from "next/server";
import {
  createMetaBetaSessionToken,
  getLoginRateLimiter,
  getMetaBetaSecrets,
  isMetaBetaAuthenticated,
  META_BETA_COOKIE,
  secureSecretEquals,
} from "@/lib/meta-beta/auth";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

type AccessRequest = {
  password?: unknown;
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

export async function GET() {
  return json({ authenticated: await isMetaBetaAuthenticated() });
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

  const secrets = getMetaBetaSecrets();
  if (!secrets) return json({ ok: false, error: "configuration" }, 500);

  if (
    typeof input.password !== "string" ||
    !(await secureSecretEquals(input.password, secrets.password))
  ) {
    return json({ ok: false, error: "invalid" }, 401);
  }

  const token = await createMetaBetaSessionToken(secrets.authSecret, SESSION_MAX_AGE);
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
