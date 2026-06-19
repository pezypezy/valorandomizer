import { test } from "node:test";
import assert from "node:assert/strict";
import { type Agent, type Role, ROLES, TEAM_SIZE } from "./roles";
import {
  DEFAULT_COUNTS,
  type RoleCounts,
  countByRole,
  pickTeam,
  validateCounts,
} from "./picker";

function makeRoster(perRole = 6): Agent[] {
  const roster: Agent[] = [];
  for (const role of ROLES) {
    for (let i = 0; i < perRole; i++) {
      roster.push({
        id: `${role}-${i}`,
        name: `${role}${i}`,
        role: role as Role,
        portrait: "",
        icon: "",
        gradient: [],
      });
    }
  }
  return roster;
}

test("pickTeam returns the exact requested count per role with no duplicates", () => {
  const roster = makeRoster();
  const counts: RoleCounts = DEFAULT_COUNTS;
  for (let run = 0; run < 200; run++) {
    const team = pickTeam(roster, counts);
    assert.equal(team.length, TEAM_SIZE);
    const ids = new Set(team.map((a) => a.id));
    assert.equal(ids.size, team.length, "no duplicate agents");
    const byRole = countByRole(team);
    for (const role of ROLES) assert.equal(byRole[role], counts[role]);
  }
});

test("pickTeam keeps locked agents in the result", () => {
  const roster = makeRoster();
  const locked = [roster.find((a) => a.id === "Duelist-3")!];
  for (let run = 0; run < 50; run++) {
    const team = pickTeam(roster, DEFAULT_COUNTS, locked);
    assert.ok(team.some((a) => a.id === "Duelist-3"), "locked agent retained");
  }
});

test("validateCounts enforces team size and pool limits", () => {
  const roster = makeRoster(3);
  assert.equal(validateCounts(roster, DEFAULT_COUNTS).ok, true);
  assert.deepEqual(
    validateCounts(roster, { Duelist: 1, Initiator: 1, Controller: 1, Sentinel: 1 }),
    { ok: false, total: 4, reason: "total" },
  );
  // Pool has only 3 per role, so requesting 4 Duelists is invalid.
  assert.equal(
    validateCounts(roster, { Duelist: 4, Initiator: 1, Controller: 0, Sentinel: 0 }).ok,
    false,
  );
});
