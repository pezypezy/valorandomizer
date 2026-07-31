import { NextResponse } from "next/server";
import { getD1Database, isMetaBetaAuthenticated } from "@/lib/meta-beta/auth";
import { getCollectionStatus } from "@/lib/meta-beta/collection-status";

export async function GET() {
  if (!(await isMetaBetaAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const status = await getCollectionStatus(getD1Database());
  return NextResponse.json(status, {
    status: status.error ? 500 : 200,
    headers: { "cache-control": "no-store" },
  });
}
