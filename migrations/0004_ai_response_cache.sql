CREATE TABLE IF NOT EXISTS ai_response_cache (
  cache_key TEXT PRIMARY KEY,
  locale TEXT NOT NULL,
  map_id TEXT NOT NULL,
  rank_bucket TEXT NOT NULL,
  prompt_id TEXT NOT NULL,
  stats_updated_at TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_response_cache_expiry
  ON ai_response_cache(expires_at);
