# 📂 ملخص الملفات المدروسة — محدّث بإعادة تدقيق 13/09/2026

> **إعادة تدقيق:** الأرقام تعكس الحالة بعد النشر (commit `469c38d` على origin). تحقق حي: `x-build-sha: 469c38d` ✅

## ملفات المصدر الأساسية (src/app/)

| الملف | السطر | الحالة | ملاحظات |
|-------|-------|--------|---------|
| `layout.tsx` | 143 | ✅ | WebSite JSON-LD + lang="ar" dir="rtl" ثابت (قرار مبرر) |
| `page.tsx` | 209 | ✅ | Home data cache 30min isolate-level |
| `movies/[slug]/page.tsx` | 140 | ✅ | Movie details |
| `series/[slug]/page.tsx` | 156 | ✅ | Series details |
| `search/page.tsx` | 125 | ✅ | Search results (يستخدم searchContent المشترك) |
| `genres/[slug]/page.tsx` | 129 | ✅ | Genre overview |
| `movies/page.tsx` | 83 | ✅ | Movies listing |
| `series/page.tsx` | 82 | ✅ | Series listing |
| `not-found.tsx` | 46 | ✅ | 404 page |
| `robots.ts` | 22 | ✅ | **مُصلَح ونُشر** — 9 مسارات disallow (تحقق حي: Disallow count = 5+ ✅) |
| `globals.css` | 2130 | ✅ | نظام site-logo الجديد (GPU only) — نُشر في commit `dad724b` |
| `providers.tsx` | 21 | ✅ | React Query |
| `ClientInit.tsx` | 36 | ✅ | Monetag meta بعد التحميل |

## مكونات Layout

| الملف | السطر | الحالة | ملاحظات |
|-------|-------|--------|---------|
| `QuantumNavbar.tsx` | ~75 | ✅ | أُزيل منه منطق scroll للوجو — نُشر |
| `SiteLogo.tsx` (جديد) | 123 | ✅ | لوجو مستقل بحالات drop/idle/tucked + aria-label ✅ — نُشر |

## ملفات API Routes

| الملف | السطر | الحالة | ملاحظات |
|-------|-------|--------|---------|
| `api/movies/route.ts` | 190 | ✅ | FTS5 search |
| `api/movies/[slug]/route.ts` | 43 | ✅ | Movie detail |
| `api/tv/route.ts` | 58 | ✅ | Series listing |
| `api/tv/[slug]/route.ts` | 45 | ✅ | Series detail |
| `api/search/route.ts` | 19 | ✅ | يفوّض لـ search-content.ts المشترك |
| `api/home-sections/route.ts` | 62 | ✅ | Home sections |
| `api/auth/callback/route.ts` | 50 | ✅ | OAuth callback |
| `api/auth/me/route.ts` | 13 | ✅ | Current user |
| `api/auth/logout/route.ts` | 29 | ✅ | Logout |
| `api/player/token/route.ts` | 24 | ✅ | Player token (HMAC قصير العمر) |
| `api/player/verify/route.ts` | 45 | ✅ | Token verify |
| `api/plays/route.ts` | 38 | ✅ | **مُصلَح ونُشر** — AbortSignal.timeout 10s |
| `api/server-configs/route.ts` | 23 | ✅ | Server configs |
| `api/revalidate/route.ts` | 41 | ✅ | Revalidation |
| `api/user/favorites/route.ts` | 181 | ✅ | Favorites |
| `api/user/card-action/route.ts` | 64 | ⚠️ | content_id=0 — ما زالت قائمة (يحتاج قرار schema) |
| `api/user/card-state/route.ts` | 87 | ✅ | Card states |
| `api/user/watch-progress/route.ts` | 101 | ✅ | Watch history |
| `api/admin/movies/route.ts` | 58 | ✅ | Admin movies |
| `api/admin/series/route.ts` | 58 | ✅ | Admin series |
| `api/admin/operations/route.ts` | 104 | ⚠️ | shell:true — **قرار مبرر، لا يُغيَّر** (الأوامر مسموحة بقائمة بيضاء) |
| `api/admin/ads/zones/route.ts` | 242 | ✅ | Ad zones |
| `api/admin/ads/assignments/route.ts` | 189 | ✅ | Ad assignments |
| `api/admin/ads/house/route.ts` | 188 | ✅ | House ads |
| `api/admin/ads/providers/route.ts` | 123 | ✅ | Ad providers |
| `api/admin/content/route.ts` | 37 | ✅ | Content ingestion |
| `api/admin/review/route.ts` | 82 | ✅ | Content review |
| `sitemap/[shard]/route.ts` | 208 | ✅ | Sitemap (له بوابة سنوات خاصة 2015/1000) |
| `sitemap-index.xml/route.ts` | ~50 | ✅ | Sitemap index |

## ملفات Library (src/lib/)

