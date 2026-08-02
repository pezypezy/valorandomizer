import assert from "node:assert/strict";
import { test } from "node:test";
import type { ProPick } from "./pro-picks";
import { drawProPicks, getCommonMaps } from "./pro-pick-draw";

function makePick(id: string, map: string, team = id): ProPick {
  return {
    id,
    event: "Test Event",
    match: `${team} vs Opponent`,
    map,
    region: "Pacific",
    team,
    agents: ["Jett", "Sova", "Omen", "Killjoy", "Breach"],
  };
}

test("both mode always draws both teams from the same shared map", () => {
  const left = [makePick("left-bind", "Bind"), makePick("left-haven", "Haven")];
  const right = [makePick("right-ascent", "Ascent"), makePick("right-haven", "Haven")];

  assert.deepEqual(getCommonMaps(left, right), ["Haven"]);
  const result = drawProPicks(left, right, "both", () => 0);
  assert.equal(result?.left.map, "Haven");
  assert.equal(result?.right?.map, "Haven");
});

test("both mode returns null when the two sides have no shared map", () => {
  const result = drawProPicks(
    [makePick("left", "Bind")],
    [makePick("right", "Ascent")],
    "both",
    () => 0,
  );
  assert.equal(result, null);
});

test("both mode avoids drawing the identical record when an alternative exists", () => {
  const shared = makePick("shared", "Haven");
  const alternative = makePick("alternative", "Haven");
  const result = drawProPicks([shared], [shared, alternative], "both", () => 0);

  assert.equal(result?.left.id, "shared");
  assert.equal(result?.right?.id, "alternative");
});

test("single and mirror modes preserve their expected right side", () => {
  const pick = makePick("left", "Bind");
  assert.equal(drawProPicks([pick], [], "single", () => 0)?.right, null);
  assert.equal(drawProPicks([pick], [], "mirror", () => 0)?.right?.id, pick.id);
});
