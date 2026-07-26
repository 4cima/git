# 🐛 مشاكل البيانات المعروفة (Known Data Issues)

## ═══════════════════════════════════════════════════════════════════

هذا الملف يوثق مشاكل البيانات الموجودة في Turso **قبل** تشغيل سكريبت rebuild-movies-slugs.js.

**هذه المشاكل خارج نطاق السكريبت الحالي** - تحتاج معالجة يدوية أو سكريبت منفصل.

---

## 1️⃣ فيلم روسي بعنوان خاطئ في title_en

### التفاصيل:

```json
{
  "tmdb_id": 206425,
  "title_en": "Зареченские женихи",
  "current_slug": "-1967",
  "issue": "title_en بالروسية، مش إنجليزي"
}
```

### المشكلة:

- عمود `title_en` يحتوي على نص **روسي** (Cyrillic)، مش إنجليزي
- `toSlug("Зареченские женихи")` يحول كل الأحرف الروسية لمسافات → string فاضي → slug يفشل
- الslug الحالي `-1967` فاسد (شرطة + سنة فقط)

### السبب:

- خلل في البيانات المسحوبة من TMDB، أو
- خطأ في الـingestion script القديم

### الحل المطلوب:

**أ. حل سريع:**
```sql
UPDATE movies 
SET title_en = 'Zarechenskiye zhenikhi'  -- transliteration
WHERE tmdb_id = 206425;
```

**ب. حل كامل:**
- فحص كل الأفلام في Turso:
```sql
SELECT tmdb_id, title_en, slug
FROM movies
WHERE title_en REGEXP '[\u0400-\u04FF]'  -- Cyrillic
   OR title_en REGEXP '[\u4E00-\u9FFF]'  -- Chinese
   OR title_en REGEXP '[\uAC00-\uD7AF]'; -- Korean
```
- تصحيح `title_en` لكل فيلم (ترجمة أو transliteration)

---

## 2️⃣ أفلام بعنوان "Unknown"

### التفاصيل:

```json
[
  {"tmdb_id": 9828, "title_en": "Unknown", "current_slug": "unknown-9828"},
  {"tmdb_id": 48138, "title_en": "Unknown", "current_slug": "unknown-48138"},
  {"tmdb_id": 1126312, "title_en": "Unknown", "current_slug": "unknown-1126312"}
]
```

### المشكلة:

- `generateUniqueSlug()` **يرفض** الكلمة "unknown" (كلمة محجوزة في الكود)
- سبب الرفض:
```javascript
function toSlug(text) {
  if (!text) return 'unknown'  // ← reserved word
}

function generateUniqueSlug(...) {
  if (base === 'unknown' || base.length === 0) {
    return null  // ← يرفض!
  }
}
```

### السبب:

- أفلام في TMDB بدون عنوان واضح (أو placeholder)
- عناوينهم فعلاً "Unknown"

### الحل المطلوب:

**أ. تعديل السكريبت:**
```javascript
// السماح بـ"unknown" كslug عادي (إزالة الحجز)
function generateUniqueSlug(...) {
  if (!base || base.length === 0) {  // ← بدون فحص "unknown"
    return null
  }
  // ...
}
```

**ب. تصحيح البيانات:**
- جلب عناوين أفضل من TMDB (بلغة تانية)
- أو استخدام `original_title` بدل `title_en`

---

## 3️⃣ الslug الفاسد `-1967`

### التفاصيل:

```
tmdb_id: 206425
current_slug: "-1967"
```

### المشكلة:

- Slug بدون base (يبدأ بشرطة)
- صيغة غير صحيحة تماماً

### السبب:

- خلل في سكريبت سابق (ربما merge أو ingestion قديم)
- `toSlug()` رجع string فاضي، فاستخدم timestamp أو fallback خاطئ

### الحل:

- يُصحح تلقائياً بعد تصحيح `title_en` (انظر النقطة 1️⃣)

---

## 4️⃣ العناوين القصيرة جداً

### التفاصيل:

```
343 فيلم بعناوين <= 3 أحرف
أمثلة: "8½", "Pi", "Z", "Go", "21", "RV", "54", "W."
```

### المشكلة:

- **ليست مشكلة فعلياً!**
- السياسة `base-year` بتحلهم كلهم
- مثال:
  - `toSlug("Pi")` → `"pi"`
  - `generateUniqueSlug("pi", 1998, null)` → `"pi"` أو `"pi-1998"`

### الحل:

- ✅ **لا حاجة لحل** - السياسة الحالية كافية

---

## 📊 الملخص:

| المشكلة | العدد | الحالة | الأولوية |
|---------|-------|--------|----------|
| **title_en غير لاتيني** | 1 | 🔴 يحتاج تصحيح | عالية |
| **عنوان "Unknown"** | 3 | 🟡 يحتاج قرار | متوسطة |
| **Slug فاسد `-1967`** | 1 | 🔴 تابع لـ#1 | عالية |
| **عناوين قصيرة** | 343 | ✅ محلول | - |

---

## 🛠️ خطة العمل:

### الآن (قبل rebuild):
- ✅ **توثيق** - تم في هذا الملف

### بعد rebuild:
1. ✅ تصحيح الفيلم الروسي (206425) يدوياً
2. ✅ قرار بخصوص الـ"Unknown" (تعديل كود أو بيانات)
3. ✅ إعادة run السكريبت للـ4 أفلام unresolved

### مستقبلاً:
- فحص شامل لكل `title_en` غير لاتيني
- تحسين الـingestion لمنع تكرار المشكلة

---

**تاريخ التوثيق:** 2026-07-21  
**الإصدار:** 1.0  
**الحالة:** موثق ومؤكد
