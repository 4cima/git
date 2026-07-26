-- ============================================================
-- 4CIMA — بنية قاعدة البيانات المحلية (نسخة نظيفة من الصفر)
-- ============================================================
-- القرار التصميمي الأهم في الملف ده:
-- كل جدول محتوى (movies, tv_series, people) بيستخدم tmdb_id
-- نفسه كـ PRIMARY KEY محليًا. مفيش عمود "id" منفصل خالص.
-- ده بيقفل نهائيًا على باگ "id != tmdb_id" اللي سبب كل
-- التلوث اللي حصل قبل كده — مش ممكن يتكرر لأن مفيش مكان
-- لرقمين مختلفين يتلخبطوا مع بعض من الأساس.
--
-- عند المزامنة مع Turso فقط، بنكتب نفس القيمة في عمودي
-- id و tmdb_id هناك (لأن بنية Turso نفسها محتاجة الاتنين
-- وممنوع نغيرها).
--
-- تسمية الأعمدة (title_en/title_ar للأفلام، name_en/name_ar
-- للمسلسلات) بتطابق بنية Turso بالحرف — عشان نقفل كمان على
-- باگ "title_ar بدل name_ar" اللي حصل قبل كده مع المسلسلات.
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- --------------------------------------------------------------
-- الأفلام
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS movies (
  tmdb_id               INTEGER PRIMARY KEY,
  slug                  TEXT UNIQUE,              -- NULL لحد ما يتحسب عند المزامنة
  title_en              TEXT,
  title_ar              TEXT,
  title_original        TEXT,
  overview_en           TEXT,
  overview_ar           TEXT,
  poster_path           TEXT,
  backdrop_path         TEXT,
  release_date          TEXT,
  release_year          INTEGER,
  runtime               INTEGER,
  vote_average          REAL DEFAULT 0,
  vote_count            INTEGER DEFAULT 0,
  popularity            REAL DEFAULT 0,
  trailer_key           TEXT,
  imdb_id               TEXT,
  original_language     TEXT,
  country_of_origin     TEXT,
  primary_genre         TEXT,                     -- اسم إنجليزي lowercase، للسلج والفلترة السريعة
  age_rating            TEXT DEFAULT 'PG',
  production_companies  TEXT,                     -- JSON array (staging فقط)
  seo_title_ar          TEXT,
  seo_description_ar    TEXT,
  seo_keywords_json     TEXT,
  canonical_url         TEXT,

  -- أعمدة تحكّم السحب والمزامنة (مش بتتبعت لـ Turso)
  is_fetched            INTEGER DEFAULT 0,        -- 1 = اتحاول سحبه من TMDB (بغض النظر عن النتيجة)
  is_filtered           INTEGER DEFAULT 0,
  filter_reason         TEXT,
  is_complete           INTEGER DEFAULT 0,        -- 1 = جاهز فعليًا للمزامنة
  sync_priority         INTEGER DEFAULT 5,
  synced_to_turso       INTEGER DEFAULT 0,
  synced_at             TEXT,
  created_at            TEXT DEFAULT (datetime('now')),
  updated_at            TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_movies_fetch_queue ON movies(is_fetched) WHERE is_fetched = 0;
CREATE INDEX IF NOT EXISTS idx_movies_sync_queue  ON movies(is_complete, synced_to_turso);

-- --------------------------------------------------------------
-- المسلسلات (name_en/name_ar — مطابق لـ Turso بالحرف)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tv_series (
  tmdb_id               INTEGER PRIMARY KEY,
  slug                  TEXT UNIQUE,
  name_en               TEXT,
  name_ar               TEXT,
  name_original         TEXT,
  overview_en           TEXT,
  overview_ar           TEXT,
  poster_path           TEXT,
  backdrop_path         TEXT,
  first_air_date        TEXT,
  first_air_year        INTEGER,
  last_air_date         TEXT,
  number_of_seasons     INTEGER DEFAULT 0,
  number_of_episodes    INTEGER DEFAULT 0,
  status                TEXT DEFAULT 'ongoing',
  vote_average          REAL DEFAULT 0,
  vote_count            INTEGER DEFAULT 0,
  popularity            REAL DEFAULT 0,
  trailer_key           TEXT,
  imdb_id               TEXT,
  original_language     TEXT,
  country_of_origin     TEXT,
  primary_genre         TEXT,
  age_rating            TEXT DEFAULT 'PG',
  production_companies  TEXT,
  seo_title_ar          TEXT,
  seo_description_ar    TEXT,
  seo_keywords_json     TEXT,
  canonical_url         TEXT,

  is_fetched            INTEGER DEFAULT 0,
  is_filtered           INTEGER DEFAULT 0,
  filter_reason         TEXT,
  is_complete           INTEGER DEFAULT 0,
  sync_priority         INTEGER DEFAULT 5,
  synced_to_turso       INTEGER DEFAULT 0,
  synced_at             TEXT,
  created_at            TEXT DEFAULT (datetime('now')),
  updated_at            TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_series_fetch_queue ON tv_series(is_fetched) WHERE is_fetched = 0;
CREATE INDEX IF NOT EXISTS idx_series_sync_queue  ON tv_series(is_complete, synced_to_turso);

-- --------------------------------------------------------------
-- المواسم والحلقات
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seasons (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  series_tmdb_id   INTEGER NOT NULL,
  season_number    INTEGER NOT NULL,
  name_en          TEXT,
  overview_en      TEXT,
  poster_path      TEXT,
  air_date         TEXT,
  air_year         INTEGER,
  episode_count    INTEGER DEFAULT 0,
  FOREIGN KEY (series_tmdb_id) REFERENCES tv_series(tmdb_id) ON DELETE CASCADE,
  UNIQUE(series_tmdb_id, season_number)
);

CREATE TABLE IF NOT EXISTS episodes (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  series_tmdb_id   INTEGER NOT NULL,
  season_number    INTEGER NOT NULL,
  episode_number   INTEGER NOT NULL,
  name_en          TEXT,
  overview_en      TEXT,
  still_path       TEXT,
  air_date         TEXT,
  runtime          INTEGER,
  vote_average     REAL DEFAULT 0,
  FOREIGN KEY (series_tmdb_id) REFERENCES tv_series(tmdb_id) ON DELETE CASCADE,
  UNIQUE(series_tmdb_id, season_number, episode_number)
);

CREATE INDEX IF NOT EXISTS idx_seasons_series  ON seasons(series_tmdb_id);
CREATE INDEX IF NOT EXISTS idx_episodes_series ON episodes(series_tmdb_id);

-- --------------------------------------------------------------
-- الأشخاص (ممثلين/طاقم) — نفس مبدأ tmdb_id كمفتاح أساسي
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS people (
  tmdb_id               INTEGER PRIMARY KEY,
  name_en               TEXT,
  name_ar               TEXT,
  profile_path          TEXT,
  gender                INTEGER,
  known_for_department  TEXT,
  popularity            REAL DEFAULT 0,
  created_at            TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cast_crew (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  content_tmdb_id    INTEGER NOT NULL,
  content_type       TEXT NOT NULL CHECK(content_type IN ('movie','tv')),
  person_tmdb_id     INTEGER NOT NULL,
  role_type          TEXT NOT NULL CHECK(role_type IN ('cast','crew')),
  character_name     TEXT,
  cast_order         INTEGER DEFAULT 0,
  job                TEXT,
  department         TEXT,
  FOREIGN KEY (person_tmdb_id) REFERENCES people(tmdb_id) ON DELETE CASCADE,
  UNIQUE(content_tmdb_id, content_type, person_tmdb_id, role_type, job)
);

CREATE INDEX IF NOT EXISTS idx_cast_crew_content ON cast_crew(content_tmdb_id, content_type);

-- --------------------------------------------------------------
-- التصنيفات (Genres)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS genres (
  tmdb_id   INTEGER PRIMARY KEY,
  name_en   TEXT NOT NULL,
  name_ar   TEXT,
  slug      TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS content_genres (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  content_tmdb_id  INTEGER NOT NULL,
  content_type     TEXT NOT NULL CHECK(content_type IN ('movie','tv')),
  genre_tmdb_id    INTEGER NOT NULL,
  FOREIGN KEY (genre_tmdb_id) REFERENCES genres(tmdb_id) ON DELETE CASCADE,
  UNIQUE(content_tmdb_id, content_type, genre_tmdb_id)
);

CREATE INDEX IF NOT EXISTS idx_content_genres_content ON content_genres(content_tmdb_id, content_type);

-- --------------------------------------------------------------
-- كاش الترجمة (لتوفير تكلفة/وقت الترجمة المتكررة)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS translation_cache (
  source_text      TEXT NOT NULL,
  target_lang      TEXT NOT NULL DEFAULT 'ar',
  translated_text  TEXT,
  created_at       TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (source_text, target_lang)
);

-- --------------------------------------------------------------
-- تتبع تقدم سكريبتات السحب
-- ملاحظة: script_name هو الـ PRIMARY KEY — مفيش عمود "id" هنا
-- خالص، عشان الباگ القديم ("no such column: id") ميتكررش.
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ingestion_progress (
  script_name              TEXT PRIMARY KEY,
  last_processed_tmdb_id   INTEGER DEFAULT 0,
  total_fetched            INTEGER DEFAULT 0,
  total_filtered           INTEGER DEFAULT 0,
  total_not_found          INTEGER DEFAULT 0,
  total_errors             INTEGER DEFAULT 0,
  rate_per_minute          REAL DEFAULT 0,
  last_run                 TEXT,
  status                   TEXT DEFAULT 'idle'
);
