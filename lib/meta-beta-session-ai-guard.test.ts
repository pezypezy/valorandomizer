import assert from "node:assert/strict";
import test from "node:test";
import {
  AI_SESSION_BURST_LIMIT,
  AI_SESSION_BURST_WINDOW_SECONDS,
  AI_SESSION_HOUR_LIMIT,
  AI_SESSION_MINUTE_LIMIT,
  classifySessionAiGuardRow,
} from "./meta-beta/session-ai-guard";

const NOW_SECONDS = 1_786_000_025;
const NOW = NOW_SECONDS * 1000;

function row(overrides: Record<string, number | string> = {}) {
  return {
    session_key: "session-1",
    burst_bucket: Math.floor(NOW_SECONDS / AI_SESSION_BURST_WINDOW_SECONDS),
    burst_used: 1,
    minute_bucket: Math.floor(NOW_SECONDS / 60),
    minute_used: 1,
    hour_bucket: Math.floor(NOW_SECONDS / 3600),
    hour_used: 1,
    in_flight_until: 0,
    lease_token: "",
    updated_at: NOW_SECONDS,
    ...overrides,
  };
}

test("an in-flight AI request blocks another request from the same session", () => {
  const status = classifySessionAiGuardRow(row({ in_flight_until: NOW_SECONDS + 23 }), NOW);
  assert.equal(status.blockedBy, "concurrent");
  assert.equal(status.retryAfterSeconds, 23);
});

test("the ten-second burst limit is enforced before wider windows", () => {
  const status = classifySessionAiGuardRow(row({ burst_used: AI_SESSION_BURST_LIMIT }), NOW);
  assert.equal(status.blockedBy, "burst");
  assert.ok((status.retryAfterSeconds ?? 0) >= 1);
  assert.ok((status.retryAfterSeconds ?? 0) <= AI_SESSION_BURST_WINDOW_SECONDS);
});

test("the per-minute session limit is enforced", () => {
  const status = classifySessionAiGuardRow(row({
    burst_bucket: Math.floor(NOW_SECONDS / AI_SESSION_BURST_WINDOW_SECONDS) - 1,
    burst_used: AI_SESSION_BURST_LIMIT,
    minute_used: AI_SESSION_MINUTE_LIMIT,
  }), NOW);
  assert.equal(status.blockedBy, "minute");
});

test("the per-hour session limit is enforced", () => {
  const status = classifySessionAiGuardRow(row({
    burst_bucket: Math.floor(NOW_SECONDS / AI_SESSION_BURST_WINDOW_SECONDS) - 1,
    minute_bucket: Math.floor(NOW_SECONDS / 60) - 1,
    hour_used: AI_SESSION_HOUR_LIMIT,
  }), NOW);
  assert.equal(status.blockedBy, "hour");
});
