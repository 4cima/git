-- Cache tables for precomputed similar recommendations
-- Run locally only on data/4cima-local.db

CREATE TABLE IF NOT EXISTS movie_similar_cache (
  tmdb_id INTEGER PRIMARY KEY,
  recommended_ids TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS series_similar_cache (
  tmdb_id INTEGER PRIMARY KEY,
  recommended_ids TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);
