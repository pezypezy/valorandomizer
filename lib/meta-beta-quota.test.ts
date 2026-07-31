import assert from "node:assert/strict";
import test from "node:test";
import { getAiQuotaDate, getNextAiQuotaResetAt } from "./meta-beta/quota";

test("AI quota date changes at 09:00 JST", () => {
  const beforeReset = Date.parse("2026-07-30T23:59:59.000Z");
  const afterReset = Date.parse("2026-07-31T00:00:00.000Z");

  assert.equal(getAiQuotaDate(beforeReset), "2026-07-30");
  assert.equal(getAiQuotaDate(afterReset), "2026-07-31");
});

test("next AI quota reset is the following 00:00 UTC", () => {
  const now = Date.parse("2026-07-31T05:30:00.000Z");
  assert.equal(getNextAiQuotaResetAt(now), "2026-08-01T00:00:00.000Z");
});
