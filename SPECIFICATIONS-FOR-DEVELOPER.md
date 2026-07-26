# 📋 مواصفات مشروع 4CIMA - للمبرمج العبقري

## 🎯 الهدف الرئيسي
إعادة بناء نظام سحب ومزامنة البيانات من الصفر، متوافق ذاتياً، بدون legacy issues.

---

## 🗄️ **1. البنية الفعلية لـ Turso (Production)**

### جدول `movies`:
```sql
CREATE TABLE IF NOT EXISTS movies (
  -- المعرفات
  id INTEGER PRIMARY KEY,
  tmdb_id INTEGER UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  
  -- العناوين
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  
  -- الأوصاف
  overview_ar TEXT,
  
  -- الصور
  poster_path TEXT,
  
  -- التواريخ
  release_date TEXT,
  release_year INTEGER,
  
  -- التقييمات
  vote_average REAL DEFAULT 0,
  
  -- الفيديوهات
  trailer_key TEXT,
  
  -- البيانات المدمجة (JSON)
  genres_json TEXT,
  cast_json TEXT,
  countries_json TEXT,
  keywords_json TEXT,
  companies_json TEXT,
  
  -- SEO Data
  seo_title_ar TEXT,
  seo_description_ar TEXT,
  seo_keywords_json TEXT,
  canonical_url TEXT,
  
  -- التواريخ
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_movies_tmdb ON movies(tmdb_id);
CREATE INDEX idx_movies_slug ON movies(slug);
CREATE INDEX idx_movies_year ON movies(release_year DESC);
CREATE INDEX idx_movies_rating ON movies(vote_average DESC);
```


### جدول `tv_series`:
```sql
CREATE TABLE IF NOT EXISTS tv_series (
  -- المعرفات
  id INTEGER PRIMARY KEY,
  tmdb_id INTEGER UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  
  -- العناوين
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  
  -- الأوصاف
  overview_ar TEXT,
  
  -- الصور
  poster_path TEXT,
  
  -- التواريخ
  first_air_date TEXT,
  first_air_year INTEGER,
  
  -- المعلومات
  number_of_seasons INTEGER DEFAULT 1,
  number_of_episodes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ongoing',
  
  -- التقييمات
  vote_average REAL DEFAULT 0,
  
  -- الفيديوهات
  trailer_key TEXT,
  
  -- البيانات المدمجة (JSON)
  genres_json TEXT,
  cast_json TEXT,
  countries_json TEXT,
  keywords_json TEXT,
  networks_json TEXT,
  seasons_json TEXT,
  episodes_json TEXT,
  
  -- SEO Data
  seo_title_ar TEXT,
  seo_description_ar TEXT,
  seo_keywords_json TEXT,
  canonical_url TEXT,
  
  -- التواريخ
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_series_tmdb ON tv_series(tmdb_id);
CREATE INDEX idx_series_slug ON tv_series(slug);
CREATE INDEX idx_series_year ON tv_series(first_air_year DESC);
CREATE INDEX idx_series_rating ON tv_series(vote_average DESC);
```

---

## 🏠 **2. القاعدة المحلية (SQLite)**

### 🔥 القرار التصميمي الثوري:

**استخدام `tmdb_id` كـ PRIMARY KEY مباشرة - بدون عمود `id` منفصل!**

```
tmdb_id INTEGER PRIMARY KEY
```

**ليه؟**
- ✅ يقفل نهائيًا على bug `id != tmdb_id` - مستحيل يحصل لأن مفيش عمود `id` أصلاً
- ✅ zero confusion - رقم واحد فقط
- ✅ عند المزامنة لـ Turso: نكتب نفس القيمة في `id` و `tmdb_id` هناك

### Schema المحلي الكامل:

```sql
CREATE TABLE IF NOT EXISTS movies (
  tmdb_id               INTEGER PRIMARY KEY,  -- ← مفيش عمود id خالص!
  slug                  TEXT UNIQUE,
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
  primary_genre         TEXT,
  age_rating            TEXT DEFAULT 'PG',
  production_companies  TEXT,  -- JSON staging
  seo_title_ar          TEXT,
  seo_description_ar    TEXT,
  seo_keywords_json     TEXT,
  canonical_url         TEXT,
  
  -- أعمدة التحكم (مش بتتبعت لـ Turso)
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

CREATE TABLE IF NOT EXISTS tv_series (
  tmdb_id               INTEGER PRIMARY KEY,  -- ← مفيش id!
  slug                  TEXT UNIQUE,
  name_en               TEXT,  -- ← name مش title (متطابق مع Turso)
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
  
  -- أعمدة التحكم
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
```

