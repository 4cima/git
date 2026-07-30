# 📊 النتائج الخام - بدون استنتاجات
## Raw Results Report

---

## 1️⃣ MOVIES - INGESTION STATUS (LOCAL DB)

```json
{
  "total_rows": 1223545,
  "fetched": 1223545,
  "complete": 268757,
  "synced": 268755,
  "filtered_out": 954233,
  "blocked": 922478
}
```

**مقارنة مع Turso:**
- Synced في Local: `268,755`
- Rows في Turso: `268,755`
- **الفرق: 0** ✅

---

## 2️⃣ TV_SERIES - INGESTION STATUS (LOCAL DB)

```json
{
  "total_rows": 227358,
  "fetched": 227358,
  "complete": 52776,
  "synced": 0,
  "filtered_out": 174574,
  "blocked": 172346
}
```

**مقارنة مع Turso:**
- Synced في Local: `0`
- Rows في Turso: `99`
- **ملاحظة**: الـ 99 في Turso لم يتم تعليمها كـ synced في Local

---

## 3️⃣ JSON COLUMNS COMPLETENESS IN TURSO

### Movies (Turso):
```json
{
  "total": 268755,
  "empty_cast": 0,
  "empty_genres": 0
}
```
- ✅ جميع الأفلام (268,755) عندها `cast_json` و `genres_json`

### TV Series (Turso):
```json
{
  "total": 99,
  "empty_cast": 0,
  "empty_genres": 0,
  "empty_seasons": 0,
  "empty_episodes": 0
}
```
- ✅ جميع المسلسلات (99) عندها `cast_json`, `genres_json`, `seasons_json`, `episodes_json`

---

## 4️⃣ MISSING COLUMNS ON FETCHED ROWS ONLY (LOCAL DB)

### Movies (WHERE is_fetched = 1):
```json
{
  "total_fetched": 1223545,
  "has_age_rating": 998740,
  "has_imdb": 252799,
  "has_country": 237583
}
```

**النسب المئوية:**
- `age_rating`: 998,740 / 1,223,545 = **81.6%**
- `imdb_id`: 252,799 / 1,223,545 = **20.7%**
- `country_of_origin`: 237,583 / 1,223,545 = **19.4%**

### TV Series (WHERE is_fetched = 1):
```json
{
  "total_fetched": 227358,
  "has_age_rating": 190549,
  "has_imdb": 45797,
  "has_country": 43460
}
```

**النسب المئوية:**
- `age_rating`: 190,549 / 227,358 = **83.8%**
- `imdb_id`: 45,797 / 227,358 = **20.1%**
- `country_of_origin`: 43,460 / 227,358 = **19.1%**

---

## 5️⃣ SYNC SCRIPT ANALYSIS

### الملف: `scripts/3-sync-to-turso.js`

**موجود:** ✅ نعم

**الوظيفة:**
- يقوم بتحويل البيانات من الجداول المنفصلة (relational) إلى JSON
- يستخدم joins على:
  - `content_genres` → `genres_json`
  - `cast_crew` + `people` → `cast_json`
  - `seasons` → `seasons_json`
  - `episodes` → `episodes_json`

**الأعمدة المنقولة (Movies):**
```
✅ tmdb_id, slug, title_en, title_ar, overview_ar
✅ poster_path, backdrop_path
✅ release_date, release_year
✅ vote_average, vote_count, popularity, runtime
✅ trailer_key
✅ genres_json (converted from content_genres)
✅ cast_json (converted from cast_crew + people)
✅ countries_json (converted from country_of_origin)
✅ keywords_json, companies_json
✅ seo_title_ar, seo_description_ar, seo_keywords_json
✅ canonical_url
✅ created_at, updated_at
✅ filter_status, original_language
```

**الأعمدة المنقولة (TV Series):**
```
✅ tmdb_id, slug, name_en, name_ar, overview_ar
✅ poster_path, backdrop_path
✅ first_air_date, first_air_year
✅ number_of_seasons, number_of_episodes, status
✅ vote_average, vote_count, popularity
✅ trailer_key
✅ genres_json (converted from content_genres)
✅ cast_json (converted from cast_crew + people)
✅ seasons_json (converted from seasons table)
✅ episodes_json (converted from episodes table)
✅ seo_title_ar, seo_description_ar, seo_keywords_json
✅ canonical_url
✅ created_at, updated_at
✅ filter_status
```

