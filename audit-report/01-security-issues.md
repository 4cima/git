# 🔴 أخطاء أمنية حرجة

> **آخر تدقيق:** 13 سبتمبر 2026 على `HEAD = 469c38d` بعد عمليتي النشر `dad724b` (حزمة اللوجو: `globals.css` + `QuantumNavbar.tsx` + `SiteLogo.tsx`) و`469c38d` (14 ملف إصلاح آمن + حذف `prefetch.ts`/`image-cache.ts`) — قراءة مباشرة للملفات الحالية. لم يُعدَّل أي ملف مشروع أثناء هذا التدقيق. `src/lib/prefetch.ts` و`src/lib/image-cache.ts` غير موجودين الآن (`Test-Path=False`)، و`src/components/layout/SiteLogo.tsx` موجود (`True`).
> **ملاحظة تصحيحية عامة:** راجع `README.md` (قسم «تصحيحات على النسخة السابقة») — بعض بنود «تم الإصلاح» السابقة في النسخة القديمة من التقرير لم تكن مطابقة للواقع (مثل `useAuth.login` و`UPSERT` في `auth-server.ts`) وتم تصحيحها أدناه وفق الحالة الفعلية في `HEAD`.

> **إضافة حرجة جديدة — إعادة تدقيق `HEAD = 469c38d` (13 سبتمبر 2026، قراءة فقط):** ملف البناء المُخرَج `.open-next/cloudflare/next-env.mjs` (موجود في مساحة العمل، غير مُتتبَّع في git) يحتوي **كل الأسرار كنص صريح** في سطرَي `production` و`development`: `ADMIN_USERNAME/ADMIN_PASSWORD`، `OPERATIONS_PANEL_PASSWORD`، `CLOUDFLARE_D1_TOKEN`، `GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET`، `PLAYER_BRIDGE_SECRET`، `REVALIDATE_SECRET`، مفاتيح TMDB/Groq/OpenRouter/XAI/Mistral. أي وصول لقراءة هذا الملف = اختراق كامل (لوحة الأدمن + العمليات + D1 API + OAuth). هذا ملف مُولَّد من OpenNext أثناء البناء وليس كوداً يدوياً — لكن بقاءه بنفس قيم الإنتاج يجعله سطح تسريب حقيقياً: تأكد أنه لا يُرفع لأي استضافة ستاتيك ولا يُضمَّن في git، ودوّر الأسرار الظاهرة فيه إن كان قد نُشر سابقاً. (قراءة فقط — لم يُحذف أو يُعدَّل أي شيء.)

## 1.1 — Account ID و Database ID مكشوفان في الكود
**الملف:** `src/lib/db.ts`
**الخطورة:** عالية

```typescript
const ACCOUNT_ID  = '834bca43d616c73db23cf95311cfe17e';
const DATABASE_ID = 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6';
```

**المشكلة:** معرفات Cloudflare حساسة مكشوفة في الكود المصدري  
**الحل:** نقلها إلى Environment Variables أو Secrets
```typescript
const ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const DATABASE_ID = process.env.CF_DATABASE_ID;
```

---

## 1.2 — Admin Credentials بدون تشفير
**الملف:** `src/middleware.ts` و `src/lib/requireAdmin.ts`
**الخطورة:** عالية

```typescript
const username = process.env.ADMIN_USERNAME;
const password = process.env.ADMIN_PASSWORD;
// ...
if (decoded.slice(0, colonIndex) === username && 
    decoded.slice(colonIndex + 1) === password) {
```

**المشاكل:**
- كلمة المرور تُقارن كنص عادي (بدون bcrypt)
- لا يوجد rate limit على محاولات Basic Auth
- Timing attack vulnerability

**الحل:**
```typescript
import { timingSafeEqual } from 'crypto';
// استخدام timing-safe comparison
const userMatch = timingSafeEqual(
  Buffer.from(decoded.slice(0, colonIndex)),
  Buffer.from(username)
);
```

---

## 1.3 — Admin Operations — Command Injection Risk
**الملف:** `src/app/api/admin/operations/route.ts`
**الخطورة:** عالية

