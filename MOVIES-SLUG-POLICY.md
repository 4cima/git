# 🎬 سياسة Slugs الأفلام النهائية

## 📋 السياسة المؤكدة

### ترتيب المحاولات:

```
1️⃣ base                          (spider-man)
2️⃣ base-year                     (spider-man-2021)
3️⃣ base-year-genre               (spider-man-2021-action)
4️⃣ base-year-genre-2, ..., -999  (spider-man-2021-action-2)
```

### ⚠️ قواعد صارمة غير قابلة للتعديل:

1. **صفر IDs في أي slug** - نهائي، لا نقاش، لا استثناءات
2. **الslug دايماً إنجليزي نظيف فقط** - مش عربي، مش صيني، مش كوري، مش أي لغة في الدنيا غير إنجليزي
3. **Turso هي مصدر الحقيقة الوحيد** - كل الslugs الموجودة تُجلب منها

---

## 🔧 التنفيذ التقني

### ⚠️ القواعد الحتمية (Deterministic):

1. **الترتيب الثابت:** كل استعلام يستخدم `ORDER BY tmdb_id ASC`
2. **الربط الصحيح:** الربط بين المحلي وTurso يتم حصرياً عبر `tmdb_id` (ليس `id`)
3. **Idempotency:** إعادة تشغيل السكريبت تُعطي نفس النتيجة بالضبط

### 1️⃣ تنظيف النص (toSlug):

```javascript
function toSlug(text) {
  return text.toString().toLowerCase()
    .normalize('NFD')                      // تفكيك الأحرف المركبة
    .replace(/[\u0300-\u036f]/g, '')       // إزالة diacritics
    .replace(/[\u0600-\u06FF]/g, '')       // إزالة العربي
    .replace(/[\u4E00-\u9FFF]/g, '')       // إزالة الصيني
    .replace(/[\u3040-\u309F\u30A0-\u30FF]/g, '')  // إزالة الياباني
    .replace(/[\uAC00-\uD7AF]/g, '')       // إزالة الكوري
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    // ... باقي التحويلات
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/[\s_]+/g, '-')
    .trim()
}
```

### 2️⃣ حماية التصادم الذاتي (Self-Collision):

```javascript
// حذف slug الفيلم الحالي قبل الحساب
const currentSlug = idToSlug.get(movie.id)
if (currentSlug) {
  slugMap.delete(currentSlug)  // ← الحماية
}

// حساب slug جديد
const newSlug = generateUniqueSlug(...)

// لو مفيش تغيير، أرجع الslug القديم للMap
if (currentSlug === newSlug) {
  slugMap.set(currentSlug, { id: movie.id, tmdb_id: movie.tmdb_id })
}
```

### 3️⃣ استراتيجية الفشل:

- لو `generateUniqueSlug()` رجع `null` → الفيلم يدخل قائمة `unresolved`
- **مفيش استخدام لـ `Date.now()` أو أي IDs**
- القائمة تُحفظ في `unresolved-movies-slugs.json` للمراجعة اليدوية

---

## 🚀 خطوات التنفيذ

### المرحلة 1: جلب البيانات من Turso

```javascript
// جلب بـ chunks (10,000 صف لكل مرة) لتجنب Resource exhausted
const slugMap = new Map()      // slug → {tmdb_id}
const tmdbToSlug = new Map()   // tmdb_id → slug

let offset = 0
while (true) {
  const result = await turso.execute({
    sql: 'SELECT tmdb_id, slug FROM movies ORDER BY tmdb_id ASC LIMIT 10000 OFFSET ?',
    args: [offset]
  })
  
  if (result.rows.length === 0) break
  
  result.rows.forEach(row => {
    slugMap.set(row.slug, { tmdb_id: row.tmdb_id })
    tmdbToSlug.set(row.tmdb_id, row.slug)
  })
  
  offset += 10000
}
```

**التعقيد:** O(n) - ~13-15 ثانية لجلب 134,252 فيلم

**الترتيب الحتمي:** `ORDER BY tmdb_id ASC` يضمن نفس النتيجة في كل مرة

---

