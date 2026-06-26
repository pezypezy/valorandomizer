"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AGENTS } from "@/lib/agents";
import { PRO_PICKS, type ProPick } from "@/lib/pro-picks";
import { type Agent, ROLE_META } from "@/lib/roles";
import { Button } from "./ui/Button";

type SideMode = "both" | "single" | "mirror";
type DrawnPick = ProPick & { drawId: number };
type PickFilters = {
  map: string;
  event: string;
  region: string;
  team: string;
};

const ALL = "all";
const DEFAULT_FILTERS: PickFilters = { map: ALL, event: ALL, region: ALL, team: ALL };

export function ProPickPicker() {
  const t = useTranslations();
  const [leftFilters, setLeftFilters] = useState<PickFilters>(DEFAULT_FILTERS);
  const [rightFilters, setRightFilters] = useState<PickFilters>(DEFAULT_FILTERS);
  const [sideMode, setSideMode] = useState<SideMode>("both");
  const [left, setLeft] = useState<DrawnPick | null>(null);
  const [right, setRight] = useState<DrawnPick | null>(null);
  const [drawCounter, setDrawCounter] = useState(0);

  const maps = useMemo(() => unique(PRO_PICKS.map((pick) => pick.map)), []);
  const events = useMemo(() => unique(PRO_PICKS.map((pick) => pick.event)), []);
  const regions = useMemo(() => unique(PRO_PICKS.map((pick) => pick.region)), []);
  const teams = useMemo(() => unique(PRO_PICKS.map((pick) => pick.team)), []);

  const agentByName = useMemo(() => {
    return new Map(AGENTS.map((agent) => [agent.name, agent]));
  }, []);

  const leftCandidates = useMemo(() => filterPicks(leftFilters), [leftFilters]);
  const rightCandidates = useMemo(() => filterPicks(rightFilters), [rightFilters]);

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

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-[var(--color-muted)]">
            {t("proPick.heading")}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {t("proPick.subtitle")}
          </p>
        </div>
        <span className="border border-[var(--color-line)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          A {leftCandidates.length} / B {sideMode === "both" ? rightCandidates.length : "-"}
        </span>
      </div>

      <div className="grid gap-4 overflow-x-auto pb-1 lg:grid-cols-[minmax(46rem,1fr)_minmax(46rem,1fr)_minmax(9rem,auto)]">
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
        <div className="flex min-w-36 flex-col gap-3 lg:self-end">
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
            className="min-h-12 w-full px-8 py-3 text-base"
          >
            {t("proPick.pick")}
          </Button>
        </div>
      </div>

      <div className="relative grid gap-4 pt-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <PickResult key={left?.drawId ?? "left-empty"} label="Team A" pick={left} agentByName={agentByName} />
        <PickResult key={right?.drawId ?? "right-empty"} label="Team B" pick={right} agentByName={agentByName} />
        <div className="hidden lg:block lg:min-w-36" aria-hidden="true" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-6 font-display text-2xl font-bold text-[var(--color-primary)] lg:block">
          VS
        </div>
      </div>
    </section>
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
    <div className="min-w-[46rem] border border-[var(--color-line)] bg-[var(--color-surface)] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-muted)]">{title}</h3>
        {disabled && disabledText ? (
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">{disabledText}</span>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(7rem,0.8fr)_minmax(10rem,1.2fr)_minmax(8rem,0.9fr)_minmax(10rem,1.1fr)]">
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
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-ink)] outline-none disabled:cursor-not-allowed disabled:opacity-45"
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
    <article className="clip-frame border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
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

function getOpponentLabel(proPick: ProPick) {
  const teams = proPick.match.split(" vs ");
  const opponent = teams.find((team) => team !== proPick.team);
  return opponent ? `vs ${opponent}` : proPick.match;
}

function pickOne<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function unique(items: string[]) {
  return [...new Set(items)].sort((a, b) => a.localeCompare(b));
}
