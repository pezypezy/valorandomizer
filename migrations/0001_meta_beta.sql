PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS matches (
  match_id TEXT PRIMARY KEY,
  region TEXT NOT NULL,
  map_id TEXT NOT NULL,
  patch TEXT NOT NULL,
  queue_id TEXT NOT NULL DEFAULT 'competitive',
  started_at INTEGER NOT NULL,
  processed_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_matches_scope
  ON matches(region, patch, map_id, started_at);

CREATE TABLE IF NOT EXISTS team_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id TEXT NOT NULL,
  team_side TEXT NOT NULL,
  rank_bucket TEXT NOT NULL,
  comp_key TEXT NOT NULL,
  agents_json TEXT NOT NULL,
  won INTEGER NOT NULL CHECK (won IN (0, 1)),
  rounds_won INTEGER NOT NULL,
  rounds_lost INTEGER NOT NULL,
  role_pattern TEXT NOT NULL,
  eligible_for_recommendation INTEGER NOT NULL CHECK (eligible_for_recommendation IN (0, 1)),
  exclusion_reason TEXT,
  FOREIGN KEY (match_id) REFERENCES matches(match_id) ON DELETE CASCADE,
  UNIQUE (match_id, team_side)
);

CREATE INDEX IF NOT EXISTS idx_team_results_scope
  ON team_results(rank_bucket, comp_key, eligible_for_recommendation);

CREATE TABLE IF NOT EXISTS daily_comp_stats (
  stat_date TEXT NOT NULL,
  region TEXT NOT NULL,
  patch TEXT NOT NULL,
  map_id TEXT NOT NULL,
  rank_bucket TEXT NOT NULL,
  comp_key TEXT NOT NULL,
  agents_json TEXT NOT NULL,
  match_count INTEGER NOT NULL,
  wins INTEGER NOT NULL,
  rounds_won INTEGER NOT NULL,
  rounds_lost INTEGER NOT NULL,
  raw_win_rate REAL NOT NULL,
  adjusted_win_rate REAL NOT NULL,
  confidence_lower REAL NOT NULL,
  pick_rate REAL NOT NULL,
  eligible_for_recommendation INTEGER NOT NULL CHECK (eligible_for_recommendation IN (0, 1)),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (stat_date, region, patch, map_id, rank_bucket, comp_key)
);

CREATE INDEX IF NOT EXISTS idx_daily_comp_stats_lookup
  ON daily_comp_stats(region, patch, map_id, rank_bucket, stat_date DESC);

CREATE TABLE IF NOT EXISTS recommendation_snapshots (
  stat_date TEXT NOT NULL,
  region TEXT NOT NULL,
  patch TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  map_id TEXT NOT NULL,
  rank_bucket TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('theory', 'off_meta', 'solo_queue')),
  comp_key TEXT NOT NULL,
  agents_json TEXT NOT NULL,
  raw_win_rate REAL NOT NULL,
  adjusted_win_rate REAL NOT NULL,
  pick_rate REAL NOT NULL,
  match_count INTEGER NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  reasons_json TEXT NOT NULL,
  caution TEXT NOT NULL,
  score REAL NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (stat_date, region, patch, map_id, rank_bucket, category)
);

CREATE INDEX IF NOT EXISTS idx_recommendation_snapshots_lookup
  ON recommendation_snapshots(region, map_id, rank_bucket, stat_date DESC);

CREATE TABLE IF NOT EXISTS ai_usage_daily (
  usage_date TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('global', 'session')),
  scope_key TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0 CHECK (used >= 0),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (usage_date, scope, scope_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_daily_cleanup
  ON ai_usage_daily(usage_date);
