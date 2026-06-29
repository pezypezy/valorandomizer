import { setRequestLocale } from "next-intl/server";
import { TeamRoomView } from "@/components/TeamRoomView";
import { getTeamRoom } from "@/lib/team-rooms";

export const dynamic = "force-dynamic";

export default async function TeamRoomPage({
  params,
}: {
  params: Promise<{ locale: string; roomId: string }>;
}) {
  const { locale, roomId } = await params;
  setRequestLocale(locale);

  return <TeamRoomView initialRoom={getTeamRoom(roomId)} locale={locale} roomId={roomId} />;
}
