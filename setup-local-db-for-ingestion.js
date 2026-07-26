#!/usr/bin/env node
// ============================================
// 🔧 تجهيز قاعدة البيانات المحلية للسحب
// ============================================
require('dotenv').config({ path: '.env.local' })
const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')
const https = require('https')

const DB_PATH = './data/4cima-local.db'
const DATA_DIR = './data'

console.log('\n╔════════════════════════════════════════════════════════════╗')
console.log('║     🔧 تجهيز قاعدة البيانات المحلية للسحب من TMDB        ║')
console.log('╚════════════════════════════════════════════════════════════╝\n')

// التأكد من وجود المجلد
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  console.log('✓ تم إنشاء مجلد ./data\n')
}

// فتح قاعدة البيانات
const db = new Database(DB_PATH)

console.log('📋 المرحلة 1: إضافة الأعمدة المطلوبة للسحب\n')

// الأعمدة المطلوبة لسكريبتات السحب
const requiredColumns = [
  // Movies
  { table: 'movies', column: 'is_fetched', type: 'INTEGER DEFAULT 0' },
  { table: 'movies', column: 'fetched_at', type: 'DATETIME' },
  { table: 'movies', column: 'fetched_from', type: 'TEXT' },
  { table: 'movies', column: 'imdb_id', type: 'TEXT' },
  { table: 'movies', column: 'title_original', type: 'TEXT' },
  { table: 'movies', column: 'overview_en', type: 'TEXT' },
  { table: 'movies', column: 'tagline_ar', type: 'TEXT' },
  { table: 'movies', column: 'trailer_key_2', type: 'TEXT' },
  { table: 'movies', column: 'additional_video_key', type: 'TEXT' },
  { table: 'movies', column: 'is_filtered', type: 'INTEGER DEFAULT 0' },
  { table: 'movies', column: 'filter_reason', type: 'TEXT' },
  { table: 'movies', column: 'original_language', type: 'TEXT DEFAULT "en"' },
  { table: 'movies', column: 'content_language', type: 'TEXT DEFAULT "ar"' },
  { table: 'movies', column: 'country_of_origin', type: 'TEXT' },
  { table: 'movies', column: 'production_companies', type: 'TEXT' },
  { table: 'movies', column: 'content_type', type: 'TEXT NOT NULL DEFAULT "movie"' },
  { table: 'movies', column: 'quality', type: 'TEXT DEFAULT "HD"' },
  { table: 'movies', column: 'age_rating', type: 'TEXT DEFAULT "PG"' },
  { table: 'movies', column: 'has_arabic_title', type: 'INTEGER DEFAULT 0' },
  { table: 'movies', column: 'has_arabic_overview', type: 'INTEGER DEFAULT 0' },
  { table: 'movies', column: 'has_trailer', type: 'INTEGER DEFAULT 0' },
  { table: 'movies', column: 'has_servers', type: 'INTEGER DEFAULT 0' },
  { table: 'movies', column: 'has_cast', type: 'INTEGER DEFAULT 0' },
  { table: 'movies', column: 'has_genres', type: 'INTEGER DEFAULT 0' },
  { table: 'movies', column: 'has_keywords', type: 'INTEGER DEFAULT 0' },
  { table: 'movies', column: 'is_complete', type: 'INTEGER DEFAULT 0' },
  { table: 'movies', column: 'source', type: 'TEXT DEFAULT "tmdb"' },
  { table: 'movies', column: 'backed_up_at', type: 'TEXT' },
  { table: 'movies', column: 'backup_version', type: 'INTEGER DEFAULT 0' },
  { table: 'movies', column: 'is_active', type: 'INTEGER DEFAULT 1' },
  { table: 'movies', column: 'is_featured', type: 'INTEGER DEFAULT 0' },
  { table: 'movies', column: 'view_count', type: 'INTEGER DEFAULT 0' },
  { table: 'movies', column: 'download_count', type: 'INTEGER DEFAULT 0' },
  { table: 'movies', column: 'synced_to_turso', type: 'INTEGER DEFAULT 0' },
  { table: 'movies', column: 'synced_at', type: 'TEXT' },
  { table: 'movies', column: 'sync_priority', type: 'INTEGER DEFAULT 5' },
  { table: 'movies', column: 'sync_error', type: 'TEXT' },
  { table: 'movies', column: 'primary_genre', type: 'TEXT' },
  { table: 'movies', column: 'keywords', type: 'TEXT' },
  { table: 'movies', column: 'global_keywords', type: 'TEXT' },
  
  // TV Series
  { table: 'tv_series', column: 'is_fetched', type: 'INTEGER DEFAULT 0' },
  { table: 'tv_series', column: 'fetched_at', type: 'DATETIME' },
  { table: 'tv_series', column: 'fetched_from', type: 'TEXT' },
  { table: 'tv_series', column: 'imdb_id', type: 'TEXT' },
  { table: 'tv_series', column: 'tvmaze_id', type: 'INTEGER' },
  { table: 'tv_series', column: 'title_original', type: 'TEXT' },
  { table: 'tv_series', column: 'overview_en', type: 'TEXT' },
  { table: 'tv_series', column: 'tagline_ar', type: 'TEXT' },
  { table: 'tv_series', column: 'trailer_key_2', type: 'TEXT' },
  { table: 'tv_series', column: 'additional_video_key', type: 'TEXT' },
  { table: 'tv_series', column: 'is_filtered', type: 'INTEGER DEFAULT 0' },
  { table: 'tv_series', column: 'filter_reason', type: 'TEXT' },
  { table: 'tv_series', column: 'last_air_date', type: 'TEXT' },
  { table: 'tv_series', column: 'content_type', type: 'TEXT NOT NULL DEFAULT "series"' },
  { table: 'tv_series', column: 'quality', type: 'TEXT DEFAULT "HD"' },
  { table: 'tv_series', column: 'age_rating', type: 'TEXT DEFAULT "PG"' },
  { table: 'tv_series', column: 'has_arabic_title', type: 'INTEGER DEFAULT 0' },
  { table: 'tv_series', column: 'has_arabic_overview', type: 'INTEGER DEFAULT 0' },
  { table: 'tv_series', column: 'has_trailer', type: 'INTEGER DEFAULT 0' },
  { table: 'tv_series', column: 'has_cast', type: 'INTEGER DEFAULT 0' },
  { table: 'tv_series', column: 'has_genres', type: 'INTEGER DEFAULT 0' },
  { table: 'tv_series', column: 'has_keywords', type: 'INTEGER DEFAULT 0' },
  { table: 'tv_series', column: 'is_complete', type: 'INTEGER DEFAULT 0' },
  { table: 'tv_series', column: 'source', type: 'TEXT DEFAULT "tmdb"' },
  { table: 'tv_series', column: 'backed_up_at', type: 'TEXT' },
  { table: 'tv_series', column: 'backup_version', type: 'INTEGER DEFAULT 0' },
  { table: 'tv_series', column: 'is_active', type: 'INTEGER DEFAULT 1' },
  { table: 'tv_series', column: 'is_featured', type: 'INTEGER DEFAULT 0' },
  { table: 'tv_series', column: 'view_count', type: 'INTEGER DEFAULT 0' },
  { table: 'tv_series', column: 'synced_to_turso', type: 'INTEGER DEFAULT 0' },
  { table: 'tv_series', column: 'synced_at', type: 'TEXT' },
  { table: 'tv_series', column: 'sync_priority', type: 'INTEGER DEFAULT 5' },
  { table: 'tv_series', column: 'sync_error', type: 'TEXT' },
  { table: 'tv_series', column: 'primary_genre', type: 'TEXT' },
  { table: 'tv_series', column: 'keywords', type: 'TEXT' },
  { table: 'tv_series', column: 'global_keywords', type: 'TEXT' },
  { table: 'tv_series', column: 'content_language', type: 'TEXT DEFAULT "ar"' },
  { table: 'tv_series', column: 'country_of_origin', type: 'TEXT' },
  { table: 'tv_series', column: 'production_companies', type: 'TEXT' }
]

