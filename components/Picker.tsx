"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import { AGENTS } from "@/lib/agents";
import { ROLES, TEAM_SIZE, type Agent, type Role } from "@/lib/roles";
import {
  DEFAULT_COUNTS,
  type RoleCounts,
  countByRole,
  pickTeam,
  totalCount,
  validateCounts,
} from "@/lib/picker";
import { RoleStepper } from "./RoleStepper";
import { AgentCard } from "./AgentCard";
import { ProPickPicker } from "./ProPickPicker";
import { Button } from "./ui/Button";

type PickerMode = "random" | "pro";

type PickerProps = {
  initialMode?: PickerMode | null;
  locale: string;
};

const MODE_PATH: Record<PickerMode, string> = {
  random: "random-pick",
  pro: "pro-pick",
};

function randomCounts(available: RoleCounts): RoleCounts {
  const counts: RoleCounts = { Duelist: 0, Initiator: 0, Controller: 0, Sentinel: 0 };
  for (let i = 0; i < TEAM_SIZE; i++) {
    const open = ROLES.filter((r) => counts[r] < available[r]);
    const r = open[Math.floor(Math.random() * open.length)];
    counts[r]++;
  }
  return counts;
}

function routeFor(locale: string, mode: PickerMode) {
  return `/${locale}/${MODE_PATH[mode]}`;
}

function readCountParam(params: URLSearchParams, key: string, fallback: number, max: number) {
  const raw = params.get(key);
  if (raw === null) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 0 || value > max) return fallback;
  return value;
}

function buildRandomUrl(counts: RoleCounts) {
  const url = new URL(window.location.href);
  url.searchParams.set("duelist", String(counts.Duelist));
  url.searchParams.set("initiator", String(counts.Initiator));
  url.searchParams.set("controller", String(counts.Controller));
  url.searchParams.set("sentinel", String(counts.Sentinel));
  return `${url.pathname}?${url.searchParams.toString()}`;
}

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

