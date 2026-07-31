import { getCloudflareContext } from "@opennextjs/cloudflare";

export type DiscordRuntimeEnv = {
  DISCORD_PUBLIC_KEY?: string;
  DISCORD_SESSION_SECRET?: string;
  DISCORD_ALLOWED_GUILD_ID?: string;
};

export function getDiscordEnv(): DiscordRuntimeEnv {
  return getCloudflareContext().env as unknown as DiscordRuntimeEnv;
}
