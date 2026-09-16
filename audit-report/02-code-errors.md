# 🔴 أخطاء في الكود — إعادة تدقيق `HEAD = 469c38d` (13 سبتمبر 2026، قراءة فقط)

> هذه النسخة مصححة بعد إعادة القراءة المباشرة لملفات المشروع. البنود التي كانت موسومة «تم الإصلاح» في النسخة السابقة وتم التراجع عنها بأمر صريح (`git restore`) أُعيد وسمها **❌ غير مُصلح — مُسترجع عمداً** مع السبب.

## ❌ 2.1 — useAuth.login() يُلقي خطأ دائماً — **غير مُصلح (مُسترجع عمداً بأمر صريح)**

**الملف:** `src/hooks/useAuth.ts:82-86` — الحالة الفعلية المقروءة الآن:
```typescript
async login(email: string, password: string) {
  // Email/password login via Supabase is no longer used.
  // Kept for interface compatibility — throws so callers degrade gracefully.
  throw new Error('Email login not available. Please use Google Sign-In.');
},
```

**التصحيح:** النسخة السابقة من هذا التقرير ادّعت تحويله إلى no-op — هذا غير صحيح الآن؛ الملف أُعيد بـ `git restore` ولا يحتوي أي no-op. رمي الخطأ مقصود جزئياً (يكشف أي استدعاء منسي في UI)، لكنه يبقى سلوكاً صامتاً من وجهة نظر المستخدم لو كان زرّ دخول حي يناديه.

---

## 2.2 — content_id دائماً = 0
**الملف:** `src/app/api/user/card-action/route.ts`

```typescript
await executeAll(
  `INSERT OR IGNORE INTO favorites (user_id, content_type, content_id, tmdb_id, ...) 
   VALUES (?,?,?,?,?,?)`,
  [user.id, content_type, 0, tmdb_id, ...] // content_id = 0 دائماً!
);
```

**الحل:** إزالة `content_id` من الجدول أو تعيينه بشكل صحيح

---

## ✅ 2.3 — Promise.race بدون تنظيف Timeout — **تم الإصلاح فعلاً (مؤكد في `HEAD`)**
**الملف:** `src/hooks/useInitAuth.ts:17-29` — الحالة المقروءة الآن تتضمن `timeoutId` + `clearTimeout` في `finally` (مطابقة للاقتباس السابق في التقرير).

```typescript
// بعد الإصلاح
let timeoutId: ReturnType<typeof setTimeout> | undefined;
try {
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Auth timeout')), 5000);
  });
  await Promise.race([refreshProfile(), timeout]);
} catch {
  if (mounted) useAuth.getState().setLoading(false);
} finally {
  if (timeoutId) clearTimeout(timeoutId);
}
```

---

## ❌ 2.4 — Double INSERT في handleAuthCallback — **غير مُصلح (مُسترجع عمداً بأمر صريح)**

**الملف:** `src/lib/auth-server.ts:108-118` — الحالة الفعلية المقروءة الآن ما زالت عمليتين منفصلتين:
```sql
INSERT INTO users (...) VALUES (...) ON CONFLICT(email) DO NOTHING;
UPDATE users SET name = ?, avatar_url = ?, role = ?, last_login_at = ? WHERE id = ?;
```

**التصحيح:** اقتباس الـ UPSERT الموحد في النسخة السابقة غير موجود في الملف الحالي؛ أُعيد الملف بـ `git restore`. ملاحظة إضافية من التدقيق الأعمق: لا يوجد `CREATE TABLE users` في `schema.sql`/`migrations/` ولا `UNIQUE(email)` مؤكد — الـ `ON CONFLICT(email)` سيفشل وقت التشغيل إن لم يكن القيد موجوداً في D1 الفعلي (يحتاج فحص schema الإنتاج، لا تغيير كود الآن).

---

## ✅ 2.5 — localStorage بدون try-catch — **تم الإصلاح**
**الملف:** `src/services/errorLogging.ts`

```typescript
// بعد الإصلاح
private saveQueue() {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
  } catch (error) {
    logger.error('Failed to save error queue to localStorage', error);
  }
}
```

---

## ✅ 2.6 — useImageBrightness في Workers — **تم الإصلاح**
**الملف:** `src/utils/imageAnalysis.ts`

```typescript
// بعد الإصلاح
export const analyzeImageBrightness = async (imagePath: string): Promise<OverlayConfig> => {
  // Return default for SSR/Workers environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return getDefaultDarkOverlay()
  }
  // ... rest of implementation
}
```

---

## 2.7 — adsterraQueue: script injection مباشر
**الملف:** `src/components/features/system/adsterraQueue.ts`

```typescript
const s = document.createElement('script')
s.textContent = seg.raw
container.appendChild(s)
```

**المخاطر:** حقن `<script>` مباشر في DOM  
**الحل:** استخدام nonce مع CSP

---

## 2.8 — serverCatalog.ts — بيانات وهمية
**الملف:** `src/lib/serverCatalog.ts`

```typescript
{ id: 'server1', name: 'Primary Server', url: 'https://server1.example.com' }
```

**المشكلة:** `example.com` في الكود الإنتاجي  
**الحل:** إزالة البيانات الوهمية أو وضعها في config file

---

## 2.9 — Prefetch كود مُهجور
**الملف:** `src/lib/prefetch.ts`

```typescript
export function prefetchRoute(path: string) {
  if (typeof window !== 'undefined') {
    const router = (window as any).__NEXT_ROUTER__
    if (router?.prefetch) router.prefetch(path)
  }
}
```

**المشكلة:** بقايا React Router — Next.js يتعامل مع prefetch تلقائياً  
**الحل:** حذف الملف

---

## 2.10 — Unused ErrorHandler
**الملف:** `src/lib/error-handling.ts`

```typescript
export class ErrorHandler {
  static handle(error: any, context?: string): void {
    console.error(`Error${context ? ` in ${context}` : ''}:`, error)
  }
}
```

**المشكلة:** غير مستخدم في أي مكان — كل الـ APIs تستخدم console.error مباشرة  
**الحل:** حذفه أو استخدامه فعلياً
