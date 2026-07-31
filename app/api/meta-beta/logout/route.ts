import { NextResponse } from "next/server";
import { META_BETA_COOKIE } from "@/lib/meta-beta/auth";

function safeReturnTo(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "/ja/meta-beta/login";
  if (!/^\/(ja|en|ko)\/meta-beta\/login$/u.test(value) || value.startsWith("//")) {
    return "/ja/meta-beta/login";
  }
  return value;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const returnTo = safeReturnTo(formData.get("returnTo"));
  const response = NextResponse.redirect(new URL(returnTo, request.url), 303);
  response.cookies.set(META_BETA_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
  return response;
}
