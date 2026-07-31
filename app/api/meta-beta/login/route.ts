import { NextResponse } from "next/server";
import {
  createMetaBetaSessionToken,
  getLoginRateLimiter,
  getMetaBetaSecrets,
  META_BETA_COOKIE,
  secureSecretEquals,
} from "@/lib/meta-beta/auth";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function safeReturnTo(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "/ja/meta-beta";
  if (!/^\/(ja|en|ko)\/meta-beta(?:\/|$)/u.test(value) || value.startsWith("//")) {
    return "/ja/meta-beta";
  }
  return value;
}

function loginPathFor(returnTo: string): string {
  const locale = returnTo.split("/")[1];
  return `/${locale || "ja"}/meta-beta/login`;
}

function requestActorKey(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const submittedPassword = formData.get("password");
  const returnTo = safeReturnTo(formData.get("returnTo"));
  const loginPath = loginPathFor(returnTo);

  const limiter = getLoginRateLimiter();
  if (limiter) {
    const { success } = await limiter.limit({ key: `login:${requestActorKey(request)}` });
    if (!success) {
      return NextResponse.redirect(new URL(`${loginPath}?error=rate-limit`, request.url), 303);
    }
  }

  const secrets = getMetaBetaSecrets();
  if (!secrets) {
    return NextResponse.redirect(new URL(`${loginPath}?error=configuration`, request.url), 303);
  }

  if (
    typeof submittedPassword !== "string" ||
    !(await secureSecretEquals(submittedPassword, secrets.password))
  ) {
    return NextResponse.redirect(new URL(`${loginPath}?error=invalid`, request.url), 303);
  }

  const token = await createMetaBetaSessionToken(secrets.authSecret, SESSION_MAX_AGE);
  const response = NextResponse.redirect(new URL(returnTo, request.url), 303);
  response.cookies.set(META_BETA_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