export function Picker({ initialMode = null, locale }: PickerProps) {
  const t = useTranslations();
  const router = useRouter();
  const available = useMemo(() => countByRole(AGENTS), []);
  const hydratedRandomParams = useRef(false);

  const [mode, setMode] = useState<PickerMode | null>(initialMode);
  const [counts, setCounts] = useState<RoleCounts>(DEFAULT_COUNTS);
  const [team, setTeam] = useState<Agent[] | null>(null);
  const [locked, setLocked] = useState<Set<string>>(new Set());
  const [rollId, setRollId] = useState(0);
  const [copyState, setCopyState] = useState<"idle" | "url" | "result">("idle");

  const total = totalCount(counts);
  const valid = validateCounts(AGENTS, counts).ok;

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (initialMode !== "random" || hydratedRandomParams.current) return;

    const params = new URL(window.location.href).searchParams;
    const nextCounts: RoleCounts = {
      Duelist: readCountParam(params, "duelist", DEFAULT_COUNTS.Duelist, available.Duelist),
      Initiator: readCountParam(params, "initiator", DEFAULT_COUNTS.Initiator, available.Initiator),
      Controller: readCountParam(params, "controller", DEFAULT_COUNTS.Controller, available.Controller),
      Sentinel: readCountParam(params, "sentinel", DEFAULT_COUNTS.Sentinel, available.Sentinel),
    };

    if (validateCounts(AGENTS, nextCounts).ok) setCounts(nextCounts);
    hydratedRandomParams.current = true;
  }, [available, initialMode]);

  useEffect(() => {
    if (mode !== "random" || !hydratedRandomParams.current) return;
    if (!window.location.pathname.endsWith("/random-pick")) return;
    window.history.replaceState(null, "", buildRandomUrl(counts));
  }, [counts, mode]);

  function chooseMode(nextMode: PickerMode) {
    router.push(routeFor(locale, nextMode));
  }

  function goBackToModeSelect() {
    router.push(`/${locale}`);
  }

  function changeCount(role: Role, delta: number) {
    setCounts((prev) => {
      const next = prev[role] + delta;
      if (next < 0 || next > available[role]) return prev;
      if (delta > 0 && total >= TEAM_SIZE) return prev;
      return { ...prev, [role]: next };
    });
  }

  function roll(withCounts: RoleCounts = counts) {
    if (!validateCounts(AGENTS, withCounts).ok) return;
    const lockedAgents = team?.filter((a) => locked.has(a.id)) ?? [];
    const next = pickTeam(AGENTS, withCounts, lockedAgents);
    setTeam(next);
    setLocked((prev) => new Set([...prev].filter((id) => next.some((a) => a.id === id))));
    setRollId((n) => n + 1);
  }

  function fullRandom() {
    const c = randomCounts(available);
    setCounts(c);
    setLocked(new Set());
    setTeam(pickTeam(AGENTS, c));
    setRollId((n) => n + 1);
  }

  function rerollOne(slot: number) {
    if (!team) return;
    const target = team[slot];
    const used = new Set(team.map((a) => a.id));
    const pool = AGENTS.filter((a) => a.role === target.role && !used.has(a.id));
    if (pool.length === 0) return;
    const replacement = pool[Math.floor(Math.random() * pool.length)];
    setTeam(team.map((a, i) => (i === slot ? replacement : a)));
    setLocked((prev) => {
      const n = new Set(prev);
      n.delete(target.id);
      return n;
    });
  }

  function toggleLock(id: string) {
    setLocked((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function copyCurrentUrl() {
    const url = typeof window === "undefined" ? routeFor(locale, "random") : window.location.href;
    await copyText(url);
    setCopyState("url");
    window.setTimeout(() => setCopyState("idle"), 1600);
  }

  async function copyRandomResult() {
    if (!team) return;
    const grouped = ROLES
      .map((role) => {
        const names = team.filter((agent) => agent.role === role).map((agent) => agent.name).join(" / ") || "-";
        return `${t(`roles.${role}`)}: ${names}`;
      })
      .join("\n");

    await copyText(`VALORANDOMIZER RANDOM PICK\n${grouped}\n\n${window.location.href}`);
    setCopyState("result");
    window.setTimeout(() => setCopyState("idle"), 1600);
  }

  return (
    <div className="flex flex-col gap-10 pt-2">
      <AnimatePresence mode="wait">
        {!mode ? (
          <LandingPage key="landing" onSelect={chooseMode} />
        ) : (
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 22, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -18, filter: "blur(8px)" }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-10"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button variant="ghost" onClick={goBackToModeSelect} className="px-4">
                {t("mode.back")}
              </Button>
              {mode === "random" ? (
                <Button variant="ghost" onClick={copyCurrentUrl} className="px-4">
                  {copyState === "url" ? t("share.copied") : t("share.url")}
                </Button>
              ) : null}
            </div>

            {mode === "random" ? (
              <>
                <section className="text-center">
                  <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-[var(--color-primary)]">
                    {t("landing.randomEyebrow")}
                  </p>
                  <h1 className="mt-3 font-display text-4xl font-bold tracking-wide text-[var(--color-ink)] sm:text-5xl">
                    {t("app.tagline")}
                  </h1>
                  <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[var(--color-muted)]">
                    {t("app.subtitle")}
                  </p>
                </section>

                <section className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-[var(--color-muted)]">
                      {t("config.heading")}
                    </h2>
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => setCounts(DEFAULT_COUNTS)}
                        className="border border-[var(--color-line)] px-3 py-1.5 text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
                      >
                        {t("config.balanced")}
                      </button>
                      <button
                        type="button"
                        onClick={fullRandom}
                        className="border border-[var(--color-line)] px-3 py-1.5 text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
                      >
                        {t("config.fullRandom")}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {ROLES.map((role) => (
                      <RoleStepper
                        key={role}
                        role={role}
                        count={counts[role]}
                        available={available[role]}
                        canIncrement={total < TEAM_SIZE && counts[role] < available[role]}
                        onChange={(delta) => changeCount(role, delta)}
                      />
                    ))}
                  </div>

                  <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs uppercase tracking-wider text-[var(--color-muted)]">
                        {t("config.total")}
                      </span>
                      <span
                        className="font-display text-3xl font-bold tabular-nums"
                        style={{ color: valid ? "var(--color-sentinel)" : "var(--color-primary)" }}
                      >
                        {total}
                      </span>
                      <span className="text-sm text-[var(--color-muted)]">
                        {t("config.slash", { size: TEAM_SIZE })}
                      </span>
                    </div>
                    <Button onClick={() => roll()} disabled={!valid} className="w-full px-8 py-3 text-base sm:w-auto">
                      {valid ? t("actions.randomize") : t("actions.mustTotal", { size: TEAM_SIZE })}
                    </Button>
                  </div>
                </section>

                <section className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-[var(--color-muted)]">
                      {t("result.heading")}
                    </h2>
                    {team ? (
                      <Button variant="ghost" onClick={copyRandomResult} className="px-4">
                        {copyState === "result" ? t("share.copied") : t("actions.copy")}
                      </Button>
                    ) : null}
                  </div>
                  <AnimatePresence mode="wait">
                    {team ? (
                      <motion.div
                        key={rollId}
                        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
                      >
                        {team.map((agent, i) => (
                          <AgentCard
                            key={`${agent.id}-${i}`}
                            agent={agent}
                            index={i}
                            locked={locked.has(agent.id)}
                            onToggleLock={() => toggleLock(agent.id)}
                            onReroll={() => rerollOne(i)}
                          />
                        ))}
                      </motion.div>
                    ) : (
                      <motion.p
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="border border-dashed border-[var(--color-line)] px-6 py-16 text-center text-sm text-[var(--color-muted)]"
                      >
                        {t("result.empty")}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  {team && (
                    <div className="flex justify-center pt-2">
                      <Button variant="ghost" onClick={() => roll()} className="px-8">
                        {t("actions.rollAgain")}
                      </Button>
                    </div>
                  )}
                </section>
              </>
            ) : (
              <ProPickPicker />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LandingPage({ onSelect }: { onSelect: (mode: PickerMode) => void }) {
  const t = useTranslations();

  return (
    <motion.div
      initial={{ opacity: 0, filter: "blur(8px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, filter: "blur(8px)" }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-10"
    >
      <section className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden border-y border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.35em] text-[var(--color-primary)]">
              {t("landing.eyebrow")}
            </p>
            <h1 className="mt-5 max-w-4xl font-display text-[clamp(3.2rem,8vw,7rem)] font-bold leading-none tracking-wide text-[var(--color-ink)]">
              {t("landing.title")}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--color-muted)] sm:text-lg">
              {t("landing.description")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button type="button" onClick={() => onSelect("random")} className="px-7 py-3">
                {t("landing.randomCta")}
              </Button>
              <Button type="button" variant="ghost" onClick={() => onSelect("pro")} className="px-7 py-3">
                {t("landing.proCta")}
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <LandingStat value="5" label={t("landing.statTeam")} />
            <LandingStat value="4" label={t("landing.statRoles")} />
            <LandingStat value="VCT" label={t("landing.statPro")} />
          </div>
        </div>
      </section>

      <ModeSelection onSelect={onSelect} />

      <section className="grid gap-3 md:grid-cols-3">
        <InfoCard title={t("landing.howOneTitle")} body={t("landing.howOneBody")} />
        <InfoCard title={t("landing.howTwoTitle")} body={t("landing.howTwoBody")} />
        <InfoCard title={t("landing.howThreeTitle")} body={t("landing.howThreeBody")} />
      </section>

      <section className="clip-frame border border-[var(--color-line)] bg-[var(--color-surface)] p-6 sm:p-8">
        <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-[var(--color-primary)]">
          {t("landing.useCaseEyebrow")}
        </p>
        <h2 className="mt-3 font-display text-2xl font-bold text-[var(--color-ink)] sm:text-3xl">
          {t("landing.useCaseTitle")}
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--color-muted)]">
          {t("landing.useCaseBody")}
        </p>
      </section>
    </motion.div>
  );
}

function ModeSelection({ onSelect }: { onSelect: (mode: PickerMode) => void }) {
  const t = useTranslations();

  return (
    <section className="relative left-1/2 grid w-screen -translate-x-1/2 overflow-hidden border-y border-[var(--color-line)] md:grid-cols-2">
      <SplitChoice
        title="RANDOM PICK"
        description={t("mode.randomDescription")}
        meta={t("mode.randomMeta")}
        accent="var(--color-primary)"
        direction="left"
        onClick={() => onSelect("random")}
      />
      <SplitChoice
        title="PRO PICK"
        description={t("mode.proDescription")}
        meta={t("mode.proMeta")}
        accent="var(--color-sentinel)"
        direction="right"
        onClick={() => onSelect("pro")}
      />
    </section>
  );
}

function LandingStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="clip-frame border border-[var(--color-line)] bg-[var(--color-surface-2)] p-5">
      <p className="font-display text-4xl font-bold text-[var(--color-primary)]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{label}</p>
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="clip-card border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
      <h3 className="font-display text-lg font-bold text-[var(--color-ink)]">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">{body}</p>
    </article>
  );
}

function SplitChoice({
  title,
  description,
  meta,
  accent,
  direction,
  onClick,
}: {
  title: string;
  description: string;
  meta: string;
  accent: string;
  direction: "left" | "right";
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, x: direction === "left" ? -36 : 36 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="group relative flex min-h-[22rem] overflow-hidden border-b border-[var(--color-line)] bg-[var(--color-surface)] px-8 py-10 text-left transition-colors hover:bg-[var(--color-surface-2)] sm:px-12 md:min-h-[30rem] md:border-b-0 md:border-r md:px-14 lg:px-20 last:md:border-r-0"
    >
      <div
        className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `linear-gradient(135deg, ${accent}, transparent 34%)` }}
      />
      <div
        className="absolute inset-x-0 top-0 h-1 md:inset-y-0 md:inset-x-auto md:h-auto md:w-1"
        style={{ background: accent, [direction === "left" ? "right" : "left"]: 0 }}
      />
      <div className="relative flex w-full flex-col justify-between gap-10 self-stretch">
        <div className="max-w-2xl pt-6 md:pt-10">
          <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-[var(--color-muted)] sm:text-sm">
            {meta}
          </p>
          <h2 className="mt-5 font-display text-[clamp(3.5rem,5.6vw,7rem)] font-bold leading-none tracking-wide text-[var(--color-ink)]">
            {title}
          </h2>
          <p className="mt-6 max-w-xl text-sm leading-7 text-[var(--color-muted)] sm:text-base">
            {description}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 pb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Select
          </span>
          <span
            className="flex h-12 w-12 items-center justify-center border border-[var(--color-line)] text-2xl transition-transform group-hover:translate-x-1"
            style={{ color: accent }}
            aria-hidden="true"
          >
            →
          </span>
        </div>
      </div>
    </motion.button>
  );
}
