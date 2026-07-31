CREATE TABLE IF NOT EXISTS tracked_players (
  puuid TEXT PRIMARY KEY,
  routing_region TEXT NOT NULL,
  dataset_region TEXT NOT NULL DEFAULT 'jp',
  source_type TEXT NOT NULL CHECK (source_type IN ('rso', 'manual-consent')),
  consented_at INTEGER NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  last_polled_at INTEGER,
  next_poll_at INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tracked_players_poll
  ON tracked_players(enabled, next_poll_at);

CREATE TABLE IF NOT EXISTS collection_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  source TEXT NOT NULL,
  tracked_players INTEGER NOT NULL DEFAULT 0,
  match_ids_seen INTEGER NOT NULL DEFAULT 0,
  matches_inserted INTEGER NOT NULL DEFAULT 0,
  matches_skipped INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'partial', 'failed')),
  detail TEXT
);

CREATE INDEX IF NOT EXISTS idx_collection_runs_started
  ON collection_runs(started_at DESC);
