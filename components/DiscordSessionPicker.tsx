"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { AGENTS } from "@/lib/agents";
import { DEFAULT_COUNTS, countByRole, pickTeam, totalCount, validateCounts, type RoleCounts } from "@/lib/picker";
import { PRO_PICKS, type ProPick } from "@/lib/pro-picks";
import { ROLES, TEAM_SIZE, type Agent, type Role } from "@/lib/roles";
import type { DiscordCommandMode, DiscordPublishResult } from "@/lib/discord/types";
import { AgentCard } from "./AgentCard";
import { RoleStepper } from "./RoleStepper";
import { Button } from "./ui/Button";

const ALL = "all";

type PublishState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "success"; messageUrl: string | null }
  | { status: "error"; message: string };

type ProFilters = {
  map: string;
  event: string;
  region: string;
  team: string;
};

const DEFAULT_FILTERS: ProFilters = { map: ALL, event: ALL, region: ALL, team: ALL };

const COPY = {
  ja: {
    eyebrow: "DISCORD SESSION",
    randomTitle: "ランダム構成を作成",
    proTitle: "プロ構成を抽選",
    hello: (name: string) => `${name} さんのDiscord投稿セッション`,
    expires: "リンク有効時間",
    expired: "このリンクは期限切れです。Discordでもう一度コマンドを実行してください。",
    total: "合計",
    randomize: "構成を抽選",
    rollAgain: "もう一度抽選",
    publish: "Discordに投稿",
    publishing: "投稿中…",
    published: "Discordへ投稿しました。",
    openMessage: "投稿を開く",
    publishError: "Discordへの投稿に失敗しました。コマンドからやり直してください。",
    noResult: "先に構成を抽選してください。",
    proCount: "抽選する構成数",
    oneTeam: "1構成",
    twoTeams: "2構成（VS）",
    candidates: "対象データ",
    map: "マップ",
    event: "大会",
    region: "地域",
    team: "チーム",
    all: "すべて",
    proDraw: "プロ構成を抽選",
    notEnough: "条件に一致する構成が足りません。",
  },
  en: {
    eyebrow: "DISCORD SESSION",
    randomTitle: "Create a random composition",
    proTitle: "Draw a pro composition",
    hello: (name: string) => `Discord publish session for ${name}`,
    expires: "Link expires in",
    expired: "This link has expired. Run the Discord command again.",
    total: "Total",
    randomize: "Randomize",
    rollAgain: "Roll again",
    publish: "Post to Discord",
    publishing: "Posting…",
    published: "Posted to Discord.",
    openMessage: "Open message",
    publishError: "Could not post to Discord. Start again from the command.",
    noResult: "Generate a composition first.",
    proCount: "Number of compositions",
    oneTeam: "One composition",
    twoTeams: "Two compositions (VS)",
    candidates: "Matching data",
    map: "Map",
    event: "Event",
    region: "Region",
    team: "Team",
    all: "All",
    proDraw: "Draw pro composition",
    notEnough: "Not enough compositions match these filters.",
  },
  ko: {
    eyebrow: "DISCORD SESSION",
    randomTitle: "랜덤 조합 만들기",
    proTitle: "프로 조합 추첨",
    hello: (name: string) => `${name}님의 Discord 게시 세션`,
    expires: "링크 만료까지",
    expired: "이 링크는 만료되었습니다. Discord에서 명령어를 다시 실행해 주세요.",
    total: "합계",
    randomize: "조합 추첨",
    rollAgain: "다시 추첨",
    publish: "Discord에 게시",
    publishing: "게시 중…",
    published: "Discord에 게시했습니다.",
    openMessage: "게시물 열기",
    publishError: "Discord 게시에 실패했습니다. 명령어부터 다시 시작해 주세요.",
    noResult: "먼저 조합을 추첨해 주세요.",
    proCount: "추첨할 조합 수",
    oneTeam: "1개 조합",
    twoTeams: "2개 조합 (VS)",
    candidates: "대상 데이터",
    map: "맵",
    event: "대회",
    region: "지역",
    team: "팀",
    all: "전체",
    proDraw: "프로 조합 추첨",
    notEnough: "조건에 맞는 조합이 부족합니다.",
  },
} as const;

