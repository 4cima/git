# 🚨 المشاكل المكتشفة في الاسكريبتات

**تاريخ الكشف:** 2026-05-03  
**الإصدار:** 1.0  
**الحالة:** ✅ توثيق شامل

---

## 🔴 المشاكل الحرجة

### المشكلة 1: عدم وجود علامة "تم السحب" (is_fetched)

#### 📍 الموقع:
- `INGEST-MOVIES-LOGIC.js` - السطر 550-600
- `INGEST-SERIES-LOGIC.js` - السطر 600-650

#### ❌ المشكلة:
```javascript
// الآن: لا يوجد عمود is_fetched
db.prepare(`
  UPDATE movies SET
    title_ar = ?, overview_ar = ?, ...
    // ❌ لا يوجد: is_fetched = 1
    // ❌ لا يوجد: fetched_at = datetime('now')
    // ❌ لا يوجد: fetched_from = 'tmdb'
  WHERE id = ?
`).run(...)
```

#### 🔍 التأثير:
- **الأعمال المفلترة قد تُسحب مرة أخرى** ❌
- **لا يمكن معرفة متى تم السحب** ❌
- **لا يمكن تتبع مصدر البيانات** ❌

#### 📊 الحالة الحالية:
```sql
-- الآن:
SELECT * FROM movies WHERE overview_en IS NULL AND is_filtered = 0

-- المشكلة: إذا كان:
-- is_filtered = 1 (مفلتر)
-- overview_en = NULL (لم يُسحب)
-- قد يُسحب مرة أخرى!
```

#### ✅ الحل المقترح:
```javascript
// إضافة الأعمدة:
ALTER TABLE movies ADD COLUMN is_fetched INTEGER DEFAULT 0;
ALTER TABLE movies ADD COLUMN fetched_at DATETIME;
ALTER TABLE movies ADD COLUMN fetched_from TEXT;

// التحديث:
db.prepare(`
  UPDATE movies SET
    is_fetched = 1,
    fetched_at = datetime('now'),
    fetched_from = 'tmdb',
    ...
  WHERE id = ?
`).run(...)

// التحديد:
SELECT * FROM movies WHERE is_fetched = 0
```

---

### المشكلة 2: الأعمال المفلترة قد تُسحب مرة أخرى

#### 📍 الموقع:
- `INGEST-MOVIES-LOGIC.js` - السطر 674-680
- `INGEST-SERIES-LOGIC.js` - السطر 778-785

#### ❌ المشكلة:
```javascript
// الآن:
const totalPending = db.prepare(`
  SELECT COUNT(*) as c FROM movies
  WHERE (
    (overview_en IS NULL AND is_filtered = 0)           // ✅ صحيح
    OR (overview_en IS NOT NULL AND title_ar = 'TBD')   // ⚠️ مشكلة
    OR (NOT EXISTS cast_crew)                            // ⚠️ مشكلة
  )
`).get().c

// المشكلة:
// إذا كان:
// - is_filtered = 1 (مفلتر)
// - overview_en IS NOT NULL (سُحب)
// - title_ar = 'TBD' (بدون عربي)
// قد يُسحب مرة أخرى!
```

#### 🔍 التأثير:
- **إعادة سحب غير ضرورية** ❌
- **استهلاك API غير ضروري** ❌
- **بطء الاسكريبت** ❌

#### ✅ الحل المقترح:
```javascript
// يجب أن يكون:
const totalPending = db.prepare(`
  SELECT COUNT(*) as c FROM movies
  WHERE (
    is_fetched = 0                                       // ✅ لم يُسحب بعد
    OR (is_fetched = 1 AND is_filtered = 0 AND title_ar = 'TBD')  // ✅ سُحب لكن بدون عربي
    OR (is_fetched = 1 AND is_filtered = 0 AND NOT EXISTS cast_crew)  // ✅ سُحب لكن بدون ممثلين
  )
`).get().c
```

---