### ⚠️ ملاحظات مهمة:
1. **Movies:** تستخدم `title_en/title_ar`
2. **TV Series:** تستخدم `name_en/name_ar` (متطابق مع Turso بالحرف!)
3. **People:** تستخدم `tmdb_id` كـ PRIMARY KEY برضه
4. **Foreign Keys:** تشير لـ `tmdb_id` مش `id`


---

## 🔑 **3. سياسة الـ Slugs (محددة ومُختبرة)**

### الخوارزمية:
```javascript
function generateSlug(title_en, release_year, genre) {
  const base = toSlug(title_en)  // إنجليزي فقط، no IDs
  
  // التحقق بالترتيب:
  const checks = [
    base,
    `${base}-${release_year}`,
    `${base}-${release_year}-${toSlug(genre)}`,
    `${base}-${release_year}-${toSlug(genre)}-2`, // N = 2, 3, 4...
    `${base}-${release_year}-2` // لو مفيش genre
  ]
  
  // ✅ يجب فحص كل slug في القاعدة BEFORE الإدخال
  // ❌ لا توجد IDs في الـ slugs نهائياً
  
  for (const slug of checks) {
    if (!db.prepare(`SELECT tmdb_id FROM movies WHERE slug = ?`).get(slug)) {
      return slug
    }
  }
  
  // fallback
  return `${base}-${Date.now()}`
}

function toSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^\x00-\x7F]/g, '') // حذف non-ASCII
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
}
```


### ⚠️ Race Condition Fix:
```javascript
// ❌ خطأ: فحص ثم كتابة منفصلة
const slug = generateSlug(...)
// ... await translations ...
db.run(`UPDATE movies SET slug = ?`, [slug])

// ✅ صحيح: atomic operation
db.transaction(() => {
  const slug = generateUniqueSlug(...) // يفحص داخل transaction
  db.run(`INSERT INTO movies (tmdb_id, slug, ...) VALUES (?, ?, ...)`, [tmdb_id, slug, ...])
})()
```

---

## 🎬 **4. مصادر البيانات**

### TMDB API:
```javascript
const TMDB_API_KEY = process.env.TMDB_API_KEY
const BASE_URL = 'https://api.themoviedb.org/3'

// Endpoints:
// - GET /movie/{tmdb_id}?append_to_response=credits,translations,keywords,videos
// - GET /tv/{tmdb_id}?append_to_response=credits,translations,keywords,videos
// - GET /tv/{tmdb_id}/season/{season_number}
```

### متغيرات البيئة (.env.local):
```
TURSO_DATABASE_URL=libsql://4cima-4cima.aws-eu-west-1.turso.io
TURSO_AUTH_TOKEN=eyJhbGci...
TMDB_API_KEY=afef094e7c0de13c1cac98227a61da4d
TMDB_API_KEY_2=1298554bf3b09eee57972f0876ad096e
GROQ_API_KEY=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
```


---

## 📦 **5. السكريبتات المطلوبة (3 فقط)**

### 1️⃣ `1-fetch-and-enrich.js`
**المهمة:** سحب IDs من TMDB و البيانات الكاملة في خطوة واحدة.

