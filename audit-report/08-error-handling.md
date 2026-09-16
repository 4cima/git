# 🟠 مشاكل Error Handling — إعادة تدقيق `HEAD = 469c38d` (13 سبتمبر 2026، قراءة فقط)

> **تصحيح 8.1:** `src/lib/error-handling.ts` الحالي موسوم `@deprecated` فعلاً (مؤكد بالقراءة) لكنه ما زال يستخدم `console.error` و`any` — الوسم صحيح والتنظيف الكامل لاحقاً.
> **ملاحظة جديدة:** `signOut()` في `useAuth.ts:88-93` و`resolvePopunderScriptUrl` في `adsClick.ts` يستخدمان `catch {}` صامتاً — مقبول (fail-open وتسجيل خروج محلي) لكن يستحق توثيقاً لا تغييراً.

## 8.1 — catch blocks فارغة
**ملفات متعددة:**

```typescript
// src/lib/auth-server.ts
} catch {
  return null  // لا يوجد logging!
}

// src/lib/tmdb.ts
} catch {
  console.log('FTS5 search failed')  // console.log فقط!
}
```

**الحل:** استخدام `logger.error()` أو error reporting service

---

## 8.2 — عدم وجود Error Boundary في كل الصفحات
**الملفات:** `ErrorBoundary.tsx` و `PageErrorBoundary.tsx`
- موجودة لكن لا تُستخدم في route الحرجة
- صفحة التفاصيل لا تحتوي Error Boundary

---

## 8.3 — عدم وجود Fallback UI للبيانات المفقودة
**الملف:** `src/components/pages/MovieDetailsClient.tsx`

```typescript
const overview = sanitizeOverview(movie?.overview_ar || 'لا يوجد وصف متاح')
```

- رسالة افتراضية فقط — لا يوجد skeleton أو loading state

---

## 8.4 — عدم وجود retry logic
**الملف:** `src/lib/api.ts`

```typescript
async function apiFetch(path: string) {
  const res = await fetch(path, { next: { revalidate } })
  if (!res.ok) throw new Error(`API Error: ${res.status}`)
  return res.json()
}
```

- لا يوجد retry — فشل واحد = خطأ يظهر للمستخدم

---

## ✅ 8.5 — عدم وجود timeout لبعض الـ fetches — **تم الإصلاح**
**الملف:** `src/app/api/plays/route.ts`

```typescript
// بعد الإصلاح
const response = await fetch(`${WORKER_URL}/api/plays?${queryString}`, {
  headers: { 'Accept': 'application/json' },
  signal: AbortSignal.timeout(10000), // 10s timeout
})
```
