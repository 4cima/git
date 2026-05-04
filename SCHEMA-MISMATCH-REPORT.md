# 🔴 تقرير: عدم تطابق الأعمدة بين القاعدة المحلية و Turso

**التاريخ:** 2026-05-04  
**الحالة:** ❌ مشكلة حرجة

---

## 🔍 المشكلة المكتشفة

### ❌ الخطأ الأول: أسماء الأعمدة مختلفة

**في القاعدة المحلية (`4cima-local.db`):**
```
جدول movies:
- title_en ✅
- title_ar ✅

جدول tv_series:
- title_en ❌ (خطأ!)
- title_ar ❌ (خطأ!)
```

**في Turso:**
```
جدول movies:
- title_en ✅
- title_ar ✅

جدول tv_series:
- name_en ✅ (صحيح!)
- name_ar ✅ (صحيح!)
```

### ⚠️ المشكلة:
- اسكريبت `sync-remaining-works.js` كان يستخدم `name_en` و `name_ar` للأفلام
- لكن الأفلام في Turso تستخدم `title_en` و `title_ar`
- والمسلسلات في Turso تستخدم `name_en` و `name_ar`

---

## ✅ الحل المطبق

### تم تصحيح `sync-remaining-works.js`:

**قبل (❌ خطأ):**
```javascript
// للأفلام
INSERT INTO movies (tmdb_id, slug, name_en, name_ar, ...)
VALUES (?, ?, ?, ?, ...)

// للمسلسلات
INSERT INTO tv_series (tmdb_id, slug, name_en, name_ar, ...)
VALUES (?, ?, ?, ?, ...)
```

**بعد (✅ صحيح):**
```javascript
// للأفلام
INSERT INTO movies (tmdb_id, slug, title_en, title_ar, ...)
VALUES (?, ?, ?, ?, ...)

// للمسلسلات
INSERT INTO tv_series (tmdb_id, slug, name_en, name_ar, ...)
VALUES (?, ?, ?, ?, ...)
```

---

## 🔴 المشكلة الثانية: UNIQUE constraint failed

### الخطأ:
```
UNIQUE constraint failed: tv_series.slug
```

### السبب:
- هناك مسلسلات مكررة بنفس الـ slug في Turso
- عند محاولة إدراج مسلسل بـ slug موجود بالفعل، يفشل الإدراج

### المسلسلات المتأثرة:
```
- ID: 261259
- ID: 292925
- ID: 295957
- ID: 313579
```

---

## 📊 الأعمدة الفعلية في Turso

### جدول `movies`:
```
- id
- tmdb_id
- slug
- title_en ✅
- title_ar ✅
- overview_ar
- poster_path
- release_date
- release_year
- vote_average
- trailer_key
- genres_json
- cast_json
- countries_json
- keywords_json
- companies_json
- seo_title_ar
- seo_description_ar
- seo_keywords_json
- canonical_url
- created_at
- updated_at
```

### جدول `tv_series`:
```
- id
- tmdb_id
- slug
- name_en ✅
- name_ar ✅
- overview_ar
- poster_path
- first_air_date
- first_air_year
- number_of_seasons
- number_of_episodes
- status
- vote_average
- trailer_key
- genres_json
- cast_json
- countries_json
- keywords_json
- networks_json
- seasons_json
- episodes_json
- seo_title_ar
- seo_description_ar
- seo_keywords_json
- canonical_url
- created_at
- updated_at
```

---

## 🎯 الخطوات التالية

### 1️⃣ تصحيح المسلسلات المكررة:
```bash
# حذف المسلسلات المكررة من Turso
# أو تحديث الـ slug لها
```

### 2️⃣ إعادة المزامنة:
```bash
node sync-remaining-works.js
```

### 3️⃣ التحقق من النتائج:
```bash
node check-turso-data.js
```

---

## 📝 ملاحظات مهمة

### ✅ تم تصحيحه:
- ✅ أسماء الأعمدة في `sync-remaining-works.js`

### ⚠️ بحاجة إلى تصحيح:
- ⚠️ المسلسلات المكررة بنفس الـ slug
- ⚠️ التأكد من عدم وجود تضارب آخر

---

**آخر تحديث:** 2026-05-04