let added = 0
let exists = 0

for (const { table, column, type } of requiredColumns) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
    console.log(`  ✓ ${table}.${column}`)
    added++
  } catch (e) {
    if (e.message.includes('duplicate column')) {
      exists++
    } else {
      console.log(`  ⚠ ${table}.${column}: ${e.message}`)
    }
  }
}

console.log(`\n  إضافة: ${added} | موجود: ${exists}\n`)

// إنشاء الجداول الإضافية إذا لم تكن موجودة
console.log('📋 المرحلة 2: إنشاء الجداول المساعدة\n')

const additionalTables = `
-- جدول تقدم السحب
CREATE TABLE IF NOT EXISTS ingestion_progress (
  script_name TEXT PRIMARY KEY,
  last_tmdb_page INTEGER DEFAULT 0,
  last_item_id INTEGER DEFAULT 0,
  total_fetched INTEGER DEFAULT 0,
  total_skipped INTEGER DEFAULT 0,
  total_errors INTEGER DEFAULT 0,
  last_run TEXT,
  status TEXT DEFAULT 'idle'
);

-- جدول cache الترجمة
CREATE TABLE IF NOT EXISTS translation_cache (
  source_text TEXT NOT NULL,
  target_lang TEXT NOT NULL DEFAULT 'ar',
  translated_text TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY(source_text, target_lang)
);

-- جدول الممثلين
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
  place_of_birth TEXT,
  popularity REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  synced_to_turso INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- جدول طاقم العمل
CREATE TABLE IF NOT EXISTS cast_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id INTEGER NOT NULL,
  content_type TEXT NOT NULL,
  actor_id INTEGER NOT NULL,
  character_name TEXT,
  cast_order INTEGER DEFAULT 0,
  FOREIGN KEY (actor_id) REFERENCES actors(id) ON DELETE CASCADE,
  UNIQUE(content_id, content_type, actor_id)
);

-- جدول المواسم
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
  synced_to_turso INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (series_id) REFERENCES tv_series(id) ON DELETE CASCADE,
  UNIQUE(series_id, season_number)
);

-- جدول الحلقات
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
  synced_to_turso INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (series_id) REFERENCES tv_series(id) ON DELETE CASCADE,
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
  UNIQUE(season_id, episode_number)
);

-- جدول الربط بين المحتوى والتصنيفات
CREATE TABLE IF NOT EXISTS content_genres (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id INTEGER NOT NULL,
  content_type TEXT NOT NULL,
  genre_id INTEGER NOT NULL,
  FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE,
  UNIQUE(content_id, content_type, genre_id)
);

-- جدول الربط بين المحتوى والكلمات المفتاحية
CREATE TABLE IF NOT EXISTS content_keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id INTEGER NOT NULL,
  content_type TEXT NOT NULL,
  keyword_id INTEGER NOT NULL,
  FOREIGN KEY (keyword_id) REFERENCES global_keywords(id) ON DELETE CASCADE,
  UNIQUE(content_id, content_type, keyword_id)
);
`

