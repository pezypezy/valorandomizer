"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AGENTS } from "@/lib/agents";
import { PRO_PICKS, type ProPick } from "@/lib/pro-picks";
import { type Agent, ROLE_META } from "@/lib/roles";
import { Button } from "./ui/Button";

type SideMode = "both" | "single" | "mirror";
type DrawnPick = ProPick & { drawId: number };
type MatchOutcome = "left" | "right" | "draw";
type MatchRecord = {
  id: string;
  recordedAt: string;
  outcome: MatchOutcome;
  left: ProPick;
  right: ProPick | null;
};
type PickFilters = {
  map: string;
  event: string;
  region: string;
  team: string;
};
type DrawDataEntry = {
  side: "A" | "B";
  pick: ProPick;
};

const ALL = "all";
const DEFAULT_FILTERS: PickFilters = { map: ALL, event: ALL, region: ALL, team: ALL };
const RECORD_STORAGE_KEY = "valorandomizer.proPick.matchRecords";
const MAX_RECORDS = 100;

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

function readSafeParam(params: URLSearchParams, key: string, allowed: string[]) {
  const value = params.get(key);
  if (!value || !allowed.includes(value)) return ALL;
  return value;
}

function readSideMode(params: URLSearchParams): SideMode {
  const value = params.get("mode");
  if (value === "single" || value === "mirror" || value === "both") return value;
  return "both";
}

function buildFiltersFromParams(params: URLSearchParams, suffix: "" | "B", maps: string[], events: string[], regions: string[], teams: string[]): PickFilters {
  return {
    map: readSafeParam(params, `map${suffix}`, maps),
    event: readSafeParam(params, `event${suffix}`, events),
    region: readSafeParam(params, `region${suffix}`, regions),
    team: readSafeParam(params, `team${suffix}`, teams),
  };
}

function writeFilterParams(params: URLSearchParams, suffix: "" | "B", filters: PickFilters) {
  for (const key of ["map", "event", "region", "team"] as const) {
    const queryKey = `${key}${suffix}`;
    if (filters[key] === ALL) params.delete(queryKey);
    else params.set(queryKey, filters[key]);
  }
}

