# 📖 تفاصيل الاسكريبتات المحفوظة

**تاريخ الإنشاء:** 2026-05-03  
**الإصدار:** 1.0  
**الحالة:** ✅ توثيق شامل

---

## 🎬 INGEST-MOVIES-LOGIC.js

### 📍 الموقع:
```
scripts/INGEST-MOVIES-LOGIC.js
BACKUP/scripts/INGEST-MOVIES-LOGIC.js.backup
```

### 🎯 الوظيفة الأساسية:
سحب وتحديث بيانات الأفلام من TMDB API بشكل متزامن مع ترجمة وتحسين البيانات.

### 📥 المدخلات:
```javascript
// من قاعدة البيانات المحلية:
- جدول movies (الأفلام المحتاجة معالجة)
- جدول translation_cache (الترجمات المخزنة)

// من API:
- TMDB API (بيانات الأفلام)
- Google Translate (ترجمة العناوين)
- Groq API (توليد الأوصاف)
- Mistral API (ترجمة بديلة)
```

### 📤 المخرجات:
```javascript
// تحديثات في قاعدة البيانات:
- جدول movies (البيانات المحدثة)
- جدول cast_crew (الممثلين والطاقم)
- جدول content_genres (الأنواع)
- جدول translation_cache (الترجمات الجديدة)
- جدول ingestion_progress (تسجيل التقدم)

// إحصائيات:
- stats.movies (عدد الأفلام المحدثة)
- stats.filtered (عدد الأفلام المفلترة)
- stats.not_found (عدد الأفلام غير الموجودة)
- stats.cast (عدد الممثلين المضافين)
- stats.translated (عدد الترجمات)
- stats.groq_generated (عدد الأوصاف المولدة)
```

### 🔄 دورة العمل:

#### 1. التحديد (Selection)
```javascript
// السطر 674
SELECT COUNT(*) FROM movies WHERE (
  (overview_en IS NULL AND is_filtered = 0)           // لم تُسحب بعد
  OR (overview_en IS NOT NULL AND title_ar = 'TBD')   // سُحبت لكن بدون عربي
  OR (NOT EXISTS cast_crew)                            // بدون ممثلين
)
```

#### 2. السحب من TMDB
```javascript
// السطر 84-113
async function fetchTMDB(endpoint, params = {}, retries = 3)
// يسحب مع معالجة الأخطاء والـ rate limiting
```

#### 3. الفلترة
```javascript
// السطر 403-430
if (shouldFilterContent(movie)) {
  // يفلتر إذا كان:
  // - بدون poster
  // - بدون overview
  // - تقييم منخفض جداً
  // - غير موجود في TMDB
  
  db.prepare(`UPDATE movies SET is_filtered = 1`).run(id)
  stats.filtered++
  return  // ← يتوقف هنا!
}
```

#### 4. الترجمة
```javascript
// السطر 132-240
async function translateWithCache(text, targetLang = 'ar')
// يحاول بالترتيب:
// 1. Google Translate
// 2. Groq API
// 3. Mistral API
```

#### 5. توليد الأوصاف
```javascript
// السطر 242-275
async function generateOverviewWithGroq(titleAr, titleEn, year)
// يولد وصف بـ AI إذا لم يوجد
```

#### 6. إضافة الممثلين
```javascript
// السطر 314-400
async function processPerson(personData, contentId, contentType, castOrder)
// يضيف الممثلين والطاقم
```

#### 7. التحديث
```javascript
// السطر 550-600
db.prepare(`UPDATE movies SET ...`).run(...)
// يحدث جميع البيانات في قاعدة البيانات
```

### ⚙️ الإعدادات:
```javascript
const CONCURRENCY = 50          // طلبات متزامنة
const BATCH_SIZE = 200          // حجم الدفعة
const CHUNK_SIZE = 1000         // سحب من DB دفعة دفعة
```

### 🚨 المشاكل المعروفة:

| المشكلة | التأثير | الحل |
|--------|--------|------|
| ❌ لا يوجد `is_fetched` | قد تُسحب الأفلام مرة أخرى | إضافة عمود `is_fetched` |
| ❌ الأفلام المفلترة قد تُسحب مرة أخرى | إعادة سحب غير ضرورية | تحديث الشرط في SELECT |
| ❌ لا يوجد تمييز واضح | صعوبة في التتبع | إضافة عمود `fetched_at` |

---

## 📺 INGEST-SERIES-LOGIC.js

### 📍 الموقع:
```
scripts/INGEST-SERIES-LOGIC.js
BACKUP/scripts/INGEST-SERIES-LOGIC.js.backup
```