export function DiscordSessionPicker({
  token,
  mode,
  locale,
  displayName,
  expiresAt,
}: {
  token: string;
  mode: DiscordCommandMode;
  locale: "ja" | "en" | "ko";
  displayName: string;
  expiresAt: number;
}) {
  const copy = COPY[locale];
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
  const [publishState, setPublishState] = useState<PublishState>({ status: "idle" });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  const expired = secondsLeft <= 0;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, "0");

  async function publish(result: DiscordPublishResult) {
    if (expired || publishState.status === "sending" || publishState.status === "success") return;
    setPublishState({ status: "sending" });

    try {
      const response = await fetch("/api/discord/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, result }),
      });
      const body = (await response.json()) as { messageUrl?: string | null };
      if (!response.ok) throw new Error("publish failed");
      setPublishState({ status: "success", messageUrl: body.messageUrl ?? null });
    } catch {
      setPublishState({ status: "error", message: copy.publishError });
    }
  }

  const publishDisabled = publishState.status === "sending" || publishState.status === "success";

  return (
    <div className="flex flex-col gap-8 py-4">
      <section className="border border-[var(--color-line)] bg-[var(--color-surface)] p-5 sm:p-7">
        <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-[var(--color-primary)]">
          {copy.eyebrow}
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-[var(--color-ink)] sm:text-4xl">
              {mode === "random" ? copy.randomTitle : copy.proTitle}
            </h1>
            <p className="mt-2 text-sm text-[var(--color-muted)]">{copy.hello(displayName)}</p>
          </div>
          <div className="border border-[var(--color-line)] px-4 py-2 text-sm text-[var(--color-muted)]">
            {copy.expires}: <span className="font-display font-bold text-[var(--color-ink)]">{minutes}:{seconds}</span>
          </div>
        </div>
      </section>

      {expired ? (
        <p className="border border-[var(--color-primary)] bg-[var(--color-surface)] px-5 py-8 text-center text-[var(--color-primary)]">
          {copy.expired}
        </p>
      ) : mode === "random" ? (
        <DiscordRandomPicker disabled={publishDisabled} publishing={publishState.status === "sending"} onPublish={publish} copy={copy} />
      ) : (
        <DiscordProPicker disabled={publishDisabled} publishing={publishState.status === "sending"} onPublish={publish} copy={copy} />
      )}

      {publishState.status === "success" ? (
        <section className="border border-[var(--color-sentinel)] bg-[var(--color-surface)] px-5 py-6 text-center">
          <p className="font-display font-bold text-[var(--color-sentinel)]">{copy.published}</p>
          {publishState.messageUrl ? (
            <a
              href={publishState.messageUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm text-[var(--color-ink)] underline underline-offset-4"
            >
              {copy.openMessage}
            </a>
          ) : null}
        </section>
      ) : null}

      {publishState.status === "error" ? (
        <p className="border border-[var(--color-primary)] px-4 py-3 text-center text-sm text-[var(--color-primary)]">
          {publishState.message}
        </p>
      ) : null}
    </div>
  );
}

type LocalCopy = (typeof COPY)[keyof typeof COPY];

