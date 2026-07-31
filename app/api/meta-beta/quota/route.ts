import { NextResponse } from "next/server";
import { getD1Database, getMetaBetaSession } from "@/lib/meta-beta/auth";
import { getAiQuotaStatus } from "@/lib/meta-beta/quota";

export async function GET() {
  const session = await getMetaBetaSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const quota = await getAiQuotaStatus(getD1Database(), session.nonce);
    return NextResponse.json(quota, {
      headers: {
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("Meta beta quota query failed", error);
    return NextResponse.json({
      configured: false,
      usageDate: new Date().toISOString().slice(0, 10),
      resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      globalLimit: 150,
      globalUsed: null,
      globalRemaining: null,
      sessionLimit: 20,
      sessionUsed: null,
      sessionRemaining: null,
    });
  }
}
