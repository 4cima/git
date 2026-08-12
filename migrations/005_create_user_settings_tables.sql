-- User Settings Tables (Privacy & Notifications)
-- Created for profile settings page

-- User privacy settings
CREATE TABLE IF NOT EXISTS user_privacy_settings (
  user_id TEXT PRIMARY KEY,
  show_watch_history BOOLEAN DEFAULT 1,
  show_favorites BOOLEAN DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- User notification settings
CREATE TABLE IF NOT EXISTS user_notification_settings (
  user_id TEXT PRIMARY KEY,
  email_notifications BOOLEAN DEFAULT 1,
  new_content_notifications BOOLEAN DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

