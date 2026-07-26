# 📋 مواصفات محدّثة - بعد مراجعة المبرمج

## 🔄 التحديثات الجوهرية

### 1. استخدام TMDB Daily Exports (بدل Loop)

**❌ الطريقة القديمة (معطوبة):**
```javascript
// Loop من 1 إلى 1,000,000+
for (let tmdb_id = 1; tmdb_id <= endId; tmdb_id++) {
  // معظمها 404 - هدر رهيب!
}
```

**✅ الطريقة الصحيحة:**
```javascript
// استخدام TMDB Daily Export Files
const MOVIE_EXPORT = 'http://files.tmdb.org/p/exports/movie_ids_MM_DD_YYYY.json.gz'
const TV_EXPORT = 'http://files.tmdb.org/p/exports/tv_series_ids_MM_DD_YYYY.json.gz'

async function downloadAndImportIds(exportUrl, table) {
  // 1. تحميل الملف المضغوط
  const response = await fetch(exportUrl)
  const buffer = await response.arrayBuffer()
  
  // 2. فك الضغط (gzip)
  const zlib = require('zlib')
  const decompressed = zlib.gunzipSync(Buffer.from(buffer))
  
  // 3. قراءة السطور (كل سطر JSON منفصل)
  const lines = decompressed.toString().split('\n')
  
  console.log(`📦 تم تحميل ${lines.length} ID`)
  
  // 4. INSERT batch في المحلي
  db.transaction(() => {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO ${table} (tmdb_id, is_fetched, is_complete)
      VALUES (?, 0, 0)
    `)
    
    let count = 0
    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const data = JSON.parse(line)
        stmt.run(data.id)
        count++
      } catch (e) {
        // skip malformed lines
      }
    }
    
    console.log(`✅ تم إدراج ${count} ID في ${table}`)
  })()
}

// الاستخدام:
await downloadAndImportIds(MOVIE_EXPORT, 'movies')
await downloadAndImportIds(TV_EXPORT, 'tv_series')
```

**الفرق:**
- ❌ Loop: ~1,000,000 API calls (معظمها 404)
- ✅ Export: ~140,000 ID فقط (الموجودين فعلياً)
- ⚡ التوفير: **~85% أقل API calls**

---

### 2. Translation Strategy (TMDB أولاً)

**❌ القديم: AI لكل شيء**
```javascript
const title_ar = await translateWithGroq(title_en)  // كل مرة AI!
```

**✅ الجديد: Fallback Chain**
```javascript
async function getArabicTranslation(field, tmdb_translations) {
  // 1️⃣ Priority: TMDB official translations (مجاني!)
  const arTrans = tmdb_translations?.find(t => t.iso_639_1 === 'ar')
  if (arTrans?.data?.[field]) {
    return arTrans.data[field]
  }
  
  // 2️⃣ Fallback: Translation cache
  const cached = db.prepare(`
    SELECT translated_text FROM translation_cache 
    WHERE source_text = ? AND target_lang = 'ar'
  `).get(field)
  if (cached) return cached.translated_text
  
  // 3️⃣ Last resort: AI translation
  return await translateWithAI(field)
}

// الاستخدام:
const movie = await fetchTMDB(`/movie/${tmdb_id}`, {
  append_to_response: 'translations'  // ← مهم!
})

const title_ar = await getArabicTranslation(
  movie.title, 
  movie.translations?.translations
)
```

**التوفير المتوقع:**
- ~60-70% من المحتوى الشهير: ترجمة TMDB جاهزة ✅
- ~30-40% فقط يحتاج AI
- **التكلفة: ~60% أقل**
- **الوقت: ~50% أسرع**

---

### 3. Concurrency Model (توضيح مهم)

**⚠️ better-sqlite3 هي مكتبة Synchronous**

```javascript
// ✅ صحيح: التوازي على مستوى I/O فقط
const limiter = pLimit(20)  // ← 20 API calls متوازية

await Promise.all(
  ids.map(tmdb_id => 
    limiter(async () => {
      // ✅ التوازي هنا: انتظار TMDB API (I/O)
      const movie = await fetchTMDB(`/movie/${tmdb_id}`)
      const title_ar = await translateWithAI(movie.title)
      
      // ✅ Sequential: الكتابة في القاعدة (واحد واحد)
      db.transaction(() => {
        // ❌ ممنوع async/await هنا!
        const slug = generateSlug(...)  // synchronous
        db.prepare('INSERT ...').run(...) // synchronous
      })()
    })
  )
)

