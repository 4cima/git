# 🎯 إجابات كيرو على أسئلة المبرمج

## شكراً للمراجعة الدقيقة! 🙏

ملاحظاتك احترافية جداً. دعني أجاوب على كل نقطة:

---

## ✅ الإجابات

### 1. هل هنستخدم TMDB daily export files؟

**نعم، 100%! هذا هو الصحيح.**

أنت محق تماماً - الـ loop من 1 للآخر **هدر رهيب**. 

**الحل الصحيح:**
```javascript
// ✅ استخدام TMDB Daily Exports
const EXPORT_URL = 'http://files.tmdb.org/p/exports/movie_ids_MM_DD_YYYY.json.gz'

async function fetchMovieIds() {
  // 1. تحميل الملف المضغوط
  const response = await fetch(EXPORT_URL)
  const buffer = await response.arrayBuffer()
  
  // 2. فك الضغط
  const decompressed = zlib.gunzipSync(Buffer.from(buffer))
  
  // 3. قراءة السطور (كل سطر = JSON object)
  const lines = decompressed.toString().split('\n')
  
  // 4. INSERT في المحلي
  db.transaction(() => {
    for (const line of lines) {
      if (!line.trim()) continue
      const { id } = JSON.parse(line)
      db.prepare(`
        INSERT OR IGNORE INTO movies (tmdb_id, is_fetched, is_complete)
        VALUES (?, 0, 0)
      `).run(id)
    }
  })()
}
```

**الفرق:**
- ❌ Loop: ~1,000,000 API calls (معظمها 404)
- ✅ Export file: ~140,000 ID فقط (الموجودين فعلياً)

**التحديث:** السكريبت `1-fetch-and-enrich.js` سيستخدم هذه الطريقة.

---

### 2. المفاتيح اللي ظهرت في التقرير - هل اتغيرت؟

**🚨 نعم، يجب تغييرها فوراً!**

المفاتيح المعروضة في `.env.local` **حقيقية** وكانت غلطة مني إني حطيتها في التقرير.

**الواجب عمله الآن:**

#### TMDB API Keys:
```bash
# زيارة: https://www.themoviedb.org/settings/api
# إنشاء مفاتيح جديدة
# تحديث .env.local
```

#### Turso Auth Token:
```bash
# من terminal:
turso db tokens create 4cima --expiration none

# نسخ الـ token الجديد في .env.local
```

#### Groq API Key:
```bash
# زيارة: https://console.groq.com/keys
# إنشاء مفتاح جديد
# تحديث .env.local
```

**ملاحظة:** الملفات المُسلّمة للمبرمج **لا تحتوي** على المفاتيح - فقط أسماء المتغيرات.

---

### 3. هل هنعتمد على TMDB translations الجاهزة الأول؟

**نعم، بالتأكيد! هذا هو الأذكى.**

**Strategy الصحيحة:**
```javascript
async function getArabicTitle(movie) {
  // 1️⃣ محاولة TMDB translations أولاً (مجاني وسريع)
  const arTrans = movie.translations?.translations?.find(t => t.iso_639_1 === 'ar')
  if (arTrans?.data?.title) {
    return arTrans.data.title
  }
  
  // 2️⃣ fallback لـ AI فقط لو مفيش ترجمة TMDB
  return await translateWithGroq(movie.title)
}
```

**الأرقام المتوقعة:**
- ~60-70% من المحتوى الشهير: ترجمة TMDB جاهزة ✅
- ~30-40% المتبقي: نستخدم AI

**توفير:**
- تكلفة: ~60% أقل
- وقت: ~50% أسرع

---

### 4. سحب المواسم والحلقات هيبقى فين؟

**جزء من `1-fetch-and-enrich.js` نفسه.**

```javascript
async function processSeries(tmdb_id) {
  // 1. سحب بيانات المسلسل
  const series = await fetchTMDB(`/tv/${tmdb_id}`)
  
  // 2. INSERT المسلسل
  db.prepare(`INSERT INTO tv_series (...) VALUES (...)`).run(...)
  
  // 3. سحب المواسم (في نفس السكريبت)
  for (const season of series.seasons) {
    const seasonData = await fetchTMDB(`/tv/${tmdb_id}/season/${season.season_number}`)
    
    // INSERT الموسم
    db.prepare(`INSERT INTO seasons (...) VALUES (...)`).run(...)
    
    // INSERT الحلقات
    for (const episode of seasonData.episodes) {
      db.prepare(`INSERT INTO episodes (...) VALUES (...)`).run(...)
    }
  }
}
```

