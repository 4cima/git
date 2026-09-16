# 🟡 مشاكل SEO — إعادة تدقيق `HEAD = 469c38d` (13 سبتمبر 2026، قراءة فقط)

> تصحيح البند 5.1: صفحتا `/movies/lang/[code]` و`/series/lang/[code]` **تتضمّنان حالياً** `alternates: { canonical }` + OpenGraph كاملاً في `generateMetadata` (مقروء مباشرة أعلاه) — البند القديم «لا canonical» **مغلق**. يبقى `/movies/genres/[slug]/page.tsx` بحاجة لفحص منفصل (لم يُقرأ في هذه الجولة).

## 5.1 — (مغلق جزئياً) Canonical مفقود في بعض الصفحات
**الملفات الناقصة:**
- `/movies/lang/[code]/page.tsx` — لا canonical
- `/series/lang/[code]/page.tsx` — لا canonical
- `/movies/genres/[slug]/page.tsx` — لا canonical

**الحل:** إضافة `alternates: { canonical: ... }` لكل صفحة

---

## 5.2 — Search Results noindex بدون تنظيف
**الملف:** `src/app/search/page.tsx`

```typescript
robots: { index: false, follow: true }
```

- `q` parameter قد يحتوي على محتوى غير لائق — يجب تنظيفه في title

---

## 5.3 — JSON-LD مكرر
- `layout.tsx` — WebSite schema (في كل الصفحات)
- `page.tsx` — ItemList schema
- بعض الصفحات تُكرر نفس JSON-LD

---

## 5.4 — عدم وجود hreflang
**الملف:** `src/app/layout.tsx`

- لا يوجد `hreflang` alternates للنسخة الإنجليزية
- يجب إضافة:
```html
<link rel="alternate" hreflang="ar" href="https://4cima.com/..." />
<link rel="alternate" hreflang="en" href="https://4cima.com/en/..." />
<link rel="alternate" hreflang="x-default" href="https://4cima.com/..." />
```

---

## ✅ 5.5 — robots.ts لا يحظر routes كافية — **تم الإصلاح**
**الملف:** `src/app/robots.ts`

```typescript
// بعد الإصلاح
disallow: [
  '/admin', '/api', '/profile', '/login', '/register',
  '/ads-lab', '/ads-test', '/forgot-password', '/search',
],
```

---

## 5.6 — Sitemap shard routing
**الملف:** `src/app/sitemap/[shard]/route.ts`

- بعض shards قديمة تُحوَّل بـ 301 — قد لا تتبعها Google فوراً
- لا يوجد verification أن كل shard موجود في sitemap-index
