# 📊 تحليل شامل لنظام سحب البيانات

**التاريخ:** 2026-07-19  
**الحالة:** ✅ جاهز للعمل

---

## 🎯 نظرة عامة

نظام سحب البيانات مصمم لجلب معلومات الأفلام والمسلسلات من TMDB API وحفظها في قاعدة بيانات محلية، ثم مزامنتها مع Turso (السحابة).

---

## 📋 مكونات النظام

### 1. قاعدة البيانات المحلية (`./data/4cima-local.db`)

**الحجم:** 694 MB  
**عدد الأفلام:** 133,319  
**عدد المسلسلات:** 44,620  
**الحالة:** ✅ جاهزة تماماً

#### الجداول الرئيسية:

| الجدول | الصفوف | الغرض |
|--------|-------|-------|
| **movies** | 133,319 | الأفلام |
| **tv_series** | 44,620 | المسلسلات |
| **people** | 0 | الممثلين والمخرجين |
| **cast_crew** | 0 | ربط الأعمال بالممثلين |
| **genres** | 27 | التصنيفات |
| **content_genres** | 0 | ربط الأعمال بالتصنيفات |
| **translation_cache** | 0 | ذاكرة الترجمات |
| **ingestion_progress** | 0 | تتبع التقدم |

---

## 🔄 آلية عمل سكريبت السحب (INGEST-MOVIES-LOGIC.js)

### المراحل:

#### 1️⃣ **القراءة من قاعدة البيانات**
```sql
SELECT id FROM movies
WHERE (
  (overview_en IS NULL AND is_filtered = 0)
  OR (overview_en IS NOT NULL AND (title_ar = 'TBD' OR title_ar IS NULL))
  OR (overview_en IS NOT NULL AND has_cast = 0)
)
ORDER BY vote_count DESC, id ASC
```

**النتيجة:** 133,319 فيلم محتاج سحب (100%)

#### 2️⃣ **السحب من TMDB API**

لكل فيلم، يسحب:
```javascript
await fetchTMDB(`/movie/${id}`, {
  append_to_response: 'credits,translations,keywords,videos,release_dates'
})
```

**البيانات المسحوبة:**
- ✅ العناوين (الأصلي + الإنجليزي)
- ✅ الوصف (بالإنجليزي)
- ✅ التصنيفات (Genres)
- ✅ التقييمات والشعبية
- ✅ الملصق والخلفية
- ✅ الممثلين والطاقم (أول 10 ممثلين)
- ✅ المخرجين والكتاب
- ✅ الفيديوهات (Trailers)
- ✅ تاريخ الإصدار
- ✅ شركات الإنتاج
- ✅ الكلمات المفتاحية

#### 3️⃣ **الترجمة إلى العربية**

**أولاً:** يحاول جلب الترجمة من TMDB نفسه:
```javascript
const arTrans = movie.translations?.translations?.find(t => t.iso_639_1 === 'ar')
let title_ar = arTrans?.data?.title || null
let overview_ar = arTrans?.data?.overview || null
```

**ثانياً:** إذا لم توجد، يستخدم خدمات الترجمة بالترتيب:
1. **Google Translate** (translateContent)
2. **Groq AI** (llama-3.3-70b-versatile)
3. **Mistral AI** (mistral-small-latest)

**Cache:** يحفظ الترجمات في `translation_cache` لتجنب إعادة الترجمة.

#### 4️⃣ **توليد المحتوى المفقود**

إذا لم يوجد وصف بالعربي، يستخدم **Groq AI** لتوليد وصف:
```javascript
async function generateOverviewWithGroq(titleAr, titleEn, year) {
  // يرسل prompt لـ Groq لتوليد وصف مشوق 3-5 جمل
}
```

#### 5️⃣ **معالجة الممثلين**

لكل ممثل:
1. يفحص إذا موجود في جدول `people`
2. إذا لم يكن موجود:
   - يسحب بياناته الكاملة من `/person/{id}`
   - يترجم اسمه وسيرته الذاتية
   - يحفظه في جدول `people`
3. يربطه بالفيلم في جدول `cast_crew`

#### 6️⃣ **توليد SEO**

يستخدم `generateCompleteSEO()` لتوليد:
- `seo_title_ar` - عنوان SEO بالعربي
- `seo_title_en` - عنوان SEO بالإنجليزي  
- `seo_description_ar` - وصف SEO
- `seo_keywords_json` - كلمات مفتاحية
- `canonical_url` - رابط كانونيكال