### المشكلة 3: عدم التمييز بين "مسحوب" و"مكتمل"

#### 📍 الموقع:
- `INGEST-MOVIES-LOGIC.js` - السطر 30-40
- `INGEST-SERIES-LOGIC.js` - السطر 30-40

#### ❌ المشكلة:
```javascript
// الآن:
const stats = {
  movies: 0,      // يعني "مسحوب ومكتمل"
  errors: 0,
  filtered: 0,    // يعني "مسحوب لكن مفلتر"
  cast: 0,
  translated: 0,
  groq_generated: 0,
  not_found: 0,
  start: Date.now()
}

// المشكلة:
// stats.movies + stats.filtered + stats.not_found ≠ إجمالي المسحوب
// لا يوجد عداد للأعمال المسحوبة الكلي
```

#### 🔍 التأثير:
- **صعوبة في التتبع** ❌
- **عدم معرفة الإحصائيات الدقيقة** ❌
- **صعوبة في التصحيح** ❌

#### ✅ الحل المقترح:
```javascript
// يجب أن يكون:
const stats = {
  fetched: 0,           // ✅ إجمالي المسحوب
  complete: 0,          // ✅ المسحوب والمكتمل
  filtered: 0,          // ✅ المسحوب والمفلتر
  not_found: 0,         // ✅ المسحوب لكن غير موجود
  errors: 0,            // ✅ الأخطاء
  cast: 0,
  translated: 0,
  groq_generated: 0,
  start: Date.now()
}

// الحساب:
// stats.fetched = stats.complete + stats.filtered + stats.not_found
```

---

## 🟡 المشاكل المتوسطة

### المشكلة 4: عدم وجود حماية من الـ Duplicate

#### 📍 الموقع:
- `INGEST-MOVIES-LOGIC.js` - السطر 550-600
- `INGEST-SERIES-LOGIC.js` - السطر 600-650

#### ⚠️ المشكلة:
```javascript
// الآن:
db.prepare(`
  UPDATE movies SET
    title_ar = ?, overview_ar = ?, ...
  WHERE id = ?
`).run(...)

// المشكلة:
// إذا تم تشغيل الاسكريبت مرتين في نفس الوقت
// قد يحدث تحديث مزدوج
```

#### ✅ الحل المقترح:
```javascript
// إضافة فحص:
const existing = db.prepare(
  'SELECT is_fetched FROM movies WHERE id = ?'
).get(id)

if (existing?.is_fetched === 1) {
  console.log(`⏭️ تم سحب هذا العمل بالفعل: ${id}`)
  return
}
```

---

### المشكلة 5: عدم وجود Timeout للـ API

#### 📍 الموقع:
- `INGEST-MOVIES-LOGIC.js` - السطر 84-113
- `INGEST-SERIES-LOGIC.js` - السطر 88-117

#### ⚠️ المشكلة:
```javascript
// الآن:
async function fetchTMDB(endpoint, params = {}, retries = 3) {
  // ...
  const res = await fetch(url.toString())
  // ❌ لا يوجد timeout
}

// المشكلة:
// قد يتعلق الاسكريبت إذا كان الاتصال بطيء
```

#### ✅ الحل المقترح:
```javascript
// إضافة timeout:
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 30000) // 30 ثانية

try {
  const res = await fetch(url.toString(), { signal: controller.signal })
  clearTimeout(timeout)
  // ...
} catch (e) {
  if (e.name === 'AbortError') {
    console.error('⏱️ Timeout: الطلب استغرق وقتاً طويلاً')
  }
}
```

---

### المشكلة 6: عدم وجود Rollback في حالة الخطأ

#### 📍 الموقع:
- `INGEST-MOVIES-LOGIC.js` - السطر 550-600
- `INGEST-SERIES-LOGIC.js` - السطر 600-650