**الأعمدة المفقودة في سكريبت المزامنة:**

**Movies:**
- ❌ `age_rating` - غير موجود في السكريبت
- ❌ `imdb_id` - غير موجود في السكريبت
- ❌ `country_of_origin` كعمود منفصل (يتم تحويله لـ JSON فقط)

**TV Series:**
- ❌ `age_rating` - غير موجود في السكريبت
- ❌ `imdb_id` - غير موجود في السكريبت
- ❌ `country_of_origin` - غير موجود في السكريبت
- ❌ `original_language` - غير موجود في السكريبت
- ❌ `last_air_date` - غير موجود في السكريبت

**شرط المزامنة:**
```sql
WHERE is_complete = 1 
  AND filter_status IN ('clean', 'reviewed_approved') 
  AND synced_to_turso = 0
```

---

## 6️⃣ global_keywords ANALYSIS

### في Turso:
- **Row count:** `0` (فارغ تماماً)

### في الكود:

**Worker types (`worker/src/db/types.ts`):**
```typescript
// تعريف فقط في types - غير مستخدم
global_keywords?: string
```

**في الـ API routes (`src/`):**
- ❌ لم يتم العثور على أي استخدام في `src/`

**سكريبت التحديث:**
- ✅ `scripts/update-global-keywords.js` موجود
- الوظيفة: مزامنة global keywords من Local إلى Turso
- لكن الجدول نفسه فارغ في Turso

**الاستنتاج:**
- الجدول موجود في schema
- لكن **غير مستخدم** في أي API route أو component
- فارغ تماماً في Turso

---

## 7️⃣ FILTER STATUS BREAKDOWN

### Movies (Local):
- **Total:** 1,223,545
- **Fetched:** 1,223,545 (100%)
- **Complete:** 268,757 (22.0%)
- **Synced:** 268,755 (22.0%)
- **Filtered out:** 954,233 (78.0%)
- **Blocked:** 922,478 (75.4%)

### TV Series (Local):
- **Total:** 227,358
- **Fetched:** 227,358 (100%)
- **Complete:** 52,776 (23.2%)
- **Synced:** 0 (0%)
- **Filtered out:** 174,574 (76.8%)
- **Blocked:** 172,346 (75.8%)

---

## 8️⃣ KEY FINDINGS (حقائق فقط، بدون توصيات)

### Movies:
1. ✅ المزامنة دقيقة: 268,755 في Local = 268,755 في Turso
2. ❌ 78% من الأفلام مفلترة (954K من 1.2M)
3. ✅ جميع الأفلام في Turso عندها JSON كامل (cast, genres)
4. ❌ الأعمدة `age_rating`, `imdb_id`, `country_of_origin` غير موجودة في Turso

### TV Series:
1. ❌ 99 فقط في Turso رغم أن 52,776 complete في Local
2. ❌ الـ synced flag في Local = 0 لكل المسلسلات
3. ❌ 76.8% من المسلسلات مفلترة (174K من 227K)
4. ✅ الـ 99 في Turso عندهم JSON كامل (cast, genres, seasons, episodes)
5. ❌ الأعمدة `age_rating`, `imdb_id`, `country_of_origin`, `last_air_date`, `original_language` غير موجودة في Turso

### Sync Script:
1. ✅ يحول relational data إلى JSON بشكل صحيح
2. ❌ لا ينقل الأعمدة: `age_rating`, `imdb_id`, `country_of_origin` (كأعمدة منفصلة)
3. ✅ ينقل `original_language` للأفلام فقط
4. ❌ لا ينقل `original_language` و `last_air_date` للمسلسلات

### global_keywords:
1. ❌ فارغ تماماً في Turso (0 rows)
2. ❌ غير مستخدم في أي API route
3. ✅ موجود في schema فقط

---

**انتهى التقرير الخام**  
**التاريخ:** 2026-07-29  
**المدة:** < 1 ثانية