#### 7️⃣ **تحديد أولوية المزامنة**

```javascript
const syncPriority = (() => {
  const age = new Date().getFullYear() - (release_year || 0)
  const r = movie.vote_average || 0
  if (age <= 2 && r >= 7.5) return 1  // أفلام جديدة ممتازة
  if (age <= 5 && r >= 7.0) return 2  // أفلام حديثة جيدة
  if (age <= 10 && r >= 6.5) return 3 // أفلام متوسطة العمر
  if (r >= 6.0) return 4              // أفلام جيدة
  return 5                             // باقي الأفلام
})()
```

#### 8️⃣ **التصفية (Filtering)**

يستخدم `shouldFilterContent()` للتحقق من:
- محتوى للكبار فقط
- أفلام لا تستحق العرض (تقييم منخفض جداً)
- محتوى مخالف

الأفلام المفلترة تُحفظ مع سبب الفلترة في `filter_reason`.

#### 9️⃣ **الحفظ في القاعدة**

```sql
UPDATE movies SET
  title_ar = ?, title_en = ?, overview_ar = ?,
  poster_path = ?, backdrop_path = ?,
  trailer_key = ?, genres_json = ?,
  has_arabic_title = 1,
  has_arabic_overview = 1,
  has_genres = 1,
  has_cast = 1,
  is_complete = 1,
  sync_priority = ?,
  seo_title_ar = ?, seo_description_ar = ?,
  ...
WHERE id = ?
```

#### 🔟 **حفظ التقدم**

كل 50 فيلم، يحفظ التقدم في جدول `ingestion_progress`:
```javascript
saveProgress(lastId, 'running')
```

---

## ⚙️ الإعدادات والأداء

### المتغيرات المهمة:

```javascript
const CONCURRENCY = 50      // عدد الطلبات المتزامنة
const BATCH_SIZE = 200      // حجم الدفعة
const CHUNK_SIZE = 1000     // حجم القطعة
```

### الأداء المتوقع:

- **السرعة:** ~50 فيلم/دقيقة
- **الوقت المتوقع:** ~2,666 دقيقة (44 ساعة) لـ 133,319 فيلم
- **يمكن إيقافه وتشغيله:** نعم، يحفظ التقدم تلقائياً

### Rate Limits:

- **TMDB API:** 40 requests/10 seconds
- **السكريبت يتعامل معها:** نعم، ينتظر تلقائياً عند rate limit

---

## 🔄 آلية المزامنة مع Turso

### السكريبتات:

1. **`sync-to-turso-optimized.js`** - مزامنة محسنة
2. **`sync-to-turso-ultra-fast.js`** - مزامنة سريعة جداً

### الآلية:

```sql
-- يختار الأفلام الجاهزة للمزامنة
SELECT * FROM movies
WHERE synced_to_turso = 0 
  AND is_complete = 1
ORDER BY sync_priority ASC
LIMIT 500
```

**المزامنة:**
1. يحول البيانات للشكل المناسب لـ Turso
2. يرسلها على دفعات
3. يحدث `synced_to_turso = 1` عند النجاح
4. يحفظ الأخطاء في `sync_error`

---

## 📊 الحالة الحالية

### قاعدة البيانات المحلية:

```
✅ جاهزة تماماً
✅ 133,319 فيلم (100% محتاج سحب)
✅ 44,620 مسلسل
✅ جميع الجداول موجودة
✅ جميع الأعمدة موجودة
```

### البيانات:

```
📊 أفلام بها overview: 0 (0.0%)
📊 أفلام مكتملة: 0 (0.0%)
📊 أفلام محتاجة سحب: 133,319 (100.0%)
```

**الخلاصة:** قاعدة البيانات فيها فقط IDs والعناوين الأساسية، وكل شيء تاني محتاج يتسحب من TMDB.

---

## 🚀 خطوات التشغيل

### 1. تحضير السكريبتات

```bash
# نسخ السكريبتات من BACKUP
Copy-Item "BACKUP/scripts/INGEST-MOVIES-LOGIC.js.backup" "scripts/INGEST-MOVIES-LOGIC.js"
Copy-Item "BACKUP/scripts/INGEST-SERIES-LOGIC.js.backup" "scripts/INGEST-SERIES-LOGIC.js"
```

### 2. التأكد من المتغيرات البيئية