export function ProPickPicker() {
  const t = useTranslations();
  const hydratedParams = useRef(false);
  const [leftFilters, setLeftFilters] = useState<PickFilters>(DEFAULT_FILTERS);
  const [rightFilters, setRightFilters] = useState<PickFilters>(DEFAULT_FILTERS);
  const [sideMode, setSideMode] = useState<SideMode>("both");
  const [left, setLeft] = useState<DrawnPick | null>(null);
  const [right, setRight] = useState<DrawnPick | null>(null);
  const [drawCounter, setDrawCounter] = useState(0);
  const [records, setRecords] = useState<MatchRecord[]>([]);
  const [showDataList, setShowDataList] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "url" | "result">("idle");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(RECORD_STORAGE_KEY);
      if (stored) setRecords(JSON.parse(stored) as MatchRecord[]);
    } catch {
      setRecords([]);
    }
  }, []);

  const maps = useMemo(() => unique(PRO_PICKS.map((pick) => pick.map)), []);
  const events = useMemo(() => unique(PRO_PICKS.map((pick) => pick.event)), []);
  const regions = useMemo(() => unique(PRO_PICKS.map((pick) => pick.region)), []);
  const teams = useMemo(() => unique(PRO_PICKS.map((pick) => pick.team)), []);

  useEffect(() => {
    if (hydratedParams.current) return;
    const params = new URL(window.location.href).searchParams;
    setSideMode(readSideMode(params));
    setLeftFilters(buildFiltersFromParams(params, "", maps, events, regions, teams));
    setRightFilters(buildFiltersFromParams(params, "B", maps, events, regions, teams));
    hydratedParams.current = true;
  }, [events, maps, regions, teams]);

  useEffect(() => {
    if (!hydratedParams.current) return;
    if (!window.location.pathname.endsWith("/pro-pick")) return;
    const url = new URL(window.location.href);
    url.search = "";
    if (sideMode !== "both") url.searchParams.set("mode", sideMode);
    writeFilterParams(url.searchParams, "", leftFilters);
    if (sideMode === "both") writeFilterParams(url.searchParams, "B", rightFilters);
    const query = url.searchParams.toString();
    window.history.replaceState(null, "", `${url.pathname}${query ? `?${query}` : ""}`);
  }, [leftFilters, rightFilters, sideMode]);

  const agentByName = useMemo(() => {
    return new Map(AGENTS.map((agent) => [agent.name, agent]));
  }, []);

  const leftCandidates = useMemo(() => filterPicks(leftFilters), [leftFilters]);
  const rightCandidates = useMemo(() => filterPicks(rightFilters), [rightFilters]);
  const drawDataEntries = useMemo(() => {
    if (sideMode !== "both") return leftCandidates.map((pick) => ({ side: "A" as const, pick }));

    return [
      ...leftCandidates.map((pick) => ({ side: "A" as const, pick })),
      ...rightCandidates.map((pick) => ({ side: "B" as const, pick })),
    ];
  }, [leftCandidates, rightCandidates, sideMode]);
  const drawDataCount = useMemo(() => new Set(drawDataEntries.map((entry) => entry.pick.id)).size, [drawDataEntries]);

  const canPick = leftCandidates.length > 0 && (sideMode !== "both" || rightCandidates.length > 0);

  function draw() {
    if (!canPick) {
      setLeft(null);
      setRight(null);
      return;
    }

    const nextDrawId = drawCounter + 1;
    const first = withDrawId(pickOne(leftCandidates), nextDrawId);
    let second: DrawnPick | null = null;

    if (sideMode === "mirror") {
      second = withDrawId(first, nextDrawId + 1000);
    } else if (sideMode === "both") {
      second = withDrawId(pickOne(rightCandidates), nextDrawId + 1000);
      if (rightCandidates.length > 1) {
        while (second.id === first.id) second = withDrawId(pickOne(rightCandidates), nextDrawId + 1000);
      }
    }

    setDrawCounter(nextDrawId);
    setLeft(first);
    setRight(second);
  }

  function recordMatch(outcome: MatchOutcome) {
    if (!left) return;

    const nextRecords = [
      {
        id: `${Date.now()}-${left.id}-${right?.id ?? "single"}`,
        recordedAt: new Date().toISOString(),
        outcome,
        left: stripDrawId(left),
        right: right ? stripDrawId(right) : null,
      },
      ...records,
    ].slice(0, MAX_RECORDS);

    setRecords(nextRecords);
    window.localStorage.setItem(RECORD_STORAGE_KEY, JSON.stringify(nextRecords));
  }

  function clearRecords() {
    setRecords([]);
    window.localStorage.removeItem(RECORD_STORAGE_KEY);
  }

  function filterPicks(filters: PickFilters) {
    return PRO_PICKS.filter((pick) => {
      return (
        (filters.map === ALL || pick.map === filters.map) &&
        (filters.event === ALL || pick.event === filters.event) &&
        (filters.region === ALL || pick.region === filters.region) &&
        (filters.team === ALL || pick.team === filters.team)
      );
    });
  }

  function updateFilters(side: "left" | "right", key: keyof PickFilters, value: string) {
    const updater = (filters: PickFilters) => ({ ...filters, [key]: value });
    if (side === "left") setLeftFilters(updater);
    else setRightFilters(updater);
  }

  async function copyCurrentUrl() {
    await copyText(window.location.href);
    setCopyState("url");
    window.setTimeout(() => setCopyState("idle"), 1600);
  }

  async function copyPickResult() {
    if (!left) return;
    const lines = [formatPick("Team A", left)];
    if (right) lines.push(formatPick("Team B", right));
    await copyText(`VALORANDOMIZER PRO PICK\n${lines.join("\n\n")}\n\n${window.location.href}`);
    setCopyState("result");
    window.setTimeout(() => setCopyState("idle"), 1600);
  }

  return (
    <section className="relative left-1/2 flex w-[calc(100vw-2rem)] max-w-[112rem] -translate-x-1/2 flex-col gap-6 sm:w-[calc(100vw-3rem)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-[var(--color-sentinel)]">
            {t("landing.proEyebrow")}
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-[var(--color-ink)] sm:text-4xl">
            {t("proPick.heading")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--color-muted)]">
            {t("proPick.subtitle")}
          </p>
        </div>
        <div className="relative flex flex-wrap justify-end gap-2">
          <span className="border border-[var(--color-line)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            A {leftCandidates.length} / B {sideMode === "both" ? rightCandidates.length : "-"}
          </span>
          <button
            type="button"
            onClick={() => setShowDataList((value) => !value)}
            className="border border-[var(--color-line)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            {t("proPick.dataCounter", { count: drawDataCount, total: PRO_PICKS.length })}
          </button>
          {showDataList ? <DrawDataList entries={drawDataEntries} onClose={() => setShowDataList(false)} /> : null}
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-2xl gap-3 sm:grid-cols-[minmax(12rem,1fr)_auto_auto]">
        <Select
          label={t("proPick.mode")}
          value={sideMode}
          values={["both", "single", "mirror"]}
          labels={{ both: t("proPick.both"), single: t("proPick.single"), mirror: t("proPick.mirror") }}
          onChange={(value) => setSideMode(value as SideMode)}
        />
        <Button
          type="button"
          onClick={draw}
          disabled={!canPick}
          className="min-h-12 w-full px-6 py-3 text-base sm:self-end"
        >
          {t("proPick.pick")}
        </Button>
        <Button type="button" variant="ghost" onClick={copyCurrentUrl} className="min-h-12 w-full px-6 py-3 text-base sm:self-end">
          {copyState === "url" ? t("share.copied") : t("share.url")}
        </Button>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <FilterPanel
          title="Team A"
          filters={leftFilters}
          maps={maps}
          events={events}
          regions={regions}
          teams={teams}
          onChange={(key, value) => updateFilters("left", key, value)}
        />
        <FilterPanel
          title="Team B"
          filters={rightFilters}
          maps={maps}
          events={events}
          regions={regions}
          teams={teams}
          disabled={sideMode !== "both"}
          disabledText={sideMode === "mirror" ? t("proPick.mirror") : t("proPick.single")}
          onChange={(key, value) => updateFilters("right", key, value)}
        />
      </div>

      <div className="flex justify-center">
        <div className="border border-[var(--color-line)] bg-[var(--color-surface)] px-5 py-3 font-display text-2xl font-bold text-[var(--color-primary)]">
          VS
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <PickResult key={left?.drawId ?? "left-empty"} label="Team A" pick={left} agentByName={agentByName} />
        <PickResult key={right?.drawId ?? "right-empty"} label="Team B" pick={right} agentByName={agentByName} />
      </div>

      {left ? (
        <div className="flex justify-center">
          <Button type="button" variant="ghost" onClick={copyPickResult} className="px-6">
            {copyState === "result" ? t("share.copied") : t("actions.copy")}
          </Button>
        </div>
      ) : null}

      <MatchHistory records={records} canRecord={Boolean(left)} hasRight={Boolean(right)} onRecord={recordMatch} onClear={clearRecords} />
    </section>
  );
}

