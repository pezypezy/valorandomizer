import { NextResponse } from "next/server";
import { getTeamRoom } from "@/lib/team-rooms";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;
  const room = getTeamRoom(roomId);
  if (!room) {
    return NextResponse.json({ error: "room_not_found" }, { status: 404 });
  }

  return NextResponse.json(room);
}
