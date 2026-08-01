import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAiPickDiscordMessage,
  buildAiPickSelectorMessage,
  resolveAiPickComponentSelection,
} from "./ai-pick-interactive";
import type { MetaStatsResult } from "../meta-beta/stats";

const stats: MetaStatsResult = {
  source: "d1",
  updatedAt: "2026-08-01T10:00:00.000Z",
  dataScope: {
    region: "jp",
    map: "Ascent",
    rank: "Diamond",
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

test("selector shows map and rank menus at the same time", () => {
  const message = buildAiPickSelectorMessage("ja");
  assert.equal(message.components.length, 2);
  assert.equal(message.components[0].components[0].options.length, 9);
  assert.equal(message.components[1].components[0].options.length, 10);
  assert.match(message.components[0].components[0].custom_id, /^aipick:map:/);
  assert.match(message.components[1].components[0].custom_id, /^aipick:rank:/);
});

test("map selection preserves an already selected rank", () => {
  assert.deepEqual(
    resolveAiPickComponentSelection("aipick:map:Diamond", ["Ascent"]),
    { map: "Ascent", rank: "Diamond" },
  );
});

test("rank selection preserves an already selected map", () => {
  assert.deepEqual(
    resolveAiPickComponentSelection("aipick:rank:Ascent", ["Diamond"]),
    { map: "Ascent", rank: "Diamond" },
  );
});

test("live result includes map, rank and three public embeds", () => {
  const message = buildAiPickDiscordMessage(stats, "123456789012345678", "ja");
  assert.equal(message.flags, undefined);
  assert.equal(message.embeds.length, 3);
  assert.match(message.content, /Ascent/);
  assert.match(message.content, /ダイヤモンド/);
  assert.deepEqual(message.allowed_mentions.users, ["123456789012345678"]);
});

test("sample fallback never publishes fake recommendations", () => {
  const message = buildAiPickDiscordMessage(
    { ...stats, source: "sample" },
    "123456789012345678",
    "ja",
  );
  assert.equal(message.flags, 64);
  assert.equal(message.embeds.length, 0);
  assert.deepEqual(message.allowed_mentions.users, []);
  assert.match(message.content, /実データがまだありません/);
  assert.match(message.content, /サンプル構成は表示せず/);
});
