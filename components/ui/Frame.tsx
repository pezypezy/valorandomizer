import type { CSSProperties, ReactNode } from "react";
import clsx from "clsx";

/**
 * Angular sci-fi frame: a 1px accent border drawn by stacking two clipped
 * layers (outer accent, inner surface). Inspired by arwes frames.
 */
export function Frame({
  children,
  accent = "var(--color-line)",
  glow,
  surface = "var(--color-surface)",
  className,
  innerClassName,
  style,
}: {
  children?: ReactNode;
  accent?: string;
  glow?: string;
  surface?: string;
  className?: string;
  innerClassName?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={clsx("clip-frame p-px", className)}
      style={{
        background: accent,
        boxShadow: glow ? `0 0 24px -2px ${glow}` : undefined,
        ...style,
      }}
    >
      <div
        className={clsx("clip-frame h-full w-full", innerClassName)}
        style={{ background: surface }}
      >
        {children}
      </div>
    </div>
  );
}
