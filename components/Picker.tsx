"use client";

import { useEffect, useMemo, useState } from "react";
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
import { AgentCard } from "./AgentCard";
import { RoleStepper } from "./RoleStepper";
import { Button } from "./ui/Button";

function randomItem<T>(items: readonly T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(Math.random() * items.length)];
}

function randomCounts(available: RoleCounts): RoleCounts {
  const counts: RoleCounts = {
    Duelist: 0,
    Initiator: 0,
    Controller: 0,
    Sentinel: 0,
  };

  for (let index = 0; index < TEAM_SIZE; index++) {
    const openRoles = ROLES.filter((role) => counts[role] < available[role]);
    const role = randomItem(openRoles);
    if (!role) break;
    counts[role] += 1;
  }

  return counts;
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

export function Picker({ initialCounts = DEFAULT_COUNTS }: { initialCounts?: RoleCounts }) {
  const t = useTranslations();
  const available = useMemo(() => countByRole(AGENTS), []);
  const [counts, setCounts] = useState<RoleCounts>(initialCounts);
  const [team, setTeam] = useState<Agent[] | null>(null);
  const [locked, setLocked] = useState<Set<string>>(new Set());
  const [rollId, setRollId] = useState(0);
  const [copyState, setCopyState] = useState<"idle" | "url" | "result">("idle");

  const total = totalCount(counts);
  const valid = validateCounts(AGENTS, counts).ok;

  useEffect(() => {
    if (!window.location.pathname.endsWith("/random-pick")) return;
    window.history.replaceState(null, "", buildRandomUrl(counts));
  }, [counts]);

  function clearResult() {
    setTeam(null);
    setLocked(new Set());
  }

  function changeCount(role: Role, delta: number) {
    const nextValue = counts[role] + delta;
    if (nextValue < 0 || nextValue > available[role]) return;
    if (delta > 0 && total >= TEAM_SIZE) return;
    setCounts({ ...counts, [role]: nextValue });
    clearResult();
  }

  function resetBalanced() {
    setCounts({ ...DEFAULT_COUNTS });
    clearResult();
  }

  function roll(withCounts: RoleCounts = counts) {
    if (!validateCounts(AGENTS, withCounts).ok) return;
    const lockedAgents = team?.filter((agent) => locked.has(agent.id)) ?? [];
    const next = pickTeam(AGENTS, withCounts, lockedAgents);
    setTeam(next);
    setLocked((previous) =>
      new Set([...previous].filter((id) => next.some((agent) => agent.id === id))),
    );
    setRollId((value) => value + 1);
  }

  function fullRandom() {
    const nextCounts = randomCounts(available);
    setCounts(nextCounts);
    setLocked(new Set());
    setTeam(pickTeam(AGENTS, nextCounts));
    setRollId((value) => value + 1);
  }

  function rerollOne(slot: number) {
    if (!team) return;
    const target = team[slot];
    if (!target) return;
    const used = new Set(team.map((agent) => agent.id));
    const pool = AGENTS.filter(
      (agent) => agent.role === target.role && !used.has(agent.id),
    );
    const replacement = randomItem(pool);
    if (!replacement) return;
    setTeam(team.map((agent, index) => (index === slot ? replacement : agent)));
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

  async function copyCurrentUrl() {
    await copyText(window.location.href);
    setCopyState("url");
    window.setTimeout(() => setCopyState("idle"), 1600);
  }

  async function copyRandomResult() {
    if (!team) return;
    const grouped = ROLES.map((role) => {
      const names =
        team
          .filter((agent) => agent.role === role)
          .map((agent) => agent.name)
          .join(" / ") || "-";
      return `${t(`roles.${role}`)}: ${names}`;
    }).join("\n");

    await copyText(`VALORANDOMIZER RANDOM PICK\n${grouped}\n\n${window.location.href}`);
    setCopyState("result");
    window.setTimeout(() => setCopyState("idle"), 1600);
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex justify-end">
        <Button variant="ghost" onClick={copyCurrentUrl} className="px-4">
          {copyState === "url" ? t("share.copied") : t("share.url")}
        </Button>
      </div>

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
              onClick={resetBalanced}
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
          <Button
            onClick={() => roll()}
            disabled={!valid}
            className="w-full px-8 py-3 text-base sm:w-auto"
          >
            {valid ? t("actions.randomize") : t("actions.mustTotal", { size: TEAM_SIZE })}
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-4" aria-live="polite">
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
        {team ? (
          <p className="sr-only" role="status">
            {t("result.announcement", { agents: team.map((agent) => agent.name).join(", ") })}
          </p>
        ) : null}
        <AnimatePresence mode="wait">
          {team ? (
            <motion.div
              key={rollId}
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
            >
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

        {team ? (
          <div className="flex justify-center pt-2">
            <Button variant="ghost" onClick={() => roll()} className="px-8">
              {t("actions.rollAgain")}
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
