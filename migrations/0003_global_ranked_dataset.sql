ALTER TABLE matches ADD COLUMN source TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE matches ADD COLUMN source_shard TEXT NOT NULL DEFAULT 'unknown';

CREATE INDEX IF NOT EXISTS idx_matches_global_source
  ON matches(region, source, source_shard, started_at);

CREATE TABLE IF NOT EXISTS global_ingest_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  fetched_at INTEGER NOT NULL,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  payload_matches INTEGER NOT NULL DEFAULT 0,
  normalized_matches INTEGER NOT NULL DEFAULT 0,
  matches_inserted INTEGER NOT NULL DEFAULT 0,
  matches_skipped INTEGER NOT NULL DEFAULT 0,
  rejected_matches INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'partial', 'failed')),
  detail TEXT
);

CREATE INDEX IF NOT EXISTS idx_global_ingest_runs_started
  ON global_ingest_runs(started_at DESC);

CREATE TABLE IF NOT EXISTS global_dataset_coverage (
  stat_date TEXT NOT NULL,
  source TEXT NOT NULL,
  shard TEXT NOT NULL,
  patch TEXT NOT NULL,
  map_id TEXT NOT NULL,
  rank_bucket TEXT NOT NULL,
  team_count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (stat_date, source, shard, patch, map_id, rank_bucket)
);

CREATE INDEX IF NOT EXISTS idx_global_dataset_coverage_scope
  ON global_dataset_coverage(stat_date DESC, shard, rank_bucket, map_id);
