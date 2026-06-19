"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { type Agent, ROLE_META } from "@/lib/roles";
import { RoleIcon } from "./ui/RoleIcon";

export function AgentCard({
  agent,
  index,
  locked,
  onToggleLock,
  onReroll,
}: {
  agent: Agent;
  index: number;
  locked: boolean;
  onToggleLock: () => void;
  onReroll: () => void;
}) {
  const t = useTranslations();
  const { accent, glow } = ROLE_META[agent.role];
  const [c0, c1] = agent.gradient.length >= 2 ? agent.gradient : [accent, "#0f1923"];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 28, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      className="clip-card group relative overflow-hidden"
      style={{ boxShadow: `0 0 0 1px ${accent}, 0 12px 30px -10px ${glow}` }}
    >
      {/* gradient backdrop from agent colors */}
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(160deg, ${c0}, ${c1})` }}
      />
      <div className="relative aspect-[3/4] w-full">
        <Image
          src={agent.portrait}
          alt={agent.name}
          fill
          sizes="(max-width: 640px) 50vw, 20vw"
          className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-deep)] via-transparent to-transparent" />

        {/* controls */}
        <div className="absolute right-2 top-2 flex flex-col gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <IconButton title={t("actions.reroll")} onClick={onReroll}>
            <RerollGlyph />
          </IconButton>
          <IconButton
            title={locked ? t("actions.locked") : t("actions.lock")}
            onClick={onToggleLock}
            active={locked}
          >
            <LockGlyph open={!locked} />
          </IconButton>
        </div>

        {locked && (
          <span
            className="absolute left-2 top-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
            style={{ background: accent }}
          >
            {t("actions.locked")}
          </span>
        )}
      </div>

      {/* footer */}
      <div className="relative flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-bold leading-none text-white">
            {agent.name}
          </p>
          <p
            className="mt-1 text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: accent }}
          >
            {t(`roles.${agent.role}`)}
          </p>
        </div>
        <RoleIcon role={agent.role} className="h-6 w-6 shrink-0" style={{ color: accent }} />
      </div>
    </motion.div>
  );
}

function IconButton({
  children,
  title,
  onClick,
  active,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={clsx(
        "flex h-8 w-8 items-center justify-center border border-white/20 backdrop-blur-sm transition-colors",
        active
          ? "bg-[var(--color-primary)] text-white"
          : "bg-black/40 text-white hover:bg-black/70",
      )}
    >
      {children}
    </button>
  );
}

function RerollGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 4v5h-5" />
    </svg>
  );
}

function LockGlyph({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      {open ? <path d="M8 11V8a4 4 0 0 1 7.5-2" /> : <path d="M8 11V8a4 4 0 0 1 8 0v3" />}
    </svg>
  );
}
