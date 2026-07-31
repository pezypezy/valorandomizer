import { NextResponse } from "next/server";
import { getDiscordEnv } from "@/lib/discord/env";
import { sealDiscordSession } from "@/lib/discord/session";
import type { DiscordCommandMode, DiscordSessionPayload } from "@/lib/discord/types";
import { verifyDiscordRequest } from "@/lib/discord/verify";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

const SESSION_TTL_MS = 14 * 60 * 1000;
const EPHEMERAL = 1 << 6;

type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
};

type DiscordInteraction = {
  type: number;
  application_id: string;
  token: string;
  guild_id?: string;
  channel_id?: string;
  locale?: string;
  member?: { nick?: string | null; user?: DiscordUser };
  user?: DiscordUser;
  data?: { name?: string };
};

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

function ephemeral(content: string) {
  return jsonResponse({ type: 4, data: { content, flags: EPHEMERAL } });
}

function resolveLocale(value?: string): DiscordSessionPayload["locale"] {
  const normalized = value?.toLowerCase() ?? "";
  if (normalized.startsWith("ja")) return "ja";
  if (normalized.startsWith("ko")) return "ko";
  return "en";
}

function resolveMode(command?: string): DiscordCommandMode | null {
  if (command === "valorandom") return "random";
  if (command === "valopropick") return "pro";
  return null;
}

const COPY = {
  ja: {
    random: "Webでランダム構成を作成してください。リンクは約14分で期限切れになります。",
    pro: "Webでプロ構成を抽選してください。リンクは約14分で期限切れになります。",
    button: "Webで構成を作る",
    denied: "このDiscordサーバーではまだ利用できません。",
    invalid: "このコマンドは利用できません。",
  },
  en: {
    random: "Create the random composition on the web. This link expires in about 14 minutes.",
    pro: "Draw the pro composition on the web. This link expires in about 14 minutes.",
    button: "Create on the web",
    denied: "This Discord server is not allowed yet.",
    invalid: "This command is not available.",
  },
  ko: {
    random: "웹에서 랜덤 조합을 만들어 주세요. 링크는 약 14분 후 만료됩니다.",
    pro: "웹에서 프로 조합을 추첨해 주세요. 링크는 약 14분 후 만료됩니다.",
    button: "웹에서 조합 만들기",
    denied: "이 Discord 서버에서는 아직 사용할 수 없습니다.",
    invalid: "이 명령어는 사용할 수 없습니다.",
  },
} as const;

export async function POST(request: Request) {
  const env = getDiscordEnv();
  if (!env.DISCORD_PUBLIC_KEY || !env.DISCORD_SESSION_SECRET) {
    return jsonResponse({ error: "Discord integration is not configured" }, 500);
  }

  const body = await request.text();
  const verified = await verifyDiscordRequest(
    body,
    request.headers.get("x-signature-ed25519"),
    request.headers.get("x-signature-timestamp"),
    env.DISCORD_PUBLIC_KEY,
  );
  if (!verified) return jsonResponse({ error: "Invalid request signature" }, 401);

  let interaction: DiscordInteraction;
  try {
    interaction = JSON.parse(body) as DiscordInteraction;
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  if (interaction.type === 1) return jsonResponse({ type: 1 });
  if (interaction.type !== 2) return ephemeral("Unsupported interaction type.");

  const locale = resolveLocale(interaction.locale);
  const copy = COPY[locale];
  const mode = resolveMode(interaction.data?.name);
  if (!mode) return ephemeral(copy.invalid);

  if (!interaction.guild_id || !interaction.channel_id) return ephemeral(copy.denied);
  if (env.DISCORD_ALLOWED_GUILD_ID && interaction.guild_id !== env.DISCORD_ALLOWED_GUILD_ID) {
    return ephemeral(copy.denied);
  }

  const user = interaction.member?.user ?? interaction.user;
  if (!user) return ephemeral(copy.invalid);

  const session: DiscordSessionPayload = {
    v: 1,
    mode,
    applicationId: interaction.application_id,
    interactionToken: interaction.token,
    guildId: interaction.guild_id,
    channelId: interaction.channel_id,
    userId: user.id,
    displayName: interaction.member?.nick || user.global_name || user.username,
    locale,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };

  const token = await sealDiscordSession(session, env.DISCORD_SESSION_SECRET);
  const url = `${SITE_URL}/${locale}/discord/${encodeURIComponent(token)}`;

  return jsonResponse({
    type: 4,
    data: {
      content: mode === "random" ? copy.random : copy.pro,
      flags: EPHEMERAL,
      components: [
        {
          type: 1,
          components: [{ type: 2, style: 5, label: copy.button, url }],
        },
      ],
    },
  });
}
