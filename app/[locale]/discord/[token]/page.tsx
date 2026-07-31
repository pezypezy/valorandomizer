import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { DiscordSessionPicker } from "@/components/DiscordSessionPicker";
import { getDiscordEnv } from "@/lib/discord/env";
import { openDiscordSession } from "@/lib/discord/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Discord Session | Valorandomizer",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type DiscordSessionPageProps = {
  params: Promise<{ locale: string; token: string }>;
};

export default async function DiscordSessionPage({ params }: DiscordSessionPageProps) {
  const { locale: requestedLocale, token } = await params;
  const env = getDiscordEnv();
  const session = env.DISCORD_SESSION_SECRET
    ? await openDiscordSession(token, env.DISCORD_SESSION_SECRET)
    : null;
  const locale = session?.locale ?? (requestedLocale === "ja" || requestedLocale === "ko" ? requestedLocale : "en");
  setRequestLocale(locale);

  if (!session || Date.now() >= session.expiresAt) {
    const message = locale === "ja"
      ? "このDiscordリンクは無効または期限切れです。Discordでもう一度コマンドを実行してください。"
      : locale === "ko"
        ? "이 Discord 링크는 잘못되었거나 만료되었습니다. Discord에서 명령어를 다시 실행해 주세요."
        : "This Discord link is invalid or expired. Run the Discord command again.";

    return (
      <div className="py-16">
        <p className="border border-[var(--color-primary)] bg-[var(--color-surface)] px-6 py-12 text-center text-[var(--color-primary)]">
          {message}
        </p>
      </div>
    );
  }

  return (
    <DiscordSessionPicker
      token={token}
      mode={session.mode}
      locale={session.locale}
      displayName={session.displayName}
      expiresAt={session.expiresAt}
    />
  );
}
