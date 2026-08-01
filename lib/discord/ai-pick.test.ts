import assert from "node:assert/strict";
import test from "node:test";
import { buildAiPickDiscordMessage } from "./ai-pick";
import type { MetaStatsResult } from "../meta-beta/stats";

const stats: MetaStatsResult = {
  source: "d1",
  updatedAt: "2026-08-01T10:00:00.000Z",
  dataScope: {
    region: "jp",
    map: "Ascent",
    rank: "All",
    patch: "11.04",
    periodStart: "2026-07-26",
    periodEnd: "2026-08-01",
  },
  recommendations: [
    {
      category: "theory",
      agents: ["Jett", "Sova", "KAY/O", "Omen", "Killjoy"],
      rawWinRate: 53.8,
      adjustedWinRate: 53.4,
      pickRate: 7.25,
      matchCount: 4280,
      confidence: "high",
      reasons: ["十分な試合数", "役割バランスが良い"],
      caution: "ロールを優先してください。",
    },
    {
      category: "offMeta",
      agents: ["Yoru", "Breach", "Sova", "Omen", "Cypher"],
      rawWinRate: 54.5,
      adjustedWinRate: 52.9,
      pickRate: 0.82,
      matchCount: 610,
      confidence: "medium",
      reasons: ["低使用率ながら十分な試合数"],
      caution: "事前に役割を共有してください。",
    },
    {
      category: "soloQueue",
      agents: ["Jett", "Sova", "Gekko", "Omen", "Sage"],
      rawWinRate: 52.8,
      adjustedWinRate: 52.5,
      pickRate: 5.9,
      matchCount: 3510,
      confidence: "high",
      reasons: ["野良でも役割が分かりやすい"],
      caution: "索敵とエントリーを合わせてください。",
    },
  ],
};

test("AI pick response contains three public recommendation embeds", () => {
  const message = buildAiPickDiscordMessage(stats, "123456789012345678", "ja");

  assert.equal(message.embeds.length, 3);
  assert.match(message.content, /Ascent/);
  assert.deepEqual(message.allowed_mentions.users, ["123456789012345678"]);
  assert.equal(message.embeds[0].title, "セオリー構成");
  assert.equal(message.embeds[1].title, "オフメタ構成");
  assert.equal(message.embeds[2].title, "野良向け構成");
  assert.match(message.embeds[0].fields[0].value, /Jett \/ Sova/);
  assert.match(message.embeds[0].footer.text, /実データ/);
});

test("AI pick response clearly labels sample fallback data", () => {
  const message = buildAiPickDiscordMessage({ ...stats, source: "sample" }, "123456789012345678", "en");
  assert.match(message.embeds[0].footer.text, /Sample data/);
});
