# 4CIMA Cleanup Report

## Data Quality Issues

### 1. Genre Database Inconsistencies

#### Missing TV-Specific Genres
**Issue:** 5 TV-specific genres defined in `worker/src/db/seed-genres.sql` are not synced to production database (Turso):
- `Kids` (10762) - أطفال
- `News` (10763) - أخبار  
- `Reality` (10764) - ريالتي
- `Soap` (10766) - مسلسل درامي
- `War & Politics` (10768) - حرب وسياسة

**Current State:**
- Seed file contains 27 TMDB genres
- Local DB (data/4cima-local.db) contains only 22 genres
- Turso production DB also contains only 22 genres

**Impact:**
- TV series with these genres will not display genre information correctly
- Genre filtering for these types will not work
- Navigation/discovery features incomplete

**Recommendation:** 
1. Decide if these TV-specific genres are needed for the platform
2. If yes: Sync them from seed file to both local and Turso
3. If no: Remove them from seed file to avoid confusion

**Note:** Most are US TV-specific (Talk shows, News, Soap operas) and may not be relevant for Arabic audience focus.

---

#### Unescaped Special Characters in Genre Slugs
**Issue:** Genre slugs contain unescaped `&` character:
- `/genres/action-&-adventure` (should be `/genres/action-and-adventure`)
- `/genres/sci-fi-&-fantasy` (should be `/genres/sci-fi-and-fantasy`)

**Impact:**
- URL encoding issues in browsers (& → %26)
- Inconsistent URL patterns
- Potential routing problems
- Poor SEO

**Recommendation:** Update slugs to use `-and-` instead of `-&-` for URL-safe format.

**Priority:** Medium (affects URLs but currently functional)

---

## Out-of-Scope Features Requiring Decision

### 1. Quran Feature (REMOVED ✅)
**Status:** DELETED in commit `6dac242`

**Previously:**
- Location: `src/components/features/quran/`  
- Dependencies: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (~100KB)

**Action Taken:** Complete removal - out of scope for movies/TV platform.

---

### 2. Social/Reviews Feature (REMOVED ✅)
**Status:** DELETED in commit `2217296`

**Previously:**
- Locations: `src/components/features/social/`, `src/components/features/reviews/`
- Dependencies: `@supabase/supabase-js` (large package)
- Features: User auth, reviews/ratings, social activity, notifications

**Action Taken:** Complete removal - not actively used, reduces bundle size significantly.

---

## Notes
- These features were discovered during build fix process
- All dependencies are now installed and working
- No immediate action required, but should be reviewed during next cleanup phase
- Removing unused features could significantly reduce bundle size and improve performance


---

## 🔥 [✅ تم التنفيذ] مشكلة استعلامات content_genres في API

### التاريخ
- **تاريخ الاكتشاف:** 2026-07-28
- **تاريخ التنفيذ:** 2026-07-28
- **الحالة:** ✅ تم الحل والاختبار بنجاح

### المشكلة المكتشفة
4 ملفات في `src/app/api/` كانت تحاول عمل JOIN على جدول علاقات (`content_genres`) غير موجود في Turso:

**الملفات المتأثرة:**
1. `src/app/api/movies/route.ts` (سطر 35-39)
2. `src/app/api/series/route.ts` (سطر 36-40)
3. `src/app/api/genres/route.ts` (سطر 16-31)
4. `src/app/api/genres/[slug]/route.ts` (سطر 54, 68, 84, 89, 61, 75, 97)

**الاستعلام الخاطئ:**
```sql
SELECT cg.content_id FROM content_genres cg
JOIN genres g ON cg.genre_id = g.id  -- ❌ genres.id غير موجود
WHERE g.slug = ? AND cg.content_type = 'movie'
```

### السبب الجذري

1. **جدول `content_genres` موجود في local.db** (472,150 صف) لكن **لم يُنقل أبداً إلى Turso**
2. **جدول `genres` في Turso** لا يحتوي على عمود `id` - المفتاح الأساسي هو `tmdb_id` مباشرةً
3. **التصميم الحالي في Turso هو denormalized** (JSON columns) وليس relational:
   - كل فيلم/مسلسل لديه `genres_json` يحتوي على array كامل من التصنيفات
   - البيانات **موجودة وصحيحة** في `genres_json`
4. **السكريبت `3-sync-to-turso.js`** ينقل الأعمدة الأساسية فقط (بما فيها `genres_json`) ولا ينقل جداول العلاقات

### التحقيق

**نتائج الفحص من local.db:**
```
content_genres في Local: موجود
عدد الصفوف: 472,150
الهيكل:
  - id (PK)
  - content_tmdb_id
  - content_type (movie/tv)
  - genre_tmdb_id

genres في Local:
  - tmdb_id (PK) ← ليس id!
  - name_en
  - name_ar
  - slug
```

**نتائج الفحص الشامل لـ src/:**
- ✅ `src/app/api/home/route.ts` - يستخدم `genres_json` مباشرة (نظيف)
- ✅ `src/app/api/anime/route.ts` - يعيد التوجيه للـ Worker (نظيف)
- ✅ `src/app/api/search/route.ts` - يبحث في title/overview فقط (نظيف)
- ✅ `src/app/admin/**/*` - لا توجد استعلامات على `content_genres` (نظيف)
- ✅ `worker/src/**/*` - لا توجد استعلامات على `content_genres` (نظيف)
- ❌ 4 ملفات فقط متأثرة (المذكورة أعلاه)

