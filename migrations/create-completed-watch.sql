CREATE TABLE IF NOT EXISTS completed_watch (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  content_type TEXT NOT NULL,
  tmdb_id INTEGER NOT NULL,
  title TEXT,
  poster_path TEXT,
  added_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, content_type, tmdb_id)
);
CREATE INDEX IF NOT EXISTS idx_completed_watch_user ON completed_watch(user_id);
