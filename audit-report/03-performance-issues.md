# 🟠 مشاكل الأداء — إعادة تدقيق `HEAD = 469c38d` (13 سبتمبر 2026، قراءة فقط)

> ملاحظة عن `TmdbImage` (3.3 السابق): المكوّن الحالي `src/components/common/TmdbImage.tsx` يتضمّن فعلاً `loading=lazy/eager` حسب `priority`، و`decoding`، و`fetchPriority`، و`srcSet`، وأبعاد `width/height` لمنع CLS، و`sizes`، وحالة `error` مع صورة بديلة — أي أن بند «عدم وجود Image Optimization» **غير صحيح حالياً** ويُغلق.

## 3.1 — Home Data Cache TTL طويل (30 دقيقة)
**الملف:** `src/app/page.tsx`

```typescript
let homeDataCache: { at: number; data: HomeDataResult } | null = null
const HOME_DATA_TTL_MS = 30 * 60 * 1000 // 30 دقيقة
```

**المشكلة:** المحتوى الجديد لا يظهر فوراً  
**الحل:** استخدام `revalidateTag()` أو on-demand revalidation

---

## 3.2 — OFFSET Pagination بطيء
**الملف:** `src/app/api/tv/route.ts`

```typescript
const offset = (page - 1) * limit
// ...
LIMIT ? OFFSET ?
```

**المشكلة:** OFFSET يصير O(n) مع الجداول الكبيرة  
**الحل:** Cursor-based pagination
```sql
WHERE id > ? ORDER BY id LIMIT 20
```

---

## 3.3 — عدم وجود Image Optimization
**الملف:** `src/components/common/TmdbImage.tsx`

- الصور تُحمَّل بدون lazy loading كافٍ
- لا يوجد blur placeholder
- لا يوجد preconnect لـ TMDB images

**الحل:**
```typescript
<Image src={...} loading="lazy" placeholder="blur" blurDataURL={...} />
```

---

## 3.4 — Bundle Splitting غير كافٍ
**الملف:** `src/components/pages/HomePageClient.tsx`

- `dynamic()` مستخدم فقط لـ HomeTrendingSections
- `react-player` يُحمَّل دائماً

**الحل:**
```typescript
const VideoPlayer = dynamic(() => import('./VideoPlayer'), { ssr: false })
```

---

## 3.5 — CSS Bundle ضخم
**الملف:** `src/app/globals.css` — 2083 سطر، 49,797 بايت

- العديد من keyframes مكررة
- لا يوجد critical CSS extraction

**الحل:** تقسيم CSS + استخدام `next/head` للـ critical CSS

---

## 3.6 — SQL Queries بدون LIMIT
**بعض Routes** تستخدم LIMIT كبيرة:
```sql
-- src/lib/search-content.ts
LIMIT 50  -- لكل من الأفلام والمسلسلات = 100 استعلام
```

---

## 3.7 — Double Query في requireAdmin
**الملف:** `src/lib/requireAdmin.ts` + `src/middleware.ts`

- `middleware.ts` يستدعي `getCurrentUser`
- `requireAdmin` يستدعي `getCurrentUser` مرة أخرى
- نفس الاستعلام يُنفذ مرتين

---

## 3.8 — عدم وجود IntersectionObserver للكروت
**الملف:** `src/components/features/media/MovieCard.tsx`

- `isVisible` prop يأتي من parent
- لا يوجد IntersectionObserver مدمج