// ❌ خطأ فادح:
db.transaction(async () => {        // ← ممنوع async!
  const data = await fetchTMDB(...) // ← ممنوع await!
  db.prepare('INSERT ...').run(data)
})()
// → هيكسر المكتبة تماماً!
```

**القاعدة الذهبية:**
- ✅ `async/await` **خارج** transactions (للـ API calls)
- ❌ `async/await` **داخل** transactions (synchronous فقط)
- ✅ التوازي = I/O operations
- ❌ التوازي ≠ Database writes

---

### 4. Run Strategy (Initial + Cron)

#### Phase 1: Initial Backlog (Run واحد طويل)
```bash
# تحميل IDs من exports
node scripts/0-download-ids.js

# سحب البيانات (resumable)
node scripts/1-fetch-and-enrich.js

# المدة المتوقعة: 48-72 ساعة
# Resumable: لو توقف يكمل من آخر نقطة
```

```javascript
// Resumable implementation:
function getNextBatch() {
  const progress = db.prepare(`
    SELECT last_processed_tmdb_id FROM ingestion_progress 
    WHERE script_name = '1-fetch-and-enrich'
  `).get()
  
  return db.prepare(`
    SELECT tmdb_id FROM movies 
    WHERE tmdb_id > ? AND is_fetched = 0
    ORDER BY tmdb_id
    LIMIT ?
  `).all(progress?.last_processed_tmdb_id || 0, BATCH_SIZE)
}
```

#### Phase 2: Daily Maintenance (Cron job)
```bash
# crontab
0 2 * * * node scripts/1-fetch-and-enrich.js --new-only
```

```javascript
// --new-only mode:
if (process.argv.includes('--new-only')) {
  // سحب export file الجديد فقط
  await downloadAndImportIds(MOVIE_EXPORT, 'movies')
  
  // معالجة الجديد فقط
  const newIds = db.prepare(`
    SELECT tmdb_id FROM movies 
    WHERE created_at > datetime('now', '-1 day')
    AND is_fetched = 0
  `).all()
}
```

---

### 5. Schema Updates

```sql
-- ✅ age_rating: NULL بدل 'PG'
age_rating TEXT DEFAULT NULL,  -- مش 'PG'

-- ✅ source tracking
source TEXT DEFAULT 'tmdb',
fetched_from TEXT,  -- 'export' or 'api'
```

---

## 🔐 Security Update

**⚠️ المفاتيح في .env.local يجب تغييرها فوراً!**

### TMDB API:
```bash
# https://www.themoviedb.org/settings/api
# إنشاء مفتاح جديد
```

### Turso:
```bash
turso db tokens create 4cima --expiration none
```

### Groq:
```bash
# https://console.groq.com/keys
# إنشاء مفتاح جديد
```

**القاعدة:** لا تحط مفاتيح حقيقية في:
- ❌ Git commits
- ❌ Documentation
- ❌ Code comments
- ✅ `.env.local` فقط (مش في git)

---

## 📦 السكريبتات المحدّثة (4 بدل 3)

```
scripts/
  0-download-ids.js          ← NEW: تحميل IDs من exports
  1-fetch-and-enrich.js      ← سحب البيانات من TMDB
  2-enrich-incomplete.js     ← تحديث الناقص
  3-sync-to-turso.js         ← رفع لـ Turso
```

### Script 0: Download IDs
```javascript
// المهمة: تحميل IDs من TMDB exports
// Input: TMDB export files
// Output: IDs في جدول movies/tv_series
// Duration: ~2-5 دقائق
```

### Script 1: Fetch & Enrich (محدّث)
```javascript
// المهمة: سحب البيانات الكاملة
// Input: IDs من Script 0
// Output: بيانات كاملة في المحلي
// Duration: 48-72 ساعة (initial)
// Features:
// - Resumable
// - TMDB translations أولاً
// - AI fallback
// - Seasons/Episodes included
```

---

## 🎯 Updated Workflow

```
Step 1: Download IDs from TMDB exports
  ↓ (~140K movie IDs, ~XX TV IDs)
  
Step 2: Fetch data from TMDB API
  ↓ (with resumable progress)
  
Step 3: Translate missing fields
  ↓ (TMDB → AI fallback)
  
Step 4: Generate slugs
  ↓ (atomic in transactions)
  
Step 5: Sync to Turso
  ↓ (batch with ON CONFLICT)
  
Step 6: Daily cron for new content
  ↓ (maintenance mode)
```

---

## ✅ Updated Success Criteria

1. ✅ استخدام TMDB exports (مش loop)
2. ✅ TMDB translations أولاً (مش AI لكل شيء)
3. ✅ Concurrency صحيح (I/O فقط)
4. ✅ Resumable progress
5. ✅ age_rating = NULL (مش 'PG')
6. ✅ المفاتيح اتغيرت
7. ✅ tmdb_id كـ PK
8. ✅ Atomic slugs
9. ✅ title vs name
10. ✅ Seasons/Episodes included

---

**هذه المواصفات المحدّثة بعد المراجعة الاحترافية من المبرمج! 🚀**
