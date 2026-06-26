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

const ALL = "all";

export function ProPickPicker() {
  const t = useTranslations();
  const [map, setMap] = useState(ALL);
  const [event, setEvent] = useState(ALL);
  const [team, setTeam] = useState(ALL);
  const [sideMode, setSideMode] = useState<SideMode>("both");
  const [left, setLeft] = useState<DrawnPick | null>(null);
  const [right, setRight] = useState<DrawnPick | null>(null);
  const [drawCounter, setDrawCounter] = useState(0);

  const maps = useMemo(() => unique(PRO_PICKS.map((pick) => pick.map)), []);
  const events = useMemo(() => unique(PRO_PICKS.map((pick) => pick.event)), []);
  const teams = useMemo(() => unique(PRO_PICKS.map((pick) => pick.team)), []);

  const agentByName = useMemo(() => {
    return new Map(AGENTS.map((agent) => [agent.name, agent]));
  }, []);

  const candidates = useMemo(() => {
    return PRO_PICKS.filter((pick) => {
      return (
        (map === ALL || pick.map === map) &&
        (event === ALL || pick.event === event) &&
        (team === ALL || pick.team === team)
      );
    });
  }, [event, map, team]);

  function draw() {
    if (candidates.length === 0) {
      setLeft(null);
      setRight(null);
      return;
    }

    const nextDrawId = drawCounter + 1;
    const first = withDrawId(pickOne(candidates), nextDrawId);
    let second: DrawnPick | null = withDrawId(pickOne(candidates), nextDrawId + 1000);

    if (sideMode === "single") second = null;
    if (sideMode === "mirror") second = withDrawId(first, nextDrawId + 1000);
    if (sideMode === "both" && candidates.length > 1) {
      while (second?.id === first.id) second = withDrawId(pickOne(candidates), nextDrawId + 1000);
    }

    setDrawCounter(nextDrawId);
    setLeft(first);
    setRight(second);
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
          {t("proPick.count", { count: candidates.length })}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
        <Select label={t("proPick.map")} value={map} values={[ALL, ...maps]} onChange={setMap} allLabel={t("proPick.all")} />
        <Select label={t("proPick.event")} value={event} values={[ALL, ...events]} onChange={setEvent} allLabel={t("proPick.all")} />
        <Select label={t("proPick.team")} value={team} values={[ALL, ...teams]} onChange={setTeam} allLabel={t("proPick.all")} />
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
          disabled={candidates.length === 0}
          className="min-h-12 w-full px-8 py-3 text-base lg:w-auto lg:self-end"
        >
          {t("proPick.pick")}
        </Button>
      </div>

      <div className="grid gap-4 pt-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <PickResult key={left?.drawId ?? "left-empty"} label="Team A" pick={left} agentByName={agentByName} />
        <div className="hidden min-h-16 items-center justify-center border border-[var(--color-line)] bg-[var(--color-surface)] px-4 font-display text-2xl font-bold text-[var(--color-primary)] lg:flex">
          VS
        </div>
        <PickResult key={right?.drawId ?? "right-empty"} label="Team B" pick={right} agentByName={agentByName} />
      </div>
    </section>
  );
}

function Select({
  label,
  value,
  values,
  labels,
  allLabel,
  onChange,
}: {
  label: string;
  value: string;
  values: string[];
  labels?: Record<string, string>;
  allLabel?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-ink)] outline-none"
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
          <p className="text-sm text-[var(--color-muted)]">{getOpponentLabel(pick)}</p>
        </div>
        {pick.source ? (
          <a
            href={pick.source}
            target="_blank"
            rel="noreferrer"
            className="w-fit border border-[var(--color-line)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
          >
            {t("proPick.source")}
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
      <div className="relative aspect-[4/5] w-full" style={{ background: `linear-gradient(160deg, ${c0}, ${c1})` }}>
        <Image
          src={agent.portrait}
          alt={agent.name}
          fill
          sizes="(max-width: 640px) 50vw, 140px"
          className="object-contain object-bottom p-1"
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