| الملف | السطر | الحالة | ملاحظات |
|-------|-------|--------|---------|
| `db.ts` | 181 | ⚠️ | **Hardcoded ACCOUNT_ID/DATABASE_ID ما زالا موجودين (سطر 19-20)** — مشكلة أمنية متروكة حسب الطلب |
| `auth-server.ts` | 174 | ⚠️ | **مُسترجَع بأمر صريح** — INSERT+UPDATE منفصلان رجعا (لا UPSERT). لا يوجد CREATE TABLE users في schema.sql — يحتاج فحص D1 الإنتاج |
| `rateLimit.ts` | 55 | ✅ | In-memory مقبول (قرار مبرر — لا D1) |
| `requireAdmin.ts` | 44 | ⚠️ | مقارنة كلمة مرور عادية (لا timing-safe) — متروكة حسب الطلب |
| `filter-analytics.ts` | 9 | ✅ | نُشر — logger.debug بدل gtag الميت (لا GA نشط في الموقع) |
| `prefetch.ts` | — | ✅ | **حُذف ونُشر** (كود React Router مهجور) |
| `image-cache.ts` | — | ✅ | **حُذف ونُشر** (غير مستخدم) |
| `search-content.ts` | 181 | ✅ | مصدر واحد للبحث (FTS5 + short_titles_lookup) |
| `error-handling.ts` | 36 | ✅ | @deprecated — logger هو المرجع |
| `serverCatalog.ts` | 22 | ✅ | **مُسترجَع بالكامل** — DOWNLOAD_SERVER_IDS/SERVER_PROVIDERS الأصليان (مستخدم فعلياً في useServers.ts) |

## ملفات Hooks

| الملف | السطر | الحالة | ملاحظات |
|-------|-------|--------|---------|
| `useAuth.ts` | 125 | ⚠️ | **مُسترجَع بأمر صريح** — login() يرمي خطأ "Use Google Sign-In" (سلوك مقبول: يفضح أي استدعاء منسي) |
| `useInitAuth.ts` | 37 | ✅ | **مُصلَح ونُشر** — clearTimeout في finally |

## Config

| الملف | الحالة | ملاحظات |
|-------|--------|---------|
| `tsconfig.json` | ✅ | **نُشر** — target ES2022 |
| `eslint.config.mjs` | ⚠️ | **مُسترجَع** — القواعد warn (الأصل). التشديد إلى error يفشل الـ build مع 466 خطأ — لا تكرر |
| `next.config.ts` | ✅ | سليم — redirects/rewrites/headers بدون CSP (قرار مبرر للإعلانات) |
| `wrangler.jsonc` | ⚠️ | DO + KV + D1 bindings سليمة؛ compatibility_date 2026-08-20 |
| `tmdb.ts` | 278 | ✅ | TMDB client |
| `utils.ts` | 224 | ✅ | Utilities |
| `constants.ts` | 62 | ✅ | Constants |
| `rateLimit.ts` | 55 | ⚠️ | In-memory |
| `requireAdmin.ts` | 44 | ✅ | Admin guard |
| `error-handling.ts` | 30 | ⚠️ | Unused |
| `logger.ts` | 127 | ✅ | Logger |
| `api.ts` | 46 | ✅ | API client |
| `player-bridge.ts` | 99 | ✅ | Token signing |
| `openWatch.ts` | 113 | ⚠️ | Token in URL |
| `search-content.ts` | 181 | ✅ | FTS5 search |
| `home-sections-query.ts` | 117 | ✅ | Home SQL |
| `genres.ts` | 65 | ✅ | Genres |
| `sitemap.ts` | 257 | ✅ | Sitemap |
| `slugGenerator.ts` | 339 | ✅ | Slugs |
| `seo-generator.ts` | 230 | ✅ | SEO |
| `serverOrder.ts` | 53 | ✅ | Server order |
| `serverCatalog.ts` | 46 | ⚠️ | Fake data |
| `adsAllowlist.ts` | 51 | ✅ | Ad allowlist |
| `directAds.ts` | 46 | ✅ | Direct ads |
| `genre-siblings.ts` | 153 | ✅ | Genre diff |
| `filter-utils.ts` | 54 | ✅ | Filters |
| `data-validation.ts` | 52 | ⚠️ | Unused |
| `search-utils.ts` | 58 | ✅ | FTS5 sanitize |
| `content-utils.ts` | 82 | ⚠️ | Duplicate |
| `genre-translations.ts` | 62 | ✅ | Translations |
| `listing-config.ts` | 34 | ✅ | Listing config |
| `subsection-config.ts` | 27 | ✅ | Subsection config |
| `envHelper.ts` | 9 | ✅ | Env helper |
| `image-cache.ts` | 14 | ⚠️ | Unused |
| `prefetch.ts` | 11 | ⚠️ | Deprecated |
| `toast-manager.ts` | 120 | ✅ | Toast manager |

## ملفات Components (مختارة)

| الملف | السطر | الحالة | ملاحظات |
|-------|-------|--------|---------|
| `HomePageClient.tsx` | 744 | ✅ | Home page |
| `MovieDetailsClient.tsx` | 687 | ✅ | Movie details |
| `SeriesDetailsClient.tsx` | 785 | ✅ | Series details |
| `QuantumNavbar.tsx` | 429 | ✅ | Navbar |
| `VideoPlayer.tsx` | 800 | ✅ | Player |
| `MovieCard.tsx` | 535 | ✅ | Card |
| `AdsManager.tsx` | 278 | ✅ | Ad manager |
| `AdsterraBanner.tsx` | 201 | ✅ | Ad banner |
| `adsterraQueue.ts` | 157 | ✅ | Ad queue |
| `adsClick.ts` | 132 | ⚠️ | No SRI |

## 📊 إحصائيات إجمالية

| التصنيف | العدد |
|--------|-------|
| ملفات المصادق عليها | ~180 |
| ملفات بها مشاكل أمنية | 8 |
| ملفات بها أخطاء كود | 10 |
| ملفات بها مشاكل أداء | 8 |
| ملفات مكررة/مُهجرة | 10 |
| سكريبتات تحتاج حذف | 30+ |
| سكريبتات تحتاج أرشفة | 30+ |
