"use client";

import { useMemo, useState } from "react";
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

/** Random composition of TEAM_SIZE across the four roles (respecting pools). */
function randomCounts(available: RoleCounts): RoleCounts {
  const counts: RoleCounts = { Duelist: 0, Initiator: 0, Controller: 0, Sentinel: 0 };
  for (let i = 0; i < TEAM_SIZE; i++) {
    const open = ROLES.filter((r) => counts[r] < available[r]);
    const r = open[Math.floor(Math.random() * open.length)];
    counts[r]++;
  }
  return counts;
}

export function Picker() {
  const t = useTranslations();
  const available = useMemo(() => countByRole(AGENTS), []);

  const [counts, setCounts] = useState<RoleCounts>(DEFAULT_COUNTS);
  const [team, setTeam] = useState<Agent[] | null>(null);
  const [locked, setLocked] = useState<Set<string>>(new Set());
  const [rollId, setRollId] = useState(0);

  const total = totalCount(counts);
  const valid = validateCounts(AGENTS, counts).ok;

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

  return (
    <div className="flex flex-col gap-10 pt-2">
      <section className="text-center">
        <h1 className="font-display text-4xl font-bold tracking-wide text-[var(--color-ink)] sm:text-5xl">
          {t("app.tagline")}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--color-muted)]">
          {t("app.subtitle")}
        </p>
      </section>

      {/* Role configuration */}
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

        {/* Total + action */}
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

      {/* Result */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-[var(--color-muted)]">
          {t("result.heading")}
        </h2>
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

      <ProPickPicker />
    </div>
  );
}
