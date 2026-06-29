import type { TeamParticipant } from "./team-balancer";

export type TeamRoom = {
  id: string;
  createdAt: string;
  participants: TeamParticipant[];
};

declare global {
  var __valorandomizerTeamRooms: Map<string, TeamRoom> | undefined;
}

function rooms() {
  globalThis.__valorandomizerTeamRooms ??= new Map<string, TeamRoom>();
  return globalThis.__valorandomizerTeamRooms;
}

export function createTeamRoom() {
  const id = crypto.randomUUID().slice(0, 8);
  const room: TeamRoom = {
    id,
    createdAt: new Date().toISOString(),
    participants: [],
  };
  rooms().set(id, room);
  return room;
}

export function getTeamRoom(roomId: string) {
  return rooms().get(roomId) ?? null;
}

export function addParticipant(roomId: string, participant: Omit<TeamParticipant, "id" | "joinedAt">) {
  const room = getTeamRoom(roomId);
  if (!room) return null;

  const nextParticipant: TeamParticipant = {
    ...participant,
    id: crypto.randomUUID(),
    joinedAt: new Date().toISOString(),
  };
  room.participants.push(nextParticipant);
  return nextParticipant;
}

export function removeParticipant(roomId: string, participantId: string) {
  const room = getTeamRoom(roomId);
  if (!room) return false;

  const before = room.participants.length;
  room.participants = room.participants.filter((participant) => participant.id !== participantId);
  return room.participants.length !== before;
}
