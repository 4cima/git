# 🔒 سياسة Slug النهائية - مقفولة ولا يمكن تعديلها

**تاريخ القرار:** 2026-07-21  
**القرار:** الخيار 2  
**الحالة:** 🔒 **LOCKED - ممنوع التعديل نهائياً**

---

## السياسة المعتمدة

### الصيغة:
```
base → base-year → base-year-genre → base-year-genre-N
```

### أمثلة:
- `helen` (لو الاسم لوحده متاح)
- `helen-2009` (لو helen محجوز)
- `spider-man` → `spider-man-2021` → `spider-man-2021-action`
- `castle` → `castle-2009`

### القاعدة الذهبية:
**❌ صفر IDs في أي slug، نهائياً، بدون استثناءات**

---

## ما هو مقفول بالضبط؟

### 🔒 مقفول نهائياً (قرار استراتيجي):

✅ **شكل السياسة:** `base → year → genre → number`  
✅ **صفر IDs:** ممنوع استخدام tmdb_id أو أي ID في الـ slug  
✅ **الترتيب:** base أولاً، ثم year، ثم genre، ثم رقم تسلسلي  

**هذه قرارات استراتيجية غير قابلة للنقاش أو "التفضيل الشخصي".**

### ✅ غير مقفول (تصحيحات تنفيذية):

✅ **إصلاح باگات الأداء:** مثل استبدال SQL بـ Map/Set للسرعة  
✅ **إصلاح باگات الفرادة:** مثل التصادم في نفس الجلسة  
✅ **تحسين الكفاءة:** مثل batch processing أو caching  
✅ **إصلاح edge cases:** مثل معالجة أسماء فارغة أو رموز خاصة  

**التصحيحات التنفيذية مسموحة طالما تحافظ على شكل السياسة.**

### الفرق بين القرار الاستراتيجي والتنفيذ:

| النوع | مثال | الحالة |
|-------|------|--------|
| **استراتيجي** | "نستخدم tmdb_id بدلاً من year" | 🔒 مرفوض |
| **استراتيجي** | "نضيف ID في النهاية للضمان" | 🔒 مرفوض |
| **تنفيذي** | "نستخدم Map بدل SELECT للسرعة" | ✅ مسموح |
| **تنفيذي** | "نحدّث Set في الذاكرة لتجنب تصادم" | ✅ مسموح |

---

## الكود المعتمد

```javascript
function toSlug(text) {
  if (!text) return 'unknown'
  return text.toString().toLowerCase()
    .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u').replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c').replace(/[&]/g, 'and')
    .replace(/['"''""]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim()
}

function generateUniqueSlug(title, year, genre, existingSlugs) {
  const base = toSlug(title)
  
  if (!base || base === 'unknown') {
    return null
  }
  
  // المحاولات بالترتيب
  const attempts = [
    base,
    year ? `${base}-${year}` : null,
    year && genre ? `${base}-${year}-${toSlug(genre)}` : null
  ].filter(Boolean)
  
  for (const slug of attempts) {
    if (!existingSlugs.has(slug)) {
      return slug
    }
  }
  
  // رقم تسلسلي (نادر جداً)
  const lastAttempt = attempts[attempts.length - 1] || base
  for (let i = 2; i <= 999; i++) {
    const slug = `${lastAttempt}-${i}`
    if (!existingSlugs.has(slug)) {
      return slug
    }
  }
  
  return null
}
```

---

## التطبيق

### 1. INGEST-MOVIES-LOGIC.js
✅ حذف كل السطور المتعلقة بـ tmdb_id  
✅ استخدام الكود أعلاه فقط

### 2. INGEST-SERIES-LOGIC.js
✅ حذف كل السطور المتعلقة بـ tmdb_id  
✅ استخدام الكود أعلاه فقط

### 3. rebuild scripts
✅ كل السكريبتات تستخدم نفس المنطق بالضبط

---

## ⚠️ تحذير نهائي

**القرار الاستراتيجي (شكل السياسة) نهائي ولا رجعة فيه.**

### ممنوع منعاً باتاً:
❌ إضافة tmdb_id للـ slug  
❌ استخدام أي ID في الـ slug  
❌ تغيير الترتيب (base → year → genre)  
❌ "تحسينات" تغير شكل الـ URL  

### مسموح (تصحيحات تنفيذية):
✅ إصلاح باگات الأداء  
✅ إصلاح باگات الفرادة  
✅ تحسين الكفاءة  

### أي طلب لتعديل السياسة الاستراتيجية سيُقابل بـ:
```
🚫 REJECTED

هذا قرار استراتيجي نهائي ومقفول بتاريخ 2026-07-21.
تغيير شكل الـ slugs = كسر كل الروابط + فقدان SEO + كارثة.

راجع SLUG-POLICY-FINAL-LOCKED.md
```

---

## التوقيع

**المستخدم:** تم الاختيار  
**التاريخ:** 2026-07-21  
**الخيار:** 2 (base → base-year → base-year-genre)  
**الحالة:** 🔒 LOCKED PERMANENTLY

---

**القرار الاستراتيجي مقفول. التنفيذ قابل للتحسين.**
