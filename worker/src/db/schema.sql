-- ============================================================
-- 4CIMA DATABASE SCHEMA v2.0
-- Turso (SQLite) - Clean Design
-- ============================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ============================================================
-- MOVIES
-- ============================================================
CREATE TABLE IF NOT EXISTS movies (
  -- Identity
  id                  INTEGER PRIMARY KEY,
  tmdb_id             INTEGER UNIQUE NOT NULL,
  imdb_id             TEXT,
  slug                TEXT UNIQUE NOT NULL,
  -- نظام الـ slug:
  -- المرحلة 1: the-dark-knight
  -- المرحلة 2: the-dark-knight-2015      (لو في تكرار)
  -- المرحلة 3: the-dark-knight-2015-action (لو في تكرار)
  -- المرحلة 4: the-dark-knight-2015-action-2 (لو في تكرار)
  -- ❌ لا tmdb_id في الـ slug إطلاقاً
  -- ✅ tmdb_id محفوظ في عمود tmdb_id منفصل
  
  -- Titles
  title_ar            TEXT NOT NULL,
  title_en            TEXT NOT NULL,
  title_original      TEXT,
  
  -- Content
  overview_ar         TEXT,
  overview_en         TEXT,
  tagline_ar          TEXT,
  
  -- Primary Genre (للفلترة السريعة)
  primary_genre       TEXT,
  
  -- Keywords (كلمات مفتاحية خاصة بكل عمل)
  keywords            TEXT,
  
  -- Global Keywords (كلمات مفتاحية عامة مشتركة)
  global_keywords     TEXT,
  
  -- Media
  poster_path         TEXT,
  backdrop_path       TEXT,
  trailer_key         TEXT,
  
  -- Metadata
  release_date        TEXT,
  release_year        INTEGER,
  runtime             INTEGER,
  original_language   TEXT DEFAULT 'en',
  content_language    TEXT DEFAULT 'ar'
    CHECK(content_language IN ('ar','en','dubbed','subtitled')),
  country_of_origin   TEXT,
  production_companies TEXT,
  
  -- Ratings
  vote_average        REAL DEFAULT 0,
  vote_count          INTEGER DEFAULT 0,
  popularity          REAL DEFAULT 0,
  
  -- Classification
  content_type        TEXT NOT NULL DEFAULT 'movie'
    CHECK(content_type IN ('movie','anime_movie')),
  quality             TEXT DEFAULT 'HD'
    CHECK(quality IN ('CAM','HD','FHD','4K')),
  age_rating          TEXT DEFAULT 'PG'
    CHECK(age_rating IN ('G','PG','PG-13','R','NC-17','18+')),
  
  -- Data Completeness
  has_arabic_title    INTEGER DEFAULT 0 CHECK(has_arabic_title IN (0,1)),
  has_arabic_overview INTEGER DEFAULT 0 CHECK(has_arabic_overview IN (0,1)),
  has_trailer         INTEGER DEFAULT 0 CHECK(has_trailer IN (0,1)),
  has_servers         INTEGER DEFAULT 0 CHECK(has_servers IN (0,1)),
  has_cast            INTEGER DEFAULT 0 CHECK(has_cast IN (0,1)),
  has_genres          INTEGER DEFAULT 0 CHECK(has_genres IN (0,1)),
  has_keywords        INTEGER DEFAULT 0 CHECK(has_keywords IN (0,1)),
  is_complete         INTEGER DEFAULT 0,
  
  -- Backup & Source
  source              TEXT DEFAULT 'tmdb'
    CHECK(source IN ('tmdb','manual','migrated')),
  backed_up_at        TEXT,
  backup_version      INTEGER DEFAULT 0,
  
  -- Status
  is_active           INTEGER DEFAULT 1,
  is_featured         INTEGER DEFAULT 0,
  
  -- Stats
  view_count          INTEGER DEFAULT 0,
  download_count      INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at          TEXT DEFAULT (datetime('now')),
  updated_at          TEXT DEFAULT (datetime('now'))
);
-- ============================================================
-- TV SERIES
-- ============================================================
CREATE TABLE IF NOT EXISTS tv_series (
  id INTEGER PRIMARY KEY,
  tmdb_id INTEGER UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_original TEXT,
  overview_ar TEXT,
  overview_en TEXT,
  primary_genre TEXT,
  keywords TEXT,
  global_keywords TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  trailer_key TEXT,
  first_air_date TEXT,
  last_air_date TEXT,
  first_air_year INTEGER,
  original_language TEXT DEFAULT 'ar',
  content_language TEXT DEFAULT 'ar' CHECK(content_language IN ('ar','en','dubbed','subtitled')),
  country_of_origin TEXT,
  production_companies TEXT,
  number_of_seasons INTEGER DEFAULT 1,
  number_of_episodes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ongoing' CHECK(status IN ('ongoing','ended','cancelled','upcoming')),
  vote_average REAL DEFAULT 0,
  vote_count INTEGER DEFAULT 0,
  popularity REAL DEFAULT 0,
  content_type TEXT NOT NULL DEFAULT 'series' CHECK(content_type IN ('series','anime','play')),
  quality TEXT DEFAULT 'HD' CHECK(quality IN ('CAM','HD','FHD','4K')),
  age_rating TEXT DEFAULT 'PG' CHECK(age_rating IN ('G','PG','PG-13','R','NC-17','18+')),
  has_arabic_title INTEGER DEFAULT 0 CHECK(has_arabic_title IN (0,1)),
  has_arabic_overview INTEGER DEFAULT 0 CHECK(has_arabic_overview IN (0,1)),
  has_trailer INTEGER DEFAULT 0 CHECK(has_trailer IN (0,1)),
  has_cast INTEGER DEFAULT 0 CHECK(has_cast IN (0,1)),
  has_genres INTEGER DEFAULT 0 CHECK(has_genres IN (0,1)),
  has_keywords INTEGER DEFAULT 0 CHECK(has_keywords IN (0,1)),
  is_complete INTEGER DEFAULT 0,
  source TEXT DEFAULT 'tmdb' CHECK(source IN ('tmdb','manual','migrated')),
  backed_up_at TEXT,
  backup_version INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  is_featured INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- SEASONS
-- ============================================================
CREATE TABLE IF NOT EXISTS seasons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  series_id INTEGER NOT NULL,
  tmdb_id INTEGER,
  season_number INTEGER NOT NULL,
  title_ar TEXT,
  title_en TEXT,
  overview_ar TEXT,
  overview_en TEXT,
  poster_path TEXT,
  air_date TEXT,
  air_year INTEGER,
  episode_count INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (series_id) REFERENCES tv_series(id) ON DELETE CASCADE,
  UNIQUE(series_id, season_number)
);

