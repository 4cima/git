# 🔧 إصلاح مشكلة content_genres

## المشكلة
```
SQLITE_UNKNOWN: SQLite error: no such table: content_genres
```

## السبب
الكود كان يحاول استخدام جدول `content_genres` الذي لا يوجد في قاعدة البيانات.

## البنية الفعلية
البيانات مخزنة في حقل `genres_json` داخل جداول:
- `movies` - حقل `genres_json`
- `tv_series` - حقل `genres_json`

مثال:
```json
{
  "genres": [
    { "id": 28, "name": "Action", "slug": "action", "name_ar": "أكشن" },
    { "id": 53, "name": "Thriller", "slug": "thriller", "name_ar": "إثارة" }
  ]
}
```

## الحل المطبق

### 1. src/app/page.tsx ✅
**قبل:**
```sql
SELECT g.id, g.slug, g.name_ar, g.name_en,
  COUNT(DISTINCT cg.content_id) as total_count
FROM genres g
LEFT JOIN content_genres cg ON g.id = cg.genre_id
```

**بعد:**
```sql
SELECT id, tmdb_id, slug, name_ar, name_en
FROM genres
WHERE id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12)
ORDER BY id ASC
LIMIT 12
```

**التغيير:** جلب التصنيفات بدون العدادات (لن تظهر في الصفحة الرئيسية)

---

### 2. src/app/api/genres/route.ts ✅
**قبل:**
```sql
SELECT g.*,
  (SELECT COUNT(*) FROM content_genres cg 
   WHERE cg.genre_id = g.id AND cg.content_type = 'movie') as movie_count
FROM genres g
```

**بعد:**
```sql
SELECT id, tmdb_id, slug, name_ar, name_en
FROM genres
ORDER BY name_ar ASC
```

**التغيير:** 
- جلب التصنيفات بدون العدادات
- العدادات تُرجع بقيمة 0 مؤقتاً
- TODO: حساب العدادات من genres_json

---

### 3. src/app/api/genres/[slug]/route.ts ✅
**قبل:**
```sql
SELECT m.*, 'movie' as media_type
FROM movies m
JOIN content_genres cg ON m.id = cg.content_id
WHERE cg.genre_id = ?
```

**بعد:**
```sql
SELECT *, 'movie' as media_type
FROM movies
WHERE genres_json LIKE '%"slug":"' || ? || '"%'
ORDER BY popularity DESC
LIMIT ? OFFSET ?
```

**التغيير:**
- استخدام `LIKE` للبحث في `genres_json`
- البحث بـ `slug` بدلاً من `id`
- نفس المنطق للمسلسلات

---

## التأثير

### ✅ ما يعمل الآن:
1. **الصفحة الرئيسية** - تعرض 12 تصنيف (بدون عدادات)
2. **صفحة التصنيفات** `/genres` - تعرض كل التصنيفات
3. **صفحة تصنيف معين** `/genres/[slug]` - تعرض المحتوى بشكل صحيح

### ⚠️ ما لا يعمل:
1. **عدادات التصنيفات** - تظهر 0 حالياً
   - في GenresQuickAccess (الصفحة الرئيسية)
   - في صفحة /genres

---

## الحل الكامل (TODO)

### خيار 1: إنشاء جدول content_genres
```sql
CREATE TABLE content_genres (
  content_id INTEGER NOT NULL,
  content_type TEXT NOT NULL, -- 'movie' or 'tv'
  genre_id INTEGER NOT NULL,
  PRIMARY KEY (content_id, content_type, genre_id)
);

-- Fill from movies
INSERT INTO content_genres (content_id, content_type, genre_id)
SELECT 
  m.id,
  'movie',
  json_extract(value, '$.id')
FROM movies m,
  json_each(json_extract(m.genres_json, '$.genres'))
WHERE m.genres_json IS NOT NULL;

-- Fill from tv_series
INSERT INTO content_genres (content_id, content_type, genre_id)
SELECT 
  s.id,
  'tv',
  json_extract(value, '$.id')
FROM tv_series s,
  json_each(json_extract(s.genres_json, '$.genres'))
WHERE s.genres_json IS NOT NULL;
```

### خيار 2: حساب العدادات ديناميكياً
```sql
-- In /api/genres
SELECT 
  g.*,
  (SELECT COUNT(*) FROM movies 
   WHERE genres_json LIKE '%"id":' || g.tmdb_id || ',%') as movie_count,
  (SELECT COUNT(*) FROM tv_series 
   WHERE genres_json LIKE '%"id":' || g.tmdb_id || ',%') as series_count
FROM genres g
```

⚠️ **تحذير:** الخيار 2 بطيء للغاية مع 177K+ سجل

---

## التوصية

### للاستخدام الفوري: ✅
- استخدام الحل الحالي (بدون عدادات)
- الموقع يعمل بشكل كامل
- العدادات ليست ضرورية للوظيفة

### للتحسين المستقبلي: 🔄
1. إنشاء جدول `content_genres` (الخيار 1)
2. ملء الجدول من `genres_json`
3. تحديث الكود لاستخدام الجدول الجديد
4. إضافة trigger لمزامنة البيانات

---

## الملفات المعدّلة
- ✅ `src/app/page.tsx`
- ✅ `src/app/api/genres/route.ts`
- ✅ `src/app/api/genres/[slug]/route.ts`

## الحالة
✅ **الموقع يعمل الآن بدون أخطاء**
⚠️ العدادات تحتاج تحسين مستقبلاً
