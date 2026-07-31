import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAiCacheKey,
  getCacheablePromptId,
  getQuickPromptTexts,
} from "./meta-beta/ai-cache";

test("only predefined quick prompts are cacheable", () => {
  assert.equal(getCacheablePromptId("ja", "セオリー構成を解説して"), "explain-theory");
  assert.equal(getCacheablePromptId("ja", "  セオリー構成を解説して  "), "explain-theory");
  assert.equal(getCacheablePromptId("ja", "ジェットを固定した残り2枠は？"), null);
});

test("quick prompts retain stable display order", () => {
  assert.deepEqual(getQuickPromptTexts("en"), [
    "Explain the theory composition",
    "How is the solo queue option different?",
    "What is the off-meta option's weakness?",
  ]);
});

test("cache key changes when the statistics snapshot changes", () => {
  const base = {
    locale: "ja" as const,
    map: "Ascent",
    rank: "Ascendant",
    promptId: "explain-theory" as const,
    statsSource: "d1" as const,
  };
  const first = buildAiCacheKey({ ...base, statsUpdatedAt: "2026-07-31T04:00:00.000Z" });
  const second = buildAiCacheKey({ ...base, statsUpdatedAt: "2026-08-01T04:00:00.000Z" });
  assert.notEqual(first, second);
});