### المرحلة 2: معالجة في الذاكرة

```javascript
// قراءة من المحلي بنفس الترتيب
const movies = localDb.prepare(`
  SELECT tmdb_id, title_en, release_year, primary_genre
  FROM movies
  WHERE id = tmdb_id
  ORDER BY tmdb_id ASC
`).all()

for (const movie of movies) {
  // 1. حذف الslug الحالي (حماية self-collision)
  const currentSlug = tmdbToSlug.get(movie.tmdb_id)
  if (currentSlug) slugMap.delete(currentSlug)
  
  // 2. حساب slug جديد
  const newSlug = generateUniqueSlug(
    movie.title_en,
    movie.release_year,
    movie.primary_genre,
    slugMap
  )
  
  // 3. تسجيل التحديث أو الفشل
  if (!newSlug) {
    unresolved.push(movie)
  } else if (currentSlug !== newSlug) {
    updates.push({ tmdb_id, oldSlug: currentSlug, newSlug })
    slugMap.set(newSlug, { tmdb_id: movie.tmdb_id })
    tmdbToSlug.set(movie.tmdb_id, newSlug)
  } else {
    // أرجع الslug القديم
    slugMap.set(currentSlug, { tmdb_id: movie.tmdb_id })
  }
}
```

**التعقيد:** O(n) - كل عملية `Map.has()` = O(1)  
**الوقت المتوقع:** ~30-60 ثانية للمعالجة الكاملة  
**الترتيب الحتمي:** `ORDER BY tmdb_id ASC` في القراءة والمعالجة

---

### المرحلة 3: تطبيق التحديثات على Turso

```javascript
// دفعات 500 تحديث متوازي
for (let i = 0; i < updates.length; i += 500) {
  const batch = updates.slice(i, i + 500)
  
  const results = await Promise.allSettled(
    batch.map(u =>
      turso.execute({
        sql: 'UPDATE movies SET slug = ? WHERE tmdb_id = ?',
        args: [u.newSlug, u.tmdb_id]
      })
    )
  )
  
  // جمع الفاشل
  results.forEach((r, idx) => {
    if (r.status === 'rejected') {
      failedUpdates.push(batch[idx])
    }
  })
}

// Retry تسلسلي للفاشل (تجنب UNIQUE constraint conflict)
for (const u of failedUpdates) {
  try {
    await turso.execute({
      sql: 'UPDATE movies SET slug = ? WHERE tmdb_id = ?',
      args: [u.newSlug, u.tmdb_id]
    })
  } catch (e) {
    console.log(`❌ فشل نهائي: ${u.tmdb_id}`)
  }
}
```

**الوقت المتوقع:** 5-10 دقائق (حسب latency مع Turso)

**الربط الصحيح:** `WHERE tmdb_id = ?` (ليس `id`)

---

## 🧪 وضع Dry-Run (قراءة فقط)

### الاستخدام:

```bash
# تشغيل في وضع قراءة فقط (بدون UPDATE)
node rebuild-movies-slugs.js --dry-run
```

### ما يفعله:

1. ✅ يجلب كل البيانات من Turso
2. ✅ يحسب كل الslugs الجديدة
3. ✅ يطبع تقرير شامل:
   - عدد الأفلام المتغير slugها
   - عدد الأفلام الثابتة
   - عدد الunresolved
   - عينة 20 فيلم من كل فئة
4. ❌ **لا ينفذ أي UPDATE على Turso**

### مثال التقرير:

```
📊 تقرير العينات
═══════════════════════════════════════════════════════════════

✏️  عينة من الأفلام المتغير slugها (أول 20 من 45,123):
   [550] fight-club-724606 → fight-club-1999
   [13] forrest-gump-13 → forrest-gump-1994
   ...

⚠️  عينة من الأفلام غير المحلولة (أول 20 من 87):
   [422] "8½" - حالياً: 8-1963
   [2721] "Z" - حالياً: z-1969
   ...

═══════════════════════════════════════════════════════════════
📈 الملخص:
   إجمالي:       134,252
   ✏️  محدّث:     45,123 (33.60%)
   ✓  ثابت:      89,042 (66.33%)
   ⚠️  unresolved: 87 (0.06%)
═══════════════════════════════════════════════════════════════
```

