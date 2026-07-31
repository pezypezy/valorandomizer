"use client";

import { FormEvent, useMemo, useState } from "react";
import { AGENTS } from "@/lib/agents";
import {
  getMockRecommendations,
  META_MAPS,
  META_RANKS,
  type MetaRecommendation,
  type MetaRecommendationCategory,
} from "@/lib/meta-beta/mock-data";

interface MetaBetaDashboardProps {
  locale: string;
}

interface UiChatMessage {
  role: "user" | "assistant";
  content: string;
  mode?: "ai" | "fallback" | "rejected";
}

const COPY = {
  ja: {
    eyebrow: "RANKED META / PRIVATE BETA",
    title: "ランク構成統計・AI相談",
    description: "直近7日・現パッチの構成統計を想定した限定テスト画面です。現在の数値はUIと推論処理を検証するためのサンプルです。",
    sample: "サンプルデータ",
    map: "マップ",
    rank: "ランク",
    period: "期間",
    periodValue: "現パッチ・直近7日",
    region: "地域",
    regionValue: "日本向け（データ範囲検証中）",
    theory: "セオリー",
    offMeta: "オフメタ",
    soloQueue: "野良向け",
    adjusted: "補正勝率",
    raw: "生勝率",
    pickRate: "ピック率",
    matches: "試合数",
    high: "信頼度 高",
    medium: "信頼度 中",
    low: "信頼度 低",
    reasons: "選定理由",
    aiTitle: "構成アドバイザー",
    aiDescription: "VALORANTの構成相談だけを受け付けます。無関係な質問はAIを呼ばずに弾くため、無料枠を消費しません。",
    placeholder: "例：オーメン、ソーヴァ、ジェットを固定した残り2枠は？",
    send: "相談する",
    sending: "推論中...",
    empty: "マップ・ランク・使えるエージェントを入力してください。",
    fallback: "定型回答",
    ai: "Workers AI",
    rejected: "AI未使用",
    quickOne: "セオリー構成を解説して",
    quickTwo: "野良向けとの違いは？",
    quickThree: "オフメタ構成の弱点は？",
    logout: "ログアウト",
  },
  en: {
    eyebrow: "RANKED META / PRIVATE BETA",
    title: "Ranked composition stats and AI advice",
    description: "Private test screen for current-patch, rolling seven-day composition statistics. Values are sample data while the data pipeline is being built.",
    sample: "Sample data",
    map: "Map",
    rank: "Rank",
    period: "Period",
    periodValue: "Current patch / last 7 days",
    region: "Region",
    regionValue: "Japan-first beta (scope under validation)",
    theory: "Theory",
    offMeta: "Off-meta",
    soloQueue: "Solo queue",
    adjusted: "Adjusted WR",
    raw: "Raw WR",
    pickRate: "Pick rate",
    matches: "Matches",
    high: "High confidence",
    medium: "Medium confidence",
    low: "Low confidence",
    reasons: "Why it was selected",
    aiTitle: "Composition adviser",
    aiDescription: "Only VALORANT composition questions are accepted. Unrelated questions are rejected before calling AI and consume no AI quota.",
    placeholder: "Example: We lock Omen, Sova and Jett. What are the last two slots?",
    send: "Ask",
    sending: "Thinking...",
    empty: "Include the map, rank, and agents your group can play.",
    fallback: "Rule-based reply",
    ai: "Workers AI",
    rejected: "No AI used",
    quickOne: "Explain the theory composition",
    quickTwo: "How is the solo queue option different?",
    quickThree: "What is the off-meta option's weakness?",
    logout: "Log out",
  },
  ko: {
    eyebrow: "RANKED META / PRIVATE BETA",
    title: "랭크 조합 통계・AI 상담",
    description: "현 패치・최근 7일 조합 통계를 가정한 비공개 테스트 화면입니다. 현재 수치는 데이터 파이프라인 연결 전의 샘플입니다.",
    sample: "샘플 데이터",
    map: "맵",
    rank: "랭크",
    period: "기간",
    periodValue: "현 패치・최근 7일",
    region: "지역",
    regionValue: "일본 우선 베타（범위 검증 중）",
    theory: "정석",
    offMeta: "오프메타",
    soloQueue: "솔로 랭크",
    adjusted: "보정 승률",
    raw: "실제 승률",
    pickRate: "픽률",
    matches: "경기 수",
    high: "신뢰도 높음",
    medium: "신뢰도 중간",
    low: "신뢰도 낮음",
    reasons: "선정 이유",
    aiTitle: "조합 어드바이저",
    aiDescription: "VALORANT 조합 질문만 받습니다. 관련 없는 질문은 AI 호출 전에 차단되어 무료 사용량을 소모하지 않습니다.",
    placeholder: "예: 오멘, 소바, 제트를 고정하면 나머지 두 자리는?",
    send: "상담하기",
    sending: "추론 중...",
    empty: "맵, 랭크, 사용할 수 있는 요원을 입력해 주세요.",
    fallback: "규칙 기반 응답",
    ai: "Workers AI",
    rejected: "AI 미사용",
    quickOne: "정석 조합을 설명해 줘",
    quickTwo: "솔로 랭크 조합과 차이는?",
    quickThree: "오프메타 조합의 약점은?",
    logout: "로그아웃",
  },
} as const;

