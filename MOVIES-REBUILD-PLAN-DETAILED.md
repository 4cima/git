# خطة إعادة بناء slugs الأفلام - مفصلة

## المشكلة
134,252 فيلم بصيغة `title--tmdb_id` (مثل `helen--724606`)

## الهدف
رجوع للسياسة الموحدة: `base → base-year → base-year-genre → base-year-genre-N`

---

## الخطوات التفصيلية

### المرحلة 1: جلب slugs الموجودة (مرة واحدة)

```sql
SELECT slug FROM movies WHERE slug IS NOT NULL
```

**التنفيذ:**
1. استعلام واحد لـ Turso يجيب **كل** الـ slugs
2. تحميلهم في `Set` في الذاكرة (JavaScript)
3. **صفر network calls** أثناء المعالجة

**الوقت المتوقع:** ~5-10 ثواني لجلب 133K+ slug

---

### المرحلة 2: قراءة الأفلام من القاعدة المحلية

```sql
SELECT id, tmdb_id, title, release_year, primary_genre, slug as old_slug
FROM movies
ORDER BY id ASC
```

**ملاحظة:** نفس ترتيب المسلسلات - قراءة كاملة من المحلي

---

### المرحلة 3: المعالجة في الذاكرة

**لكل فيلم (بالترتيب):**

```javascript
// 1. حذف الـ slug الحالي من الـ Set (لتجنب التصادم مع النفس)
if (movie.old_slug) {
  existingSlugs.delete(movie.old_slug);
}

// 2. حساب slug جديد
const newSlug = generateUniqueSlug(
  movie.title, 
  movie.release_year, 
  movie.primary_genre, 
  existingSlugs  // فحص ضد الـ Set في الذاكرة
);

// 3. إضافة الـ slug الجديد للـ Set
existingSlugs.add(newSlug);

// 4. لو اختلف عن القديم، سجله للتحديث
if (movie.old_slug !== newSlug) {
  updates.push({ id: movie.id, old: movie.old_slug, new: newSlug });
}
```

**التعامل مع التصادم مع النفس:**
- بحذف الـ slug الحالي من الـ Set أولاً، الفيلم **لن يتصادم مع نفسه**
- مثال: `helen` (slug حالي) → نحذفه → نحسب slug جديد → لو طلع `helen` تاني، مفيش مشكلة
- بعد الحساب، نضيف الـ slug الجديد للـ Set عشان الأفلام اللي بعده يشوفوه

---

### المرحلة 4: التطبيق بـ Batches

```javascript
const BATCH_SIZE = 500;

for (let i = 0; i < updates.length; i += BATCH_SIZE) {
  const batch = updates.slice(i, i + BATCH_SIZE);
  
  await Promise.allSettled(
    batch.map(u => 
      turso.execute({
        sql: 'UPDATE movies SET slug = ? WHERE id = ?',
        args: [u.new, u.id]
      })
    )
  );
}
```

**Idempotent:**
- لو شغلنا السكريبت 10 مرات، بعد أول مرة صفر تغيير
- السبب: `if (movie.old_slug !== newSlug)` → لو الـ slug مش محتاج تغيير، مش هيتضاف للـ updates

---

## الاختبار

### 1. عينة صغيرة (200 فيلم)
- فحص قبل/بعد
- تأكد من حالات معروفة:
  - `helen--724606` → `helen` أو `helen-{year}`
  - `the-edge--151211` → `the-edge` (مفترض مش محجوز دلوقتي)

### 2. فحص الجودة
```javascript
// صفر IDs
const hasIds = newSlugs.some(s => /--\d/.test(s));

// صفر تكرارات
SELECT slug, COUNT(*) 
FROM movies 
GROUP BY slug 
HAVING COUNT(*) > 1
```

### 3. التطبيق الكامل
- 134,252 فيلم
- بدفعات 500
- مع progress logging كل 5000

---

## الفحوصات النهائية

1. **عدد الأفلام المحدثة**
2. **صفر slugs فيها `--{digit}`** (regex: `/--\d/`)
3. **صفر تكرارات**
4. **عينة عشوائية للتأكد البصري**

---

## الوقت المتوقع

- جلب slugs: ~10 ثواني
- قراءة محلي: ~5 ثواني
- معالجة في الذاكرة: ~30 ثانية
- تطبيق batches: ~2-3 دقائق (134K فيلم / 500 batch)

**إجمالي:** ~3-4 دقائق

---

## ملفات unresolved

أي فيلم مش قادر يولد slug صحيح (title فاضي أو رموز غريبة):
- يُسجل في `unresolved-movies.log`
- **لا يُحدث** في Turso
- نراجعه يدوياً بعد التنفيذ

---

## الملف النهائي

`rebuild-movies-slugs.js` - نفس بنية المسلسلات، لكن:
- `table = 'movies'`
- `WHERE` condition مختلف (مفيش placeholder للأفلام)
- نفس منطق generateUniqueSlug
- نفس دالة hasIdSuffix للفحص