### 🎯 الوظيفة الأساسية:
سحب وتحديث بيانات المسلسلات من TMDB API مع المواسم والحلقات والترجمة.

### 📥 المدخلات:
```javascript
// من قاعدة البيانات المحلية:
- جدول tv_series (المسلسلات المحتاجة معالجة)
- جدول translation_cache (الترجمات المخزنة)

// من API:
- TMDB API (بيانات المسلسلات والمواسم والحلقات)
- Google Translate (ترجمة العناوين)
- Groq API (توليد الأوصاف)
- Mistral API (ترجمة بديلة)
```

### 📤 المخرجات:
```javascript
// تحديثات في قاعدة البيانات:
- جدول tv_series (البيانات المحدثة)
- جدول seasons (المواسم)
- جدول episodes (الحلقات)
- جدول cast_crew (الممثلين والطاقم)
- جدول content_genres (الأنواع)
- جدول translation_cache (الترجمات الجديدة)
- جدول ingestion_progress (تسجيل التقدم)

// إحصائيات:
- stats.series (عدد المسلسلات المحدثة)
- stats.seasons (عدد المواسم المضافة)
- stats.episodes (عدد الحلقات المضافة)
- stats.filtered (عدد المسلسلات المفلترة)
- stats.cast (عدد الممثلين المضافين)
```

### 🔄 دورة العمل:

#### 1. التحديد
```javascript
// السطر 778
SELECT COUNT(*) FROM tv_series WHERE (
  (overview_en IS NULL AND is_filtered = 0)
  OR (overview_en IS NOT NULL AND title_ar = 'TBD')
  OR (NOT EXISTS seasons)
  OR (NOT EXISTS cast_crew)
)
```

#### 2. السحب والفلترة والترجمة
```javascript
// نفس الآلية كـ INGEST-MOVIES-LOGIC
// لكن مع إضافة المواسم والحلقات
```

#### 3. سحب المواسم والحلقات
```javascript
// السطر 600-650
const validSeasons = (series.seasons || []).filter(s => s.season_number > 0)

// سحب كل موسم بـ limiter منفصل
const seasonResults = await Promise.all(
  validSeasons.map(season =>
    seasonLimiter(async () => {
      const details = await fetchTMDB(`/tv/${id}/season/${season.season_number}`)
      return { season, details }
    })
  )
)

// إضافة الحلقات
for (const ep of details?.episodes || []) {
  insertEpisode.run(...)
  stats.episodes++
}
```

### ⚙️ الإعدادات:
```javascript
const CONCURRENCY = 50              // طلبات متزامنة للمسلسلات
const SEASON_CONCURRENCY = 10       // طلبات متزامنة للمواسم
const BATCH_SIZE = 200              // حجم الدفعة
const CHUNK_SIZE = 1000             // سحب من DB دفعة دفعة
```

### 🚨 المشاكل المعروفة:

| المشكلة | التأثير | الحل |
|--------|--------|------|
| ❌ لا يوجد `is_fetched` | قد تُسحب المسلسلات مرة أخرى | إضافة عمود `is_fetched` |
| ❌ المسلسلات المفلترة قد تُسحب مرة أخرى | إعادة سحب غير ضرورية | تحديث الشرط في SELECT |
| ❌ قد تحدث مشاكل في المواسم | بيانات ناقصة | التحقق من عدد المواسم |

---

## 🔄 sync-to-turso-optimized.js

### 📍 الموقع:
```
scripts/sync-to-turso-optimized.js
BACKUP/scripts/sync-to-turso-optimized.js.backup
```

### 🎯 الوظيفة الأساسية:
مزامنة الأفلام والمسلسلات المكتملة من قاعدة البيانات المحلية إلى Turso بشكل محسّن.

### 📥 المدخلات:
```javascript
// من قاعدة البيانات المحلية:
- جدول movies (الأفلام المكتملة)
- جدول tv_series (المسلسلات المكتملة)

// من Turso:
- بيانات الاتصال والمصادقة
```

### 📤 المخرجات:
```javascript
// في Turso:
- إدراج/تحديث الأفلام
- إدراج/تحديث المسلسلات
- تسجيل `synced_to_turso = 1` في قاعدة البيانات المحلية
```

### ⚙️ الإعدادات:
```javascript
const BATCH_SIZE = 50               // حجم الدفعة
const CONCURRENCY = 10              // طلبات متزامنة
```

---

## ⚡ sync-to-turso-ultra-fast.js

### 📍 الموقع:
```
scripts/sync-to-turso-ultra-fast.js
BACKUP/scripts/sync-to-turso-ultra-fast.js.backup
```

