import type { CSSProperties, ReactNode } from "react";
import type { Role } from "@/lib/roles";

const GLYPHS: Record<Role, ReactNode> = {
  Duelist: <path d="M12 2 L15 9 L12 21 L9 9 Z" />,
  Initiator: (
    <>
      <path d="M2 12 C5 7 19 7 22 12 C19 17 5 17 2 12 Z" />
      <circle cx="12" cy="12" r="3.2" />
    </>
  ),
  Controller: (
    <>
      <path d="M12 2.5 L20 7 V17 L12 21.5 L4 17 V7 Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  Sentinel: (
    <>
      <path d="M12 2.5 L19.5 5.2 V11 C19.5 15.8 16 19.5 12 21.5 C8 19.5 4.5 15.8 4.5 11 V5.2 Z" />
      <path d="M9 12 l2 2 l4 -4" />
    </>
  ),
};

export function RoleIcon({
  role,
  className,
  style,
}: {
  role: Role;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinejoin="round"
      strokeLinecap="round"
      className={className}
      style={style}
      aria-hidden
    >
      {GLYPHS[role]}
    </svg>
  );
}
