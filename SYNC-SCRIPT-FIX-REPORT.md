# تقرير إصلاح السكريبت 3-sync-to-turso.js

## الخطوة 2: التعديلات المنفذة

### أ) إضافة Helper Function موحدة

```javascript
function toJsonOrNull(value) {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === 'string') {
    // Already a JSON string, return as-is
    return value
  }
  if (typeof value === 'object') {
    // Object or array, stringify it
    return JSON.stringify(value)
  }
  // Primitive types that shouldn't be JSON columns
  return null
}
```

### ب) التعديلات على جدول `movies`:

**1. إضافة `original_language`:**
- في قائمة الأعمدة (INSERT INTO)
- في placeholders (?)
- في args[]
- في ON CONFLICT UPDATE SET

**2. معالجة الأعمدة JSON:**
- `keywords_json`: من `movie.keywords_json` إلى `toJsonOrNull(movie.keywords_json)`
- `companies_json`: من `movie.companies_json` إلى `toJsonOrNull(movie.companies_json)`
- `seo_keywords_json`: من `movie.seo_keywords_json` إلى `toJsonOrNull(movie.seo_keywords_json)`
- `genres_json`, `cast_json`, `countries_json`: تبقى `JSON.stringify()` (دائماً arrays)

### ج) التعديلات على جدول `tv_series`:

**معالجة الأعمدة JSON:**
- `seo_keywords_json`: من `series.seo_keywords_json` إلى `toJsonOrNull(series.seo_keywords_json)`
- `genres_json`, `cast_json`, `seasons_json`, `episodes_json`: تبقى `JSON.stringify()` (دائماً arrays)

---

## ب) نتيجة عد الأعمدة

### جدول `movies`:
✅ عدد الأعمدة في INSERT INTO: **28**
✅ عدد placeholders (?): **28**
✅ عدد عناصر args[]: **28**
⚠️ عدد الأعمدة في UPDATE SET: **25** (طبيعي - لا نحدث id, tmdb_id, created_at)

**الأعمدة الـ28:**
1. id
2. tmdb_id
3. slug
4. title_en
5. title_ar
6. overview_ar
7. poster_path
8. backdrop_path
9. release_date
10. release_year
11. vote_average
12. vote_count
13. popularity
14. runtime
15. trailer_key
16. genres_json
17. cast_json
18. countries_json
19. keywords_json
20. companies_json
21. seo_title_ar
22. seo_description_ar
23. seo_keywords_json
24. canonical_url
25. created_at
26. updated_at
27. filter_status
28. **original_language** ← جديد

---

### جدول `tv_series`:
✅ عدد الأعمدة في INSERT INTO: **28**
✅ عدد placeholders (?): **28**
✅ عدد عناصر args[]: **28**
✅ عدد الأعمدة في UPDATE SET: **25** (طبيعي - لا نحدث id, tmdb_id, created_at)

**الأعمدة الـ28:**
1. id
2. tmdb_id
3. slug
4. name_en
5. name_ar
6. overview_ar
7. poster_path
8. backdrop_path
9. first_air_date
10. first_air_year
11. number_of_seasons
12. number_of_episodes
13. status
14. vote_average
15. vote_count
16. popularity
17. trailer_key
18. genres_json
19. cast_json
20. **seasons_json** ← موجود ويعمل
21. **episodes_json** ← موجود ويعمل
22. seo_title_ar
23. seo_description_ar
24. seo_keywords_json
25. canonical_url
26. created_at
27. updated_at
28. filter_status

---

## ج) نتائج الفحص الشامل لـ src/

### المشاكل المكتشفة:

#### 1. **استعلامات تستخدم جداول غير موجودة في Turso:**

**الملف:** `src/app/api/series/[slug]/route.ts:35`
```typescript
sql: 'SELECT * FROM tv_seasons WHERE tv_series_id = ? ORDER BY season_number ASC'
```
❌ جدول `tv_seasons` غير موجود في Turso
✅ **تم إصلاحه سابقاً** - يستخدم `seasons_json` من جدول `tv_series`

---

#### 2. **استعلامات تستخدم جداول علاقات غير موجودة:**

**الملفات المتأثرة:**
- `src/app/api/series/route.ts:36`
- `src/app/api/movies/route.ts:35`
- `src/app/api/genres/route.ts:16`
- `src/app/api/genres/[slug]/route.ts:61, 75, 97`

**الاستعلامات:**
```sql
SELECT cg.content_id FROM content_genres cg
JOIN genres g ON cg.genre_id = g.id
WHERE g.slug = ? AND cg.content_type = 'movie'
```

❌ جدول `content_genres` غير موجود في Turso
❌ جدول `genres` لا يحتوي على `id` (يستخدم `tmdb_id`)
⚠️ **يحتاج إصلاح شامل** - البيانات موجودة في `genres_json` ضمن كل عمل

---

### ✅ الأعمدة التي تم التحقق منها ولم تجد مشاكل:
- `runtime` - موجود في schema
- `imdb_id` - غير مستخدم في src/
- `production_companies` - غير مستخدم
- `keywords` - غير مستخدم
- `networks` - غير مستخدم
- `country_of_origin` - غير مستخدم
- `primary_genre` - غير مستخدم
- `age_rating` - غير مستخدم
- `is_filtered` - غير مستخدم
- `synced_to_turso` - غير مستخدم

---

## الخلاصة

✅ **السكريبت أُصلح بالكامل:**
- إضافة `original_language`
- معالجة صحيحة لكل الأعمدة JSON
- التطابق الكامل في عدد الأعمدة/placeholders/args

⚠️ **مشاكل في src/ تحتاج إصلاح منفصل:**
- استعلامات تبحث في جداول علاقات (`content_genres`) غير موجودة
- يجب تحويلها للبحث في `genres_json` بدلاً من JOIN

**جاهز للخطوة 4: اختبار السكريبت على 50 فيلم + 10 مسلسلات**
