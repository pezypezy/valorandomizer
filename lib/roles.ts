export const ROLES = ["Duelist", "Initiator", "Controller", "Sentinel"] as const;
export type Role = (typeof ROLES)[number];

export interface Agent {
  id: string;
  name: string;
  role: Role;
  /** path under /public, e.g. /agents/<id>/portrait.png */
  portrait: string;
  icon: string;
  /** agent background gradient colors as #rrggbb, brightest first */
  gradient: string[];
}

export interface RoleMeta {
  role: Role;
  /** primary accent color (solid) */
  accent: string;
  /** translucent glow used for shadows/borders */
  glow: string;
}

/** Per-role accent palette. Duelist mirrors the brand red; the rest are distinct. */
export const ROLE_META: Record<Role, RoleMeta> = {
  Duelist: { role: "Duelist", accent: "#ff4655", glow: "rgba(255,70,85,0.45)" },
  Initiator: { role: "Initiator", accent: "#f5d04e", glow: "rgba(245,208,78,0.45)" },
  Controller: { role: "Controller", accent: "#9d6bff", glow: "rgba(157,107,255,0.45)" },
  Sentinel: { role: "Sentinel", accent: "#36d6b0", glow: "rgba(54,214,176,0.42)" },
};

export const TEAM_SIZE = 5;
