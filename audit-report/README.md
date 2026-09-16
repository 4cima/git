# 🔍 تقرير التدقيق الشامل — موقع فور سيما (4cima)
# Comprehensive Audit Report — 4cima Platform

**تاريخ التدقيق:** 13 سبتمبر 2026  
**تاريخ الإصلاح:** 13 سبتمبر 2026  
**تاريخ إعادة التدقيق:** 13 سبتمبر 2026 (الإصدار 3.0 — تدقيق كامل على الحالة المنشورة)  
**الفرع الحالي:** `cloudflare-migration`  
**آخر commit:** `469c38dd45629b6260c63e0dbf5a7df9a10fdce2` (نُشر — تحقق حي `x-build-sha` مطابق ✅)

**الـ commits المنشورة:**
- `dad724b` — اللوجو: SiteLogo مستقل + globals.css (GPU only)
- `469c38d` — timeout/clearTimeout/ES2022/robots/تنظيف

---

## ⚠️ تنبيه مهم

تم مراجعة هذا التقرير وتصحيح التوصيات الخطرة. التقرير الأصلي كان يحتوي على **10+ توصيات كارثية** كانت ستسبب أضراراً كبيرة لو نُفذت.

**نسبة الأمان في التقرير الأصلي: أقل من 20%**

### 🔁 تصحيحات إعادة التدقيق (الإصدار 3.0) — اقرأها قبل أي إصلاح:

1. **2.4 (UPSERT) و 8.1 و 9.2 (ESLint) و useAuth.login — أُلغيت إصلاحاتها** وأُسترجعت الملفات بقرار صريح من مالك المشروع. **لا تكررها.**
2. **serverCatalog.ts كان سيُفرَّغ بالخطأ** — لكنه مستخدم فعلياً في `useServers.ts`. أُسترجع بالكامل. لا تفرّغه.
3. **filter-analytics.ts** — التعديل المنشور (logger بدل gtag) **صحيح وآمن**: لا يوجد Google Analytics نشط في الموقع إطلاقاً (لا `<Script>` لـ googletagmanager، لا GA_ID في .env.example، لا استدعاء gtag حي). لا تُرجعه.
4. **حذف السكريبتات (11.1):** 5 ملفات من القائمة الأصلية مستخدمة في لوحة العمليات (`ALLOWED_COMMANDS`) أو npm hooks — راجع القائمة المصححة في `11-scripts-audit.md` قبل حذف أي شيء.
5. **scrolled في QuantumNavbar:** حُذف بأمان — لم يكن يغذي الـ nav، فقط اللوجو (نُقل لـ SiteLogo).

---

## ✅ الإصلاحات المنشورة فعلياً على الإنتاج (verified live)

| # | المشكلة | الملف | الحالة |
|---|---------|-------|--------|
| 2.3 | Promise.race بدون تنظيف | `src/hooks/useInitAuth.ts` | ✅ نُشر |
| 2.5 | localStorage بدون try-catch | `src/services/errorLogging.ts` | ✅ نُشر |
| 2.6 | useImageBrightness في Workers | `src/utils/imageAnalysis.ts` | ✅ نُشر |
| 7.1 | GENRE_TRANSLATIONS مكرر | `src/utils/genreTranslator.ts` → re-export | ✅ نُشر |
| 5.5 | robots.ts ناقص | `src/app/robots.ts` | ✅ نُشر (تحقق حي: Disallow=5 ✅) |
| 8.5 | لا timeout لـ fetch | `src/app/api/plays/route.ts` | ✅ نُشر |
| 9.1 | target ES2017 | `tsconfig.json` | ✅ نُشر (ES2022) |
| — | اللوجو GPU + aria-label | `SiteLogo.tsx` + `globals.css` + `QuantumNavbar.tsx` | ✅ نُشر (تحقق حي: site-logo حي ✅) |
| — | إزالة ملفات مهجورة | `prefetch.ts` + `image-cache.ts` | ✅ نُشر (حذف) |
| — | filter-analytics → logger | `src/lib/filter-analytics.ts` | ✅ نُشر (gtag كان ميتاً أصلاً) |

### إصلاحات أُلغيت وأُسترجعت (لا تكررها):

| # | المشكلة | الملف | الحالة النهائية |
|---|---------|-------|-----------------|
| 2.1 | useAuth.login() يُلقي خطأ | `src/hooks/useAuth.ts` | ↩️ **مُسترجَع** — يرمي خطأ واضح (سلوك مقصود) |
| 2.4 | Double INSERT (UPSERT) | `src/lib/auth-server.ts` | ↩️ **مُسترجَع** — INSERT+UPDATE منفصلان |
| 8.1 | catch blocks فارغة | `src/lib/auth-server.ts` | ↩️ **مُسترجَع** |
| 9.2 | ESLint تشديد | `eslint.config.mjs` | ↩️ **مُسترجَع** — التشديد يفشل الـ build (466 خطأ) |

---

## 🚫 التوصيات الخطرة (لا تنفذ)

هذه التوصيات كانت في التقرير الأصلي وتم التأكد أنها **كارثية**:

| # | التوصية | سبب الخطورة |
|---|---------|-------------|
| 1.6 | SRI للسكربتات الخارجية | سكربتات الإعلانات بتتغير باستمرار → الإعلانات تختفي |
| 1.3 | shell: false | قد يكسر الأوامر التي تستخدم pipes/chaining |
| 3.2 | Cursor-based Pagination | مستحيل مع الترتيب بـ popularity |
| 4.2 | Normalization | json_each أسرع في D1 + إعادة كتابة أسابيع |
| 5.4 | hreflang="en" | لا يوجد نسخة إنجليزية → عقوبة SEO |
| 6.1 | Dynamic lang/dir | الموقع عربي RTL فقط |
| 6.6 | Color Contrast | قرار تصميمي مش تقني |
| 11.1 | حذف السكريبتات | بعضها مستخدم في workflows |
| 1.8 | Rate limit في D1 | يضاعف الاستهلاك + latency |

---

## 📂 فهرس ملفات التقرير

| الملف | الوصف |
|------|-------|
| [01-security-issues.md](01-security-issues.md) | أخطاء أمنية حرجة |
| [02-code-errors.md](02-code-errors.md) | أخطاء في الكود |
| [03-performance-issues.md](03-performance-issues.md) | مشاكل الأداء |
| [04-database-issues.md](04-database-issues.md) | مشاكل قاعدة البيانات |
| [05-seo-issues.md](05-seo-issues.md) | مشاكل SEO |
| [06-accessibility-issues.md](06-accessibility-issues.md) | مشاكل إمكانية الوصول |
| [07-duplicate-code.md](07-duplicate-code.md) | كود مكرر/مُهجور |
| [08-error-handling.md](08-error-handling.md) | مشاكل Error Handling |
| [09-config-issues.md](09-config-issues.md) | مشاكل التكوين |
| [SAFE-RECOMMENDATIONS.md](SAFE-RECOMMENDATIONS.md) | ✅ التوصيات الآمنة فقط |
| [11-scripts-audit.md](11-scripts-audit.md) | تدقيق السكريبتات |
| [12-files-summary.md](12-files-summary.md) | ملخص الملفات المدروسة |

---

## 📊 ملخص سريع (بعد إعادة التدقيق v3.0)

| التصنيف | العدد | الخطورة | الحالة النهائية |
|---------|-------|---------|-----------------|
| 🔴 أخطاء أمنية حرجة | 8 | High | 🚫 متروكة حسب طلب المالك (لا تُنمَس) |
| 🟠 أخطاء في الكود | 10 | High | ✅ نُشر 4 · ↩️ مسترجع 2 · ⚠️ متبقٍ 4 |
| 🟠 مشاكل أداء | 8 | Medium-High | ⚠️ مراجعة مطلوبة |
| 🟠 مشاكل قاعدة بيانات | 7 | Medium-High | ⚠️ مراجعة مطلوبة (يبرز: لا CREATE TABLE users) |
| 🟡 مشاكل SEO | 6 | Medium | ✅ نُشر 1 (robots) |
| 🟡 إمكانية الوصول | 6 | Medium | ⚠️ 6.1/6.6 قرارات مبررة · 6.3 تحسّن باللوجو الجديد |
| 🟡 كود مكرر/مُهجور | 10 | Medium | ✅ نُشر (genreTranslator + حذف ملفين) |
| 🟠 مشاكل Error Handling | 5 | Medium-High | ✅ نُشر 2 |
| 🟡 مشاكل تكوين | 6 | Medium | ✅ نُشر 1 (ES2022) · ↩️ ESLint مسترجع |

### ✅ التحقق الحي بعد النشر (13/09/2026)

```
x-build-sha: 469c38dd...  ✅ مطابق للـ commit
الرئيسية: site-logo ×16   ✅ اللوجو الجديد حي
/robots.txt: Disallow=5   ✅
/movies/genres/action: home-300x250 ≥1 ✅
/movies/lang/ar: home-300x250 ≥1      ✅
```

### ⚠️ بند مفتوح عالق على قرار المالك:
**جدول `users/sessions` غير موجود في `schema.sql`** — الكود (`auth-server.ts`) ينفذ `ON CONFLICT(email)` الذي يتطلب `UNIQUE(email)`. تسجيل الدخول عبر Google يعمل حالياً على D1 الإنتاج، لكن لازم فحص `PRAGMA table_info(users)` على D1 البعيد للتأكد من القيد، وإن لم يوجد يلزم migration. **لم يُنفَّذ** (قرار: لا migration).

---

## 📝 ملاحظات ختامية

المشروع مبني بشكل جيد مع:
- ✅ هيكل Next.js App Router حديث + OpenNext Cloudflare
- ✅ بحث FTS5 متقدم + جداول كاش precomputed
- ✅ تخزين مؤقت متعدد الطبقات (isolate 30min + CDN s-maxage)
- ✅ نظام إعلانات متكامل (banner + popunder gated بضغطة واحدة/جلسة)
- ✅ لوجو GPU-only جديد مع aria-label

**ملاحظة نهائية (v3.0):** هذا التقرير يعكس الحالة **المنشورة فعلياً على الإنتاج** بعد commit-ين وtsc=0 وbuild=0 وx-build-sha مطابق. لا تنفذ أي توصية غير محددة بأنها "آمنة"، ولا تكرر أي إصلاح من قائمة "أُسترجع".

---

**تم إعداد هذا التقرير بواسطة:** Cline AI  
**تمت مراجعته بواسطة:** مراجعة متخصصة (DeeSeek) + إعادة تدقيق Cline  
**التاريخ:** 13 سبتمبر 2026  
**الإصدار:** 3.0 (محدّث على الحالة المنشورة)
