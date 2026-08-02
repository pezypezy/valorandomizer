import type { ProPick } from "./pro-picks";

export type ProPickSideMode = "both" | "single" | "mirror";

export type ProPickDraw = {
  left: ProPick;
  right: ProPick | null;
};

export function getCommonMaps(
  leftCandidates: readonly ProPick[],
  rightCandidates: readonly ProPick[],
): string[] {
  const rightMaps = new Set(rightCandidates.map((pick) => pick.map));
  return [...new Set(leftCandidates.map((pick) => pick.map))].filter((map) =>
    rightMaps.has(map),
  );
}

export function drawProPicks(
  leftCandidates: readonly ProPick[],
  rightCandidates: readonly ProPick[],
  mode: ProPickSideMode,
  random: () => number = Math.random,
): ProPickDraw | null {
  if (leftCandidates.length === 0) return null;

  if (mode === "single" || mode === "mirror") {
    const left = pickOne(leftCandidates, random);
    if (!left) return null;
    return { left, right: mode === "mirror" ? left : null };
  }

  const map = pickOne(getCommonMaps(leftCandidates, rightCandidates), random);
  if (!map) return null;

  const left = pickOne(
    leftCandidates.filter((pick) => pick.map === map),
    random,
  );
  if (!left) return null;

  const rightOnMap = rightCandidates.filter((pick) => pick.map === map);
  const alternatives = rightOnMap.filter((pick) => pick.id !== left.id);
  const right = pickOne(alternatives.length > 0 ? alternatives : rightOnMap, random);
  return right ? { left, right } : null;
}

function pickOne<T>(items: readonly T[], random: () => number): T | undefined {
  if (items.length === 0) return undefined;
  const index = Math.min(items.length - 1, Math.floor(random() * items.length));
  return items[index];
}