```javascript
// Pseudo-code:
const TMDB_KEY = process.env.TMDB_API_KEY
const CONCURRENCY = 20  // ❌ مش 40 - منع race conditions

async function main() {
  // 1. سحب آخر movie ID من TMDB API
  const latest = await fetch(`${TMDB_URL}/movie/latest?api_key=${TMDB_KEY}`)
  const endId = latest.id
  
  // 2. Loop من 1 إلى endId
  for (let tmdb_id = 1; tmdb_id <= endId; tmdb_id++) {
    
    // تحقق إذا موجود
    const exists = db.prepare('SELECT tmdb_id FROM movies WHERE tmdb_id = ?').get(tmdb_id)
    if (exists) continue
    
    // سحب البيانات الكاملة
    const movie = await fetchTMDB(`/movie/${tmdb_id}`, {
      append_to_response: 'credits,translations,keywords,videos'
    })
    
    if (!movie) {
      // 404 - مش موجود
      db.prepare(`
        INSERT INTO movies (tmdb_id, is_complete, is_filtered, filter_reason)
        VALUES (?, 0, 1, 'not_found_in_tmdb')
      `).run(tmdb_id)
      continue
    }
    
    // فلترة المحتوى غير المناسب
    if (shouldFilterContent(movie)) {
      db.prepare(`
        INSERT INTO movies (tmdb_id, is_complete, is_filtered, filter_reason)
        VALUES (?, 0, 1, ?)
      `).run(tmdb_id, getFilterReason(movie))
      continue
    }
    
    // معالجة العنوان والترجمة
    const title_en = movie.title || movie.original_title
    const title_ar = await translateWithCache(title_en, 'ar') || 'TBD'
    
    // معالجة الوصف
    const overview_ar = await translateWithCache(movie.overview, 'ar')
    
    // توليد slug آمن (atomic)
    const release_year = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : null
    const primary_genre = movie.genres?.[0]?.name?.toLowerCase()
    
    db.transaction(() => {
      const slug = generateUniqueSlug(title_en, release_year, primary_genre, 'movies')
      
      // ✅ INSERT مع tmdb_id كـ PRIMARY KEY
      db.prepare(`
        INSERT INTO movies (
          tmdb_id, slug,
          title_en, title_ar,
          overview_ar,
          poster_path, backdrop_path,
          release_date, release_year,
          vote_average, trailer_key,
          is_complete, synced_to_turso
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)
      `).run(
        tmdb_id, slug,
        title_en, title_ar,
        overview_ar,
        movie.poster_path, movie.backdrop_path,
        movie.release_date, release_year,
        movie.vote_average, movie.videos?.results?.[0]?.key
      )
      
      // إضافة الـ genres
      for (const genre of movie.genres || []) {
        db.prepare(`
          INSERT OR IGNORE INTO content_genres (content_tmdb_id, content_type, genre_tmdb_id)
          VALUES (?, 'movie', ?)
        `).run(tmdb_id, genre.id)
      }
      
      // إضافة الـ cast
      for (let i = 0; i < Math.min(movie.credits?.cast?.length || 0, 10); i++) {
        const person = movie.credits.cast[i]
        db.prepare(`
          INSERT OR IGNORE INTO people (tmdb_id, name_en, profile_path)
          VALUES (?, ?, ?)
        `).run(person.id, person.name, person.profile_path)
        
        db.prepare(`
          INSERT OR IGNORE INTO cast_crew 
          (content_tmdb_id, content_type, person_tmdb_id, role_type, character_name, cast_order)
          VALUES (?, 'movie', ?, 'cast', ?, ?)
        `).run(tmdb_id, person.id, person.character, i)
      }
    })()
  }
}
```

**Features:**
- ✅ `tmdb_id` كـ PRIMARY KEY (مفيش عمود id أصلاً!)
- ✅ Slug generation آمن (atomic داخل transaction)
- ✅ Genres و Cast في جداول منفصلة (مش JSON)
- ✅ Translation مع cache
- ✅ Retry logic للـ 429 rate limit
- ✅ Progress tracking


---

### 2️⃣ `2-enrich-incomplete.js`
**المهمة:** تحديث السجلات الناقصة (missing translations, cast, etc).

```javascript
// Pseudo-code:
async function main() {
  const incomplete = db.prepare(`
    SELECT tmdb_id FROM movies 
    WHERE is_complete = 0 AND is_filtered = 0
    LIMIT ?
  `).all(BATCH_SIZE)

  for (const movie of incomplete) {
    const data = await fetchTMDB(`/movie/${movie.tmdb_id}`, {
      append_to_response: 'credits,translations,keywords,videos'
    })
    
    if (!data) {
      db.prepare(`
        UPDATE movies SET is_filtered = 1, filter_reason = 'not_found_in_tmdb'
        WHERE tmdb_id = ?
      `).run(movie.tmdb_id)
      continue
    }
    
    // ✅ UPDATE فقط - مش INSERT
    const title_ar = await translateWithCache(data.title, 'ar')
    const overview_ar = await translateWithCache(data.overview, 'ar')
    
    db.prepare(`
      UPDATE movies SET
        title_ar = ?,
        overview_ar = ?,
        is_complete = 1,
        updated_at = datetime('now')
      WHERE tmdb_id = ?
    `).run(
      title_ar,
      overview_ar,
      movie.tmdb_id
    )
  }
}
```


---

### 3️⃣ `3-sync-to-turso.js`
**المهمة:** رفع المحلي لـ Turso.

