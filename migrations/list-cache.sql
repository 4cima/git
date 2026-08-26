-- migrations/list-cache.sql
-- Precomputed list caches for home/movies/series pages
-- Do not run until explicit order

CREATE TABLE IF NOT EXISTS list_movies_popular (
  rank INTEGER PRIMARY KEY,
  id INTEGER NOT NULL,
  tmdb_id INTEGER NOT NULL,
  slug TEXT NOT NULL,
  title_ar TEXT,
  title_en TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  vote_average REAL,
  release_year INTEGER,
  overview_ar TEXT,
  genres_json TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS list_movies_newest (
  rank INTEGER PRIMARY KEY,
  id INTEGER NOT NULL,
  tmdb_id INTEGER NOT NULL,
  slug TEXT NOT NULL,
  title_ar TEXT,
  title_en TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  vote_average REAL,
  release_year INTEGER,
  overview_ar TEXT,
  genres_json TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS list_series_popular (
  rank INTEGER PRIMARY KEY,
  id INTEGER NOT NULL,
  tmdb_id INTEGER NOT NULL,
  slug TEXT NOT NULL,
  name_ar TEXT,
  name_en TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  vote_average REAL,
  first_air_year INTEGER,
  overview_ar TEXT,
  genres_json TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS list_series_newest (
  rank INTEGER PRIMARY KEY,
  id INTEGER NOT NULL,
  tmdb_id INTEGER NOT NULL,
  slug TEXT NOT NULL,
  name_ar TEXT,
  name_en TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  vote_average REAL,
  first_air_year INTEGER,
  overview_ar TEXT,
  genres_json TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);