const CATEGORY_STYLES: Record<MetaRecommendationCategory, string> = {
  theory: "border-[var(--color-primary)]/60",
  offMeta: "border-[var(--color-initiator)]/60",
  soloQueue: "border-[var(--color-sentinel)]/60",
};

function categoryLabel(category: MetaRecommendationCategory, copy: (typeof COPY)["ja"]): string {
  if (category === "theory") return copy.theory;
  if (category === "offMeta") return copy.offMeta;
  return copy.soloQueue;
}

function AgentRow({ agents }: { agents: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {agents.map((name) => {
        const agent = AGENTS.find((candidate) => candidate.name === name);
        return (
          <span
            key={name}
            className="flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-black/20 py-1 pl-1 pr-3 text-sm"
          >
            {agent ? (
              <img src={agent.icon} alt="" className="h-7 w-7 rounded-full bg-[var(--color-surface-2)] object-cover" />
            ) : null}
            {name}
          </span>
        );
      })}
    </div>
  );
}

function RecommendationCard({
  recommendation,
  copy,
}: {
  recommendation: MetaRecommendation;
  copy: (typeof COPY)["ja"];
}) {
  const confidenceLabel =
    recommendation.confidence === "high"
      ? copy.high
      : recommendation.confidence === "medium"
        ? copy.medium
        : copy.low;

  return (
    <article className={`clip-card border bg-[var(--color-surface)]/85 p-5 ${CATEGORY_STYLES[recommendation.category]}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold">{categoryLabel(recommendation.category, copy)}</h2>
        <span className="rounded-full border border-[var(--color-line)] px-3 py-1 text-xs text-[var(--color-muted)]">
          {confidenceLabel}
        </span>
      </div>
      <AgentRow agents={recommendation.agents} />
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-[var(--color-muted)]">{copy.adjusted}</dt>
          <dd className="mt-1 font-display text-xl font-bold">{recommendation.adjustedWinRate.toFixed(1)}%</dd>
        </div>
        <div>
          <dt className="text-[var(--color-muted)]">{copy.raw}</dt>
          <dd className="mt-1 font-display text-xl font-bold">{recommendation.rawWinRate.toFixed(1)}%</dd>
        </div>
        <div>
          <dt className="text-[var(--color-muted)]">{copy.pickRate}</dt>
          <dd className="mt-1 font-display text-xl font-bold">{recommendation.pickRate.toFixed(1)}%</dd>
        </div>
        <div>
          <dt className="text-[var(--color-muted)]">{copy.matches}</dt>
          <dd className="mt-1 font-display text-xl font-bold">{recommendation.matchCount.toLocaleString()}</dd>
        </div>
      </dl>
      <h3 className="mt-5 text-sm font-semibold text-[var(--color-muted)]">{copy.reasons}</h3>
      <ul className="mt-2 space-y-1 text-sm">
        {recommendation.reasons.map((reason) => (
          <li key={reason}>・{reason}</li>
        ))}
      </ul>
      <p className="mt-4 border-t border-[var(--color-line)] pt-3 text-xs text-[var(--color-muted)]">
        {recommendation.caution}
      </p>
    </article>
  );
}

export function MetaBetaDashboard({ locale }: MetaBetaDashboardProps) {
  const language = locale === "en" || locale === "ko" ? locale : "ja";
  const copy = COPY[language] as (typeof COPY)["ja"];
  const [map, setMap] = useState<(typeof META_MAPS)[number]>("Ascent");
  const [rank, setRank] = useState<(typeof META_RANKS)[number]>("Ascendant");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<UiChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const recommendations = useMemo(() => getMockRecommendations(map, rank), [map, rank]);

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const previousMessages = messages.slice(-6).map(({ role, content }) => ({ role, content }));
    setMessages((current) => [...current, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/meta-beta/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: trimmed, map, rank, locale: language, history: previousMessages }),
      });
      if (response.status === 401) {
        window.location.href = `/${language}/meta-beta/login`;
        return;
      }
      const result = (await response.json()) as {
        reply?: string;
        mode?: "ai" | "fallback" | "rejected";
      };
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: result.reply || copy.empty,
          mode: result.mode ?? "fallback",
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: copy.empty, mode: "fallback" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(input);
  }

  return (
    <div className="py-8 sm:py-12">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-3xl">
          <p className="font-display-en text-xs font-bold tracking-[0.26em] text-[var(--color-primary)]">{copy.eyebrow}</p>
          <h1 className="font-ui-ja mt-3 text-3xl font-bold sm:text-5xl">{copy.title}</h1>
          <p className="mt-4 leading-7 text-[var(--color-muted)]">{copy.description}</p>
        </div>
        <form action="/api/meta-beta/logout" method="post">
          <input type="hidden" name="returnTo" value={`/${language}/meta-beta/login`} />
          <button
            type="submit"
            className="clip-btn border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2 text-sm transition hover:border-[var(--color-primary)]"
          >
            {copy.logout}
          </button>
        </form>
      </div>

      <section className="clip-frame mt-8 border border-[var(--color-line)] bg-[var(--color-surface)]/70 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-[var(--color-primary)] px-3 py-1 text-xs font-bold text-white">{copy.sample}</span>
          <span className="text-xs text-[var(--color-muted)]">Riot API / D1 connection: pending</span>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <label className="text-sm text-[var(--color-muted)]">
            {copy.map}
            <select
              value={map}
              onChange={(event) => setMap(event.target.value as (typeof META_MAPS)[number])}
              className="mt-2 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-bg-deep)] px-3 py-3 text-[var(--color-ink)]"
            >
              {META_MAPS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-sm text-[var(--color-muted)]">
            {copy.rank}
            <select
              value={rank}
              onChange={(event) => setRank(event.target.value as (typeof META_RANKS)[number])}
              className="mt-2 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-bg-deep)] px-3 py-3 text-[var(--color-ink)]"
            >
              {META_RANKS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <div className="text-sm text-[var(--color-muted)]">
            {copy.period}
            <p className="mt-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-bg-deep)] px-3 py-3 text-[var(--color-ink)]">{copy.periodValue}</p>
          </div>
          <div className="text-sm text-[var(--color-muted)]">
            {copy.region}
            <p className="mt-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-bg-deep)] px-3 py-3 text-[var(--color-ink)]">{copy.regionValue}</p>
          </div>
        </div>
      </section>

      <section className="mt-7 grid gap-5 xl:grid-cols-3">
        {recommendations.map((recommendation) => (
          <RecommendationCard key={recommendation.category} recommendation={recommendation} copy={copy} />
        ))}
      </section>

      <section className="clip-frame mt-8 border border-[var(--color-line)] bg-[var(--color-surface)]/85 p-5 sm:p-7">
        <div className="max-w-3xl">
          <p className="font-display-en text-xs font-bold tracking-[0.22em] text-[var(--color-sentinel)]">AI CHAT / GUARDED</p>
          <h2 className="font-ui-ja mt-2 text-2xl font-bold">{copy.aiTitle}</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">{copy.aiDescription}</p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {[copy.quickOne, copy.quickTwo, copy.quickThree].map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => void ask(prompt)}
              disabled={loading}
              className="rounded-full border border-[var(--color-line)] px-3 py-2 text-sm transition hover:border-[var(--color-primary)] disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="mt-5 min-h-40 space-y-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-deep)]/80 p-4" aria-live="polite">
          {messages.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">{copy.empty}</p>
          ) : (
            messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`max-w-[92%] rounded-xl px-4 py-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "ml-auto bg-[var(--color-primary)] text-white"
                    : "border border-[var(--color-line)] bg-[var(--color-surface-2)]"
                }`}
              >
                {message.role === "assistant" && message.mode ? (
                  <span className="mb-2 inline-block rounded-full border border-[var(--color-line)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                    {message.mode === "ai" ? copy.ai : message.mode === "rejected" ? copy.rejected : copy.fallback}
                  </span>
                ) : null}
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            ))
          )}
        </div>

        <form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="meta-chat-input">{copy.aiTitle}</label>
          <textarea
            id="meta-chat-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            maxLength={1200}
            rows={3}
            placeholder={copy.placeholder}
            className="min-h-24 flex-1 resize-y rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-deep)] px-4 py-3 text-base outline-none focus:border-[var(--color-primary)]"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="clip-btn self-stretch bg-[var(--color-primary)] px-6 py-3 font-bold text-white transition hover:bg-[var(--color-primary-soft)] disabled:cursor-not-allowed disabled:opacity-50 sm:self-end"
          >
            {loading ? copy.sending : copy.send}
          </button>
        </form>
      </section>
    </div>
  );
}
