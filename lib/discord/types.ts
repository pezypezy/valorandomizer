export type DiscordCommandMode = "random" | "pro";

export interface DiscordSessionPayload {
  v: 1;
  mode: DiscordCommandMode;
  applicationId: string;
  interactionToken: string;
  userId: string;
  locale: "ja" | "en" | "ko";
  expiresAt: number;
  // Legacy v1 links may still contain these fields until they expire.
  guildId?: string;
  channelId?: string;
  displayName?: string;
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
