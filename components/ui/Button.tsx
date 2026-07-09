"use client";

import type { ReactNode } from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import clsx from "clsx";

type Variant = "primary" | "ghost";

export function Button({
  children,
  variant = "primary",
  className,
  accent,
  ...props
}: {
  children: ReactNode;
  variant?: Variant;
  accent?: string;
} & HTMLMotionProps<"button">) {
  const isPrimary = variant === "primary";
  return (
    <motion.button
      whileHover={props.disabled ? undefined : { scale: 1.02 }}
      whileTap={props.disabled ? undefined : { scale: 0.97 }}
      className={clsx(
        "clip-btn font-display relative inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold uppercase tracking-wider transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-40",
        isPrimary
          ? "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-soft)]"
          : "border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-surface-2)]",
        className,
      )}
      style={
        accent
          ? { backgroundColor: accent, color: "#0e151c" }
          : undefined
      }
      {...props}
    >
      {children}
    </motion.button>
  );
}
