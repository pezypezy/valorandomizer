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

type PickerMode = "random" | "pro";

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

  const [mode, setMode] = useState<PickerMode | null>(null);
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
      <AnimatePresence mode="wait">
        {!mode ? (
          <ModeSelection key="mode-select" onSelect={setMode} />
        ) : (
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 22, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -18, filter: "blur(8px)" }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-10"
          >
            <div className="flex justify-start">
              <Button variant="ghost" onClick={() => setMode(null)} className="px-4">
                {t("mode.back")}
              </Button>
            </div>

            {mode === "random" ? (
              <>
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

function ModeSelection({ onSelect }: { onSelect: (mode: PickerMode) => void }) {
  const t = useTranslations();

  return (
    <motion.section
      initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -18, filter: "blur(8px)" }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      className="flex min-h-[62vh] flex-col justify-center gap-8"
    >
      <div className="text-center">
        <p className="font-display text-sm font-bold uppercase tracking-[0.3em] text-[var(--color-primary)]">
          {t("mode.eyebrow")}
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-wide text-[var(--color-ink)] sm:text-5xl">
          {t("mode.heading")}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--color-muted)]">
          {t("mode.subtitle")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ModeCard
          title={t("mode.randomTitle")}
          description={t("mode.randomDescription")}
          meta={t("mode.randomMeta")}
          accent="var(--color-primary)"
          onClick={() => onSelect("random")}
        />
        <ModeCard
          title={t("mode.proTitle")}
          description={t("mode.proDescription")}
          meta={t("mode.proMeta")}
          accent="var(--color-sentinel)"
          onClick={() => onSelect("pro")}
        />
      </div>
    </motion.section>
  );
}

function ModeCard({
  title,
  description,
  meta,
  accent,
  onClick,
}: {
  title: string;
  description: string;
  meta: string;
  accent: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -6, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="clip-frame group relative min-h-64 overflow-hidden border border-[var(--color-line)] bg-[var(--color-surface)] p-5 text-left transition-colors hover:bg-[var(--color-surface-2)]"
      style={{ boxShadow: `0 0 0 1px ${accent}` }}
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: accent }}
      />
      <div className="flex h-full flex-col justify-between gap-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
            {meta}
          </p>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-wide text-[var(--color-ink)]">
            {title}
          </h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-[var(--color-muted)]">
            {description}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Select
          </span>
          <span
            className="flex h-10 w-10 items-center justify-center border border-[var(--color-line)] text-lg transition-transform group-hover:translate-x-1"
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
