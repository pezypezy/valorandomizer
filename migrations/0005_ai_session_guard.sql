CREATE TABLE IF NOT EXISTS ai_session_guard (
  session_key TEXT PRIMARY KEY,
  burst_bucket INTEGER NOT NULL,
  burst_used INTEGER NOT NULL DEFAULT 0 CHECK (burst_used >= 0),
  minute_bucket INTEGER NOT NULL,
  minute_used INTEGER NOT NULL DEFAULT 0 CHECK (minute_used >= 0),
  hour_bucket INTEGER NOT NULL,
  hour_used INTEGER NOT NULL DEFAULT 0 CHECK (hour_used >= 0),
  in_flight_until INTEGER NOT NULL DEFAULT 0,
  lease_token TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_session_guard_updated_at
  ON ai_session_guard(updated_at);
