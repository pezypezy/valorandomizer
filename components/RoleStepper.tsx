"use client";

import { useTranslations } from "next-intl";
import clsx from "clsx";
import { type Role, ROLE_META } from "@/lib/roles";
import { Frame } from "./ui/Frame";
import { RoleIcon } from "./ui/RoleIcon";

export function RoleStepper({
  role,
  count,
  available,
  canIncrement,
  onChange,
}: {
  role: Role;
  count: number;
  available: number;
  canIncrement: boolean;
  onChange: (delta: number) => void;
}) {
  const t = useTranslations();
  const { accent, glow } = ROLE_META[role];
  const active = count > 0;

  return (
    <Frame
      accent={active ? accent : "var(--color-line)"}
      glow={active ? glow : undefined}
      className="transition-shadow"
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2" style={{ color: accent }}>
            <RoleIcon role={role} className="h-5 w-5" />
            <span className="font-display text-sm font-bold uppercase tracking-wider text-[var(--color-ink)]">
              {t(`roles.${role}`)}
            </span>
          </div>
          <span className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
            {t("config.available", { count: available })}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <StepBtn
            label="−"
            onClick={() => onChange(-1)}
            disabled={count <= 0}
            accent={accent}
          />
          <span
            className="font-display text-4xl font-bold tabular-nums"
            style={{ color: active ? accent : "var(--color-muted)" }}
          >
            {count}
          </span>
          <StepBtn
            label="+"
            onClick={() => onChange(1)}
            disabled={!canIncrement}
            accent={accent}
          />
        </div>
      </div>
    </Frame>
  );
}

function StepBtn({
  label,
  onClick,
  disabled,
  accent,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  accent: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "flex h-9 w-9 items-center justify-center border text-lg leading-none transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-30",
        "border-[var(--color-line)] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface)]",
      )}
      style={{ color: accent }}
    >
      {label}
    </button>
  );
}