---

## 📊 التقدير الزمني الكامل

| المرحلة | الوقت المتوقع | السبب |
|---------|---------------|-------|
| **1. جلب Turso** | 13-15 ثانية | 134K صف × 3 أعمدة، chunks 10K |
| **2. معالجة ذاكرة** | 30-60 ثانية | O(n) مع Map lookups |
| **3. تطبيق Turso** | 5-10 دقائق | ~268 batch × latency |
| **إجمالي** | **6-12 دقيقة** | بدون تأخيرات شبكة |

---

## ✅ معايير النجاح

### فحص نهائي بعد التنفيذ:

```sql
-- 1. لا يوجد slugs بصيغة title-{رقم كبير}
SELECT COUNT(*) FROM movies 
WHERE slug REGEXP '-[0-9]{5,}$'
AND id NOT IN (SELECT tmdb_id FROM unresolved_movies_slugs);
-- المتوقع: 0

-- 2. كل الslugs فريدة
SELECT slug, COUNT(*) as cnt 
FROM movies 
GROUP BY slug 
HAVING cnt > 1;
-- المتوقع: 0 صف

-- 3. كل الslugs إنجليزي نظيف (مفيش أحرف عربية/صينية/كورية)
SELECT COUNT(*) FROM movies
WHERE slug REGEXP '[\u0600-\u06FF\u4E00-\u9FFF\uAC00-\uD7AF]';
-- المتوقع: 0
```

---

## 🔒 الضمانات

### ✅ ما يضمنه السكريبت:

1. **صفر IDs** - مستحيل وجود ID في الslug
2. **فرادة تامة** - كل slug فريد 100%
3. **إنجليزي فقط** - تنظيف صارم للغات الأخرى
4. **Idempotency** - لو اتشغل مرتين يدي نفس النتيجة
5. **حماية self-collision** - الفيلم مش هيتصادم مع نفسه

### ⚠️ الحالات الخاصة:

- **عنوان غير إنجليزي تماماً:** يدخل `unresolved` (مثال: فيلم صيني بدون ترجمة)
- **تصادم 999 مرة:** يدخل `unresolved` (احتمال 0.001%)

---

## 📝 الملفات الناتجة

1. **`unresolved-movies-slugs.json`** - قائمة الأفلام اللي مش قادرة تاخد slug
2. **Log في الكونسول** - تقرير مفصل عن كل مرحلة

---

## ⚡ أمثلة واقعية

### مثال 1: Spider-Man

```
Title: "Spider-Man: No Way Home"
Year: 2021
Genre: "Action"

المحاولات:
✅ spider-man-no-way-home           (متاح)
→ النتيجة: spider-man-no-way-home
```

### مثال 2: Helen (التصادم الأصلي)

```
Title: "Helen"
Year: 2009
Genre: "Drama"

المحاولات:
❌ helen                            (محجوز لـ Helen 2008)
✅ helen-2009                       (متاح)
→ النتيجة: helen-2009
```

### مثال 3: عنوان عربي

```
Title: "الفيل الأزرق"
Year: 2014
Genre: "Thriller"

المعالجة:
toSlug("الفيل الأزرق") → "" (فاضي بعد الفلترة)
→ النتيجة: null → يدخل unresolved
```

---

## 🚫 ما لا يُسمح به أبداً

❌ `spider-man-1234567` (ID)  
❌ `الرجل-العنكبوت` (عربي)  
❌ `蜘蛛侠` (صيني)  
❌ `스파이더맨` (كوري)  
❌ `spider-man-1734567890123` (timestamp)

---

## ✅ ما يُسمح به

✅ `spider-man`  
✅ `spider-man-2021`  
✅ `spider-man-2021-action`  
✅ `spider-man-2021-action-2`

---

**تحذير نهائي:** هذه السياسة **مغلقة ونهائية**. أي تعديل مستقبلي يجب أن يتبع نفس القواعد الصارمة.
