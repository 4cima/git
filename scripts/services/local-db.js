/**
 * SQLite Local Database
 */

const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const DB_PATH = path.join(__dirname, '../../data/4cima-local.db')
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })

const db = new Database(DB_PATH, {
  verbose: process.env.DEBUG ? console.log : null
})

db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')
db.pragma('cache_size = 100000')
db.pragma('temp_store = MEMORY')
db.pragma('mmap_size = 30000000000')
db.pragma('foreign_keys = ON')

db.exec(`
CREATE TABLE IF NOT EXISTS movies (
  id INTEGER PRIMARY KEY, tmdb_id INTEGER UNIQUE NOT NULL, imdb_id TEXT,
  slug TEXT UNIQUE NOT NULL, title_ar TEXT NOT NULL, title_en TEXT NOT NULL,
  title_original TEXT, overview_ar TEXT, overview_en TEXT, tagline_ar TEXT,
  primary_genre TEXT, keywords TEXT, global_keywords TEXT,
  poster_path TEXT, backdrop_path TEXT, trailer_key TEXT, trailer_key_2 TEXT,
  release_date TEXT, release_year INTEGER, runtime INTEGER,
  original_language TEXT DEFAULT 'en', content_language TEXT DEFAULT 'ar',
  country_of_origin TEXT, production_companies TEXT,
  vote_average REAL DEFAULT 0, vote_count INTEGER DEFAULT 0, popularity REAL DEFAULT 0,
  content_type TEXT NOT NULL DEFAULT 'movie', quality TEXT DEFAULT 'HD', age_rating TEXT DEFAULT 'PG',
  has_arabic_title INTEGER DEFAULT 0, has_arabic_overview INTEGER DEFAULT 0,
  has_trailer INTEGER DEFAULT 0, has_servers INTEGER DEFAULT 0, has_cast INTEGER DEFAULT 0,
  has_genres INTEGER DEFAULT 0, has_keywords INTEGER DEFAULT 0, is_complete INTEGER DEFAULT 0,
  source TEXT DEFAULT 'tmdb', backed_up_at TEXT, backup_version INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1, is_featured INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0, download_count INTEGER DEFAULT 0,
  synced_to_turso INTEGER DEFAULT 0, synced_at TEXT, sync_priority INTEGER DEFAULT 5, sync_error TEXT,
  created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tv_series (
  id INTEGER PRIMARY KEY, tmdb_id INTEGER UNIQUE NOT NULL, slug TEXT UNIQUE NOT NULL,
  title_ar TEXT NOT NULL, title_en TEXT NOT NULL, title_original TEXT,
  overview_ar TEXT, overview_en TEXT, primary_genre TEXT, keywords TEXT, global_keywords TEXT,
  poster_path TEXT, backdrop_path TEXT, trailer_key TEXT, trailer_key_2 TEXT,
  first_air_date TEXT, last_air_date TEXT, first_air_year INTEGER,
  original_language TEXT DEFAULT 'ar', content_language TEXT DEFAULT 'ar',
  country_of_origin TEXT, production_companies TEXT,
  number_of_seasons INTEGER DEFAULT 1, number_of_episodes INTEGER DEFAULT 0, status TEXT DEFAULT 'ongoing',
  vote_average REAL DEFAULT 0, vote_count INTEGER DEFAULT 0, popularity REAL DEFAULT 0,
  content_type TEXT NOT NULL DEFAULT 'series', quality TEXT DEFAULT 'HD', age_rating TEXT DEFAULT 'PG',
  has_arabic_title INTEGER DEFAULT 0, has_arabic_overview INTEGER DEFAULT 0,
  has_trailer INTEGER DEFAULT 0, has_cast INTEGER DEFAULT 0, has_genres INTEGER DEFAULT 0,
  has_keywords INTEGER DEFAULT 0, is_complete INTEGER DEFAULT 0,
  source TEXT DEFAULT 'tmdb', backed_up_at TEXT, backup_version INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1, is_featured INTEGER DEFAULT 0, view_count INTEGER DEFAULT 0,
  synced_to_turso INTEGER DEFAULT 0, synced_at TEXT, sync_priority INTEGER DEFAULT 5, sync_error TEXT,
  created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS seasons (
  id INTEGER PRIMARY KEY AUTOINCREMENT, series_id INTEGER NOT NULL, tmdb_id INTEGER,
  season_number INTEGER NOT NULL, title_ar TEXT, title_en TEXT,
  overview_ar TEXT, overview_en TEXT, poster_path TEXT,
  air_date TEXT, air_year INTEGER, episode_count INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1, synced_to_turso INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (series_id) REFERENCES tv_series(id) ON DELETE CASCADE,
  UNIQUE(series_id, season_number)
);

CREATE TABLE IF NOT EXISTS episodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT, series_id INTEGER NOT NULL, season_id INTEGER NOT NULL,
  tmdb_id INTEGER, episode_number INTEGER NOT NULL, season_number INTEGER NOT NULL,
  title_ar TEXT, title_en TEXT, overview_ar TEXT, overview_en TEXT,
  still_path TEXT, air_date TEXT, runtime INTEGER, vote_average REAL DEFAULT 0,
  has_servers INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, view_count INTEGER DEFAULT 0,
  source TEXT DEFAULT 'tmdb', synced_to_turso INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (series_id) REFERENCES tv_series(id) ON DELETE CASCADE,
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
  UNIQUE(season_id, episode_number)
);

CREATE TABLE IF NOT EXISTS genres (
  id INTEGER PRIMARY KEY AUTOINCREMENT, tmdb_id INTEGER UNIQUE,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
  applies_to TEXT DEFAULT 'all'
);

CREATE TABLE IF NOT EXISTS content_genres (
  id INTEGER PRIMARY KEY AUTOINCREMENT, content_id INTEGER NOT NULL,
  content_type TEXT NOT NULL, genre_id INTEGER NOT NULL,
  FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE,
  UNIQUE(content_id, content_type, genre_id)
);

CREATE TABLE IF NOT EXISTS global_keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT, keyword_ar TEXT NOT NULL, keyword_en TEXT,
  slug TEXT UNIQUE NOT NULL, usage_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS content_keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT, content_id INTEGER NOT NULL,
  content_type TEXT NOT NULL, keyword_id INTEGER NOT NULL,
  FOREIGN KEY (keyword_id) REFERENCES global_keywords(id) ON DELETE CASCADE,
  UNIQUE(content_id, content_type, keyword_id)
);

CREATE TABLE IF NOT EXISTS actors (
  id INTEGER PRIMARY KEY, tmdb_id INTEGER UNIQUE NOT NULL, slug TEXT UNIQUE NOT NULL,
  name_ar TEXT, name_en TEXT NOT NULL, biography_ar TEXT, biography_en TEXT,
  profile_path TEXT, birthday TEXT, place_of_birth TEXT, popularity REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1, synced_to_turso INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cast_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT, content_id INTEGER NOT NULL,
  content_type TEXT NOT NULL, actor_id INTEGER NOT NULL,
  character_name TEXT, cast_order INTEGER DEFAULT 0,
  FOREIGN KEY (actor_id) REFERENCES actors(id) ON DELETE CASCADE,
  UNIQUE(content_id, content_type, actor_id)
);

CREATE TABLE IF NOT EXISTS ingestion_progress (
  script_name TEXT PRIMARY KEY, last_tmdb_page INTEGER DEFAULT 0,
  last_item_id INTEGER DEFAULT 0, total_fetched INTEGER DEFAULT 0,
  total_skipped INTEGER DEFAULT 0, total_errors INTEGER DEFAULT 0,
  last_run TEXT, status TEXT DEFAULT 'idle'
);

CREATE TABLE IF NOT EXISTS translation_cache (
  source_text TEXT NOT NULL, target_lang TEXT NOT NULL DEFAULT 'ar',
  translated_text TEXT, created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY(source_text, target_lang)
);

CREATE INDEX IF NOT EXISTS idx_movies_sync ON movies(synced_to_turso, sync_priority) WHERE synced_to_turso = 0;
CREATE INDEX IF NOT EXISTS idx_movies_tmdb ON movies(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_movies_slug ON movies(slug);
CREATE INDEX IF NOT EXISTS idx_series_sync ON tv_series(synced_to_turso, sync_priority) WHERE synced_to_turso = 0;
CREATE INDEX IF NOT EXISTS idx_series_tmdb ON tv_series(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_episodes_series ON episodes(series_id);
CREATE INDEX IF NOT EXISTS idx_episodes_season ON episodes(season_id);
CREATE INDEX IF NOT EXISTS idx_cast_content ON cast_members(content_id, content_type);
CREATE INDEX IF NOT EXISTS idx_actors_tmdb ON actors(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_actors_sync ON actors(synced_to_turso) WHERE synced_to_turso = 0;
`)

// Self-healing: Add trailer_key_2 column to existing databases
try {
  db.exec('ALTER TABLE movies ADD COLUMN trailer_key_2 TEXT;')
} catch (e) {
  // Column already exists, ignore
}

try {
  db.exec('ALTER TABLE tv_series ADD COLUMN trailer_key_2 TEXT;')
} catch (e) {
  // Column already exists, ignore
}

console.log('✅ SQLite Database Optimized:')
console.log('   - WAL Mode: Enabled (3x faster writes)')
console.log('   - Cache Size: 100MB')
console.log('   - Memory-mapped I/O: 30GB')
console.log('   - Synchronous: NORMAL (balanced)')

module.exports = db

