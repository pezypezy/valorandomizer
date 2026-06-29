import { NextResponse } from "next/server";
import { isRankValue } from "@/lib/team-balancer";
import { addParticipant } from "@/lib/team-rooms";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;
  const body = (await request.json()) as { name?: unknown; rank?: unknown };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const rank = typeof body.rank === "string" ? body.rank : "";

  if (name.length === 0 || name.length > 24 || !isRankValue(rank)) {
    return NextResponse.json({ error: "invalid_participant" }, { status: 400 });
  }

  const participant = addParticipant(roomId, { name, rank });
  if (!participant) {
    return NextResponse.json({ error: "room_not_found" }, { status: 404 });
  }

  return NextResponse.json(participant);
}
