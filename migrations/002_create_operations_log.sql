-- Operations log table for admin panel command execution tracking
-- Stores who ran what, when, and whether it succeeded

CREATE TABLE IF NOT EXISTS operations_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  user_id TEXT NOT NULL,              -- from Supabase auth
  username TEXT,                       -- denormalized for display
  command TEXT NOT NULL,               -- e.g. "npm run download-ids"
  exit_code INTEGER,                   -- 0 = success, non-zero = error, NULL = still running
  duration_seconds INTEGER,            -- NULL until process completes
  stdout_preview TEXT,                 -- first 1000 chars of stdout
  stderr_preview TEXT                  -- first 1000 chars of stderr
);

CREATE INDEX IF NOT EXISTS idx_operations_timestamp ON operations_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_operations_user ON operations_log(user_id);
CREATE INDEX IF NOT EXISTS idx_operations_exit_code ON operations_log(exit_code);
