CREATE TABLE IF NOT EXISTS content_maps (
  map_id TEXT PRIMARY KEY,
  map_name TEXT NOT NULL,
  asset_name TEXT,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_content_maps_name
  ON content_maps(map_name);