```javascript
// Pseudo-code:
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

async function syncMoviesBatch(movieIds) {
  const statements = []
  
  for (const tmdb_id of movieIds) {
    const movie = db.prepare('SELECT * FROM movies WHERE tmdb_id = ?').get(tmdb_id)
    if (!movie || !movie.is_complete) continue
    
    // جمع الـ genres من الجدول المنفصل
    const genres = db.prepare(`
      SELECT g.tmdb_id, g.name_en FROM genres g
      JOIN content_genres cg ON g.tmdb_id = cg.genre_tmdb_id
      WHERE cg.content_tmdb_id = ? AND cg.content_type = 'movie'
    `).all(tmdb_id)
    
    // جمع الـ cast من الجدول المنفصل
    const cast = db.prepare(`
      SELECT p.tmdb_id, p.name_en, p.profile_path, cc.character_name, cc.cast_order
      FROM people p
      JOIN cast_crew cc ON p.tmdb_id = cc.person_tmdb_id
      WHERE cc.content_tmdb_id = ? AND cc.content_type = 'movie' AND cc.role_type = 'cast'
      ORDER BY cc.cast_order
      LIMIT 10
    `).all(tmdb_id)
    
    statements.push({
      sql: `
        INSERT INTO movies (
          id, tmdb_id, slug,
          title_en, title_ar,
          overview_ar,
          poster_path,
          release_date, release_year,
          vote_average, trailer_key,
          genres_json, cast_json,
          seo_title_ar, seo_description_ar,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(tmdb_id) DO UPDATE SET
          slug = excluded.slug,
          title_en = excluded.title_en,
          title_ar = excluded.title_ar,
          overview_ar = excluded.overview_ar,
          updated_at = excluded.updated_at
      `,
      args: [
        movie.tmdb_id, movie.tmdb_id, movie.slug,  // ← id = tmdb_id في Turso
        movie.title_en, movie.title_ar,
        movie.overview_ar,
        movie.poster_path,
        movie.release_date, movie.release_year,
        movie.vote_average, movie.trailer_key,
        JSON.stringify(genres),
        JSON.stringify(cast),
        movie.seo_title_ar, movie.seo_description_ar,
        movie.created_at, movie.updated_at
      ]
    })
  }
  
  // ✅ Batch execute
  await turso.batch(statements, 'write')
  
  // تحديث حالة المزامنة
  const placeholders = movieIds.map(() => '?').join(',')
  db.prepare(`
    UPDATE movies 
    SET synced_to_turso = 1, synced_at = CURRENT_TIMESTAMP 
    WHERE tmdb_id IN (${placeholders})
  `).run(...movieIds)
}

async function main() {
  const batch = db.prepare(`
    SELECT tmdb_id FROM movies 
    WHERE is_complete = 1 AND is_filtered = 0 AND synced_to_turso = 0
    LIMIT ?
  `).all(BATCH_SIZE)
  
  await syncMoviesBatch(batch.map(m => m.tmdb_id))
}
```

**Features:**
- ✅ `id = tmdb_id` في Turso (نفس القيمة في العمودين)
- ✅ `ON CONFLICT(tmdb_id)` - الربط الصحيح
- ✅ تجميع genres و cast من الجداول المنفصلة → JSON لـ Turso
- ✅ Batch processing (100 at a time)
- ✅ Retry logic مع fallback splitting
- ✅ تحديث حالة المزامنة في المحلي


---

## 🐛 **6. المشاكل المكتشفة في الكود القديم**

### ❌ Problem 1: `id != tmdb_id`
**Location:** `fetch-new-movies-by-id.js`, line 75

```javascript
// ❌ خطأ:
INSERT INTO movies (tmdb_id, title_en, ...) VALUES (?, ?, ...)
// → id سيأخذ autoincrement!

// ✅ صحيح (النسخة القديمة):
INSERT INTO movies (id, tmdb_id, ...) VALUES (?, ?, ...)
// حيث id = tmdb_id دائماً

// 🔥 صحيح (النسخة الجديدة - الحل النهائي):
CREATE TABLE movies (tmdb_id INTEGER PRIMARY KEY, ...)
INSERT INTO movies (tmdb_id, ...) VALUES (?, ...)
// → مفيش عمود id أصلاً! مستحيل يحصل الـ bug تاني
```

**السبب:** لما تنسى تحدد `id` صراحة، SQLite بيدي autoincrement (1, 2, 3...) بينما `tmdb_id` بتاخد القيمة الحقيقية من TMDB.

**النتيجة:** 128,319 فيلم من 134,252 فيلم في المحلي عندهم `id != tmdb_id` ❌

**الحل النهائي:** استخدام `tmdb_id` كـ PRIMARY KEY مباشرة - يقفل نهائيًا على الـ bug لأن مفيش مكان لرقمين مختلفين أصلاً.

---

### ❌ Problem 2: Race Condition في Slug
**Location:** `INGEST-MOVIES-LOGIC.js`, line 289

```javascript
// ❌ خطأ:
const slug = await generateUniqueSlug(...)
// ... await translations ...  ← فجوة زمنية!
db.run(`UPDATE movies SET slug = ?`, [slug])
// → فيلمين بنفس الاسم ممكن ياخدوا نفس الـ slug!
```

**السبب:** مع `CONCURRENCY = 40`، فيلمين بنفس الاسم بيتعالجوا بالتوازي:
1. الاتنين بيعملوا `SELECT slug WHERE slug = 'base'` في نفس اللحظة
2. الاتنين بيلاقوا الـ slug فاضي
3. الاتنين بيكتبوا نفس الـ slug
4. **تصادم!**


**الحل:** استخدم transaction لجعل الفحص والكتابة atomic:

```javascript
// ✅ صحيح:
db.transaction(() => {
  const slug = generateUniqueSlug(...) // يفحص داخل transaction
  db.run(`INSERT INTO movies (slug, ...) VALUES (?, ...)`, [slug, ...])
})()
```

---

### ❌ Problem 3: Concurrency مفرطة
**Location:** `INGEST-MOVIES-LOGIC.js`, line 504

```javascript
const CONCURRENCY = 40  // ❌ كتير جداً!
// → race conditions + API rate limits
```

**الحل:** استخدم `CONCURRENCY = 20` كحد أقصى.

---

## 📊 **7. الإحصائيات الحالية**

### Turso (Production):
- Movies: **139,755** ✅
- TV Series: ~**XX,XXX** (يحتاج تأكيد)

### المحلي (معطوب):
- Movies: **134,252**
- **منهم 128,319 فيلم `id != tmdb_id`** ❌

**الخطة:** حذف القاعدة المحلية بالكامل والبدء من صفر.

---

## ✅ **8. المتطلبات النهائية للمبرمج**

### Must Have:
1. ✅ `tmdb_id` كـ PRIMARY KEY (مفيش عمود `id` منفصل)
2. ✅ Slug generation آمن (atomic داخل transaction)
3. ✅ إنجليزي فقط في slugs (no Arabic, no IDs)
4. ✅ صفر IDs في slugs
5. ✅ `ON CONFLICT(tmdb_id)` في sync لـ Turso
6. ✅ `id = tmdb_id` عند الكتابة لـ Turso (نفس القيمة في العمودين)
7. ✅ Movies تستخدم `title_en/title_ar`
8. ✅ TV Series تستخدم `name_en/name_ar` (متطابق مع Turso)
9. ✅ CONCURRENCY <= 20
10. ✅ Retry logic للـ 429 rate limit


### Nice to Have:
- Progress tracking
- Translation caching
- SEO generation
- Content filtering

---

## 📁 **9. هيكل الملفات المطلوب**

```
scripts/
  1-fetch-and-enrich.js           # سحب IDs والبيانات الكاملة
  2-enrich-incomplete.js          # تحديث الناقص
  3-sync-to-turso.js              # رفع لـ Turso
  
  services/
    local-db.js                   # SQLite connection
    slug-generator.js             # منطق slug (atomic)
    tmdb-api.js                   # wrapper للـ API
    translation-service.js        # ترجمة مع cache
    content-filter.js             # فلترة المحتوى غير المناسب
```

---

## 🔧 **10. Dependencies المطلوبة**

```json
{
  "dependencies": {
    "better-sqlite3": "^9.x",
    "@libsql/client": "^0.x",
    "dotenv": "^16.x",
    "p-limit": "^4.x"
  }
}
```

---

## 🎯 **11. خطة التنفيذ**

### Phase 1: Setup
1. حذف القاعدة المحلية القديمة: `rm data/4cima-local.db`
2. تطبيق schema جديد: `node scripts/services/local-db.js`
3. التأكد من `.env.local`

### Phase 2: Fetch
1. تشغيل `1-fetch-and-enrich.js` - سحب **50 فيلم** فقط للاختبار
2. التحقق من:
   - `id = tmdb_id` ✅
   - slugs صحيحة (no IDs) ✅
   - no duplicates ✅

### Phase 3: Sync Test
1. تشغيل `3-sync-to-turso.js` - رفع الـ 50 فيلم لـ Turso
2. التحقق من Turso:
   ```sql
   SELECT COUNT(*) FROM movies WHERE tmdb_id IN (1, 2, 3, ...)
   ```

### Phase 4: Full Production
1. تشغيل `1-fetch-and-enrich.js` - سحب كل شيء
2. تشغيل `3-sync-to-turso.js` - رفع كل شيء

---

## 🚨 **12. Safety Checks**

### قبل كل تشغيل:
```bash
# تأكد من backup Turso
node backup-turso.js

# تأكد من المحلي
sqlite3 data/4cima-local.db "SELECT COUNT(*) FROM movies"
# يجب أن يطلع العدد الصحيح

# تأكد من slugs
sqlite3 data/4cima-local.db "SELECT COUNT(DISTINCT slug) FROM movies"
# يجب أن يطلع نفس إجمالي العدد (no duplicates)

# تأكد من title vs name
sqlite3 data/4cima-local.db "SELECT name_en FROM tv_series LIMIT 1"
# يجب أن يشتغل (مش title_en)
```

---

## 📞 **13. نقاط الاتصال**

### للأسئلة:
- Schema: `scripts/turso-schema-final.sql`
- Local DB: `scripts/services/local-db.js`
- الكود القديم: `BACKUP/scripts/*.backup`

### للإبلاغ:
- كل 100 فيلم: طباعة progress
- كل خطأ: log في console + ملف errors.log
- عند الانتهاء: إحصائيات كاملة

---

## 🎬 **14. مثال تشغيل كامل**

```bash
# 1. حذف المحلي القديم
rm data/4cima-local.db

# 2. اختبار صغير (50 فيلم)
node scripts/1-fetch-and-enrich.js --limit 50

# 3. تحقق
sqlite3 data/4cima-local.db "SELECT tmdb_id, slug, title_en FROM movies LIMIT 10"

# 4. sync لـ Turso
node scripts/3-sync-to-turso.js

# 5. تحقق من Turso
node scripts/check-turso-data.js

# 6. إذا كل شيء OK → full production
node scripts/1-fetch-and-enrich.js
```

---

## ✅ **15. معايير النجاح**

1. ✅ 100% من السجلات في المحلي: `tmdb_id` هو PRIMARY KEY الوحيد
2. ✅ 0 duplicate slugs
3. ✅ 0 IDs في slugs
4. ✅ 0 Arabic في slugs
5. ✅ Movies تستخدم `title_en/title_ar`
6. ✅ TV Series تستخدم `name_en/name_ar`
7. ✅ Turso يحتوي على `id = tmdb_id` (نفس القيمة)
8. ✅ `ON CONFLICT(tmdb_id)` شغال صح
9. ✅ Foreign keys تشير لـ `tmdb_id` مش `id`

---

**المبرمج العبقري يبدأ من هنا ↑**

**Good Luck! 🚀**


---

## 🔄 **16. الفروقات الجوهرية: المحلي vs Turso**

### البنية المحلية (SQLite):
```sql
-- ✅ tmdb_id هو PRIMARY KEY الوحيد
CREATE TABLE movies (
  tmdb_id INTEGER PRIMARY KEY,
  ...
)

-- ✅ Genres و Cast في جداول منفصلة (normalized)
CREATE TABLE content_genres (
  content_tmdb_id INTEGER,
  genre_tmdb_id INTEGER,
  ...
)

CREATE TABLE cast_crew (
  content_tmdb_id INTEGER,
  person_tmdb_id INTEGER,
  ...
)

-- ✅ Foreign keys تشير لـ tmdb_id
FOREIGN KEY (series_tmdb_id) REFERENCES tv_series(tmdb_id)
```

### بنية Turso (Production):
```sql
-- ⚠️ id و tmdb_id موجودين (legacy structure)
CREATE TABLE movies (
  id INTEGER PRIMARY KEY,
  tmdb_id INTEGER UNIQUE NOT NULL,
  ...
)

-- ⚠️ Genres و Cast مدمجة في JSON
genres_json TEXT,
cast_json TEXT,
...
```

### عملية التحويل في sync:
```javascript
// 1. جمع genres من الجدول المنفصل
const genres = db.prepare(`
  SELECT g.tmdb_id, g.name_en FROM genres g
  JOIN content_genres cg ON g.tmdb_id = cg.genre_tmdb_id
  WHERE cg.content_tmdb_id = ?
`).all(tmdb_id)

// 2. تحويل لـ JSON
const genres_json = JSON.stringify(genres)

// 3. كتابة لـ Turso مع id = tmdb_id
INSERT INTO movies (id, tmdb_id, genres_json, ...)
VALUES (?, ?, ?, ...)  -- id = tmdb_id
```

---

## 📝 **17. ملاحظات مهمة للمبرمج**

### 1. اختلاف التسمية:
```javascript
// ❌ خطأ شائع:
SELECT title_en FROM tv_series  // ← مفيش title_en في المسلسلات!

// ✅ صحيح:
SELECT title_en FROM movies     // ← للأفلام
SELECT name_en FROM tv_series   // ← للمسلسلات
```

### 2. Foreign Keys:
```javascript
// ❌ خطأ:
FOREIGN KEY (series_id) REFERENCES tv_series(id)

// ✅ صحيح:
FOREIGN KEY (series_tmdb_id) REFERENCES tv_series(tmdb_id)
```

### 3. Queries:
```javascript
// ❌ خطأ:
SELECT * FROM movies WHERE id = ?

// ✅ صحيح:
SELECT * FROM movies WHERE tmdb_id = ?
```

### 4. Slugs فريدة:
```sql
-- ✅ الـ slug UNIQUE constraint موجود
slug TEXT UNIQUE

-- لكن يمكن يكون NULL في البداية
-- بيتحسب أول ما نكون جاهزين للمزامنة
```

### 5. is_complete vs is_fetched:
```javascript
// is_fetched = 1: اتحاول سحبه من TMDB (404 أو نجح أو فشل)
// is_complete = 1: السجل كامل وجاهز للمزامنة

// مثال: فيلم 404
INSERT INTO movies (tmdb_id, is_fetched, is_complete, is_filtered)
VALUES (12345, 1, 0, 1)  // fetched لكن مش complete
```

---

## 🎯 **18. Workflow الكامل**

### المرحلة 1: Initial Fetch
```
TMDB API → Local SQLite (tmdb_id as PK)
         → genres table
         → cast_crew table
         → people table
```

### المرحلة 2: Enrichment
```
Local SQLite → Translation API
            → Update title_ar, overview_ar
            → Generate slug
            → Set is_complete = 1
```

### المرحلة 3: Sync to Turso
```
Local SQLite → Read from normalized tables
            → Convert to JSON
            → Write to Turso with id = tmdb_id
```

### المرحلة 4: Updates
```
TMDB API → Check if changed
         → Update local
         → Re-sync to Turso
```

---

## 🧪 **19. Testing Checklist**

### قبل Production:
```bash
# 1. تأكد من schema
sqlite3 data/4cima-local.db ".schema movies" | grep PRIMARY
# Output: tmdb_id INTEGER PRIMARY KEY

# 2. تأكد من foreign keys
sqlite3 data/4cima-local.db "PRAGMA foreign_key_list(seasons)"
# Output: series_tmdb_id → tv_series(tmdb_id)

# 3. تأكد من التسمية
sqlite3 data/4cima-local.db "SELECT name_en FROM tv_series LIMIT 1"
# يجب أن يشتغل

# 4. test slug uniqueness
sqlite3 data/4cima-local.db "
  SELECT slug, COUNT(*) as c FROM movies 
  WHERE slug IS NOT NULL 
  GROUP BY slug HAVING c > 1
"
# Output: (empty) = no duplicates

# 5. test genres join
sqlite3 data/4cima-local.db "
  SELECT COUNT(*) FROM movies m
  JOIN content_genres cg ON m.tmdb_id = cg.content_tmdb_id
"
# Output: (عدد الربط)

# 6. test cast join
sqlite3 data/4cima-local.db "
  SELECT COUNT(*) FROM movies m
  JOIN cast_crew cc ON m.tmdb_id = cc.content_tmdb_id
"
# Output: (عدد الربط)
```

---

## 🚀 **20. Performance Tips**

### 1. Batch Processing:
```javascript
// ❌ بطيء:
for (const movie of movies) {
  await processMovie(movie)
}

// ✅ أسرع:
await Promise.all(
  movies.map(m => limiter(() => processMovie(m)))
)
```

### 2. Transaction Usage:
```javascript
// ❌ بطيء (commit بعد كل row):
for (const genre of genres) {
  db.prepare('INSERT INTO content_genres ...').run(...)
}

// ✅ أسرع (commit مرة واحدة):
db.transaction(() => {
  for (const genre of genres) {
    db.prepare('INSERT INTO content_genres ...').run(...)
  }
})()
```

### 3. Index Usage:
```javascript
// ✅ الـ indexes موجودة:
CREATE INDEX idx_movies_sync_queue ON movies(is_complete, synced_to_turso)

// استخدمها في الـ queries:
SELECT tmdb_id FROM movies 
WHERE is_complete = 1 AND synced_to_turso = 0
// ← هيستخدم الـ index تلقائيًا
```

### 4. WAL Mode:
```sql
-- ✅ مفعّل في الـ schema:
PRAGMA journal_mode = WAL;

-- يسمح بـ concurrent reads أثناء الـ writes
```

---

## 📚 **21. Resources**

### Documentation:
- TMDB API: https://developers.themoviedb.org/3
- Turso Docs: https://docs.turso.tech/
- SQLite WAL: https://www.sqlite.org/wal.html
- better-sqlite3: https://github.com/WiseLibs/better-sqlite3

### الملفات المرجعية في المشروع:
```
SPECIFICATIONS-FOR-DEVELOPER.md   ← هذا الملف
LOCAL-SCHEMA-CLEAN.sql            ← الـ schema النظيف
scripts/turso-schema-final.sql    ← الـ schema الموجود في Turso
.env.local                        ← المتغيرات
BACKUP/                           ← الكود القديم للمراجعة فقط
```

---

## 💡 **22. Common Pitfalls**

### 1. نسيان transaction:
```javascript
// ❌ خطر:
const slug = generateUniqueSlug(...)
// ... delay ...
db.prepare('INSERT ... slug = ?').run(slug)
// → race condition!

// ✅ آمن:
db.transaction(() => {
  const slug = generateUniqueSlug(...)
  db.prepare('INSERT ... slug = ?').run(slug)
})()
```

### 2. استخدام id بدل tmdb_id:
```javascript
// ❌ خطأ:
const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(123)
// → عمود id مش موجود!

// ✅ صحيح:
const movie = db.prepare('SELECT * FROM movies WHERE tmdb_id = ?').get(123)
```

### 3. نسيان الفرق بين title و name:
```javascript
// ❌ خطأ:
db.prepare('UPDATE tv_series SET title_ar = ?')
// → عمود title_ar مش موجود في المسلسلات!

// ✅ صحيح:
db.prepare('UPDATE movies SET title_ar = ?')      // للأفلام
db.prepare('UPDATE tv_series SET name_ar = ?')    // للمسلسلات
```

### 4. JSON في المحلي:
```javascript
// ❌ خطأ:
db.prepare('INSERT INTO movies (genres_json, ...) VALUES (?, ...)')
// → مفيش عمود genres_json في المحلي!

// ✅ صحيح:
// استخدم جدول content_genres المنفصل
db.prepare('INSERT INTO content_genres (content_tmdb_id, genre_tmdb_id) VALUES (?, ?)')
```

### 5. نسيان ON CONFLICT:
```javascript
// ❌ خطر:
INSERT INTO movies (tmdb_id, ...) VALUES (?, ...)
// → هيرمي error لو السجل موجود

// ✅ آمن:
INSERT INTO movies (tmdb_id, ...) VALUES (?, ...)
ON CONFLICT(tmdb_id) DO UPDATE SET ...
// أو
INSERT OR IGNORE INTO movies ...
```

---

## 🎓 **23. Final Notes**

### القاعدة الذهبية:
> **في المحلي: `tmdb_id` هو الملك**  
> **في Turso: `id = tmdb_id` دائماً**  
> **في الـ slugs: إنجليزي فقط، no IDs**

### عند الشك:
1. راجع `LOCAL-SCHEMA-CLEAN.sql`
2. راجع `SPECIFICATIONS-FOR-DEVELOPER.md` (هذا الملف)
3. اختبر على 10 سجلات أول
4. تحقق من النتائج يدوياً
5. ثم scale up

### Remember:
- **Atomic operations** للـ slugs
- **Transactions** للـ batch inserts
- **Foreign keys** تشير لـ `tmdb_id`
- **title vs name** في الـ queries
- **Normalized locally**, **JSON in Turso**

---

**🚀 المبرمج العبقري، الملعب الآن ملعبك!**

**Let's build something amazing! 💪**