-- ============================================================
-- EPISODES
-- ============================================================
CREATE TABLE IF NOT EXISTS episodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  series_id INTEGER NOT NULL,
  season_id INTEGER NOT NULL,
  tmdb_id INTEGER,
  episode_number INTEGER NOT NULL,
  season_number INTEGER NOT NULL,
  title_ar TEXT,
  title_en TEXT,
  overview_ar TEXT,
  overview_en TEXT,
  still_path TEXT,
  air_date TEXT,
  runtime INTEGER,
  vote_average REAL DEFAULT 0,
  has_servers INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  view_count INTEGER DEFAULT 0,
  source TEXT DEFAULT 'tmdb',
  backed_up_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (series_id) REFERENCES tv_series(id) ON DELETE CASCADE,
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
  UNIQUE(season_id, episode_number)
);

-- ============================================================
-- GENRES
-- ============================================================
CREATE TABLE IF NOT EXISTS genres (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tmdb_id INTEGER UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  applies_to TEXT DEFAULT 'all' CHECK(applies_to IN ('all','movie','series','anime'))
);

CREATE TABLE IF NOT EXISTS content_genres (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id INTEGER NOT NULL,
  content_type TEXT NOT NULL CHECK(content_type IN ('movie','series')),
  genre_id INTEGER NOT NULL,
  FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE,
  UNIQUE(content_id, content_type, genre_id)
);

-- ============================================================
-- GLOBAL KEYWORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS global_keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword_ar TEXT NOT NULL,
  keyword_en TEXT,
  slug TEXT UNIQUE NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS content_keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id INTEGER NOT NULL,
  content_type TEXT NOT NULL CHECK(content_type IN ('movie','series')),
  keyword_id INTEGER NOT NULL,
  FOREIGN KEY (keyword_id) REFERENCES global_keywords(id) ON DELETE CASCADE,
  UNIQUE(content_id, content_type, keyword_id)
);

-- ============================================================
-- ACTORS & CAST
-- ============================================================
CREATE TABLE IF NOT EXISTS actors (
  id INTEGER PRIMARY KEY,
  tmdb_id INTEGER UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  name_ar TEXT,
  name_en TEXT NOT NULL,
  biography_ar TEXT,
  biography_en TEXT,
  profile_path TEXT,
  birthday TEXT,
  birthplace TEXT,
  nationality TEXT,
  popularity REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cast_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id INTEGER NOT NULL,
  content_type TEXT NOT NULL CHECK(content_type IN ('movie','series')),
  actor_id INTEGER NOT NULL,
  character_name TEXT,
  cast_order INTEGER DEFAULT 0,
  FOREIGN KEY (actor_id) REFERENCES actors(id) ON DELETE CASCADE,
  UNIQUE(content_id, content_type, actor_id)
);