**ملاحظة:** المواسم/الحلقات تُسحب **مع** المسلسل في نفس الـ workflow.

---

### 5. التنفيذ هيبقى run واحد ولا cron job؟

**الاتنين! حسب المرحلة:**

#### المرحلة الأولى (Initial Fetch):
```bash
# Run واحد طويل لسحب الـ backlog
node scripts/1-fetch-and-enrich.js

# المدة المتوقعة: 48-72 ساعة
# مع resumable progress (لو توقف يكمل من آخر نقطة)
```

#### المرحلة الثانية (Maintenance):
```bash
# Cron job يومي لسحب الجديد
0 2 * * * node scripts/1-fetch-and-enrich.js --new-only

# يسحب بس الأفلام/المسلسلات الجديدة من آخر 24 ساعة
```

**التنفيذ:**
```javascript
// resumable progress
const lastProcessed = db.prepare(`
  SELECT last_processed_tmdb_id FROM ingestion_progress 
  WHERE script_name = '1-fetch-and-enrich'
`).get()

// البدء من آخر نقطة
const ids = db.prepare(`
  SELECT tmdb_id FROM movies 
  WHERE tmdb_id > ? AND is_fetched = 0
  ORDER BY tmdb_id
`).all(lastProcessed?.last_processed_tmdb_id || 0)
```

---

### 6. الـ Concurrency مع better-sqlite3

**صحيح 100% - التوازي على مستوى I/O فقط.**

```javascript
// ✅ صحيح:
const limiter = pLimit(20)  // ← I/O concurrency

await Promise.all(
  batch.map(tmdb_id => 
    limiter(async () => {
      // ← التوازي هنا: انتظار TMDB API
      const movie = await fetchTMDB(`/movie/${tmdb_id}`)
      
      // ← Sequential: الكتابة في القاعدة
      db.transaction(() => {
        // ❌ ممنوع await هنا!
        db.prepare('INSERT ...').run(...)
      })()
    })
  )
)

// ❌ خطأ:
db.transaction(async () => {  // ← ممنوع async في transaction!
  await fetchTMDB(...)        // ← ممنوع await داخل transaction!
})()
```

**القاعدة:**
- ✅ `async/await` خارج transactions (للـ API calls)
- ❌ `async/await` داخل transactions (synchronous فقط)

---

### 7. `age_rating DEFAULT 'PG'`

**محق - الأفضل NULL.**

```sql
-- ✅ التعديل:
age_rating TEXT DEFAULT NULL,  -- مش 'PG'

-- في الكود:
const age_rating = getCertification(movie) || null  // مش 'PG'
```

**السبب:** أفضل نقول "مش عارفين" من نديهم تصنيف غلط.

---

## 🔄 التحديثات المطلوبة

### 1. TMDB Daily Exports
سأضيف قسم جديد في المواصفات عن استخدام export files.

### 2. Translation Strategy
سأوضح الـ fallback chain: TMDB → Groq → Mistral

### 3. Seasons/Episodes
سأوضح إنهم جزء من نفس workflow.

### 4. Concurrency
سأضيف تحذير واضح عن better-sqlite3 synchronous nature.

### 5. age_rating
سأغير الـ DEFAULT لـ NULL.

### 6. Security
سأحذف أي مفاتيح من الأمثلة.

---

## 📝 Next Steps

1. ✅ تغيير جميع المفاتيح (فوراً!)
2. ✅ تحديث المواصفات بالإجابات دي
3. ✅ إضافة قسم TMDB exports
4. ✅ توضيح concurrency model
5. ✅ البدء في التنفيذ

---

## 🎯 الخلاصة

كل ملاحظاتك **صحيحة 100%** وتم أخذها في الاعتبار:

| النقطة | الحل |
|--------|------|
| Loop inefficiency | ✅ TMDB daily exports |
| Security | ✅ Rotate keys فوراً |
| Translation cost | ✅ TMDB first, AI fallback |
| Seasons/Episodes | ✅ Part of main workflow |
| Run strategy | ✅ Initial + cron |
| Concurrency | ✅ I/O only, no async in transactions |
| age_rating | ✅ NULL بدل 'PG' |

---

**شكراً للمراجعة الاحترافية! 🙏**

**جاهز للبدء بعد تطبيق التحديثات.**
