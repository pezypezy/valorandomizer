export type DiscordCommandMode = "random" | "pro";

export interface DiscordSessionPayload {
  v: 1;
  mode: DiscordCommandMode;
  applicationId: string;
  interactionToken: string;
  guildId: string;
  channelId: string;
  userId: string;
  displayName: string;
  locale: "ja" | "en" | "ko";
  expiresAt: number;
}

export type DiscordRandomResult = {
  kind: "random";
  agentIds: string[];
};

export type DiscordProResult = {
  kind: "pro";
  pickIds: string[];
};

export type DiscordPublishResult = DiscordRandomResult | DiscordProResult;