-- ============================================================
-- VIDEO SERVERS
-- ============================================================
CREATE TABLE IF NOT EXISTS video_servers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id INTEGER NOT NULL,
  content_type TEXT NOT NULL CHECK(content_type IN ('movie','episode')),
  server_name TEXT NOT NULL,
  server_url TEXT NOT NULL,
  quality TEXT DEFAULT 'HD' CHECK(quality IN ('CAM','HD','FHD','4K')),
  language TEXT DEFAULT 'ar' CHECK(language IN ('ar','en','dubbed','subtitled')),
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  added_by TEXT DEFAULT 'admin',
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(content_id, content_type, server_url)
);

-- ============================================================
-- QURAN
-- ============================================================
CREATE TABLE IF NOT EXISTS quran_reciters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  image_url TEXT,
  description_ar TEXT,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quran_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reciter_id INTEGER,
  slug TEXT UNIQUE NOT NULL,
  title_ar TEXT NOT NULL,
  title_en TEXT,
  content_type TEXT NOT NULL CHECK(content_type IN ('recitation','sermon','story')),
  audio_url TEXT,
  image_url TEXT,
  description_ar TEXT,
  duration INTEGER,
  is_active INTEGER DEFAULT 1,
  play_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (reciter_id) REFERENCES quran_reciters(id) ON DELETE SET NULL
);

