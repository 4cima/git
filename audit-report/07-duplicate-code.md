# 🟡 كود مكرر/مُهجور — إعادة تدقيق `HEAD = 469c38d` (13 سبتمبر 2026، قراءة فقط)

> **تصحيحات على النسخة السابقة (مؤكدة بالقراءة المباشرة):**
> - 7.3 **غير صحيح — يُسحب**: `src/lib/serverCatalog.ts` الحالي يحتوي القيم الأصلية (`DOWNLOAD_SERVER_IDS = ['server1','server2']` + `SERVER_PROVIDERS` بكائنين) بلا أي `@deprecated` — أُعيد بـ `git restore` بأمر صريح، وهو **مستخدم فعلياً** في `src/hooks/useServers.ts` (import + 4 استخدامات). ادّعاء «تم الإصلاح/الإفراغ» كان خاطئاً.
> - 7.6 **غير صحيح — يُصحَّح**: `src/lib/filter-analytics.ts` **موجود** (9 أسطر، يستخدم `logger.debug`) ولم يُحذف؛ وهو مستورد فعلياً في `AdvancedFilters.tsx:66` ويُستدعى في `:345`. التعديل الحالي أوقف إرسال `gtag` (لا GA نشط في الموقع — لا سكربت ولا Measurement ID) وهذا آمن.
> - `prefetch.ts` و`image-cache.ts` **محذوفان فعلاً** (`Test-Path=False`) — 7.4 و7.5 صحيحان.
> - `genreTranslator.ts` الحالي wrapper من سطرين يستدعي `genre-translations.ts` — 7.1 صحيح.

## ✅ 7.1 — GENRE_TRANSLATIONS مكرر — **تم الإصلاح (مؤكد)**

تم توحيد كل الترجمات في `src/lib/genre-translations.ts` كالمصدر الوحيد:
- `content-utils.ts` — أصبح re-export من `genre-translations.ts`
- `genreTranslator.ts` — أصبح wrapper بـ `@deprecated` يستدعي `genre-translations.ts`

---

## 7.2 — fetchTrending مُهجور
**الملف:** `src/lib/tmdb.ts`

```typescript
/**
 * @deprecated Use CockroachDB API instead: GET /api/trending?type=movie|tv
 */
export async function fetchTrending(type: 'movie' | 'tv') { ... }
```

- مُعلَّق بـ `@deprecated` لكنه لا يزال في الكود
- لا يوجد بديل `/api/trending` موجود

---

## ❌ 7.3 — serverCatalog.ts — **البند السابق مسحوب: الملف مُسترجع عمداً ومستخدم فعلياً**

**الحالة الفعلية (`src/lib/serverCatalog.ts:12-27`):** القيم الأصلية (`server1/server2` + `https://server1.example.com`) ما زالت موجودة بلا `@deprecated` — أُعيد الملف بـ `git restore` بأمر صريح لأنه مستورد في `src/hooks/useServers.ts:2` ويُستخدم في 4 مواضع (`:16` initial state، `:44` source، `:73` fallback، `:142` downloadIds). البند القديم الذي ادّعى «إفراغ البيانات الوهمية» كان سيُفرغ `downloadServers` فعلياً — سُحب نهائياً.
**التوصية الجديدة:** إبقاء الملف كما هو (fallback آمن)، أو استبدال `example.com` بقيم حقيقية/فارغة **فقط** بعد التأكد من `/api/server-configs` يغطي كل الحالات — لا حذف ولا تفريغ الآن.

---

## ✅ 7.4 — prefetch.ts — كود مُهجور — **تم الإصلاح**

تم حذف الملف — Next.js يتعامل مع prefetch تلقائياً عبر `<Link>`

---

## ✅ 7.5 — image-cache.ts — غير مستخدم — **تم الإصلاح**

تم حذف الملف — لا يُستدعى من أي مكان

---

## ✅ 7.6 — filter-analytics.ts — **مُصحَّح: موجود ويعمل (لم يُحذف)**

**الحالة الفعلية (`src/lib/filter-analytics.ts` — 9 أسطر):** يستخدم `logger.debug` بدل `gtag`، مستورد في `AdvancedFilters.tsx:66` ويُستدعى في `:345`. لا يوجد GA نشط في الموقع (لا سكربت `googletagmanager` ولا Measurement ID في `.env.example`) فالكود القديم كان ميتاً أصلاً (شرط `window.gtag` دائم false). الوضع الحالي آمن — البند القديم «تم حذف الملف» غير صحيح ويُصحَّح هنا.

---

## 7.7 — contentAPI.ts — دوال تُلقي خطأ دائماً
**الملف:** `src/services/contentAPI.ts`

```typescript
export async function upsertSeries(row: Record<string, unknown>) {
  throw new Error('Use admin API for content mutations')
}
```

---

## ✅ 7.8 — error-handling.ts — غير مستخدم — **تم الإصلاح**

تم إضافة `@deprecated` annotation لإعلام المطورين باستخدام `logger` بدلاً منه

---

## 7.9 — سكريبتات tmp-* و check-* مكررة
**المجلد:** `scripts/`

- `tmp-*.js` — سكريبتات مؤقتة (6 ملفات)
- `check-*.js` — عشرات سكريبتات الفحص المكررة
- `fetch-*-ids.js` — مكررة

---

## 7.10 — ملفات فارغة
- `scripts/1-download-tmdb-ids.js` — 0 بايت