### الحل المقترح: (ب) تعديل API للاستعلام على genres_json

#### لماذا ليس (أ) نقل content_genres؟

❌ **خيار (أ) غير عملي:**
- يتطلب إعادة هيكلة `genres` (إضافة عمود `id` منفصل)
- نقل 472K صف علاقات
- تعديل indexes
- تغيير معمارية الـ schema من denormalized إلى relational
- **بينما البيانات الصحيحة موجودة بالفعل في `genres_json`!**

✅ **خيار (ب) أسرع وأبسط:**
- البيانات موجودة وصحيحة في `genres_json`
- لا حاجة لتعديل Schema
- لا حاجة لنقل جداول إضافية
- يتماشى مع التصميم الحالي (denormalized)

### مخاوف الأداء (Performance Concerns)

⚠️ **تحذير - دين تقني (Technical Debt):**

**المشكلة المحتملة:**
- الحل المقترح يستخدم `json_each()` أو `LIKE` على عمود TEXT غير indexed
- هذا يسبب **full table scan** على كل استعلام فلترة بالتصنيف
- يعمل بكفاءة مع 483 فيلم حالياً
- **سيصبح بطيئاً جداً** مع مئات الآلاف من السجلات

**حلول بديلة طويلة المدى:**

**الحل الأمثل (يُقترح للتطبيق لاحقاً):**
1. إضافة عمود `genre_ids_csv` في schema (نص بسيط: `"28,18,80"`)
2. ملء العمود من `genres_json` في السكريبت
3. إنشاء index على العمود الجديد: `CREATE INDEX idx_movies_genre_ids ON movies(genre_ids_csv)`
4. الفلترة باستخدام: `WHERE ',' || genre_ids_csv || ',' LIKE '%,28,%'`
5. يستفيد من index ولا يحتاج full scan

**الحلول البديلة الأخرى:**
- استخدام Full-Text Search (FTS5) على `genres_json`
- إنشاء Generated Column indexed من `genres_json`
- إضافة Materialized View للعلاقات
- نقل `content_genres` كحل جذري (خيار أ المرفوض)

**مقارنة الأداء المتوقع:**

| الحل | الحالة الحالية (483 فيلم) | مع 10K أعمال | مع 100K+ أعمال |
|------|---------------------------|---------------|-----------------|
| `json_each()` بدون index | ~50ms | ~500ms | ~5000ms+ |
| `LIKE '%..%'` بدون index | ~30ms | ~300ms | ~3000ms+ |
| `genre_ids_csv` مع index | ~10ms | ~15ms | ~20ms |
| نقل `content_genres` مع indexes | ~5ms | ~10ms | ~15ms |

**القرار الحالي:**
- ✅ تطبيق الحل (ب) الآن كحل عملي سريع
- 📝 تسجيل هذا كـ **دين تقني** يجب معالجته قبل Scale
- 🎯 المخطط: تطبيق `genre_ids_csv` indexed قبل الوصول لـ 10K+ أعمال
- ⚠️ إذا تم إدخال بيانات ضخمة (100K+)، يجب إعطاء الأولوية لهذا التحسين فوراً

### الحالة
✅ **تم التنفيذ بنجاح - 2026-07-28**

**التعديلات المطبقة:**
1. ✅ `src/app/api/movies/route.ts` - استبدال content_genres بـ json_each()
2. ✅ `src/app/api/series/route.ts` - استبدال content_genres بـ json_each()
3. ✅ `src/app/api/genres/route.ts` - استبدال content_genres بـ json_each()
4. ✅ `src/app/api/genres/[slug]/route.ts` - استبدال content_genres بـ json_each() + إصلاح genre.id → genre.tmdb_id

**نتائج الاختبار الفعلية (6 حالات):**
1. ✅ `/api/movies?genre=action` - 81 فيلم
2. ✅ `/api/series?genre=comedy` - 0 مسلسل (صحيح - لا توجد بيانات)
3. ✅ `/api/genres` - عد صحيح (Action: 81 فيلم، 0 مسلسل)
4. ✅ `/api/genres/action?type=movie` - 81 فيلم
5. ✅ `/api/genres/drama?type=all` - 283 عمل (أفلام + مسلسلات)
6. ✅ `/api/movies?genre=nonexistent-xyz` - 0 نتيجة (الـ `1=0` fallback شغال)

**الحل المطبق:**
- استخدام `json_each()` مع `CAST(json_extract(value, '$.id') AS INTEGER)` للمطابقة الرقمية الدقيقة
- إضافة `else { conditions.push('1 = 0') }` لمنع إرجاع كل المحتوى عند genre غير موجود
- TODO comments تشير لـ TECH_DEBT.md #1 للتحسين المستقبلي

**الدين التقني المؤجل:**
- إضافة `genre_ids_csv` indexed column قبل الوصول لـ 10K+ أعمال (مسجل في TECH_DEBT.md #1)

**المرجع:** `TECH_DEBT.md` #1, `PROPOSED-GENRE-FIX-DIFF.md`