-- ============================================================
-- SOFTWARE
-- ============================================================
CREATE TABLE IF NOT EXISTS software (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ar TEXT,
  icon_url TEXT,
  category TEXT,
  platform TEXT DEFAULT 'windows' CHECK(platform IN ('windows','mac','android','ios','web')),
  version TEXT,
  file_size TEXT,
  developer TEXT,
  download_url TEXT,
  is_active INTEGER DEFAULT 1,
  download_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE TRIGGER IF NOT EXISTS trg_movie_complete_update
AFTER UPDATE ON movies
BEGIN
  UPDATE movies SET
    is_complete = (CASE WHEN NEW.has_arabic_title = 1 AND NEW.has_arabic_overview = 1 AND NEW.has_servers = 1 THEN 1 ELSE 0 END),
    has_arabic_title = (CASE WHEN NEW.title_ar IS NOT NULL AND NEW.title_ar != '' THEN 1 ELSE 0 END),
    has_arabic_overview = (CASE WHEN NEW.overview_ar IS NOT NULL AND NEW.overview_ar != '' THEN 1 ELSE 0 END),
    has_trailer = (CASE WHEN NEW.trailer_key IS NOT NULL AND NEW.trailer_key != '' THEN 1 ELSE 0 END),
    has_keywords = (CASE WHEN NEW.keywords IS NOT NULL AND NEW.keywords != '[]' AND NEW.keywords != '' THEN 1 ELSE 0 END),
    updated_at = datetime('now')
  WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_series_complete_update
AFTER UPDATE ON tv_series
BEGIN
  UPDATE tv_series SET
    is_complete = (CASE WHEN NEW.has_arabic_title = 1 AND NEW.has_arabic_overview = 1 THEN 1 ELSE 0 END),
    has_arabic_title = (CASE WHEN NEW.title_ar IS NOT NULL AND NEW.title_ar != '' THEN 1 ELSE 0 END),
    has_arabic_overview = (CASE WHEN NEW.overview_ar IS NOT NULL AND NEW.overview_ar != '' THEN 1 ELSE 0 END),
    has_trailer = (CASE WHEN NEW.trailer_key IS NOT NULL AND NEW.trailer_key != '' THEN 1 ELSE 0 END),
    has_keywords = (CASE WHEN NEW.keywords IS NOT NULL AND NEW.keywords != '[]' AND NEW.keywords != '' THEN 1 ELSE 0 END),
    updated_at = datetime('now')
  WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_server_added_movie
AFTER INSERT ON video_servers
WHEN NEW.content_type = 'movie'
BEGIN
  UPDATE movies SET has_servers = 1 WHERE id = NEW.content_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_server_added_episode
AFTER INSERT ON video_servers
WHEN NEW.content_type = 'episode'
BEGIN
  UPDATE episodes SET has_servers = 1 WHERE id = NEW.content_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_cast_added
AFTER INSERT ON cast_members
BEGIN
  UPDATE movies SET has_cast = 1 WHERE id = NEW.content_id AND NEW.content_type = 'movie';
  UPDATE tv_series SET has_cast = 1 WHERE id = NEW.content_id AND NEW.content_type = 'series';
END;

CREATE TRIGGER IF NOT EXISTS trg_genre_added
AFTER INSERT ON content_genres
BEGIN
  UPDATE movies SET has_genres = 1 WHERE id = NEW.content_id AND NEW.content_type = 'movie';
  UPDATE tv_series SET has_genres = 1 WHERE id = NEW.content_id AND NEW.content_type = 'series';
END;

CREATE TRIGGER IF NOT EXISTS trg_keyword_usage_count
AFTER INSERT ON content_keywords
BEGIN
  UPDATE global_keywords SET usage_count = usage_count + 1 WHERE id = NEW.keyword_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_episode_count_insert
AFTER INSERT ON episodes
BEGIN
  UPDATE seasons SET episode_count = (SELECT COUNT(*) FROM episodes WHERE season_id = NEW.season_id AND is_active = 1) WHERE id = NEW.season_id;
  UPDATE tv_series SET number_of_episodes = (SELECT COUNT(*) FROM episodes WHERE series_id = NEW.series_id AND is_active = 1) WHERE id = NEW.series_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_season_count_insert
AFTER INSERT ON seasons
BEGIN
  UPDATE tv_series SET number_of_seasons = (SELECT COUNT(*) FROM seasons WHERE series_id = NEW.series_id AND is_active = 1) WHERE id = NEW.series_id;
END;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_movies_tmdb ON movies(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_movies_slug ON movies(slug);
CREATE INDEX IF NOT EXISTS idx_movies_type ON movies(content_type);
CREATE INDEX IF NOT EXISTS idx_movies_year ON movies(release_year DESC);
CREATE INDEX IF NOT EXISTS idx_movies_lang ON movies(original_language);
CREATE INDEX IF NOT EXISTS idx_movies_country ON movies(country_of_origin);
CREATE INDEX IF NOT EXISTS idx_movies_genre ON movies(primary_genre);
CREATE INDEX IF NOT EXISTS idx_movies_active ON movies(is_active, popularity DESC);
CREATE INDEX IF NOT EXISTS idx_movies_featured ON movies(is_featured) WHERE is_featured = 1;
CREATE INDEX IF NOT EXISTS idx_movies_incomplete ON movies(is_complete) WHERE is_complete = 0;
CREATE INDEX IF NOT EXISTS idx_movies_no_servers ON movies(has_servers) WHERE has_servers = 0;
CREATE INDEX IF NOT EXISTS idx_movies_no_arabic ON movies(has_arabic_title) WHERE has_arabic_title = 0;
CREATE INDEX IF NOT EXISTS idx_movies_no_keywords ON movies(has_keywords) WHERE has_keywords = 0;

CREATE INDEX IF NOT EXISTS idx_series_tmdb ON tv_series(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_series_slug ON tv_series(slug);
CREATE INDEX IF NOT EXISTS idx_series_type ON tv_series(content_type);
CREATE INDEX IF NOT EXISTS idx_series_year ON tv_series(first_air_year DESC);
CREATE INDEX IF NOT EXISTS idx_series_lang ON tv_series(original_language);
CREATE INDEX IF NOT EXISTS idx_series_country ON tv_series(country_of_origin);
CREATE INDEX IF NOT EXISTS idx_series_genre ON tv_series(primary_genre);
CREATE INDEX IF NOT EXISTS idx_series_active ON tv_series(is_active, popularity DESC);
CREATE INDEX IF NOT EXISTS idx_series_incomplete ON tv_series(is_complete) WHERE is_complete = 0;
CREATE INDEX IF NOT EXISTS idx_series_status ON tv_series(status);
CREATE INDEX IF NOT EXISTS idx_series_no_keywords ON tv_series(has_keywords) WHERE has_keywords = 0;

CREATE INDEX IF NOT EXISTS idx_seasons_series ON seasons(series_id);
CREATE INDEX IF NOT EXISTS idx_episodes_series ON episodes(series_id);
CREATE INDEX IF NOT EXISTS idx_episodes_season ON episodes(season_id);
CREATE INDEX IF NOT EXISTS idx_episodes_num ON episodes(series_id, season_number, episode_number);
CREATE INDEX IF NOT EXISTS idx_episodes_no_server ON episodes(has_servers) WHERE has_servers = 0;

CREATE INDEX IF NOT EXISTS idx_cast_content ON cast_members(content_id, content_type);
CREATE INDEX IF NOT EXISTS idx_cast_actor ON cast_members(actor_id);
CREATE INDEX IF NOT EXISTS idx_content_genres ON content_genres(content_id, content_type);
CREATE INDEX IF NOT EXISTS idx_content_keywords ON content_keywords(content_id, content_type);
CREATE INDEX IF NOT EXISTS idx_global_keywords ON global_keywords(slug);
CREATE INDEX IF NOT EXISTS idx_servers_content ON video_servers(content_id, content_type, is_active);
CREATE INDEX IF NOT EXISTS idx_genres_slug ON genres(slug);
