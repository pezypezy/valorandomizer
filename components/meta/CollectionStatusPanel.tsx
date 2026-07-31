import type { CollectionStatus } from "@/lib/meta-beta/collection-status";

interface CollectionStatusPanelProps {
  locale: string;
  status: CollectionStatus;
}

type Language = "ja" | "en" | "ko";

const COPY = {
  ja: {
    title: "データ収集状況",
    notConfigured: "D1を接続すると、追跡人数・収集試合数・Cronの状態をここで確認できます。",
    tracked: "同意済み追跡人数",
    matches: "直近7日の保存試合",
    lastRun: "最終収集",
    noRun: "まだ収集実績がありません",
    inserted: "新規保存",
    skipped: "重複・対象外",
    errors: "エラー",
    latest: "最新推薦日",
    queryFailed: "収集状態を読み取れませんでした。",
  },
  en: {
    title: "Collection status",
    notConfigured: "Connect D1 to show tracked players, collected matches, and cron status here.",
    tracked: "Consented tracked players",
    matches: "Stored matches, last 7 days",
    lastRun: "Latest collection",
    noRun: "No collection run yet",
    inserted: "New matches",
    skipped: "Duplicate / excluded",
    errors: "Errors",
    latest: "Latest recommendation date",
    queryFailed: "Collection status could not be loaded.",
  },
  ko: {
    title: "데이터 수집 상태",
    notConfigured: "D1을 연결하면 추적 인원, 수집 경기 수, Cron 상태를 확인할 수 있습니다.",
    tracked: "동의한 추적 인원",
    matches: "최근 7일 저장 경기",
    lastRun: "최근 수집",
    noRun: "아직 수집 기록이 없습니다",
    inserted: "신규 저장",
    skipped: "중복・제외",
    errors: "오류",
    latest: "최신 추천 날짜",
    queryFailed: "수집 상태를 불러오지 못했습니다.",
  },
} as const;

function formatDate(locale: Language, value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(
    locale === "en" ? "en-US" : locale === "ko" ? "ko-KR" : "ja-JP",
    { timeZone: "Asia/Tokyo", dateStyle: "short", timeStyle: "short" },
  ).format(new Date(value));
}

export function CollectionStatusPanel({ locale, status }: CollectionStatusPanelProps) {
  const language: Language = locale === "en" || locale === "ko" ? locale : "ja";
  const copy = COPY[language];

  return (
    <section className="clip-frame mt-8 border border-[var(--color-line)] bg-[var(--color-surface)]/70 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-ui-ja text-lg font-bold">{copy.title}</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${status.configured ? "bg-[var(--color-sentinel)] text-[var(--color-bg-deep)]" : "bg-[var(--color-surface-2)] text-[var(--color-muted)]"}`}>
          {status.configured ? "D1 CONNECTED" : "D1 PENDING"}
        </span>
      </div>

      {!status.configured ? (
        <p className="mt-3 text-sm text-[var(--color-muted)]">{copy.notConfigured}</p>
      ) : status.error ? (
        <p className="mt-3 text-sm text-[var(--color-primary-soft)]">{copy.queryFailed}</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-deep)]/70 p-4">
            <p className="text-xs text-[var(--color-muted)]">{copy.tracked}</p>
            <p className="font-display mt-2 text-2xl font-bold">{status.trackedPlayers ?? 0}</p>
          </div>
          <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-deep)]/70 p-4">
            <p className="text-xs text-[var(--color-muted)]">{copy.matches}</p>
            <p className="font-display mt-2 text-2xl font-bold">{(status.matchesLastSevenDays ?? 0).toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-deep)]/70 p-4">
            <p className="text-xs text-[var(--color-muted)]">{copy.lastRun}</p>
            {status.lastRun ? (
              <>
                <p className="mt-2 text-sm font-semibold uppercase">{status.lastRun.status}</p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">{formatDate(language, status.lastRun.finishedAt ?? status.lastRun.startedAt)}</p>
                <p className="mt-2 text-xs text-[var(--color-muted)]">
                  {copy.inserted} {status.lastRun.matchesInserted} / {copy.skipped} {status.lastRun.matchesSkipped} / {copy.errors} {status.lastRun.errors}
                </p>
              </>
            ) : <p className="mt-2 text-sm text-[var(--color-muted)]">{copy.noRun}</p>}
          </div>
          <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-deep)]/70 p-4">
            <p className="text-xs text-[var(--color-muted)]">{copy.latest}</p>
            <p className="font-display mt-2 text-xl font-bold">{status.latestRecommendationDate ?? "—"}</p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">{formatDate(language, status.latestRecommendationUpdatedAt)}</p>
          </div>
        </div>
      )}
    </section>
  );
}
