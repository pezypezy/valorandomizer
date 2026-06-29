import { NextResponse } from "next/server";
import { removeParticipant } from "@/lib/team-rooms";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ roomId: string; participantId: string }> },
) {
  const { roomId, participantId } = await params;
  const removed = removeParticipant(roomId, participantId);
  if (!removed) {
    return NextResponse.json({ error: "participant_not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
