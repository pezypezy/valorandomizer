import { NextResponse } from "next/server";
import { createTeamRoom } from "@/lib/team-rooms";

export function POST() {
  const room = createTeamRoom();
  return NextResponse.json(room);
}