function DiscordRandomPicker({
  disabled,
  publishing,
  onPublish,
  copy,
}: {
  disabled: boolean;
  publishing: boolean;
  onPublish: (result: DiscordPublishResult) => Promise<void>;
  copy: LocalCopy;
}) {
  const available = useMemo(() => countByRole(AGENTS), []);
  const [counts, setCounts] = useState<RoleCounts>(DEFAULT_COUNTS);
  const [team, setTeam] = useState<Agent[] | null>(null);
  const [locked, setLocked] = useState<Set<string>>(new Set());
  const valid = validateCounts(AGENTS, counts).ok;

  function changeCount(role: Role, delta: number) {
    setCounts((previous) => {
      const nextValue = previous[role] + delta;
      if (nextValue < 0 || nextValue > available[role]) return previous;
      if (delta > 0 && totalCount(previous) >= TEAM_SIZE) return previous;
      return { ...previous, [role]: nextValue };
    });
  }

  function roll() {
    if (!valid) return;
    const lockedAgents = team?.filter((agent) => locked.has(agent.id)) ?? [];
    const next = pickTeam(AGENTS, counts, lockedAgents);
    setTeam(next);
    setLocked((previous) => new Set([...previous].filter((id) => next.some((agent) => agent.id === id))));
  }

  function rerollOne(index: number) {
    if (!team) return;
    const target = team[index];
    const used = new Set(team.map((agent) => agent.id));
    const pool = AGENTS.filter((agent) => agent.role === target.role && !used.has(agent.id));
    if (pool.length === 0) return;
    const replacement = pool[Math.floor(Math.random() * pool.length)];
    setTeam(team.map((agent, slot) => (slot === index ? replacement : agent)));
    setLocked((previous) => {
      const next = new Set(previous);
      next.delete(target.id);
      return next;
    });
  }

  function toggleLock(id: string) {
    setLocked((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ROLES.map((role) => (
          <RoleStepper
            key={role}
            role={role}
            count={counts[role]}
            available={available[role]}
            canIncrement={totalCount(counts) < TEAM_SIZE && counts[role] < available[role]}
            onChange={(delta) => changeCount(role, delta)}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-muted)]">
          {copy.total}: <span className="font-display text-2xl font-bold text-[var(--color-ink)]">{totalCount(counts)} / {TEAM_SIZE}</span>
        </p>
        <Button onClick={roll} disabled={!valid || disabled}>{team ? copy.rollAgain : copy.randomize}</Button>
      </div>

      {team ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {team.map((agent, index) => (
            <AgentCard
              key={`${agent.id}-${index}`}
              agent={agent}
              index={index}
              locked={locked.has(agent.id)}
              onToggleLock={() => toggleLock(agent.id)}
              onReroll={() => rerollOne(index)}
            />
          ))}
        </div>
      ) : (
        <p className="border border-dashed border-[var(--color-line)] px-6 py-14 text-center text-sm text-[var(--color-muted)]">
          {copy.noResult}
        </p>
      )}

      <div className="flex justify-center">
        <Button
          onClick={() => team && onPublish({ kind: "random", agentIds: team.map((agent) => agent.id) })}
          disabled={!team || disabled}
          className="w-full max-w-md py-3"
        >
          {publishing ? copy.publishing : copy.publish}
        </Button>
      </div>
    </section>
  );
}

function unique(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function DiscordProPicker({
  disabled,
  publishing,
  onPublish,
  copy,
}: {
  disabled: boolean;
  publishing: boolean;
  onPublish: (result: DiscordPublishResult) => Promise<void>;
  copy: LocalCopy;
}) {
  const [filters, setFilters] = useState<ProFilters>(DEFAULT_FILTERS);
  const [pickCount, setPickCount] = useState<1 | 2>(2);
  const [picks, setPicks] = useState<ProPick[]>([]);

  const maps = useMemo(() => unique(PRO_PICKS.map((pick) => pick.map)), []);
  const events = useMemo(() => unique(PRO_PICKS.map((pick) => pick.event)), []);
  const regions = useMemo(() => unique(PRO_PICKS.map((pick) => pick.region)), []);
  const teams = useMemo(() => unique(PRO_PICKS.map((pick) => pick.team)), []);
  const candidates = useMemo(
    () => PRO_PICKS.filter((pick) =>
      (filters.map === ALL || pick.map === filters.map) &&
      (filters.event === ALL || pick.event === filters.event) &&
      (filters.region === ALL || pick.region === filters.region) &&
      (filters.team === ALL || pick.team === filters.team)),
    [filters],
  );

  const canDraw = candidates.length >= pickCount;

  function draw() {
    if (!canDraw) return;
    const shuffled = [...candidates];
    for (let index = shuffled.length - 1; index > 0; index--) {
      const swap = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
    }
    setPicks(shuffled.slice(0, pickCount));
  }

  function updateFilter(key: keyof ProFilters, value: string) {
    setFilters((previous) => ({ ...previous, [key]: value }));
    setPicks([]);
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <FilterSelect label={copy.map} value={filters.map} values={maps} allLabel={copy.all} onChange={(value) => updateFilter("map", value)} />
        <FilterSelect label={copy.event} value={filters.event} values={events} allLabel={copy.all} onChange={(value) => updateFilter("event", value)} />
        <FilterSelect label={copy.region} value={filters.region} values={regions} allLabel={copy.all} onChange={(value) => updateFilter("region", value)} />
        <FilterSelect label={copy.team} value={filters.team} values={teams} allLabel={copy.all} onChange={(value) => updateFilter("team", value)} />
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          {copy.proCount}
          <select
            value={pickCount}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => {
              setPickCount(Number(event.target.value) === 1 ? 1 : 2);
              setPicks([]);
            }}
            className="min-h-12 border border-[var(--color-line)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink)]"
          >
            <option value={1}>{copy.oneTeam}</option>
            <option value={2}>{copy.twoTeams}</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-muted)]">{copy.candidates}: <strong className="text-[var(--color-ink)]">{candidates.length}</strong></p>
        <Button onClick={draw} disabled={!canDraw || disabled}>{copy.proDraw}</Button>
      </div>

      {!canDraw ? (
        <p className="border border-[var(--color-primary)] px-4 py-3 text-center text-sm text-[var(--color-primary)]">{copy.notEnough}</p>
      ) : null}

      {picks.length > 0 ? (
        <div className={`grid gap-3 ${picks.length === 2 ? "lg:grid-cols-2" : ""}`}>
          {picks.map((pick, index) => (
            <article key={pick.id} className="border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
              <p className="font-display text-xs font-bold uppercase tracking-[0.25em] text-[var(--color-primary)]">
                {picks.length === 2 ? `TEAM ${index === 0 ? "A" : "B"}` : "PRO PICK"}
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold text-[var(--color-ink)]">{pick.team}</h2>
              <p className="mt-3 text-lg font-semibold text-[var(--color-ink)]">{pick.agents.join(" / ")}</p>
              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <Meta label={copy.map} value={pick.map} />
                <Meta label={copy.region} value={pick.region} />
                <Meta label={copy.event} value={pick.event} />
                <Meta label="Match" value={pick.match} />
              </dl>
            </article>
          ))}
        </div>
      ) : (
        <p className="border border-dashed border-[var(--color-line)] px-6 py-14 text-center text-sm text-[var(--color-muted)]">{copy.noResult}</p>
      )}

      <div className="flex justify-center">
        <Button
          onClick={() => picks.length > 0 && onPublish({ kind: "pro", pickIds: picks.map((pick) => pick.id) })}
          disabled={picks.length === 0 || disabled}
          className="w-full max-w-md py-3"
        >
          {publishing ? copy.publishing : copy.publish}
        </Button>
      </div>
    </section>
  );
}

function FilterSelect({
  label,
  value,
  values,
  allLabel,
  onChange,
}: {
  label: string;
  value: string;
  values: string[];
  allLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
      {label}
      <select
        value={value}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}
        className="min-h-12 border border-[var(--color-line)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink)]"
      >
        <option value={ALL}>{allLabel}</option>
        {values.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </label>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-[var(--color-muted)]">{label}</dt>
      <dd className="mt-1 text-[var(--color-ink)]">{value}</dd>
    </div>
  );
}
