-- Genre list cache tables
-- DO NOT RUN until explicit order
-- Purpose: Eliminate expensive genres_json LIKE queries and full table scans for top-rated and genre pages

-- Top rated movies (sorted by vote_average DESC, vote_count DESC)
CREATE TABLE IF NOT EXISTS list_movies_top_rated (
  rank INTEGER PRIMARY KEY,
  id INTEGER NOT NULL,
  slug TEXT NOT NULL,
  title_ar TEXT,
  title_en TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  vote_average REAL,
  release_year INTEGER,
  overview_ar TEXT,
  genres_json TEXT,
  tmdb_id INTEGER
);

-- Top rated series (sorted by vote_average DESC, vote_count DESC)
CREATE TABLE IF NOT EXISTS list_series_top_rated (
  rank INTEGER PRIMARY KEY,
  id INTEGER NOT NULL,
  slug TEXT NOT NULL,
  name_ar TEXT,
  name_en TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  vote_average REAL,
  first_air_year INTEGER,
  overview_ar TEXT,
  genres_json TEXT,
  tmdb_id INTEGER
);

-- Genre-specific movies (top 300 per genre by popularity)
CREATE TABLE IF NOT EXISTS list_movies_genre (
  genre_tmdb_id INTEGER NOT NULL,
  rank INTEGER NOT NULL,
  id INTEGER NOT NULL,
  slug TEXT NOT NULL,
  title_ar TEXT,
  title_en TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  vote_average REAL,
  release_year INTEGER,
  overview_ar TEXT,
  genres_json TEXT,
  tmdb_id INTEGER,
  popularity REAL,
  PRIMARY KEY(genre_tmdb_id, rank)
);

-- Genre-specific series (top 300 per genre by popularity)
CREATE TABLE IF NOT EXISTS list_series_genre (
  genre_tmdb_id INTEGER NOT NULL,
  rank INTEGER NOT NULL,
  id INTEGER NOT NULL,
  slug TEXT NOT NULL,
  name_ar TEXT,
  name_en TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  vote_average REAL,
  first_air_year INTEGER,
  overview_ar TEXT,
  genres_json TEXT,
  tmdb_id INTEGER,
  popularity REAL,
  PRIMARY KEY(genre_tmdb_id, rank)
);
