import { AGENTS } from "@/lib/agents";
import { PRO_PICKS } from "@/lib/pro-picks";
import { ROLES } from "@/lib/roles";
import type { DiscordPublishResult, DiscordSessionPayload } from "./types";

const ROLE_LABELS = {
  ja: { Duelist: "デュエリスト", Initiator: "イニシエーター", Controller: "コントローラー", Sentinel: "センチネル" },
  en: { Duelist: "Duelist", Initiator: "Initiator", Controller: "Controller", Sentinel: "Sentinel" },
  ko: { Duelist: "타격대", Initiator: "척후대", Controller: "전략가", Sentinel: "감시자" },
} as const;

const CONTENT = {
  ja: {
    random: (userId: string) => `<@${userId}> がランダム構成を作成しました。`,
    pro: (userId: string, versus: boolean) => `<@${userId}> がプロ構成${versus ? "の対戦" : ""}を抽選しました。`,
  },
  en: {
    random: (userId: string) => `<@${userId}> generated a random composition.`,
    pro: (userId: string, versus: boolean) => `<@${userId}> generated a pro composition${versus ? " matchup" : ""}.`,
  },
  ko: {
    random: (userId: string) => `<@${userId}>님이 랜덤 조합을 만들었습니다.`,
    pro: (userId: string, versus: boolean) => `<@${userId}>님이 프로 조합${versus ? " 대결" : ""}을 추첨했습니다.`,
  },
} as const;

export type DiscordWebhookMessage = {
  content: string;
  embeds: Array<Record<string, unknown>>;
  allowed_mentions: { users: string[] };
  components: Array<Record<string, unknown>>;
};

function randomMessage(session: DiscordSessionPayload, agentIds: string[]): DiscordWebhookMessage | null {
  if (agentIds.length !== 5 || new Set(agentIds).size !== 5) return null;
  const byId = new Map(AGENTS.map((agent) => [agent.id, agent]));
  const agents = agentIds.map((id) => byId.get(id));
  if (agents.some((agent) => !agent)) return null;

  const fields = ROLES.map((role) => ({
    name: ROLE_LABELS[session.locale][role],
    value: agents.filter((agent) => agent?.role === role).map((agent) => agent?.name).join(" / ") || "-",
    inline: false,
  }));

  return {
    content: CONTENT[session.locale].random(session.userId),
    embeds: [
      {
        title: "VALORANDOMIZER — RANDOM PICK",
        color: 0xff4655,
        fields,
        footer: { text: "valo-randomizer.com" },
        timestamp: new Date().toISOString(),
      },
    ],
    allowed_mentions: { users: [session.userId] },
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: "Open Valorandomizer",
            url: `https://valo-randomizer.com/${session.locale}/random-pick`,
          },
        ],
      },
    ],
  };
}

function proMessage(session: DiscordSessionPayload, pickIds: string[]): DiscordWebhookMessage | null {
  if (pickIds.length < 1 || pickIds.length > 2 || new Set(pickIds).size !== pickIds.length) return null;
  const byId = new Map(PRO_PICKS.map((pick) => [pick.id, pick]));
  const picks = pickIds.map((id) => byId.get(id));
  if (picks.some((pick) => !pick)) return null;

  return {
    content: CONTENT[session.locale].pro(session.userId, picks.length === 2),
    embeds: picks.map((pick, index) => ({
      title: picks.length === 2 ? `TEAM ${index === 0 ? "A" : "B"} — ${pick?.team}` : `PRO PICK — ${pick?.team}`,
      description: pick?.agents.join(" / "),
      color: index === 0 ? 0xff4655 : 0x36d6b0,
      fields: [
        { name: "Map", value: pick?.map ?? "-", inline: true },
        { name: "Region", value: pick?.region ?? "-", inline: true },
        { name: "Event", value: pick?.event ?? "-", inline: false },
        { name: "Match", value: pick?.match ?? "-", inline: false },
      ],
      footer: { text: "valo-randomizer.com" },
    })),
    allowed_mentions: { users: [session.userId] },
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: "Open Valorandomizer",
            url: `https://valo-randomizer.com/${session.locale}/pro-pick`,
          },
        ],
      },
    ],
  };
}

export function buildDiscordWebhookMessage(
  session: DiscordSessionPayload,
  result: DiscordPublishResult,
): DiscordWebhookMessage | null {
  if (session.mode === "random" && result.kind === "random") {
    return randomMessage(session, result.agentIds);
  }
  if (session.mode === "pro" && result.kind === "pro") {
    return proMessage(session, result.pickIds);
  }
  return null;
}
