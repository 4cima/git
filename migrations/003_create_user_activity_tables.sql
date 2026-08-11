-- User Activity & Stats Tables
-- Created for complete profile system with real data

-- Watch history table (tracks every view)
CREATE TABLE IF NOT EXISTS watch_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('movie', 'series')),
  content_id INTEGER NOT NULL,
  tmdb_id INTEGER NOT NULL,
  title TEXT,
  poster_path TEXT,
  watch_date TEXT DEFAULT CURRENT_TIMESTAMP,
  watch_duration INTEGER DEFAULT 0, -- in seconds
  completed BOOLEAN DEFAULT 0,
  season_number INTEGER, -- for series
  episode_number INTEGER, -- for series
  UNIQUE(user_id, content_type, tmdb_id, season_number, episode_number)
);

CREATE INDEX idx_watch_history_user ON watch_history(user_id);
CREATE INDEX idx_watch_history_date ON watch_history(watch_date);
CREATE INDEX idx_watch_history_content ON watch_history(content_type, content_id);

-- Favorites/Watchlist table
CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('movie', 'series')),
  content_id INTEGER NOT NULL,
  tmdb_id INTEGER NOT NULL,
  title TEXT,
  poster_path TEXT,
  added_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, content_type, tmdb_id)
);

CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_favorites_content ON favorites(content_type, content_id);

-- User reviews/ratings table
CREATE TABLE IF NOT EXISTS user_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  username TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('movie', 'series')),
  content_id INTEGER NOT NULL,
  tmdb_id INTEGER NOT NULL,
  title TEXT,
  rating REAL CHECK (rating >= 0 AND rating <= 10),
  review_text TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, content_type, tmdb_id)
);

CREATE INDEX idx_reviews_user ON user_reviews(user_id);
CREATE INDEX idx_reviews_content ON user_reviews(content_type, content_id);
CREATE INDEX idx_reviews_rating ON user_reviews(rating);

-- User achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  achievement_type TEXT NOT NULL, -- 'first_watch', 'movie_marathon', 'series_binge', 'top_reviewer', etc.
  achievement_title TEXT NOT NULL,
  achievement_description TEXT,
  icon TEXT, -- emoji or icon name
  earned_at TEXT DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT, -- JSON for extra data
  UNIQUE(user_id, achievement_type)
);

CREATE INDEX idx_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_achievements_type ON user_achievements(achievement_type);