function DrawDataList({ entries, onClose }: { entries: DrawDataEntry[]; onClose: () => void }) {
  const t = useTranslations();

  return (
    <div className="absolute right-0 top-full z-30 mt-2 w-[min(calc(100vw-2rem),42rem)] border border-[var(--color-line)] bg-[var(--color-bg-deep)] p-3 shadow-2xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-muted)]">
            {t("proPick.dataListHeading")}
          </h3>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {t("proPick.dataListCount", { count: entries.length })}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="border border-[var(--color-line)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
        >
          {t("proPick.dataListClose")}
        </button>
      </div>
      {entries.length > 0 ? (
        <div className="max-h-96 overflow-y-auto pr-1">
          <div className="grid gap-2">
            {entries.map((entry, index) => (
              <div key={`${entry.side}-${entry.pick.id}-${index}`} className="border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-left">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
                  <span className="font-semibold text-[var(--color-primary)]">{entry.side === "A" ? "Team A" : "Team B"}</span>
                  <span>{entry.pick.region}</span>
                  <span>{entry.pick.map}</span>
                </div>
                <p className="mt-1 break-words font-display text-sm font-bold text-[var(--color-ink)]">{entry.pick.team}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="border border-dashed border-[var(--color-line)] px-3 py-8 text-center text-sm text-[var(--color-muted)]">
          {t("proPick.dataListEmpty")}
        </p>
      )}
    </div>
  );
}

function FilterPanel({
  title,
  filters,
  maps,
  events,
  regions,
  teams,
  disabled,
  disabledText,
  onChange,
}: {
  title: string;
  filters: PickFilters;
  maps: string[];
  events: string[];
  regions: string[];
  teams: string[];
  disabled?: boolean;
  disabledText?: string;
  onChange: (key: keyof PickFilters, value: string) => void;
}) {
  const t = useTranslations();

  return (
    <div className="min-w-0 border border-[var(--color-line)] bg-[var(--color-surface)] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-muted)]">{title}</h3>
        {disabled && disabledText ? (
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">{disabledText}</span>
        ) : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(7rem,0.8fr)_minmax(13rem,1.25fr)_minmax(8.5rem,0.9fr)_minmax(13rem,1.25fr)]">
        <Select label={t("proPick.map")} value={filters.map} values={[ALL, ...maps]} onChange={(value) => onChange("map", value)} allLabel={t("proPick.all")} disabled={disabled} />
        <Select label={t("proPick.event")} value={filters.event} values={[ALL, ...events]} onChange={(value) => onChange("event", value)} allLabel={t("proPick.all")} disabled={disabled} />
        <Select label={t("proPick.region")} value={filters.region} values={[ALL, ...regions]} onChange={(value) => onChange("region", value)} allLabel={t("proPick.all")} disabled={disabled} />
        <Select label={t("proPick.team")} value={filters.team} values={[ALL, ...teams]} onChange={(value) => onChange("team", value)} allLabel={t("proPick.all")} disabled={disabled} />
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  values,
  labels,
  allLabel,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  values: string[];
  labels?: Record<string, string>;
  allLabel?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-10 w-full truncate border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-2 text-sm text-[var(--color-ink)] outline-none disabled:cursor-not-allowed disabled:opacity-45"
      >
        {values.map((item) => (
          <option key={item} value={item}>
            {labels?.[item] ?? (item === ALL ? allLabel : item)}
          </option>
        ))}
      </select>
    </label>
  );
}

function PickResult({
  label,
  pick,
  agentByName,
}: {
  label: string;
  pick: DrawnPick | null;
  agentByName: Map<string, Agent>;
}) {
  const t = useTranslations();

  if (!pick) {
    return (
      <div className="border border-dashed border-[var(--color-line)] px-6 py-16 text-center text-sm text-[var(--color-muted)]">
        {label}: {t("proPick.noPick")}
      </div>
    );
  }

  const agents = pick.agents
    .map((agentName) => agentByName.get(agentName))
    .filter((agent): agent is Agent => Boolean(agent));

  return (
    <article className="clip-frame min-w-0 border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-muted)]">{label}</p>
          <h3 className="mt-1 break-words font-display text-2xl font-bold text-[var(--color-ink)]">{pick.team}</h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {pick.map} / {pick.event}
          </p>
          <p className="text-sm text-[var(--color-muted)]">
            {pick.region} / {getOpponentLabel(pick)}
          </p>
        </div>
        {pick.source ? (
          <a
            href={pick.source}
            target="_blank"
            rel="noreferrer"
            className="w-fit border border-[var(--color-line)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            {t("proPick.detail")}
          </a>
        ) : null}
      </div>
      <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(118px,1fr))] gap-3">
        {agents.map((agent) => (
          <ProPickAgentTile key={agent.id} agent={agent} />
        ))}
      </div>
    </article>
  );
}

function MatchHistory({
  records,
  canRecord,
  hasRight,
  onRecord,
  onClear,
}: {
  records: MatchRecord[];
  canRecord: boolean;
  hasRight: boolean;
  onRecord: (outcome: MatchOutcome) => void;
  onClear: () => void;
}) {
  const t = useTranslations();
  const recentRecords = records.slice(0, 5);

  return (
    <section className="border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-[var(--color-muted)]">
            {t("proPick.historyHeading")}
          </h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {t("proPick.historyCount", { count: records.length })}
          </p>
        </div>
        {records.length > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="border border-[var(--color-line)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
          >
            {t("proPick.historyClear")}
          </button>
        ) : null}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button type="button" disabled={!canRecord} onClick={() => onRecord("left")} className="min-h-10 border border-[var(--color-line)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-45">
          {t("proPick.recordTeamA")}
        </button>
        <button type="button" disabled={!canRecord || !hasRight} onClick={() => onRecord("right")} className="min-h-10 border border-[var(--color-line)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-45">
          {t("proPick.recordTeamB")}
        </button>
        <button type="button" disabled={!canRecord} onClick={() => onRecord("draw")} className="min-h-10 border border-[var(--color-line)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-45">
          {t("proPick.recordDraw")}
        </button>
      </div>
      {recentRecords.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {recentRecords.map((record) => (
            <div key={record.id} className="border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2 text-xs text-[var(--color-muted)]">
              <span className="font-semibold text-[var(--color-ink)]">{getOutcomeLabel(record, t)}</span>
              <span> / {record.left.team}</span>
              {record.right ? <span> vs {record.right.team}</span> : null}
              <span> / {record.left.map}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ProPickAgentTile({ agent }: { agent: Agent }) {
  const t = useTranslations();
  const { accent } = ROLE_META[agent.role];
  const [c0, c1] = agent.gradient.length >= 2 ? agent.gradient : [accent, "#0f1923"];

  return (
    <div className="clip-card min-w-0 overflow-hidden border border-[var(--color-line)] bg-[var(--color-surface-2)]">
      <div className="relative aspect-[1/1] w-full overflow-hidden" style={{ background: `linear-gradient(160deg, ${c0}, ${c1})` }}>
        <Image
          src={agent.portrait}
          alt={agent.name}
          fill
          sizes="(max-width: 640px) 50vw, 140px"
          className="translate-y-[27%] scale-[2.35] object-contain object-bottom"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-deep)] via-transparent to-transparent" />
      </div>
      <div className="min-h-16 px-3 py-2.5">
        <p className="break-words font-display text-base font-bold leading-tight text-white">{agent.name}</p>
        <p className="mt-1 break-words text-[11px] font-semibold uppercase tracking-wider" style={{ color: accent }}>
          {t(`roles.${agent.role}`)}
        </p>
      </div>
    </div>
  );
}

function withDrawId(proPick: ProPick, drawId: number): DrawnPick {
  return { ...proPick, drawId };
}

function stripDrawId({ drawId: _drawId, ...pick }: DrawnPick): ProPick {
  return pick;
}

function getOpponentLabel(proPick: ProPick) {
  const teams = proPick.match.split(" vs ");
  const opponent = teams.find((team) => team !== proPick.team);
  return opponent ? `vs ${opponent}` : proPick.match;
}

function formatPick(label: string, pick: ProPick) {
  return `${label}: ${pick.team}\nMap: ${pick.map}\nEvent: ${pick.event}\nMatch: ${pick.match}\nAgents: ${pick.agents.join(" / ")}`;
}

function getOutcomeLabel(record: MatchRecord, t: ReturnType<typeof useTranslations>) {
  if (record.outcome === "draw") return t("proPick.outcomeDraw");
  if (record.outcome === "left") return t("proPick.outcomeWinner", { team: record.left.team });
  return t("proPick.outcomeWinner", { team: record.right?.team ?? "Team B" });
}

function pickOne<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function unique(items: string[]) {
  return [...new Set(items)].sort((a, b) => a.localeCompare(b));
}
