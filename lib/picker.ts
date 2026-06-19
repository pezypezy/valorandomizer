import { type Agent, type Role, ROLES, TEAM_SIZE } from "./roles";

export type RoleCounts = Record<Role, number>;

/** Default lineup: 2 Duelists + 1 of each other role = 5. */
export const DEFAULT_COUNTS: RoleCounts = {
  Duelist: 2,
  Initiator: 1,
  Controller: 1,
  Sentinel: 1,
};

/** Fisher–Yates shuffle (returns a new array, does not mutate input). */
export function shuffle<T>(input: readonly T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** How many agents exist per role in the given roster. */
export function countByRole(roster: readonly Agent[]): RoleCounts {
  const counts = { Duelist: 0, Initiator: 0, Controller: 0, Sentinel: 0 };
  for (const a of roster) counts[a.role]++;
  return counts;
}

export function totalCount(counts: RoleCounts): number {
  return ROLES.reduce((sum, role) => sum + counts[role], 0);
}

export type Validation =
  | { ok: true; total: number }
  | { ok: false; total: number; reason: "total" | "pool" };

/** Counts are valid when they sum to the team size and never exceed the pool. */
export function validateCounts(roster: readonly Agent[], counts: RoleCounts): Validation {
  const total = totalCount(counts);
  const available = countByRole(roster);
  for (const role of ROLES) {
    if (counts[role] < 0 || counts[role] > available[role]) {
      return { ok: false, total, reason: "pool" };
    }
  }
  if (total !== TEAM_SIZE) return { ok: false, total, reason: "total" };
  return { ok: true, total };
}

/**
 * Picks a team honoring the per-role counts. Any `locked` agents are kept in
 * place (up to that role's count); the remaining slots are filled randomly with
 * unique agents from each role. Result is ordered by role, then pick order.
 */
export function pickTeam(
  roster: readonly Agent[],
  counts: RoleCounts,
  locked: readonly Agent[] = [],
): Agent[] {
  const result: Agent[] = [];
  for (const role of ROLES) {
    const need = counts[role];
    if (need <= 0) continue;
    const lockedHere = locked.filter((a) => a.role === role).slice(0, need);
    const lockedIds = new Set(lockedHere.map((a) => a.id));
    const pool = roster.filter((a) => a.role === role && !lockedIds.has(a.id));
    const picks = shuffle(pool).slice(0, Math.max(0, need - lockedHere.length));
    result.push(...lockedHere, ...picks);
  }
  return result;
}