#### ⚠️ المشكلة:
```javascript
// الآن:
try {
  db.prepare(`UPDATE movies SET ...`).run(...)
  db.prepare(`INSERT INTO cast_crew ...`).run(...)
  db.prepare(`INSERT INTO content_genres ...`).run(...)
} catch (e) {
  console.error(e)
  // ❌ قد تكون بعض البيانات محدثة وبعضها لا
}

// المشكلة:
// قد يحدث تحديث جزئي في حالة الخطأ
```

#### ✅ الحل المقترح:
```javascript
// استخدام Transaction:
try {
  db.exec('BEGIN TRANSACTION')
  
  db.prepare(`UPDATE movies SET ...`).run(...)
  db.prepare(`INSERT INTO cast_crew ...`).run(...)
  db.prepare(`INSERT INTO content_genres ...`).run(...)
  
  db.exec('COMMIT')
} catch (e) {
  db.exec('ROLLBACK')
  console.error(e)
}
```

---

## 🟢 المشاكل البسيطة

### المشكلة 7: عدم وجود Logging مفصل

#### 📍 الموقع:
- جميع الاسكريبتات

#### 🟢 المشكلة:
```javascript
// الآن:
console.log(`✅ ${stats.movies} | 🎭 ${stats.cast} | ...`)

// المشكلة:
// لا يوجد تفاصيل عن كل عمل
// صعوبة في التصحيح
```

#### ✅ الحل المقترح:
```javascript
// إضافة logging:
if (process.env.DEBUG) {
  console.log(`[${id}] سحب الفيلم: ${title_en}`)
  console.log(`[${id}] ترجمة: ${title_ar}`)
  console.log(`[${id}] ممثلين: ${castList.length}`)
}
```

---

### المشكلة 8: عدم وجود Progress Bar

#### 📍 الموقع:
- جميع الاسكريبتات

#### 🟢 المشكلة:
```javascript
// الآن:
console.log(`⏳ ${totalProcessed}/${totalPending} (${progress}%)`)

// المشكلة:
// لا يوجد تصور بصري للتقدم
```

#### ✅ الحل المقترح:
```javascript
// استخدام مكتبة progress:
const ProgressBar = require('progress')
const bar = new ProgressBar(':bar :percent :etas', {
  total: totalPending,
  width: 30
})

// في الحلقة:
bar.tick()
```

---

## 📊 ملخص المشاكل

| المشكلة | الخطورة | التأثير | الحل |
|--------|--------|--------|------|
| عدم وجود `is_fetched` | 🔴 حرج | إعادة سحب | إضافة عمود |
| إعادة سحب الأعمال المفلترة | 🔴 حرج | استهلاك API | تحديث الشرط |
| عدم التمييز بين مسحوب/مكتمل | 🔴 حرج | صعوبة التتبع | إضافة عدادات |
| عدم وجود حماية من Duplicate | 🟡 متوسط | تحديث مزدوج | إضافة فحص |
| عدم وجود Timeout | 🟡 متوسط | تعليق الاسكريبت | إضافة timeout |
| عدم وجود Rollback | 🟡 متوسط | تحديث جزئي | استخدام Transaction |
| عدم وجود Logging | 🟢 بسيط | صعوبة التصحيح | إضافة logging |
| عدم وجود Progress Bar | 🟢 بسيط | عدم معرفة التقدم | إضافة progress bar |

---

## 🔧 أولويات الإصلاح

### المرحلة 1: الحرجة (يجب إصلاحها الآن)
1. ✅ إضافة عمود `is_fetched`
2. ✅ تحديث شرط التحديد
3. ✅ إضافة عدادات صحيحة

### المرحلة 2: المتوسطة (يجب إصلاحها قريباً)
4. ⏳ إضافة حماية من Duplicate
5. ⏳ إضافة Timeout
6. ⏳ استخدام Transaction

### المرحلة 3: البسيطة (يمكن إصلاحها لاحقاً)
7. ⏳ إضافة Logging
8. ⏳ إضافة Progress Bar

---

**آخر تحديث:** 2026-05-03
