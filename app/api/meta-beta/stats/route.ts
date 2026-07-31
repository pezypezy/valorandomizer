import { NextResponse } from "next/server";
import { getD1Database, isMetaBetaAuthenticated } from "@/lib/meta-beta/auth";
import { getMetaStats, isAllowedMap, isAllowedRank } from "@/lib/meta-beta/stats";

export async function GET(request: Request) {
  if (!(await isMetaBetaAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const mapParam = url.searchParams.get("map");
  const rankParam = url.searchParams.get("rank");
  const map = isAllowedMap(mapParam) ? mapParam : "Ascent";
  const rank = isAllowedRank(rankParam) ? rankParam : "Ascendant";
  const stats = await getMetaStats(getD1Database(), map, rank);

  return NextResponse.json(stats, {
    headers: {
      "cache-control": "private, max-age=60",
    },
  });
}
