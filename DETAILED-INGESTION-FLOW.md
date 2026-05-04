# 🔍 تقرير شامل: آلية السحب والمعالجة والمزامنة

**التاريخ:** 2026-05-04  
**الحالة:** تحليل دقيق لكل خطوة

---

## 📋 جدول المحتويات

1. [الخطوة 1: السحب من TMDB](#الخطوة-1-السحب-من-tmdb)
2. [الخطوة 2: الفلترة والتصفية](#الخطوة-2-الفلترة-والتصفية)
3. [الخطوة 3: الترجمة والمعالجة](#الخطوة-3-الترجمة-والمعالجة)
4. [الخطوة 4: التسجيل في قاعدة البيانات](#الخطوة-4-التسجيل-في-قاعدة-البيانات)
5. [الخطوة 5: المزامنة إلى Turso](#الخطوة-5-المزامنة-إلى-turso)
6. [الخطوة 6: العرض في الموقع](#الخطوة-6-العرض-في-الموقع)

---

## الخطوة 1: السحب من TMDB

### 📌 الاسكريبتات المسؤولة:
- `scripts/INGEST-MOVIES-LOGIC.js` - سحب الأفلام
- `scripts/INGEST-SERIES-LOGIC.js` - سحب المسلسلات

### 🔄 آلية العمل:

#### أ) تحديد ما يتم سحبه:

```javascript
// من INGEST-MOVIES-LOGIC.js - السطر 685
const totalPending = db.prepare(`
  SELECT COUNT(*) as c FROM movies
  WHERE (
    is_fetched = 0                                       -- لم يُسحب بعد
    OR (is_fetched = 1 AND is_filtered = 0 AND (title_ar = 'TBD' OR title_ar IS NULL))   -- سُحب لكن بدون عربي
    OR (is_fetched = 1 AND is_filtered = 0 AND NOT EXISTS (SELECT 1 FROM cast_crew WHERE content_id = movies.id AND content_type = 'movie'))  -- سُحب لكن بدون ممثلين
  )
`).get().c
```

**معنى هذا:**
- ✅ الأفلام التي **لم تُسحب بعد** (`is_fetched = 0`)
- ✅ الأفلام التي **سُحبت لكن بدون عنوان عربي** (`title_ar = 'TBD'`)
- ✅ الأفلام التي **سُحبت لكن بدون ممثلين** (لا توجد في `cast_crew`)

#### ب) سحب البيانات من TMDB:

```javascript
// من INGEST-MOVIES-LOGIC.js - السطر 408
async function processMovie(id) {
  try {
    const movie = await fetchTMDB(`/movie/${id}`, {
      append_to_response: 'credits,translations,keywords,videos,release_dates'
    })
```

**البيانات المسحوبة:**
- ✅ `credits` - الممثلين والطاقم
- ✅ `translations` - الترجمات (بما فيها العربية)
- ✅ `keywords` - الكلمات المفتاحية
- ✅ `videos` - الفيديوهات (الـ trailers)
- ✅ `release_dates` - تواريخ الإصدار والتصنيفات العمرية

---

## الخطوة 2: الفلترة والتصفية

### 🚫 شروط الفلترة:

```javascript
// من INGEST-MOVIES-LOGIC.js - السطر 430
if (shouldFilterContent(movie)) {
  const reason = getFilterReason(movie)
  db.prepare(`
    UPDATE movies SET is_filtered = 1, filter_reason = ?, is_complete = 0 
    WHERE id = ?
  `).run(reason, id)
  stats.filtered++
  stats.fetched++
  return
}
```

**ماذا يحدث:**
1. ✅ يتم فحص المحتوى بـ `shouldFilterContent()`
2. ✅ إذا كان المحتوى غير مناسب:
   - `is_filtered = 1` - تم تصنيفه كمفلتر
   - `filter_reason` - السبب (مثل: low_votes, adult_content, إلخ)
   - `is_complete = 0` - لن يُعتبر مكتملاً
3. ✅ يتم تسجيل `stats.filtered++` - عداد المفلترة
4. ✅ يتم تسجيل `stats.fetched++` - عداد المسحوب

**النقطة المهمة:**
- ✅ **المفلترة تُسجل على أنها مسحوبة** (`is_fetched = 1` ضمنياً)
- ✅ لكن لا تُزامن إلى Turso (لأن `is_filtered = 1`)

---

## الخطوة 3: الترجمة والمعالجة

### 🌐 ترجمة العنوان:

```javascript
// من INGEST-MOVIES-LOGIC.js - السطر 437
const arTrans = movie.translations?.translations?.find(t => t.iso_639_1 === 'ar')
let title_ar    = arTrans?.data?.title   || null
let overview_ar = arTrans?.data?.overview || null

const rawTitle = movie.title || movie.original_title || ''
const isArabicTitle = /[\u0600-\u06FF]/.test(rawTitle)

let title_en
if (isArabicTitle) {
  title_ar = title_ar || rawTitle
  title_en = await translateWithCache(rawTitle, 'en') || rawTitle
} else {
  title_en = rawTitle
  if (!title_ar) {
    title_ar = await translateWithCache(title_en, 'ar') || 'TBD'
  }
}
```

**الخطوات:**
1. ✅ البحث عن ترجمة عربية من TMDB
2. ✅ إذا كان العنوان الأصلي عربياً:
   - استخدم العنوان العربي
   - ترجم إلى الإنجليزية
3. ✅ إذا كان العنوان الأصلي إنجليزياً:
   - استخدم العنوان الإنجليزي
   - ترجم إلى العربية (أو ضع `TBD`)

### 🛡️ حماية الترجمات الموجودة:

```javascript
// من INGEST-MOVIES-LOGIC.js - السطر 455
const existing = db.prepare(
  'SELECT title_ar, overview_ar, has_arabic_title, has_arabic_overview FROM movies WHERE id = ?'
).get(id)

if (existing?.has_arabic_title === 1 && existing?.title_ar && existing.title_ar !== 'TBD') {
  title_ar = existing.title_ar  // لا تكتب فوق ترجمة موجودة
}
```

**المعنى:**
- ✅ إذا كانت هناك ترجمة عربية موجودة بالفعل
- ✅ لا تكتب فوقها (احم البيانات الموجودة)

### 🤖 توليد الأوصاف بـ AI:

```javascript
// من INGEST-MOVIES-LOGIC.js - السطر 470
if (!overview_ar) {
  overview_ar = await generateOverviewWithGroq(title_ar, title_en, release_year)
}
```

**الخطوات:**
1. ✅ إذا لم يكن هناك وصف عربي
2. ✅ حاول الترجمة من الإنجليزية
3. ✅ إذا فشلت الترجمة، استخدم Groq لتوليد وصف

---

## الخطوة 4: التسجيل في قاعدة البيانات

### 📝 تحديث البيانات:

```javascript
// من INGEST-MOVIES-LOGIC.js - السطر 510
const isComplete = (
  title_ar && title_ar !== 'TBD' &&
  title_en && overview_ar && movie.poster_path &&
  movie.credits?.cast?.length > 0 &&
  movie.genres?.length > 0
) ? 1 : 0

db.prepare(`
  UPDATE movies SET
    title_ar = ?, title_en = ?, title_original = ?, slug = ?,
    overview_ar = ?, overview_en = ?,
    ...
    is_complete = ?, sync_priority = ?,
    is_fetched = 1, fetched_at = datetime('now'), fetched_from = 'tmdb',
    updated_at = datetime('now')
  WHERE id = ?
`).run(...)
```

### ✅ شروط الاكتمال (`is_complete = 1`):

```
✅ title_ar موجود وليس 'TBD'
✅ title_en موجود
✅ overview_ar موجود
✅ poster_path موجود
✅ cast موجود (ممثلين)
✅ genres موجود (أنواع)
```

### 🏷️ الأعلام المهمة:

| العلم | المعنى | متى يُضبط |
|------|--------|----------|
| `is_fetched = 1` | تم السحب من TMDB | دائماً بعد المعالجة |
| `is_filtered = 1` | تم تصفيته (غير مناسب) | عند الفلترة |
| `is_complete = 1` | مكتمل وجاهز للعرض | عند توفر جميع البيانات |
| `has_arabic_title = 1` | يوجد عنوان عربي | عند توفر العنوان العربي |
| `has_arabic_overview = 1` | يوجد وصف عربي | عند توفر الوصف العربي |

---

## الخطوة 5: المزامنة إلى Turso

### 📤 اسكريبت المزامنة:

**الملف:** `sync-remaining-works.js`

### 🔍 شروط المزامنة:

```javascript
// من sync-remaining-works.js - السطر 18
const movies = db.prepare(`
  SELECT id FROM movies 
  WHERE is_complete = 1 AND is_filtered = 0 
  AND (synced_to_turso = 0 OR synced_to_turso IS NULL)
  ORDER BY vote_count DESC, id ASC
`).all();
```

**معنى هذا:**
- ✅ `is_complete = 1` - مكتمل فقط
- ✅ `is_filtered = 0` - غير مفلتر
- ✅ `synced_to_turso = 0` - لم يُزامن بعد

### 📊 النتيجة:

```
القاعدة المحلية:
├─ أفلام: 1,128,834
├─ مسلسلات: 220,317
└─ إجمالي: 1,349,151

المزامنة إلى Turso:
├─ أفلام مكتملة: ~293
├─ مسلسلات مكتملة: ~0-50
└─ إجمالي المزامن: ~293-343

الأعمال الناقصة (لم تُزامن):
├─ بدون وصف عربي: 3,946
├─ بدون صورة: 29,626
├─ بدون ممثلين: 25,763
└─ إجمالي الناقصة: 35,567
```

---

## الخطوة 6: العرض في الموقع

### 🌐 كيفية العرض:

```
الموقع (cinma.online)
    ↓
يسحب البيانات من Turso
    ↓
يعرض فقط الأعمال المكتملة
    ↓
(الأعمال الناقصة لا تظهر)
```

---

## 🔄 الدورة الكاملة: من الإضافة إلى العرض

### مثال: فيلم جديد

```
1️⃣ إضافة ID جديد إلى القاعدة المحلية
   └─ is_fetched = 0
   └─ is_filtered = 0
   └─ is_complete = 0

2️⃣ تشغيل INGEST-MOVIES-LOGIC.js
   ├─ سحب البيانات من TMDB
   ├─ فحص الفلترة
   ├─ ترجمة العنوان والوصف
   ├─ توليد الأوصاف بـ AI
   └─ تحديث القاعدة المحلية
      └─ is_fetched = 1
      └─ is_filtered = 0 أو 1 (حسب الفلترة)
      └─ is_complete = 0 أو 1 (حسب الاكتمال)

3️⃣ إذا كان is_complete = 1:
   └─ تشغيل sync-remaining-works.js
      ├─ سحب البيانات من القاعدة المحلية
      ├─ إدراج في Turso
      └─ تحديث synced_to_turso = 1

4️⃣ الموقع يعرض البيانات من Turso
   └─ يظهر الفيلم في الموقع
```

---

## ⚠️ المشاكل المكتشفة

### 1️⃣ المفلترة لا تُسجل بشكل صحيح:

**المشكلة:**
- الأعمال المفلترة تُسجل على أنها مسحوبة (`is_fetched = 1`)
- لكن لا يوجد علم واضح يقول "تم السحب والفلترة"

**الحل المقترح:**
- إضافة عمود `is_fetched_and_filtered` أو تحسين التسجيل

### 2️⃣ عدد الأعمال المزامنة قليل جداً:

**السبب:**
- فقط الأعمال **المكتملة والغير مفلترة** تُزامن
- معظم الأعمال ناقصة (بدون وصف عربي أو صور)

**الحل:**
- إكمال البيانات الناقصة أولاً
- ثم إعادة المزامنة

---

## 📊 الإحصائيات الحالية

### من آخر تشغيل:

```
الأفلام:
├─ مسحوب: X
├─ مكتمل: X
├─ مفلتر: X
├─ غير موجود: X
└─ أخطاء: X

المسلسلات:
├─ مسحوب: X
├─ مكتمل: X
├─ مفلتر: X
├─ غير موجود: X
└─ أخطاء: X

Turso:
├─ أفلام مزامنة: ~293
├─ مسلسلات مزامنة: ~0-50
└─ إجمالي: ~293-343
```

---

## 🎯 الخطوات التالية

### 1️⃣ إكمال البيانات الناقصة:
```bash
node complete-all-missing-data.js
```

### 2️⃣ إعادة المزامنة:
```bash
node sync-remaining-works.js
```

### 3️⃣ التحقق من النتائج:
```bash
node check-turso-completeness.js
```

---

**آخر تحديث:** 2026-05-04
