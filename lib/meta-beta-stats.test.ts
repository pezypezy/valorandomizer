import assert from "node:assert/strict";
import test from "node:test";
import { getMetaStats, isAllowedMap, isAllowedRank } from "./meta-beta/stats";

test("meta stats falls back to three sample recommendation categories", async () => {
  const result = await getMetaStats(null, "Ascent", "Ascendant", Date.parse("2026-07-31T05:00:00Z"));

  assert.equal(result.source, "sample");
  assert.equal(result.dataScope.map, "Ascent");
  assert.equal(result.dataScope.rank, "Ascendant");
  assert.deepEqual(result.recommendations.map((item) => item.category), ["theory", "offMeta", "soloQueue"]);
});

test("map and rank validators reject arbitrary query values", () => {
  assert.equal(isAllowedMap("Ascent"), true);
  assert.equal(isAllowedMap("Tokyo"), false);
  assert.equal(isAllowedRank("Diamond"), true);
  assert.equal(isAllowedRank("Grandmaster"), false);
});
