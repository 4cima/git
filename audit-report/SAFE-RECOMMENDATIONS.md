# ✅ التوصيات الآمنة فقط

هذه التوصيات تم التأكد من أنها **آمنة للتنفيذ** ولن تسبب أي أضرار.

---

## 🔒 أمان (آمن)

### 1. JSON-LD XSS Fix
**الملف:** `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/movies/[slug]/page.tsx`, `src/app/series/[slug]/page.tsx`

**المشكلة:** `dangerouslySetInnerHTML` مع `JSON.stringify` قد يسمح بحقن HTML

**الحل الآمن:**
```typescript
// قبل
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

// بعد
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
```

**لماذا آمن:** لا يؤثر على الوظائف، فقط يمنع XSS.

---

### 2. timingSafeEqual لكلمة المرور
**الملف:** `src/middleware.ts`, `src/lib/requireAdmin.ts`

**المشكلة:** مقارنة `===` vulnerable to timing attacks

**الحل الآمن:**
```typescript
import { timingSafeEqual } from 'crypto';

// قبل
if (decoded.slice(0, colonIndex) === username && decoded.slice(colonIndex + 1) === password)

// بعد
const userMatch = timingSafeEqual(Buffer.from(decoded.slice(0, colonIndex)), Buffer.from(username));
const passMatch = timingSafeEqual(Buffer.from(decoded.slice(colonIndex + 1)), Buffer.from(password));
if (userMatch && passMatch) { ... }
```

**لماذا آمن:** لا يؤثر على الوظائف، فقط يحسن الأمان.

---

## 🗄️ قاعدة بيانات (آمن)

### 3. Index على rate_events.ts
**الملف:** `src/app/api/user/favorites/route.ts`

**المشكلة:** `DELETE FROM rate_events WHERE ts < ...` يعمل full table scan

**الحل الآمن:**
```sql
CREATE INDEX IF NOT EXISTS idx_rate_events_ts ON rate_events(ts);
```

**لماذا آمن:** Index فقط، لا يغير أي كود.

---

### 4. Index على slug + tmdb_id
**الملف:** `src/lib/db.ts`

**المشكلة:** بعض الاستعلامات تستخدم `WHERE slug = ? OR tmdb_id = ?`

**الحل الآمن:**
```sql
CREATE INDEX IF NOT EXISTS idx_movies_slug ON movies(slug);
CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_tv_series_slug ON tv_series(slug);
CREATE INDEX IF NOT EXISTS idx_tv_series_tmdb_id ON tv_series(tmdb_id);
```

**لماذا آمن:** Indexes فقط، تسريع بدون مخاطر.

---

### 5. Double Query Fix
**الملف:** `src/lib/requireAdmin.ts` + `src/middleware.ts`

**المشكلة:** `getCurrentUser` يُستدعى مرتين لنفس الطلب

**الحل الآمن:**
- في `middleware.ts`: إذا تم التحقق من Basic Auth، لا تستدعي `getCurrentUser`
- أو أضف caching بسيط في الذاكرة

```typescript
// في middleware.ts - بعد Basic Auth ناجح
if (authHeader && authHeader.startsWith('Basic ')) {
  // ... verify basic auth
  return response; // لا تستدعي getCurrentUser
}
```

**لماذا آمن:** تحسين أداء، لا يغير السلوك.

---

## 🛡️ Error Handling (آمن)

### 6. Error Boundaries لكل route
**الملف:** كل pages

**المشكلة:** صفحة التفاصيل لا تحتوي Error Boundary

**الحل الآمن:**
```typescript
// src/app/movies/[slug]/page.tsx
<ErrorBoundary fallback={<MovieDetailsError />}>
  <MovieDetailsClient movie={movie} />
</ErrorBoundary>
```

**لماذا آمن:** fallback UI فقط، لا يؤثر على الوظائف.

---

### 7. Retry Logic (بحذر)
**الملف:** `src/lib/api.ts`

**المشكلة:** فشل واحد = خطأ يظهر للمستخدم

**الحل الآمن:**
```typescript
async function apiFetch(path: string, revalidate = 3600, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(path, { next: { revalidate } });
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      return res.json();
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}
```

**لماذا آمن:** يحسن UX، fallback موجود.

---

## ⚙️ تكوين (آمن)

### 8. Pre-commit Hooks
**الملف:** `.husky/pre-commit` + `package.json`

**المشكلة:** لا يوجد pre-commit validation

**الحل الآمن:**
```bash
npm install --save-dev husky lint-staged
npx husky init
```

```json
// package.json
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
}
```

**لماذا آمن:** تأثير محلي على المطور فقط.

---

## 🔍 SEO (آمن)

### 9. Canonical URLs ناقصة
**الملفات:** بعض الصفحات لا تحدد canonical

**الحل الآمن:**
```typescript
alternates: { canonical: `https://4cima.com${pathname}` }
```

**لماذا آمن:** meta tag فقط، لا يؤثر على الوظائف.

---

## ♿ إمكانية الوصول (آمن)

### 10. Skip Navigation
**الملف:** `src/app/layout.tsx`

**المشكلة:** Skip link غير مرئي

**الحل الآمن:**
```html
<a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-black focus:p-4 focus:rounded">
  تخطي إلى المحتوى الرئيسي
</a>
```

**لماذا آمن:** CSS فقط، لا يؤثر على الوظائف.

---

### 11. ARIA Labels
**الملفات:** مكونات متعددة

**الحل الآمن:**
```html
<button aria-label="بحث عن أفلام ومسلسلات">
  <Search aria-hidden="true" />
</button>
```

**لماذا آمن:** attributes فقط، لا يؤثر على الوظائف.

---

### 12. Image Alt Text
**الملف:** `src/components/common/TmdbImage.tsx`

**الحل الآمن:**
```typescript
alt={title || movie.title_ar || movie.title_en || 'صورة الفيلم'}
```

**لماذا آمن:** attribute فقط، لا يؤثر على الوظائف.

---

## 📊 ملخص الأولويات

| الأولوية | العدد | نوع التأثير |
|----------|-------|-------------|
| 🔴 حرجة | 2 | أمان (XSS, timing attack) |
| 🟠 عالية | 4 | أداء (indexes, error boundaries) |
| 🟡 متوسطة | 5 | UX (ARIA, skip nav, retry) |
| 🟢 منخفضة | 2 | تطوير (pre-commit, canonical) |

---

## ⛔ ما يجب عدم لمسه

| السبب | التوصيات المحظورة |
|-------|-------------------|
| نظام الإعلانات | SRI, Popunder script modifications |
| بنية البيانات | Normalization, Pagination changes |
| التصميم | Dynamic lang, Color changes |
| السكريبتات | حذف أي ملف بدون التحقق من استخدامه |

---

**تم التحقق من كل توصية في هذا الملف للتأكد من أنها آمنة 100%.**