try {
  db.exec(additionalTables)
  console.log('  ✓ تم إنشاء الجداول المساعدة\n')
} catch (e) {
  console.log('  ✓ الجداول موجودة بالفعل\n')
}

// إضافة indexes للأداء
console.log('📋 المرحلة 3: إضافة Indexes للأداء\n')

const indexes = [
  'CREATE INDEX IF NOT EXISTS idx_movies_sync ON movies(synced_to_turso, sync_priority) WHERE synced_to_turso = 0',
  'CREATE INDEX IF NOT EXISTS idx_movies_tmdb ON movies(tmdb_id)',
  'CREATE INDEX IF NOT EXISTS idx_movies_slug ON movies(slug)',
  'CREATE INDEX IF NOT EXISTS idx_movies_fetched ON movies(is_fetched) WHERE is_fetched = 0',
  'CREATE INDEX IF NOT EXISTS idx_series_sync ON tv_series(synced_to_turso, sync_priority) WHERE synced_to_turso = 0',
  'CREATE INDEX IF NOT EXISTS idx_series_tmdb ON tv_series(tmdb_id)',
  'CREATE INDEX IF NOT EXISTS idx_series_fetched ON tv_series(is_fetched) WHERE is_fetched = 0',
  'CREATE INDEX IF NOT EXISTS idx_episodes_series ON episodes(series_id)',
  'CREATE INDEX IF NOT EXISTS idx_episodes_season ON episodes(season_id)',
  'CREATE INDEX IF NOT EXISTS idx_cast_content ON cast_members(content_id, content_type)',
  'CREATE INDEX IF NOT EXISTS idx_actors_tmdb ON actors(tmdb_id)',
  'CREATE INDEX IF NOT EXISTS idx_actors_sync ON actors(synced_to_turso) WHERE synced_to_turso = 0'
]

for (const index of indexes) {
  try {
    db.exec(index)
    console.log(`  ✓ ${index.match(/idx_\w+/)[0]}`)
  } catch (e) {
    // Index already exists
  }
}

console.log('\n✅ تم تجهيز قاعدة البيانات المحلية بنجاح!\n')
console.log('═'.repeat(60))

db.close()

console.log('\n📥 المرحلة 4: تنزيل أحدث ملفات IDs من TMDB\n')
console.log('⚠️  ملاحظة: ملفات IDs كبيرة جداً (100+ MB)\n')
console.log('الملفات المطلوبة:')
console.log('  • movie_ids_MM_DD_YYYY.json')
console.log('  • tv_series_ids_MM_DD_YYYY.json\n')
console.log('📌 رابط التنزيل: http://files.tmdb.org/p/exports/\n')
console.log('يجب وضع الملفات في: ./data/\n')
console.log('═'.repeat(60))
console.log('\n✅ الآن قاعدة البيانات جاهزة لاستقبال البيانات!')
console.log('   يمكنك تشغيل سكريبتات السحب:\n')
console.log('   node scripts/import-tmdb-movies-ultra-fast.js')
console.log('   node scripts/import-tmdb-series-ultra-fast.js\n')
