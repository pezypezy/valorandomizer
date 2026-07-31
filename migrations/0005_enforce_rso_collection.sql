UPDATE tracked_players
   SET enabled = 0,
       last_error = 'Disabled: approved RSO opt-in is required',
       updated_at = unixepoch()
 WHERE source_type <> 'rso' AND enabled = 1;

CREATE TRIGGER IF NOT EXISTS tracked_players_require_rso_after_insert
AFTER INSERT ON tracked_players
WHEN NEW.source_type <> 'rso' AND NEW.enabled = 1
BEGIN
  UPDATE tracked_players
     SET enabled = 0,
         last_error = 'Disabled: approved RSO opt-in is required',
         updated_at = unixepoch()
   WHERE puuid = NEW.puuid;
END;

CREATE TRIGGER IF NOT EXISTS tracked_players_require_rso_after_update
AFTER UPDATE OF source_type, enabled ON tracked_players
WHEN NEW.source_type <> 'rso' AND NEW.enabled = 1
BEGIN
  UPDATE tracked_players
     SET enabled = 0,
         last_error = 'Disabled: approved RSO opt-in is required',
         updated_at = unixepoch()
   WHERE puuid = NEW.puuid;
END;
