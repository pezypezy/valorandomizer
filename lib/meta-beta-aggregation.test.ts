import assert from "node:assert/strict";
import test from "node:test";
import { dailyRowsToCandidates } from "./meta-beta/aggregation";

test("daily rows aggregate into a seven-day composition candidate", () => {
  const rows = [
    {
      stat_date: "2026-07-30",
      region: "jp",
      patch: "12.01",
      map_id: "Ascent",
      rank_bucket: "Ascendant",
      comp_key: "jett|kay/o|killjoy|omen|sova",
      agents_json: JSON.stringify(["Jett", "KAY/O", "Sova", "Omen", "Killjoy"]),
      match_count: 180,
      wins: 100,
      rounds_won: 2400,
      rounds_lost: 2200,
      pick_rate: 0.06,
      average_agent_pick_rate: 0.09,
      eligible_for_recommendation: 1,
    },
    {
      stat_date: "2026-07-31",
      region: "jp",
      patch: "12.01",
      map_id: "Ascent",
      rank_bucket: "Ascendant",
      comp_key: "jett|kay/o|killjoy|omen|sova",
      agents_json: JSON.stringify(["Jett", "KAY/O", "Sova", "Omen", "Killjoy"]),
      match_count: 220,
      wins: 116,
      rounds_won: 2800,
      rounds_lost: 2700,
      pick_rate: 0.08,
      average_agent_pick_rate: 0.1,
      eligible_for_recommendation: 1,
    },
  ];

  const scopes = dailyRowsToCandidates(rows);
  const candidates = scopes.get("Ascent\u0000Ascendant");
  assert.equal(candidates?.length, 1);
  assert.equal(candidates?.[0].matches, 400);
  assert.equal(candidates?.[0].wins, 216);
  assert.equal(candidates?.[0].activeDays, 2);
  assert.equal(candidates?.[0].pickRate, 0.07);
  assert.equal(candidates?.[0].roles.join("/"), "Duelist/Initiator/Initiator/Controller/Sentinel");
});

test("ineligible or malformed rows are ignored", () => {
  const scopes = dailyRowsToCandidates([
    {
      stat_date: "2026-07-31",
      region: "jp",
      patch: "12.01",
      map_id: "Ascent",
      rank_bucket: "Ascendant",
      comp_key: "bad",
      agents_json: JSON.stringify(["Jett"]),
      match_count: 500,
      wins: 300,
      rounds_won: 1,
      rounds_lost: 1,
      pick_rate: 0.01,
      average_agent_pick_rate: 0.01,
      eligible_for_recommendation: 1,
    },
  ]);

  assert.equal(scopes.size, 0);
});
