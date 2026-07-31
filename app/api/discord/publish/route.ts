import { NextResponse } from "next/server";
import { getDiscordEnv } from "@/lib/discord/env";
import { buildDiscordWebhookMessage } from "@/lib/discord/message";
import { openDiscordSession } from "@/lib/discord/session";
import type { DiscordPublishResult } from "@/lib/discord/types";

export const dynamic = "force-dynamic";

type PublishRequest = {
  token?: unknown;
  result?: unknown;
};

type DiscordMessageResponse = {
  id?: string;
  guild_id?: string;
  channel_id?: string;
};

function isPublishResult(value: unknown): value is DiscordPublishResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  if (result.kind === "random") {
    return Array.isArray(result.agentIds) && result.agentIds.every((id) => typeof id === "string");
  }
  if (result.kind === "pro") {
    return Array.isArray(result.pickIds) && result.pickIds.every((id) => typeof id === "string");
  }
  return false;
}

export async function POST(request: Request) {
  const env = getDiscordEnv();
  if (!env.DISCORD_SESSION_SECRET) {
    return NextResponse.json({ error: "Discord integration is not configured" }, { status: 500 });
  }

  let input: PublishRequest;
  try {
    input = (await request.json()) as PublishRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof input.token !== "string" || !isPublishResult(input.result)) {
    return NextResponse.json({ error: "Invalid publish request" }, { status: 400 });
  }

  const session = await openDiscordSession(input.token, env.DISCORD_SESSION_SECRET);
  if (!session) return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  if (Date.now() >= session.expiresAt) {
    return NextResponse.json({ error: "Session expired" }, { status: 410 });
  }

  const message = buildDiscordWebhookMessage(session, input.result);
  if (!message) return NextResponse.json({ error: "Invalid result" }, { status: 400 });

  const endpoint = `https://discord.com/api/v10/webhooks/${session.applicationId}/${session.interactionToken}?wait=true`;
  const discordResponse = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(message),
  });

  if (!discordResponse.ok) {
    const details = await discordResponse.text();
    console.error("Discord publish failed", discordResponse.status, details.slice(0, 1000));
    return NextResponse.json(
      { error: discordResponse.status === 401 || discordResponse.status === 404 ? "Session expired" : "Discord publish failed" },
      { status: discordResponse.status === 401 || discordResponse.status === 404 ? 410 : 502 },
    );
  }

  const posted = (await discordResponse.json()) as DiscordMessageResponse;
  const guildId = posted.guild_id ?? session.guildId;
  const channelId = posted.channel_id ?? session.channelId;
  const messageUrl = posted.id && guildId && channelId
    ? `https://discord.com/channels/${guildId}/${channelId}/${posted.id}`
    : null;

  return NextResponse.json({ ok: true, messageUrl });
}
