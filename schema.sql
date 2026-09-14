-- =============================================================================
-- 4cima D1 Schema
-- Source: Local DB (36 movies cols, 39 tv_series cols) + JSON columns (legacy pre-D1 merge)
-- FTS5 trigram: VERIFIED working on D1 (tested 2026-08-20)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- CONTENT TABLES
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS movies (
  -- Primary key (from Local DB, tmdb_id is the canonical ID)
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  tmdb_id          INTEGER NOT NULL UNIQUE,
  slug             TEXT    NOT NULL UNIQUE,

  -- Titles & text
  title_en         TEXT,
  title_ar         TEXT,
  title_original   TEXT,
  overview_en      TEXT,
  overview_ar      TEXT,

  -- Media assets
  poster_path      TEXT,
  backdrop_path    TEXT,

  -- Dates & metadata
  release_date     TEXT,
  release_year     INTEGER,
  runtime          INTEGER,
  vote_average     REAL    DEFAULT 0,
  vote_count       INTEGER DEFAULT 0,
  popularity       REAL    DEFAULT 0,
  trailer_key      TEXT,
  imdb_id          TEXT,
  original_language TEXT,
  country_of_origin TEXT,
  primary_genre    TEXT,
  age_rating       TEXT    DEFAULT 'PG',

  -- SEO
  seo_title_ar     TEXT,
  seo_description_ar TEXT,
  seo_keywords_json TEXT,
  canonical_url    TEXT,

  -- Legacy field from Local DB (kept for ingestion script compatibility)
  production_companies TEXT,

  -- JSON columns (merged from legacy DB via tmdb_id)
  genres_json      TEXT,   -- [{"id":28,"name":"Action","name_ar":"أكشن"}]
  cast_json        TEXT,   -- [{"name":"...","character":"...","profile_path":"..."}]
  countries_json   TEXT,   -- [{"iso_3166_1":"US","name":"United States"}]
  keywords_json    TEXT,   -- [{"id":1,"name":"..."}]
  companies_json   TEXT,   -- [{"id":1,"name":"...","logo_path":"..."}]

  -- Ingestion control flags (from Local DB)
  is_fetched       INTEGER DEFAULT 0,
  is_filtered      INTEGER DEFAULT 0,
  filter_reason    TEXT,
  is_complete      INTEGER DEFAULT 0,
  filter_status    TEXT    DEFAULT 'clean',
  sync_priority    INTEGER DEFAULT 5,
  synced_to_turso  INTEGER DEFAULT 0,  -- legacy column name (pre-D1), kept for compatibility
  synced_at        TEXT,

  -- Timestamps
  created_at       TEXT    DEFAULT (datetime('now')),
  updated_at       TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tv_series (
  -- Primary key
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  tmdb_id          INTEGER NOT NULL UNIQUE,
  slug             TEXT    NOT NULL UNIQUE,

  -- Titles & text
  name_en          TEXT,
  name_ar          TEXT,
  name_original    TEXT,
  overview_en      TEXT,
  overview_ar      TEXT,

  -- Media assets
  poster_path      TEXT,
  backdrop_path    TEXT,

  -- Dates & series metadata
  first_air_date   TEXT,
  first_air_year   INTEGER,
  last_air_date    TEXT,
  number_of_seasons  INTEGER DEFAULT 0,
  number_of_episodes INTEGER DEFAULT 0,
  status           TEXT    DEFAULT 'ongoing',

  -- Ratings & popularity
  vote_average     REAL    DEFAULT 0,
  vote_count       INTEGER DEFAULT 0,
  popularity       REAL    DEFAULT 0,
  trailer_key      TEXT,
  imdb_id          TEXT,
  original_language TEXT,
  country_of_origin TEXT,
  primary_genre    TEXT,
  age_rating       TEXT    DEFAULT 'PG',

  -- SEO
  seo_title_ar     TEXT,
  seo_description_ar TEXT,
  seo_keywords_json TEXT,
  canonical_url    TEXT,

  -- JSON columns (merged from legacy DB via tmdb_id)
  genres_json      TEXT,   -- [{"id":18,"name":"Drama","name_ar":"دراما"}]
  cast_json        TEXT,
  countries_json   TEXT,
  keywords_json    TEXT,
  companies_json   TEXT,
  networks_json    TEXT,   -- [{"id":1,"name":"Netflix","logo_path":"..."}]
  seasons_json     TEXT,   -- [{"season_number":1,"episode_count":10,...}]
  episodes_json    TEXT,   -- [{"id":...,"episode_number":1,"name":"...",...}]

  -- Ingestion control flags
  is_fetched       INTEGER DEFAULT 0,
  is_filtered      INTEGER DEFAULT 0,
  filter_reason    TEXT,
  is_complete      INTEGER DEFAULT 0,
  filter_status    TEXT    DEFAULT 'clean',
  sync_priority    INTEGER DEFAULT 5,
  synced_to_turso  INTEGER DEFAULT 0,  -- legacy column name (pre-D1), kept for compatibility
  synced_at        TEXT,

  -- Timestamps
  created_at       TEXT    DEFAULT (datetime('now')),
  updated_at       TEXT    DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- GENRES
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS genres (
  id       INTEGER PRIMARY KEY,   -- same as tmdb_id, kept for compatibility
  tmdb_id  INTEGER NOT NULL UNIQUE,
  name_en  TEXT    NOT NULL,
  name_ar  TEXT    NOT NULL,
  slug     TEXT    NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS genre_counts (
  genre_id    INTEGER PRIMARY KEY,
  movie_count  INTEGER DEFAULT 0,
  series_count INTEGER DEFAULT 0,
  updated_at   TEXT    DEFAULT (datetime('now')),
  FOREIGN KEY (genre_id) REFERENCES genres(tmdb_id)
);

-- ---------------------------------------------------------------------------
-- LOOKUP / REFERENCE TABLES
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS short_titles_lookup (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id    INTEGER NOT NULL,
  media_type   TEXT    NOT NULL,  -- 'movie' | 'tv'
  title_ar     TEXT,
  title_en     TEXT,
  name_ar      TEXT,
  name_en      TEXT,
  poster_path  TEXT,
  release_year INTEGER,
  first_air_year INTEGER,
  vote_average REAL,
  popularity   REAL,
  filter_status TEXT,
  slug         TEXT,
  title_length INTEGER
);

CREATE TABLE IF NOT EXISTS countries (
  iso_3166_1   TEXT PRIMARY KEY,
  english_name TEXT,
  arabic_name  TEXT
);

CREATE TABLE IF NOT EXISTS languages (
  iso_639_1    TEXT PRIMARY KEY,
  english_name TEXT,
  arabic_name  TEXT
);

CREATE TABLE IF NOT EXISTS global_keywords (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword_en TEXT    NOT NULL,
  keyword_ar TEXT    NOT NULL,
  category   TEXT,
  created_at TEXT    DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- SETTINGS & ADMIN
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS settings (
  id                INTEGER PRIMARY KEY,
  site_name         TEXT,
  site_description  TEXT,
  maintenance_mode  BOOLEAN DEFAULT 0,
  registration_open BOOLEAN DEFAULT 1,
  updated_at        TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS operations_log (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp        TEXT    DEFAULT (datetime('now')),
  user_id          TEXT    NOT NULL,
  username         TEXT,
  command          TEXT    NOT NULL,
  exit_code        INTEGER,
  duration_seconds INTEGER,
  stdout_preview   TEXT,
  stderr_preview   TEXT
);

-- ---------------------------------------------------------------------------
-- USER TABLES (schema only — no production data)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS favorites (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      TEXT    NOT NULL,
  content_type TEXT    NOT NULL,  -- 'movie' | 'tv'
  content_id   INTEGER NOT NULL,
  tmdb_id      INTEGER NOT NULL,
  title        TEXT,
  poster_path  TEXT,
  added_at     TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS watch_history (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        TEXT    NOT NULL,
  content_type   TEXT    NOT NULL,
  content_id     INTEGER NOT NULL,
  tmdb_id        INTEGER NOT NULL,
  title          TEXT,
  poster_path    TEXT,
  watch_date     TEXT    DEFAULT (datetime('now')),
  watch_duration INTEGER DEFAULT 0,
  completed      BOOLEAN DEFAULT 0,
  season_number  INTEGER,
  episode_number INTEGER
);

CREATE TABLE IF NOT EXISTS user_reviews (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      TEXT    NOT NULL,
  username     TEXT,
  content_type TEXT    NOT NULL,
  content_id   INTEGER NOT NULL,
  tmdb_id      INTEGER NOT NULL,
  title        TEXT,
  rating       REAL,
  review_text  TEXT,
  created_at   TEXT    DEFAULT (datetime('now')),
  updated_at   TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id                 TEXT    NOT NULL,
  achievement_type        TEXT    NOT NULL,
  achievement_title       TEXT    NOT NULL,
  achievement_description TEXT,
  icon                    TEXT,
  earned_at               TEXT    DEFAULT (datetime('now')),
  metadata                TEXT
);

CREATE TABLE IF NOT EXISTS user_notification_settings (
  user_id                   TEXT    PRIMARY KEY,
  email_notifications       BOOLEAN DEFAULT 1,
  new_content_notifications BOOLEAN DEFAULT 1,
  created_at                TEXT    DEFAULT (datetime('now')),
  updated_at                TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_privacy_settings (
  user_id           TEXT    PRIMARY KEY,
  show_watch_history BOOLEAN DEFAULT 1,
  show_favorites    BOOLEAN DEFAULT 1,
  created_at        TEXT    DEFAULT (datetime('now')),
  updated_at        TEXT    DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------

-- movies: slug (unique lookups), filter combo for listing pages
CREATE INDEX IF NOT EXISTS idx_movies_slug            ON movies(slug);
CREATE INDEX IF NOT EXISTS idx_movies_filter          ON movies(filter_status, is_complete);
CREATE INDEX IF NOT EXISTS idx_movies_genre_filter    ON movies(primary_genre, filter_status, popularity DESC);
CREATE INDEX IF NOT EXISTS idx_movies_popularity      ON movies(popularity DESC);
CREATE INDEX IF NOT EXISTS idx_movies_vote_average    ON movies(vote_average DESC);
CREATE INDEX IF NOT EXISTS idx_movies_vote_count      ON movies(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_movies_release_year    ON movies(release_year DESC);
CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id         ON movies(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_movies_original_lang   ON movies(original_language);

-- tv_series: same pattern
CREATE INDEX IF NOT EXISTS idx_tv_slug                ON tv_series(slug);
CREATE INDEX IF NOT EXISTS idx_tv_filter              ON tv_series(filter_status, is_complete);
CREATE INDEX IF NOT EXISTS idx_tv_genre_filter        ON tv_series(primary_genre, filter_status, popularity DESC);
CREATE INDEX IF NOT EXISTS idx_tv_popularity          ON tv_series(popularity DESC);
CREATE INDEX IF NOT EXISTS idx_tv_vote_average        ON tv_series(vote_average DESC);
CREATE INDEX IF NOT EXISTS idx_tv_vote_count          ON tv_series(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_tv_first_air_year      ON tv_series(first_air_year DESC);
CREATE INDEX IF NOT EXISTS idx_tv_tmdb_id             ON tv_series(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_tv_original_lang       ON tv_series(original_language);

-- genres
CREATE INDEX IF NOT EXISTS idx_genres_slug            ON genres(slug);

-- short_titles_lookup
CREATE INDEX IF NOT EXISTS idx_stl_source             ON short_titles_lookup(source_id, media_type);
CREATE INDEX IF NOT EXISTS idx_stl_title_length       ON short_titles_lookup(title_length);

-- user tables
CREATE INDEX IF NOT EXISTS idx_favorites_user         ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_user     ON watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reviews_user      ON user_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- ---------------------------------------------------------------------------
-- FTS5 VIRTUAL TABLES (trigram tokenizer — VERIFIED on D1 2026-08-20)
-- Columns indexed: title_ar + title_en (movies), name_ar + name_en (tv_series)
-- content= links to main table; content_rowid= maps FTS rowid → table id
-- ---------------------------------------------------------------------------

CREATE VIRTUAL TABLE IF NOT EXISTS movies_fts USING fts5(
  title_ar,
  title_en,
  content='movies',
  content_rowid='id',
  tokenize='trigram'
);

CREATE VIRTUAL TABLE IF NOT EXISTS series_fts USING fts5(
  name_ar,
  name_en,
  content='tv_series',
  content_rowid='id',
  tokenize='trigram'
);

-- FTS triggers: keep virtual tables in sync with main tables on INSERT/DELETE
-- NOTE: UPDATE triggers need two statements (delete old + insert new).
-- D1 supports only one statement per trigger body without BEGIN...END blocks.
-- We split UPDATE into delete-trigger + insert-trigger to stay compatible.

CREATE TRIGGER IF NOT EXISTS movies_fts_insert AFTER INSERT ON movies
BEGIN
  INSERT INTO movies_fts(rowid, title_ar, title_en) VALUES (new.id, new.title_ar, new.title_en);
END;

CREATE TRIGGER IF NOT EXISTS movies_fts_delete AFTER DELETE ON movies
BEGIN
  INSERT INTO movies_fts(movies_fts, rowid, title_ar, title_en) VALUES ('delete', old.id, old.title_ar, old.title_en);
END;

CREATE TRIGGER IF NOT EXISTS movies_fts_update_del AFTER UPDATE ON movies
BEGIN
  INSERT INTO movies_fts(movies_fts, rowid, title_ar, title_en) VALUES ('delete', old.id, old.title_ar, old.title_en);
END;

CREATE TRIGGER IF NOT EXISTS movies_fts_update_ins AFTER UPDATE ON movies
BEGIN
  INSERT INTO movies_fts(rowid, title_ar, title_en) VALUES (new.id, new.title_ar, new.title_en);
END;

CREATE TRIGGER IF NOT EXISTS series_fts_insert AFTER INSERT ON tv_series
BEGIN
  INSERT INTO series_fts(rowid, name_ar, name_en) VALUES (new.id, new.name_ar, new.name_en);
END;

CREATE TRIGGER IF NOT EXISTS series_fts_delete AFTER DELETE ON tv_series
BEGIN
  INSERT INTO series_fts(series_fts, rowid, name_ar, name_en) VALUES ('delete', old.id, old.name_ar, old.name_en);
END;

CREATE TRIGGER IF NOT EXISTS series_fts_update_del AFTER UPDATE ON tv_series
BEGIN
  INSERT INTO series_fts(series_fts, rowid, name_ar, name_en) VALUES ('delete', old.id, old.name_ar, old.name_en);
END;

CREATE TRIGGER IF NOT EXISTS series_fts_update_ins AFTER UPDATE ON tv_series
BEGIN
  INSERT INTO series_fts(rowid, name_ar, name_en) VALUES (new.id, new.name_ar, new.name_en);
END;

-- ---------------------------------------------------------------------------
-- MISSING PRODUCTION TABLES (reconciled with live D1 introspection 2026-09-14)
-- These exist in production D1 and were missing from this schema — mirrored
-- here so the reference schema matches production.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id                TEXT PRIMARY KEY,
  email             TEXT NOT NULL UNIQUE,
  name              TEXT,
  avatar_url        TEXT,
  role              TEXT NOT NULL DEFAULT 'user',
  created_at        TEXT DEFAULT (datetime('now')),
  last_login_at     TEXT,
  name_last_changed TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  user_agent TEXT,
  ip         TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Rate-limiting events for user actions (created at runtime by the app —
-- now also defined here so it can be created/migrated explicitly).
CREATE TABLE IF NOT EXISTS rate_events (
  user_id TEXT NOT NULL,
  kind    TEXT NOT NULL,
  tmdb_id INTEGER,
  ts      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_events_user_kind_ts ON rate_events(user_id, kind, ts);

-- Ad delivery tables (managed from the admin panel)
CREATE TABLE IF NOT EXISTS ad_providers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  status     TEXT NOT NULL DEFAULT 'paused' CHECK (status IN ('active','paused')),
  notes      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ad_slots (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slot_key   TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  types      TEXT NOT NULL,
  page_scope TEXT NOT NULL DEFAULT 'all' CHECK (page_scope IN ('all','watch_only')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ad_zones (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id  INTEGER NOT NULL REFERENCES ad_providers(id),
  name         TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('popunder','banner','native','push','preroll_vast','midroll_vast','interstitial')),
  integration  TEXT NOT NULL CHECK (integration IN ('script','html','click_url','vast_url')),
  script_url   TEXT NULL CHECK (script_url IS NULL OR script_url LIKE 'http://%' OR script_url LIKE 'https://%'),
  html_snippet TEXT NULL,
  click_url    TEXT NULL CHECK (click_url IS NULL OR click_url LIKE 'http://%' OR click_url LIKE 'https://%'),
  vast_url     TEXT NULL CHECK (vast_url IS NULL OR vast_url LIKE 'http://%' OR vast_url LIKE 'https://%'),
  zone_key     TEXT NULL,
  width        INTEGER NULL,
  height       INTEGER NULL,
  active       INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ad_zones_provider ON ad_zones(provider_id);
CREATE INDEX IF NOT EXISTS idx_ad_zones_active   ON ad_zones(active);

CREATE TABLE IF NOT EXISTS ad_slot_assignments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  slot_key        TEXT NOT NULL REFERENCES ad_slots(slot_key),
  zone_id         INTEGER NOT NULL REFERENCES ad_zones(id),
  priority        INTEGER NOT NULL DEFAULT 1,
  weight          INTEGER NOT NULL DEFAULT 1,
  device          TEXT NOT NULL DEFAULT 'all' CHECK (device IN ('all','mobile','desktop')),
  start_at        TEXT NULL,
  end_at          TEXT NULL,
  frequency_cap   INTEGER NOT NULL DEFAULT 1,
  frequency_hours INTEGER NOT NULL DEFAULT 24,
  active          INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ad_assign_slot ON ad_slot_assignments(slot_key);
CREATE INDEX IF NOT EXISTS idx_ad_assign_zone ON ad_slot_assignments(zone_id);

CREATE TABLE IF NOT EXISTS ads (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('popunder','banner','preroll','midroll')),
  content         TEXT NOT NULL,
  position        TEXT,
  active          INTEGER DEFAULT 1,
  impressions     INTEGER DEFAULT 0,
  clicks          INTEGER DEFAULT 0,
  created_at      TEXT DEFAULT (datetime('now')),
  click_url       TEXT NULL CHECK (click_url IS NULL OR click_url LIKE 'http://%' OR click_url LIKE 'https://%'),
  weight          INTEGER NOT NULL DEFAULT 1,
  device          TEXT NOT NULL DEFAULT 'all',
  start_at        TEXT NULL,
  end_at          TEXT NULL,
  frequency_cap   INTEGER NOT NULL DEFAULT 1,
  frequency_hours INTEGER NOT NULL DEFAULT 24,
  impression_cap  INTEGER NULL,
  updated_at      TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_ads_type     ON ads(type);
CREATE INDEX IF NOT EXISTS idx_ads_position ON ads(position);
CREATE INDEX IF NOT EXISTS idx_ads_active   ON ads(active);

CREATE TABLE IF NOT EXISTS site_config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS completed_watch (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      TEXT NOT NULL,
  content_type TEXT NOT NULL,
  tmdb_id      INTEGER NOT NULL,
  title        TEXT,
  poster_path  TEXT,
  added_at     TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, content_type, tmdb_id)
);

CREATE INDEX IF NOT EXISTS idx_completed_watch_user ON completed_watch(user_id);

CREATE TABLE IF NOT EXISTS movie_similar_cache (
  tmdb_id         INTEGER PRIMARY KEY,
  recommended_ids TEXT NOT NULL,
  updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS series_similar_cache (
  tmdb_id         INTEGER PRIMARY KEY,
  recommended_ids TEXT NOT NULL,
  updated_at      TEXT DEFAULT (datetime('now'))
);

-- Extra watch_history indexes (present in migrations but were missing from D1)
CREATE INDEX IF NOT EXISTS idx_watch_history_date    ON watch_history(watch_date);
CREATE INDEX IF NOT EXISTS idx_watch_history_content ON watch_history(content_type, content_id);

-- operations_log timestamp index (was missing from D1)
CREATE INDEX IF NOT EXISTS idx_operations_log_timestamp ON operations_log(timestamp DESC);