### 🎯 الوظيفة الأساسية:
مزامنة سريعة جداً إلى Turso بدون تحديثات معقدة.

### 📥 المدخلات:
```javascript
// من قاعدة البيانات المحلية:
- جدول movies (الأفلام المكتملة)
- جدول tv_series (المسلسلات المكتملة)
```

### 📤 المخرجات:
```javascript
// في Turso:
- إدراج الأفلام والمسلسلات
```

---

## 📦 sync-remaining-works.js

### 📍 الموقع:
```
sync-remaining-works.js
BACKUP/sync-remaining-works.js.backup
```

### 🎯 الوظيفة الأساسية:
مزامنة الأعمال المتبقية التي لم تُزامن بعد.

### 📥 المدخلات:
```javascript
// من قاعدة البيانات المحلية:
- الأفلام حيث is_complete = 1 و synced_to_turso = 0
- المسلسلات حيث is_complete = 1 و synced_to_turso = 0
```

### 📤 المخرجات:
```javascript
// في Turso:
- إدراج/تحديث الأعمال
- تسجيل synced_to_turso = 1
```

---

## ✅ check-turso-data.js

### 📍 الموقع:
```
scripts/check-turso-data.js
BACKUP/scripts/check-turso-data.js.backup
```

### 🎯 الوظيفة الأساسية:
فحص شامل لبيانات Turso والتحقق من الاكتمال.

### 📤 المخرجات:
```javascript
// تقرير شامل يتضمن:
- إجمالي الأفلام والمسلسلات
- عدد الأعمال المكتملة
- عدد الأعمال الناقصة
- نسبة الاكتمال
- عينات من الأعمال الناقصة
```

---

## 🔧 complete-missing-data.js

### 📍 الموقع:
```
complete-missing-data.js
BACKUP/complete-missing-data.js.backup
```

### 🎯 الوظيفة الأساسية:
إكمال البيانات الناقصة (أوصاف عربية، صور) من القاعدة المحلية أو AI.

### 🔄 الأولوية:
1. البحث في القاعدة المحلية
2. توليد بـ AI إذا لم توجد

### 📤 المخرجات:
```javascript
// تحديث Turso:
- overview_ar (الوصف العربي)
- poster_path (الصورة)
```

---

## 🚀 complete-all-missing-data.js

### 📍 الموقع:
```
complete-all-missing-data.js
BACKUP/complete-all-missing-data.js.backup
```

### 🎯 الوظيفة الأساسية:
إكمال جميع البيانات الناقصة بشكل شامل ومستمر.

### 🔄 الأولوية:
1. البحث في القاعدة المحلية
2. توليد بـ AI إذا لم توجد

### 📤 المخرجات:
```javascript
// تحديث Turso:
- جميع البيانات الناقصة
- تقرير شامل بالإحصائيات
```

---

## 📊 مقارنة الاسكريبتات

| الاسكريبت | النوع | السرعة | الاستخدام |
|----------|------|--------|----------|
| INGEST-MOVIES | سحب | متوسط | سحب الأفلام الجديدة |
| INGEST-SERIES | سحب | متوسط | سحب المسلسلات الجديدة |
| sync-optimized | مزامنة | سريع | مزامنة محسّنة |
| sync-ultra-fast | مزامنة | سريع جداً | مزامنة سريعة |
| sync-remaining | مزامنة | متوسط | مزامنة الأعمال المتبقية |
| check-turso | فحص | سريع | فحص البيانات |
| complete-missing | إكمال | بطيء | إكمال البيانات |
| complete-all | إكمال | بطيء | إكمال شامل |

---

## 🔗 العلاقات بين الاسكريبتات

```
INGEST-MOVIES ──┐
                ├──> قاعدة البيانات المحلية ──┐
INGEST-SERIES ──┤                              ├──> sync-* ──> Turso
                │                              │
                └──> complete-* ──────────────┘
                
check-turso ──> فحص Turso
```

---

## 💾 حجم الملفات

| الاسكريبت | الحجم | الأسطر |
|----------|-------|--------|
| INGEST-MOVIES | ~30KB | ~700 |
| INGEST-SERIES | ~35KB | ~800 |
| sync-optimized | ~15KB | ~350 |
| sync-ultra-fast | ~18KB | ~400 |
| sync-remaining | ~12KB | ~280 |
| check-turso | ~8KB | ~200 |
| complete-missing | ~10KB | ~250 |
| complete-all | ~12KB | ~300 |

---

**آخر تحديث:** 2026-05-03