```typescript
const child = spawn(commandConfig.cmd, commandConfig.args, { 
  cwd: process.cwd(), 
  env: { ...process.env }, 
  shell: true 
})
```

**المشاكل:**
- `shell: true` يسمح بحقن الأوامر
- `env: { ...process.env }` يعرض جميع متغيرات البيئة

**الحل:**
```typescript
const child = spawn(commandConfig.cmd, commandConfig.args, { 
  cwd: process.cwd(), 
  env: { PATH: process.env.PATH }, // فقط المطلوب
  shell: false // تعطيل shell
});
```

---

## 1.4 — Session Token في URL
**الملف:** `src/lib/openWatch.ts`
**الخطورة:** متوسطة-عالية

```typescript
url += (url.includes('?') ? '&' : '?') + `pt=${encodeURIComponent(data.token)}`
```

**المخاطر:**
- التوكن يظهر في شريط العنوان وسِجل المتصفح
- يمكن تسريبه عبر `Referer` header
- صالح لمدة 7 أيام

**المشكلة (مؤكدة بالقراءة — `src/lib/player-bridge.ts:6,64-70`):** التوكن صالح 7 أيام (`PLAYER_TTL_SECONDS = 60*60*24*7`)، والمقارنة `expected !== sig` ليست timing-safe، ولا يوجد `iat`/`jti` (لا إبطال قبل انتهاء الصلاحية)، والـ role يُؤخذ من التوكن نفسه.

**الحل:** نقل التوكن عبر Cookie httpOnly أو POST body، وتقصير TTL، ومقارنة timing-safe، وإضافة `jti` مع قائمة إبطال

---

## 1.5 — XSS عبر dangerouslySetInnerHTML
**الملفات المتعددة:**
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/movies/[slug]/page.tsx`
- `src/app/series/[slug]/page.tsx`

```typescript
<script type="application/ld+json" 
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
```

**المخاطر:** إذا كانت البيانات تحتوي على `</script><script>alert(1)</script>`  
**الحل:** استخدام `JSON.stringify().replace(/</g, '\\u003c')`

---

## 1.6 — Popunder Script بدون SRI
**الملف:** `src/components/features/system/adsClick.ts`
**الخطورة:** عالية

```typescript
const FALLBACK_SCRIPT = 'https://al5sm.com/tag.min.js'
// ...
const script = document.createElement('script')
script.src = url
document.body.appendChild(script)
```

**المشكلة:** لا يوجد Subresource Integrity — يمكن للمهاجم حقن كود  
**الحل:** إضافة SRI hash أو استخدام nonce

---

## 1.7 — Ad HTML Sanitization ضعيف
**الملف:** `src/components/features/system/AdsManager.tsx`

```typescript
function sanitizeAdHtml(input: string) {
  // حماية محدودة ضد javascript: و data:text/html
}
```

**الثغرات (مؤكدة بالقراءة المباشرة لـ `AdsManager.tsx:45-68`):**
- لا حماية ضد `vbscript:` ولا `data:` العامة (فقط `javascript:` و`data:text/html` يُفحصان في `href/src/xlink:href`)
- **لا فحص إطلاقاً لسمات `srcset` و`action` و`formaction` و`poster` و`background`** — كلها نواقل XSS معروفة
- `style` attributes غير مفحوصة (CSS `expression()`/`url(javascript:)` في المتصفحات القديمة)
- التعليق في `AdsManager.tsx:14` يقرّ صراحة أن «network-sourced snippets ... may contain scripts» وتُحقن حيّة عبر `mountAdInto` — أي أن أي اختراق لحساب أدمن = XSS دائم لكل الزوار

---

## 1.8 — Rate Limiting في الذاكرة فقط
**الملف:** `src/lib/rateLimit.ts`

```typescript
const buckets = new Map<string, Bucket>();
```

**المشكلة:** كل Worker isolate له rate limit مستقل — سهل التجاوز  
**الحل:** استخدام Cloudflare KV أو D1 للتخزين المشترك
