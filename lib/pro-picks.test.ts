import { test } from "node:test";
import assert from "node:assert/strict";
import { AGENTS } from "./agents";
import { PRO_PICKS } from "./pro-picks";
import { ROLES } from "./roles";

test("pro pick data has unique ids and valid agent names", () => {
  const ids = new Set<string>();
  const agentNames = new Set(AGENTS.map((agent) => agent.name));

  assert.ok(PRO_PICKS.length >= 1310);

  for (const pick of PRO_PICKS) {
    assert.ok(pick.id, "id is required");
    assert.ok(!ids.has(pick.id), `duplicate id: ${pick.id}`);
    ids.add(pick.id);

    assert.ok(pick.event, `event is required: ${pick.id}`);
    assert.ok(pick.match.includes(" vs "), `match should include vs: ${pick.id}`);
    assert.ok(pick.map, `map is required: ${pick.id}`);
    assert.ok(["Americas", "EMEA", "Pacific", "China"].includes(pick.region), `valid region: ${pick.id}`);
    assert.ok(pick.team, `team is required: ${pick.id}`);
    assert.equal(pick.agents.length, 5, `five agents: ${pick.id}`);

    for (const agent of pick.agents) {
      assert.ok(agentNames.has(agent), `known agent ${agent}: ${pick.id}`);
    }
  }
});

test("agent role roster covers every role used by the app", () => {
  const roles = new Set(AGENTS.map((agent) => agent.role));
  for (const role of ROLES) assert.ok(roles.has(role));
});