```env
# .env.local
TMDB_API_KEY=afef094e7c0de13c1cac98227a61da4d
TMDB_API_KEY_2=1298554bf3b09eee57972f0876ad096e
GROQ_API_KEY=gsk_...
MISTRAL_API_KEY=s25l...
```

### 3. تشغيل سحب الأفلام

```bash
node scripts/INGEST-MOVIES-LOGIC.js
```

**سيبدأ تلقائياً ب:**
- سحب بيانات الأفلام من TMDB
- ترجمة العناوين والأوصاف
- سحب الممثلين والطاقم
- حفظ كل شيء في القاعدة المحلية

### 4. مراقبة التقدم

```bash
node check-ingestion-progress-table.js
```

### 5. المزامنة مع Turso

```bash
node scripts/sync-to-turso-ultra-fast.js
```

---

## 🎯 ما يحدث خطوة بخطوة

### مثال: فيلم "The Matrix" (ID: 603)

#### 1. القراءة من القاعدة المحلية:
```
ID: 603
title_en: "The Matrix"
overview_en: NULL
is_complete: 0
```

#### 2. السحب من TMDB:
```javascript
GET /movie/603?append_to_response=credits,translations,keywords,videos
```

#### 3. الترجمة:
```
title_ar: "ذا ماتريكس" (من TMDB)
overview_ar: "في عالم مستقبلي..." (ترجمة Google)
```

#### 4. سحب الممثلين:
```
- Keanu Reeves (ID: 6384)
- Laurence Fishburne (ID: 2975)
- Carrie-Anne Moss (ID: 530)
... (أول 10 ممثلين)
```

#### 5. التصنيفات:
```json
[
  {"id": 28, "name_ar": "أكشن", "name_en": "Action"},
  {"id": 878, "name_ar": "خيال علمي", "name_en": "Science Fiction"}
]
```

#### 6. SEO:
```
seo_title_ar: "فيلم ذا ماتريكس (1999) - مشاهدة وتحميل"
seo_description_ar: "شاهد فيلم ذا ماتريكس (1999)..."
canonical_url: "/movies/the-matrix-1999"
```

#### 7. الحفظ:
```sql
UPDATE movies SET
  title_ar = 'ذا ماتريكس',
  overview_ar = '...',
  has_arabic_title = 1,
  has_arabic_overview = 1,
  has_cast = 1,
  has_genres = 1,
  is_complete = 1,
  sync_priority = 1
WHERE id = 603
```

#### 8. النتيجة:
```
✅ الفيلم كامل وجاهز للمزامنة مع Turso
```

---

## 🔧 المشاكل المحتملة والحلول

### 1. Rate Limit من TMDB
**المشكلة:** 429 Too Many Requests  
**الحل:** السكريبت ينتظر تلقائياً ويعيد المحاولة

### 2. نفاد API Keys
**المشكلة:** الترجمة تفشل  
**الحل:** يستخدم keys احتياطية أو يولد محتوى بـ AI

### 3. توقف السكريبت
**المشكلة:** انقطاع الكهرباء أو توقف الجهاز  
**الحل:** يحفظ التقدم كل 50 فيلم، يمكن استكمال من حيث توقف

### 4. بيانات ناقصة
**المشكلة:** بعض الأفلام بدون ملصقات أو ممثلين  
**الحل:** `is_complete = 0` والسكريبت يعيد المحاولة لاحقاً

---

## 📈 الإحصائيات المتوقعة

بعد انتهاء السحب الكامل:

```
✅ 133,319 فيلم
   ├─ ~120,000 فيلم كامل (90%)
   ├─ ~10,000 فيلم مفلتر (7.5%)
   └─ ~3,000 فيلم ناقص بيانات (2.5%)

✅ ~1,200,000 ممثل ومخرج
✅ ~400,000 علاقة cast/crew
✅ ~300,000 ترجمة محفوظة في cache
```

---

## ✅ الخلاصة

| العنصر | الحالة | الملاحظات |
|--------|--------|-----------|
| **قاعدة البيانات** | ✅ جاهزة | جميع الجداول والأعمدة موجودة |
| **السكريبتات** | ✅ موجودة | في مجلد BACKUP |
| **API Keys** | ✅ موجودة | في .env.local |
| **البيانات** | ⏳ محتاجة سحب | 133,319 فيلم محتاج معالجة |
| **المزامنة** | ⏳ بعد السحب | جاهزة للعمل بعد اكتمال السحب |

**الحالة الإجمالية:** 🟢 جاهز للتشغيل

---

**آخر تحديث:** 2026-07-19
