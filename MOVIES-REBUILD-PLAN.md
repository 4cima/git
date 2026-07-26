# خطة إعادة بناء slugs الأفلام

## المشكلة الأصلية
- الـ 134,252 فيلم اتحولوا لصيغة `title--tmdb_id` (مثل `helen--724606`)
- السبب: فحص التصادم كان بيقارن ضد القاعدة المحلية فقط
- مشكلة Helen/The Edge: كانت موجودة في Turso بس مش في المحلي

## الحل الصحيح
رجوع للسياسة الموحدة: `base → base-year → base-year-genre → base-year-genre-N`

**بس** مع فحص تصادم صحيح يشمل Turso الفعلية.

## استراتيجية التنفيذ

### الخطوة 1: بناء Set الـ slugs الموجودة (مرة واحدة)
```sql
SELECT slug FROM movies WHERE slug IS NOT NULL
```
- نجيب كل الـ 133K+ slug دفعة واحدة (مش صف صف)
- نحطهم في `Set` في الذاكرة
- **صفر network round-trips** أثناء المعالجة

### الخطوة 2: قراءة الأفلام من المحلي
```sql
SELECT id, tmdb_id, title, release_year, primary_genre, slug as old_slug
FROM movies
ORDER BY id ASC
```

### الخطوة 3: المعالجة في الذاكرة
لكل فيلم:
1. استبعد الـ slug الحالي من الـ Set (عشان ميتصادمش مع نفسه)
2. ولّد slug جديد باستخدام: `base → base-year → base-year-genre`
3. افحص التصادم ضد الـ Set
4. رجّع الـ slug القديم للـ Set (عشان الأفلام اللي بعده يشوفوه)
5. لو الـ slug اختلف، سجله في قائمة التحديثات

### الخطوة 4: التطبيق بـ Batches
- دفعات 500 فيلم
- `Promise.allSettled` عشان فيلم واحد فاشل ميوقفش الباقي

## نقاط الأمان

### ✅ التعامل مع التصادم مع النفس
```js
// قبل المعالجة
if (movie.old_slug) {
  existingSlugs.delete(movie.old_slug);
}

// بعد المعالجة
existingSlugs.add(newSlug);
```

### ✅ Idempotent
- لو الـ slug الجديد = القديم → مفيش UPDATE
- ممكن نشغله 10 مرات، بعد أول مرة صفر تغيير

### ✅ فحص الجودة
- صفر slugs فيها IDs (regex: `/--\d+/` أو `/-\d{5,}/`)
- صفر تكرارات (GROUP BY slug HAVING COUNT(*) > 1)
- ASCII نظيف 100%

## الاختبار
1. عينة 100-200 فيلم أولاً
2. فحص قبل/بعد بصري
3. تأكد من حالات معروفة (Helen, The Edge)
4. لو نجح → تطبيق على الـ 133K كاملين

## المخرجات
- عدد الأفلام المحدثة
- ملف `unresolved-movies.log` لأي فيلم مش قادر يولد slug صحيح
- فحص نهائي: صفر IDs, صفر تكرارات
