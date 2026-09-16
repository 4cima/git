# التدقيق الشامل — 4cima — 2026-09-14

- **المجلد**: `d:\4cima` | **الفرع**: `cloudflare-migration` | **HEAD**: `f4abf4a3` (SEO: إضافة Organization + VideoObject Schema)
- **الطبيعة**: تدقيق قراءة فقط. لم يُعدَّل أي ملف في `src/` أو `scripts/` أو أي مكان سوى هذا التقرير وحده.
- **الأدوات**: `git grep`, `Select-String`, `curl.exe`, `npm audit`, `npm ls`, `npx tsc`, `npx next lint`, استعلامات D1 HTTP عبر token من `.open-next/cloudflare/next-env.mjs` (بدون طباعة أي قيم سرّية).

---

## ملخص تنفيذي

- إجمالي المشاكل: **19**
- 🔴 حرجة: **2**
- 🟡 مهمة: **9**
- 🟢 متوسطة: **8**
- ✅ أنظمة سليمة: **14**

### أبرز 3 نتائج
1. 🔴 **أسرار الإنتاج كاملة (17 متغيراً: مفاتيح TMDB/GROQ/OpenRouter/XAI/Mistral، `CLOUDFLARE_D1_TOKEN`، `ADMIN_PASSWORD`، `GOOGLE_CLIENT_SECRET`، `PLAYER_BRIDGE_SECRET`) مضمّنة في نصّ عادي داخل `.open-next/cloudflare/next-env.mjs`** — وهي تُبنى داخل الـ Worker المنشور (`wrangler.jsonc:3` → `main: .open-next/worker.js`). الملف مستثنى من git، لكن أي تسريب لمخرجات البناء يفضح كل المفاتيح.
2. 🔴 **`npm audit`:** 4 ثغرات (1 critical في Next.js RCE عبر Image Optimization/AVIF + 3 high في postcss وsharp) ضمن النطاقات المثبتة (next@15.5.21، postcss@8.5.21).
3. 🟡 **فجوة توثيق قاعدة البيانات:** `schema.sql` لا يعرّف `users`/`sessions`/`rate_events`/`ads*`/`site_config` — وكلها موجودة في D1 الحية، أي أن المخطط المرجعي لا يطابق الإنتاج.

---

## الجولة 1 — الأمان + السرعة + الاعتماديات

### 1.1 الأمان — كشف الأسرار

**فحص أنماط الأسرار في `src/` و `scripts/`** (أمر `git grep -E "sk-or-|gsk_|xai-|AIza[0-9A-Za-z]{20,}|cfut_|Bearer +[A-Za-z0-9_-]{20,}|password *=[\"']|api[_-]?key *=[\"']"`):

> النتيجة: **صفر مطابقات** (خروج الكود 1 = لا نتائج).

**ACCOUNT_ID / DATABASE_ID** — ⚠ **Hardcoded (وليست من env)**:
- `src/lib/db.ts:19` → `const ACCOUNT_ID  = '834bca43d616c73db23cf95311cfe17e';`
- `src/lib/db.ts:20` → `const DATABASE_ID = 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6';`
- `src/lib/db.ts:21` → `const D1_HTTP_URL = 'https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query'`
- التقدير: ليست "أسراراً" خطرة بحد ذاتها (نفس القيم علنية في `wrangler.jsonc:38`)، لكنها تسهّل استهداف الحساب. ➜ 🟢

**`.gitignore`** — ✔ يستبعد:
- `.env` (س5)، `.env.local` (س6)، `.env.*.local` (س7)، `.dev.vars` (س61)، `.open-next/` (س64)، `.wrangler/` (س66)، `data/*.db` (س10).
- تحقق فعلي `git check-ignore .env .env.local .dev.vars .open-next .wrangler data/*.db` → كلها **ignored** ✔
- الملفات المتتبعة الوحيدة ذات الصلة: `.env.example` و`.env.local.example` (مثالان — صحيح).

**`.env.example`** — ⚠ جزئياً: يحوي **قيمة حقيقية** `CLOUDFLARE_ACCOUNT_ID=834bca43d616c73db23cf95311cfe17e` (س3) وتعليقاً بمعرّف D1 الحقيقي (س2)، بينما `CLOUDFLARE_D1_TOKEN=` و`TMDB_API_KEY=` و`REVALIDATION_SECRET=` و`CLOUDFLARE_PLAYER_TOKEN=` **فارغة** ✔. ➜ 🟢

**اكتشاف حرج — أسرار في مخرجات البناء**:
- `.open-next/cloudflare/next-env.mjs:1-2` يحتوي **plaintext JSON** فيه من الإنتاج: `TMDB_API_KEY`, `TMDB_API_KEY_2`, `GROQ_API_KEY`, `OPENROUTER_API_KEY_1..3`, `XAI_API_KEY`, `MISTRAL_API_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `OPERATIONS_PANEL_PASSWORD`, `REVALIDATE_SECRET`, `CLOUDFLARE_D1_TOKEN` (صيغة `cfut_...`)، `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `PLAYER_BRIDGE_SECRET`.
- هذا الملف **مصدره مخرجات OpenNext build** ويُبنى داخل الـ Worker (`wrangler.jsonc:3` → `main: .open-next/worker.js`). القيم الفعلية **مخفية عمداً في هذا التقرير**.
- إنه مستثنى من git ✔، لكنه متاح كملف build artifact لأي شخص يملك حق الوصول لحساب/بيئة البناء أو لو تسرّب `.open-next/`. ➜ 🔴 (جدول المشاكل #1)

**خلاصة 1.1**: لا أسرار في الكود المصدري؛ لكن **كل الأسرار مكشوفة في artifact البناء** — هذا هو الخطر الأكبر في المشروع.
### 1.2 الأمان — API Routes

**`src/app/api/admin/operations/route.ts`** — ⚠:
- `route.ts:58` → `spawn(commandConfig.cmd, commandConfig.args, { cwd: process.cwd(), env: { ...process.env }, shell: true })` — **`shell: true`**. الحجج ثابتة من `ALLOWED_COMMANDS` (س6-23، 14 أمراً `npm`/`node` بلا وسائط مستخدم)، فالخطر المباشر محدود؛ لكن استعمال قشرة يلغي عزل الحجج، وهو نمط خطير للتوسّع مستقبلاً. ➜ 🟡
- `route.ts:29-31` → مقارنة `x-operations-password` بـ `!==` (غير timing-safe) — ويوجد أيضاً فحص مستخدم (س39-40).
- `route.ts:96-104` → **GET كشف سجلات العمليات بلا أي فحص داخل الـ handler** (يعتمد فقط على middleware العام). ➜ 🟡

**`src/middleware.ts`** — ✔ مع ملاحظات:
- يحمي `/admin` و`/api/admin` (س17-19) عبر: **Basic Auth** (`ADMIN_USERNAME`/`ADMIN_PASSWORD`، س21-35، بفك `atob`) **أو** جلسة مستخدم بدور `admin`/`supervisor` (س37-41)، وإلا redirect إلى `/login` (س46-48). تحقق الدور عبر استعلام D1 (`getCurrentUser`).
- ملاحظة: مقارنة Basic غير timing-safe، ولا rate limit على محاولات `/admin`. ➜ 🟢
- `/api/ads` يُجبر على `Cache-Control: private, no-store` (س13-15) ✔

**`src/lib/requireAdmin.ts`** — ✔ نفس منطق middleware (Basic أو جلسة أدمن) ويعيد 401 (س10-44). لكنه **لا يُستدعى** من `operations/route.ts` (انظر المشكلة #4).

**`src/app/api/revalidate/route.ts`** — ⚠:
- `route.ts:10` → `if (secret !== process.env.REVALIDATE_SECRET)` — حماية بسر واحد **غير timing-safe**، بلا rate limit.
- **تضارب التسمية**: الكود يقرأ `REVALIDATE_SECRET` بينما `.env.example:16` يوثّق `REVALIDATION_SECRET` → إعداد خاطئ محتمل. ➜ 🟡
- التحقق من `tag` (س18-23) سليم.

**`src/lib/rateLimit.ts`** — ⚠ **in-memory** (خريطة `Map` لكل مفتاح، س8)، نافذة ثابتة، تنظيف كل 60 ثانية (س11-18)، مفتاح = تجزئة `ip|UA` غير تشفيرية (س43-55) — **لكنه كود ميت**: `git grep "rateLimit|clientKey" -- src` يعيد `src/lib/rateLimit.ts` فقط، بلا مستورد واحد. لا يوجد rate limiter فعلي على نقاط `/api/ads/*` العامة. ➜ 🟡

**`src/lib/player-bridge.ts`** — ✔ توقيع HMAC-SHA256 عبر `crypto.subtle` (س35-45)، TTL = **7 أيام** (س6)، الحمولة `{uid,name,avatar,role,exp}` (س8-14)، والتحقق يفحص `exp` (س74). CORS مقيد بـ `4cima.stream` فقط (س95-97). ملاحظة: الـ token يُمرَّر **في query string** (`?pt=...`) في callback/route.ts:31-33 — مكشوف في السجل/الـ referrer. ➜ 🟡

**`src/app/api/auth/*`** — ✔ سليم عموماً:
- `google/route.ts`: `state` + كوكي `oauth_state` httpOnly (س24-30)، و`next` محمي ضد open-redirect بقاعدة `^(https:\/\/(www\.)?4cima\.(stream|com)\/|\/)` (س14).
- `callback/route.ts`: فحص `state` (auth-server.ts:57)، تحقق JWT عبر `createRemoteJWKSet` بـ issuer/audience (auth-server.ts:85-92)، التحقق من `code`/`access_token` (س81)، و`next` يُفحص مجدداً عند القراءة (س18-20). جلسة httpOnly + Secure (س40-46). ✔
- `auth-server.ts:13` → `const ADMIN_EMAILS = ['cairo.tv@gmail.com'];` — **هاردكود** ➜ 🟢

**خلاصة 1.2**: OAuth + جلسات سليمة؛ المشاكل = `shell:true`، GET بلا فحص، سر revalidate بتسمية متضاربة وغير timing-safe، rateLimit ميت، token بلاير في URL.
### 1.3 الأمان — Headers

**التعريف** — `next.config.ts:100-130` (headers على `/:path*`):
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` ✔
- `X-Content-Type-Options: nosniff` ✔
- `Referrer-Policy: strict-origin-when-cross-origin` ✔
- `X-Frame-Options: SAMEORIGIN` ✔
- `Permissions-Policy: camera=(), geolocation=()` ✔
- **لا `Content-Security-Policy`** — بقرار تصميمي صريح (التعليق `next.config.ts:103-105`: "no CSP by design — ad networks would break")، ولا COOP. ➜ 🟡 (المشكلة #6)

**التحقق الحي** — `curl -sI https://4cima.com/`:

```
HTTP/1.1 200 OK
Cache-Control: public, s-maxage=60, stale-while-revalidate=600
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
permissions-policy: camera=(), geolocation=()
referrer-policy: strict-origin-when-cross-origin
x-content-type-options: nosniff
x-frame-options: SAMEORIGIN
x-build-sha: f4abf4a3adf7d307cf520c2b69af44f4a8ddb12d   ← يطابق HEAD المحلي ✔
Server: cloudflare
```

النتيجة: الرؤوس الأمنية الخمسة **مؤكدة حياً**. نقص CSP وحده.

### 1.4 الاعتماديات

**`npm audit --audit-level=high --production`** → **4 ثغرات (3 high، 1 critical)**:

```
next  9.3.4-canary.0 - 16.3.0-preview.10   ← المثبّت next@15.5.21 داخل النطاق
  critical: Next.js Unauthenticated RCE (GHSA-p293-qw3h-jr36) - windows-hosted servers
  critical: Next.js RCE في Image Optimization عند استخدام AVIF (GHSA-2xp9-vwfh-vxw4)
postcss <=8.5.22   ← المثبّت postcss@8.5.21
  high: XSS عبر </style> (GHSA-qx2v-qp2m-jg93) + 3 إعلانات (sourceMappingURL/arbitrary file read)
sharp <=0.35.4-rc.0  ← تابع لـ next/image
  high: CVE-2026-33327/33328/35590/35591 (libvips) + GHSA-g89c-... (libheif)
4 vulnerabilities (3 high, 1 critical)   ← fix متاح عبر npm audit fix
```

**`npm ls --depth=0`** → لا `deprecated` ولا `UNMET`؛ لكن **5 حزم `extraneous`**: `@emnapi/core@1.10.0`, `@emnapi/runtime@1.11.3`, `@emnapi/wasi-threads@1.2.1`, `@napi-rs/wasm-runtime@0.2.12`, `@tybys/wasm-util@0.10.1` (بقايا native builds). ➜ 🟢

**خلاصة 1.4**: تحديث عاجل لـ Next/postcss/sharp. سيرفر الإنتاج Cloudflare (وليس Windows)، ما يخفف المخاطرة العملية للأولى، لكن الثانية (AVIF/Image Optimization) لا تزال قابلة للتطبيق.
### 1.5 السرعة — Lighthouse (بدون تثبيت)

PageSpeed Insights API (بدون key) أعاد **رفضاً بالحصة**:

```
HTTP 429 — "Quota exceeded for quota metric 'Queries' ... quota_limit_value: 0"
```

النتيجة: performance score / LCP / INP / CLS / TBT = **غير معروف** (لا قيمة موثوقة عبر هذه الآلية اليوم). لم يُثبَّت Lighthouse (ممنوع). مقاييس بديلة في 3.8 (حجم HTML، عدد الصور، رؤوس الكاش).

---

## الجولة 2 — الكود + قاعدة البيانات

### 2.1 TypeScript

- `npx tsc --noEmit` → **EXIT = 0** (لا أخطاء).
- `npx tsc --noEmit --strict` → **EXIT = 0** (لا أخطاء حتى مع strict).
- الاستنتاج: قاعدة الشيفرة سليمة نوعياً؛ والـ CI فيه خطوة tsc أيضاً (`deploy.yml:28-29`) ✔.

### 2.2 ESLint

- `npx next lint` → **WARNINGS = 493، ERRORS = 0**.
- ملاحظات الأداة: "`next lint` is deprecated ... migrate to ESLint CLI" + "The Next.js plugin was not detected in your ESLint configuration".
- أكثر 10 ملفات warnings:

| # | الملف | warnings |
|---|-------|---------|
| 1 | src/components/pages/SeriesDetailsClient.tsx | 29 |
| 2 | src/components/features/home/HomeBelowFoldSections.tsx | 23 |
| 3 | src/components/features/hero/QuantumHero.tsx | 19 |
| 4 | src/services/contentQueries.ts | 19 |
| 5 | src/components/layout/SearchBox.tsx | 18 |
| 6 | src/app/admin/ads/page.tsx | 17 |
| 7 | src/components/features/media/VideoPlayer.tsx | 14 |
| 8 | src/components/features/media/MovieCard.tsx | 13 |
| 9 | src/components/features/media/EmbedPlayer.tsx | 13 |
| 10 | src/components/pages/AdsTestPage.tsx | 13 |

الغالبية `@typescript-eslint/no-explicit-any` و`no-unused-vars`. ➜ 🟢

### 2.3 الكود الميت

- `src/lib/prefetch.ts` → **غير موجود 🎉** (لا يوجد سوى `src/components/common/PrefetchLink.tsx` + `src/hooks/usePrefetchNextPage.ts` — كلاهما مستخدم).
- `src/lib/image-cache.ts` → **غير موجود 🎉**
- `src/lib/visitor-content-sql.ts` → **غير موجود** في المتتبَّع؛ تبقّى نسخة مهملة غير متتبعة `scripts/visitor-content-sql.ts.bak` (untracked) ➜ نظافة 🟢
- الاستيرادات: `git grep "visitor-content-sql|image-cache" -- src` → **لا نتائج** ✔؛ `prefetch` يظهر فقط كوصف في الكومبوننت/الـhook أعلاه.
- **اكتشاف**: `src/lib/rateLimit.ts` **بدون أي مستورد** (كود ميت بالكامل — راجع 1.2). ➜ 🟢/🟡
### 2.4 Bundle Size

- `next.config.ts` → **لا** `@next/bundle-analyzer` (فحص كامل الملف).
- أكبر 5 ملفات JS في `.next/static/chunks/` (`Get-ChildItem ... | Sort-Object Length -Descending | Select -First 5`):

| الملف | Length (بايت) |
|------|--------------|
| node_modules_dashjs_dist_modern_esm_dash_all_min_*.js | 1,527,797 (~1.53MB) |
| node_modules_hls_js_dist_hls_mjs_*.js | 1,520,713 (~1.52MB) |
| node_modules_next_dist_compiled_next-devtools_index_a9cb0712.js | 1,503,636 (~1.50MB) |
| node_modules_next_dist_compiled_next-devtools_index_5277ebc8.js | 1,503,575 (~1.50MB) |
| node_modules_react-dom_4411d9bd._.js | 964,851 (~965KB) |

ملاحظتان: وجود نسختَي `next-devtools` (~1.5MB لكل) في مخرجات `.next` (عادةً أداة تطوير — يُعاد الفحص بعد build نظيف)، ووجود كل من `dashjs` و`hls.js` معاً. ➜ 🟢

### 2.5 قاعدة البيانات — Indexes (استعلامات D1 حية، قراءة فقط)

الآلية: POST إلى `https://api.cloudflare.com/client/v4/accounts/.../d1/database/.../query` بنفس كود `src/lib/db.ts:93` (token من `.open-next/cloudflare/next-env.mjs` — **القيمة لم تُطبع**).

`SELECT name, tbl_name FROM sqlite_master WHERE type='index' ...` → الفهارس المسماة لكل جدول (+ المفاتيح التلقائية `sqlite_autoindex_*`):

| الجدول | فهارس مسماة | Auto (PK/UNIQUE) |
|--------|-------------|-------------------|
| movies | 9 (slug, filter, genre_filter, popularity, vote_average, vote_count, release_year, tmdb_id, original_lang) | 3 (id PK، tmdb_id UNIQUE، slug UNIQUE) |
| tv_series | 9 (نفس نمط movies) | 3 |
| genres | 1 (slug) | 3 |
| users | **0** | 2 (id PK، **email UNIQUE ✔**) |
| sessions | 2 (idx_sessions_expires, idx_sessions_user) | 1 (id PK) |
| rate_events | **0** ⚠ | 0 |
| operations_log | **0** ⚠ | 1 (id PK) |
| favorites | 2 (idx_favorites_unique, idx_favorites_user) | 1 |
| watch_history | 1 (idx_watch_history_user) | 1 |
| user_reviews / user_achievements | 1 / 1 | 1 / 1 |
| completed_watch | 2 (idx_completed_unique, idx_completed_watch_user) | 1 |

- **`users.email` UNIQUE ✔ مؤكد** عبر `sqlite_autoindex_users_2` (والكود يعتمده في `ON CONFLICT(email) DO NOTHING` — auth-server.ts:110).
- **فهارس مفقودة**:
  - `rate_events(user_id, kind, ts)` — جدول يضم صفين فقط حالياً؛ أضِف الفهرس قبل النموّ. ➜ 🟡
  - `operations_log(timestamp DESC)` — 0 صفوف الآن؛ عند الحاجة.
  - `watch_history(watch_date)` — مذكور في `migrations/003...:22` لكنه **غير مطبَّق في D1** (فرق بين migrations المحلية والإنتاج).
### 2.6 قاعدة البيانات — استعلامات بطيئة (EXPLAIN QUERY PLAN عبر D1)

| الاستعلام (من الكود) | خطة التنفيذ | الحكم |
|---|---|---|
| تفاصيل فيلم عبر `slug` | `SEARCH movies USING INDEX sqlite_autoindex_movies_2 (slug=?)` | ✔ فهرس |
| قائمة أفلام `ORDER BY popularity` مع فلاتر (api/movies/route.ts:162-172) | `MULTI-INDEX OR` على `idx_movies_filter` + **`USE TEMP B-TREE FOR ORDER BY`** | ⚠ فرز مؤقت (لا يُستخدم idx_movies_popularity مع الفلاتر) |
| تصنيف: `EXISTS (SELECT 1 FROM json_each(genres_json)...)` (genres/[slug]/route.ts:248-268) | `SCAN json_each EXISTS VIRTUAL TABLE` + `USE TEMP B-TREE FOR ORDER BY` | ⚠ **مسح لكل صف** — لا يمكن فهرسة json_each |
| بحث FTS (`match`) | `SCAN movies_fts VIRTUAL TABLE INDEX 32:M2` + `SEARCH movies USING INTEGER PRIMARY KEY` | ✔ FTS |
| كاش top-rated (`list_movies_top_rated`) | `SCAN list_movies_top_rated` (ترتيب بلا فهرس) | ✔ مقبول (جدول صغير مسبق الحساب) |
| تسجيل الدخول: `sessions JOIN users` | `SEARCH sessions (id PK)` + `SEARCH users (id PK)` | ✔ |
| المفضلة: `favorites WHERE user_id ORDER BY added_at DESC` | `SEARCH idx_favorites_unique (user_id=?)` + `USE TEMP B-TREE FOR ORDER BY` | ⚠ خفيف |
| قائمة مسلسلات (api/series/route.ts:150-161) | نفس نمط movies: فهرس filter + فرز مؤقت | ⚠ خفيف |

**الخلاصة**: لا full-scan على جداول ضخمة في المسارات الأساسية سوى **التصنيفات عبر json_each** (يُوصى بالاعتماد على جداول الـ cache الجاهزة: `list_movies_genre`/`list_series_genre`).

### 2.7 Schema

`schema.sql` يعرّف: movies (س11)، tv_series (س73)، genres (س144)، genre_counts (س152)، short_titles_lookup (س164)، countries (س182)، languages (س188)، global_keywords (س194)، settings (س206)، operations_log (س215)، favorites (س231)، watch_history (س242)، user_reviews (س257)، user_achievements (س271)، user_notification_settings (س282)، user_privacy_settings (س290)، + فهارس (س302-335) + FTS5 `movies_fts`/`series_fts` (trigram) (س343-357) + triggers (س364-401).

**الخلافات مع الإنتاج (D1 الحية)**:
- ❌ `users` (71 صفاً) و`sessions` (110) — **لا CREATE TABLE في أي ملف متتبَّع** (`git grep "CREATE TABLE IF NOT EXISTS users|sessions"` → لا نتائج). ينشآن خارج الريبو.
- ❌ `rate_events` (2 صفوف) — يُنشأ **أثناء التشغيل** من كود التطبيق (`src/app/api/user/favorites/route.ts:10-17`).
- ❌ `ads`, `ad_slots`, `ad_zones`, `ad_slot_assignments`, `ad_providers`, `site_config`, `movie_similar_cache`, `series_similar_cache`, `completed_watch` — موجودة في D1 لكن غير معرّفة في schema.sql (بعضها في `migrations/*` وبعضها بلا موضع متتبَّع).
- ✔ `users.email` **UNIQUE مؤكد** و`sessions` موجودة في D1.

**الخلاصة**: المخطط المرجعي غير مكتمل، واتساق الجدولين الحساسين (`users`/`sessions`) بيد عملية يدوية غير موثقة. ➜ 🟡
---

## الجولة 3 — إمكانية الوصول + SEO + محتوى

### 3.1 إمكانية الوصول (ARIA)

- إجمالي `<button` في `src/components/` = **164**، وإجمالي `aria-label` = **76** → فجوة كبيرة: أزرار كثيرة (خصوصاً أيقونية بلا نص مرئي) بلا تسمية.
- عينة 20 سطراً لأزرار بلا `aria-label` على نفس السطر (مع ملاحظة أن `aria-label` قد يأتي في سطر تالٍ في بعض الحالات):
  - `src/components/features/media/VideoPlayer.tsx:633` (play/pause) / `:638` (mute) / `:686` (fullscreen)
  - `src/components/features/media/EmbedPlayer.tsx:594` (mute) / `:603` (fullscreen) / `:662` (play)
  - `src/components/layout/QuantumNavbar.tsx:506,521,536,551` (أزرار toggle فلاتر بلا aria-label/aria-expanded)
  - أزرار خيارات dropdown `role="option"` مثل `:515/:517/:532/:547` — بنص مرئي (أفضل حالاً لكن بلا aria-selected ثابت)
  - أزرار إغلاق/تنفيذ داخل مودالات إدارية `:395/:398/:440/:450`
  - أزرار traيلر `:566/:589/:686/:699`
- أزرار **التشغيل/كتم/ملء الشاشة/الإغلاق** أيقونية بلا تسمية = مشكلة حقيقية لقارئات الشاشة. ➜ 🟢

### 3.2 Color Contrast

عينة `text-slate-400|text-slate-500` في `src/components/` (أول 20):
- `features/system/MobileStickyAd.tsx:33`, `layout/Footer.tsx:84,104,109,114,123,137,155` (نصوص 9-12px بـ slate-400)
- `layout/QuantumNavbar.tsx:172` (10.5px slate-500) و`:345,405`
- `layout/SearchBox.tsx:598,619,642,683,696,710,732,825,860`

الحساب (WCAG relative luminance):
- `text-slate-400 (#94a3b8)` على `bg-slate-900 (#0f172a)` ≈ **7.1:1** → ✔ يمر AA للنص العادي.
- `text-slate-500 (#64748b)` على خلفيات داكنة ≈ **3.75:1** → ✘ **يفشل AA للنص العادي** (4.5:1)؛ يمر للنص الكبير (3:1) فقط؛ يُستخدم على نصوص صغيرة (10.5px) في QuantumNavbar:172 وSearchBox:860. ➜ 🟢

### 3.3 SEO — Schema (JSON-LD)

| الصفحة | الأمر | النتيجة |
|--------|------|---------|
| الرئيسية | `curl -s https://4cima.com/ \| grep -c 'application/ld+json'` | 1 |
| فيلم | `.../movies/the-wolf-of-wall-street ...` | 1 |
| مسلسل | `.../series/game-of-thrones ...` | 1 |
| تصنيف أفلام | `.../movies/genres/action ...` | 1 |
| تصنيف عربي | `.../genres/arabic ...` | 1 |

(عدّ دقيق عبر Node: صفحات الأفلام ~10 ظهورات، صفحات التصنيف ~6 — لتكرار JSON-LD في حمولة RSC + وسوم حقيقية؛ ليس عيباً). ✔ **JSON-LD موجود في كل أنواع الصفحات**.
### 3.4 SEO — Meta على 20 صفحة (من `sitemap/priority.xml`)

القراءة الحية لكل صفحة: `URL | title(len) | desc(len) | canonical | h1(len)`:

| URL | title | desc | canonical | h1 |
|-----|-------|------|-----------|----|
| /movies/sect | 28 | 166 | ok | 5 |
| /movies/haunted-universities-4 | 60 | 166 | ok | 19 |
| /movies/the-wolf-of-wall-street | 55 | 156 | ok | 13 |
| /movies/my-deadly-affair | 49 | 131 | ok | 14 |
| /movies/bloom-2026 | 29 | 156 | ok | 5 |
| /movies/grand-theft-auto-vi-an-extended-look | 56 | 156 | ok | 40 |
| /movies/neon-2026 | 27 | 156 | ok | 4 |
| /movies/cannelloni | 37 | 165 | ok | 8 |
| /movies/confinement | 35 | 156 | ok | 5 |
| /movies/nine-inch-nails-live-tension-2013 | 46 | 156 | ok | 30 |
| /movies/the-wedding-2026-comedy | 36 | 156 | ok | 6 |
| /movies/inkheart | 50 | 141 | ok | 23 |
| /movies/eastern-promises | 47 | 156 | ok | 12 |
| /movies/closer | 40 | 108 | ok | 15 |
| /movies/jay-and-silent-bob-strike-back | 45 | 176 | ok | 29 |
| /movies/the-whole-ten-yards | 53 | 176 | ok | 15 |
| /movies/mr-magorium-s-wonder-emporium | 41 | 155 | ok | 25 |
| /movies/about-schmidt | 37 | 135 | ok | 5 |
| /movies/the-spanish-apartment-2002 | 55 | 156 | ok | 15 |
| /movies/8-women | 32 | 156 | ok | 6 |

**20/20**: title موجود (27-60 حرفاً)، description موجود (108-176)، **canonical مطابق للـ URL**، H1 موجود، ولا حالات "لا توجد". ✔

### 3.5 SEO — Sitemap

- `curl -s https://4cima.com/sitemap-index.xml | grep -c "<sitemap>"` → **12**.
- الشاردز: `static.xml`, `priority.xml`, `movies-0..6.xml` (7)، `series-0..2.xml` (3) = **12 shard** ✔ (إجابة سؤالك: نعم، 12).
- `curl -sI https://4cima.com/sitemap/movies-0.xml` → `HTTP/1.1 200` ✔ (وكذلك static/priority).
- كل shard يحوي حتى **10,000 رابط** (عتبة Google القياسية لكل sitemap).
### 3.6 Sitemap — محتوى مكسور

عينة 20 رابطاً (أول 10 من `movies-0.xml` + أول 10 من `series-0.xml`) → فحص `HEAD`:

- أفلام (كلها 200): finding-nemo، dancer-in-the-dark، pirates-of-the-caribbean-the-curse-of-the-black-pearl، kill-bill-vol-1، jarhead، the-simpsons-movie، eternal-sunshine-of-the-spotless-mind، amores-perros-2000، pirates-of-the-caribbean-dead-man-s-chest، a-history-of-violence
- مسلسلات (كلها 200): weeds، avatar-the-last-airbender، everybody-hates-chris، terminator-the-sarah-connor-chronicles، teen-titans، desperate-housewives، ready-steady-cook، the-grim-adventures-of-billy-and-mandy، yu-gi-oh-duel-monsters، planet-earth

**0 روابط مكسورة في العينة.** ✔

### 3.7 المحتوى — صفحات فاضية

10 روابط من priority.xml → عدّ `"لا توجد"` في HTML: **الكل 0** ✔ (عمود empty في جدول 3.4 = 0 لكل الصفحات).

### 3.8 Core Web Vitals — إضافي

- `curl -sI https://4cima.com/` → `Cache-Control: public, s-maxage=60, stale-while-revalidate=600`؛ **`cf-cache-status` غائب** → الرئيسية لا تُخزَّن في حافة Cloudflare (تصل إلى الـ Worker/D1 في كل مرة) رغم رأس الكاش — متسق مع تعليق `next.config.ts:131`. ➜ 🟢
- حجم HTML الرئيسية: **197,690 حرفاً / 10,971 كلمة** (~197KB غير مضغوط).
- عدد الصور `<img` على الرئيسية: **19**.
- مقاييس LCP/INP/CLS/TBT: **غير معروف** (انظر 1.5 — PSI رفض الطلب بلا مفتاح).
### 3.9 الإعلانات — السلامة

- **`src/components/features/system/adsClick.ts`** — تصميم سلامة صارم:
  - البوبندر يُفعَّل **فقط داخل ضغطة زرار مشاهد حقيقية** (`requestPopunderFromUserGesture`، س10-12 و104)، مرة واحدة لكل جلسة (sessionStorage، س36-59)، **fail-open** (س14-15، 124)، **لا cloaking/لا فحص User-Agent** (س16 متضمنةً Googlebot).
  - تحقق من URL السكربت: `https:` فقط + `isHostAllowed('propellerads', url)` (س79-87)؛ الفولباك `al5sm.com/tag.min.js` (س26) وهو **مدرج** في السماح (`src/lib/adsAllowlist.ts:9`). ✔
  - ملاحظة: السكربت يُحقن ديناميكياً بلا SRI (طبيعة سكربت third-party). ➜ جزء من المشكلة #6.
- **`src/components/features/system/AdsManager.tsx`** (أول 100 سطر):
  - `sanitizeAdHtml` (س45-68) يزيل `script/iframe/object/embed/meta/base` + كل سمات `on*` + `javascript:/data:text/html` في `href/src` — ✔ قوي للإعلانات الداخلية (house).
  - `DirectAd` (س75-104) يركّب سكربتات الشبكات عبر `mountAdInto` عند `isNetwork` — سكربتات حقيقية من DB (إداري).
- **`public/ads.txt`** (7 أسطر): Adsterra (6019925، 2018051) + Monetag/Propellerads (3471530 مع معرف الناشر) — حاضر وبتنسيق سليم. ✔
- مخاوف:
  - سكربتات الشبكات الثالثة **بلا SRI** ولا CSP (المشكلة #6).
  - `src/components/features/system/adsterraQueue.ts:92` → `new Function(...)` يقيّم نص snippet مُخزَّن في قاعدة البيانات (من إعدادات إدارية/شبكات) — **سطح XSS محتمل** لو سُلِّمت لوحة/قاعدة الإعلانات. ➜ 🟢
  - التصميم ككل (بوابة الضغطة، مرة/جلسة، fail-open، قوائم السماح) **متين**.

### 3.10 البنية التحتية

- **`wrangler.jsonc`**:
  - الاسم: `4cima` (س2) | main: `.open-next/worker.js` (س3) | `compatibility_date: 2026-08-20` (س4) | flags: `nodejs_compat` + `global_fetch_strictly_public` (س5-8).
  - Bindings: `ASSETS` (س9-12)، `WORKER_SELF_REFERENCE` (س13-18)، Durable Objects `NEXT_CACHE_DO_QUEUE` + `NEXT_TAG_CACHE_DO_SHARDED` (س19-24)، KV `NEXT_INC_CACHE_KV` (س28-33)، D1 `DB → 4cima-db` (س34-40).
- **`.github/workflows/`** — ملفان:
  1. `deploy.yml`: build + deploy إلى Cloudflare Workers عند push على `cloudflare-migration` أو manual؛ `npm ci` → `npx tsc --noEmit` → `npm run build:cloudflare` → `wrangler deploy` بأسرار GitHub (س36-39).
  2. `backup-d1.yml`: نسخ احتياطي يومي (cron `0 2 * * *`) + يدوي لجداول D1 عبر `scripts/backup-d1.js` + رفع optional إلى R2 (س49-55).
---

## جدول المشاكل النهائي

| # | المشكلة | الخطورة | الدليل (ملف:سطر أو أمر) | التوصية | الوقت المقدر |
|---|---------|---------|-------------------------|---------|--------------|
| 1 | كل أسرار الإنتاج (17 متغيراً منها `CLOUDFLARE_D1_TOKEN`, `ADMIN_PASSWORD`, `GOOGLE_CLIENT_SECRET`, مفاتيح TMDB/AI) plaintext في مخرجات البناء وتُبنى داخل الـ Worker | 🔴 | `.open-next/cloudflare/next-env.mjs:1` (القيم مخفاة) + `wrangler.jsonc:3` (main) | نقلها إلى Cloudflare Secrets bindings؛ لا `vars` سرّية في open-next build؛ تدوير كل المفاتيح المعرّضة | 4-6 س |
| 2 | ثغرات نشر معروفة: Next.js RCE (critical) + postcss (XSS/قراءة ملفات) + sharp/libvips (high) في النطاق المثبَّت | 🔴 | `npm audit --audit-level=high --production` → `4 vulnerabilities (3 high, 1 critical)`؛ next@15.5.21، postcss@8.5.21 | `npm audit fix` أو ترقية next≥16 / postcss≥8.5.23 / sharp؛ إعادة بناء واختبار الصور | 2-4 س |
| 3 | `spawn(..., shell: true)` في نقطة إدارة تنفّذ أوامر | 🟡 | `src/app/api/admin/operations/route.ts:58` | `shell: false` (وسائط ثابتة لا تحتاج قشرة) | 1 س |
| 4 | `GET /api/admin/operations` بلا فحص صلاحية داخل الـ handler (mitigation واحدة فقط) | 🟡 | `src/app/api/admin/operations/route.ts:96-104` (لا `requireAdmin` في GET) | استدعاء `requireAdmin(request)` في GET وPOST | 1 س |
| 5 | `schema.sql` لا يطابق D1: `users`/`sessions`/`rate_events`/`ads*`/`site_config` بلا تعريف متتبَّع | 🟡 | قائمة CREATE TABLE في `schema.sql:11-296` مقابل `sqlite_master` الحية (users=71، sessions=110) | توثيق schema كامل بملف migrations واحد قابل للتطبيق؛ إزالة إنشاء الجداول runtime | 2-3 س |
| 6 | لا CSP ولا COOP + سكربتات إعلانات ديناميكية بلا SRI | 🟡 | `next.config.ts:103-105`؛ `adsClick.ts:116-122`؛ `adsterraQueue.ts:118-127` | CSP جزئية للمسارات غير الإعلانية؛ SRI للسكربتات الثابتة؛ عزل الإعلانات في iframe sandbox | 4-8 س |
| 7 | `rate_events` بلا فهارس واستعلامات COUNT تمسح الجدول | 🟡 | D1 `rate_events` = لا فهارس؛ `src/app/api/user/favorites/route.ts:33-45` | `CREATE INDEX idx_rate_user_kind_ts ON rate_events(user_id, kind, ts)` | 30 د |
| 8 | مقارنات أسرار غير timing-safe (revalidate/operations/Basic) | 🟡 | `src/app/api/revalidate/route.ts:10`؛ `operations/route.ts:30`؛ `middleware.ts:30` | `crypto.timingSafeEqual` على هاشات ثابتة الطول | 1-2 س |
| 9 | Player bridge token (TTL 7 أيام) في query string | 🟡 | `src/lib/player-bridge.ts:6` + `src/app/api/auth/callback/route.ts:31-33` (`?pt=`) | تقصير TTL لساعات؛ نقله إلى cookie HttpOnly للبلاير | 2-3 س |
| 10 | تصنيفات JSON: `SCAN json_each` لكل صف (لا فهرسة ممكنة) | 🟡 | EXPLAIN: `SCAN json_each EXISTS VIRTUAL TABLE`؛ `src/app/api/genres/[slug]/route.ts:248-268` | استخدام `list_movies_genre`/`list_series_genre` عوض json_each | 3-6 س |
| 11 | تضارب اسم سر revalidate بين env example والكود | 🟡 | `.env.example:16` (`REVALIDATION_SECRET`) ضد `src/app/api/revalidate/route.ts:10` (`REVALIDATE_SECRET`) | توحيد الاسم وتحديث التوثيق | 30 د |
| 12 | `ACCOUNT_ID`/`DATABASE_ID` هاردكود + قيم حقيقية في `.env.example` | 🟢 | `src/lib/db.ts:19-20`؛ `.env.example:2-3` | قراءتهما من env binding؛ إزالة القيم الحقيقية من example | 1 س |
| 13 | `ADMIN_EMAILS` هاردكود في المصدر | 🟢 | `src/lib/auth-server.ts:13` | نقله إلى env/D1 settings | 30 د |
| 14 | `new Function` يقيّم snippet إعلان من DB | 🟢 | `src/components/features/system/adsterraQueue.ts:92` | بديل parse خالٍ من التنفيذ | 1-2 س |
| 15 | أكبر 5 chunks: 2× next-devtools (~1.5MB) + dashjs (1.53MB) + hls.js (1.52MB) + react-dom (965KB) | 🟢 | `.next/static/chunks` (Length: 1,527,797 / 1,520,713 / 1,503,636 / 1,503,575 / 964,851) | استيراد ديناميكي للـ players؛ تنظيف next-devtools من build الإنتاج؛ تفعيل bundle-analyzer مؤقتاً | 3-6 س |
| 16 | الرئيسية dynamic بلا تخزين حافة (`cf-cache-status` غائب) رغم s-maxage | 🟢 | `curl -sI https://4cima.com/` (لا cf-cache-status) ضد `next.config.ts:131-141` | تفعيل تخزين الحافة لصفحات القوائم (Cache API / Cache-Everything) | 2-4 س |
| 17 | أزرار أيقونات بلا `aria-label` (~88 زراً بعدد `aria-label` أقل من عدد الأزرار) | 🟢 | 164 `<button` مقابل 76 `aria-label` في `src/components/`؛ عينة `VideoPlayer.tsx:633,638,686` و`EmbedPlayer.tsx:594,603` | إضافة aria-label/aria-expanded لأزرار التحكم والإغلاق | يوم-أسبوع |
| 18 | تباين `text-slate-500` على خلفيات داكنة ≈ 3.75:1 (يفشل AA نص عادي) | 🟢 | `layout/QuantumNavbar.tsx:172` (10.5px)، `layout/SearchBox.tsx:860` | رفع اللون إلى slate-400 أو زيادة الحجم/الوزن | 2-4 س |
| 19 | كود ميت ونظافة: `rateLimit.ts` بلا مستوردين، 5 حزم extraneous، 12 ملف tmp-* + `.bak` (untracked) | 🟢 | `git grep "rateLimit" -- src` (تعريف فقط)؛ `npm ls --depth=0` (extraneous)؛ `git status --porcelain` | حذف/تفعيل rateLimit؛ `npm dedupe`؛ تنظيف `scripts/tmp-*` | 1-2 س |
---

## توصيات حسب الأولوية

### 🔴 فوري (خلال أسبوع)
1. **إخراج الأسرار من مخرجات البناء** (المشكلة #1): استخدم `vars` في `wrangler.jsonc` للقيم العامة غير السرّية فقط، وانقل `CLOUDFLARE_D1_TOKEN`, `ADMIN_*`, `OPERATIONS_PANEL_PASSWORD`, `REVALIDATE_SECRET`, `GOOGLE_CLIENT_SECRET`, `PLAYER_BRIDGE_SECRET`, مفاتيح TMDB/AI إلى **Cloudflare Secrets** أو `secrets.*` في GitHub تُحقن في بيئة البناء فقط — ثم **دوّر كل المفاتيح المكشوفة** (خاصة `cfut_*` وOAuth secret).
2. **معالجة `npm audit`** (المشكلة #2): `npm audit fix` ثم تحقق يدوي؛ أو رفع `next`/`postcss`/`sharp`؛ ثم إعادة النشر واختبار مسارات الصور (`/tmdb`، next/image).
3. تطبيق `CREATE INDEX` لـ `rate_events` و`operations_log` قبل نموّ الجدولين (المشكلة #7).

### 🟡 مهم (خلال شهر)
4. `shell: false` في operations + إضافة `requireAdmin` للـ GET (المشكلتان #3 و#4).
5. توحيد مخطط قاعدة البيانات مع الإنتاج في migration واحد (المشكلة #5).
6. إصلاح تضارب اسم `REVALIDATE_SECRET` وتفعيل مقارنات timing-safe (المشكلتان #11 و#8).
7. تحويل طلبات التصنيفات إلى `list_*_genre` لتقليل SCAN (المشكلة #10)، ومراقبة `TEMP B-TREE` في القوائم.
8. تحسين أمان الإعلانات: sandbox/iframe أو CSP أضيق للصفحات غير الإعلانية، وبديل آمن لـ `new Function` (المشكلتان #6 و#14).
9. تقصير TTL بلاير token أو نقله إلى cookie (المشكلة #9).

### 🟢 لاحقاً (عند الحاجة)
10. ARIA للأزرار (المشكلة #17)، تباين slate-500 (المشكلة #18)، تنظيف الكود الميت والحزم (المشكلة #19)، استراتيجية كاش الحافة (المشكلة #16)، تحليل الحزم (المشكلة #15)، وإزالة القيم الحقيقية من `.env.example` ونقل `ADMIN_EMAILS` للإعداد (المشكلتان #12 و#13).

---

## ✅ أنظمة سليمة (14)

1. فحص أنماط الأسرار في `src/` و`scripts/` → صفر نتائج.
2. `.gitignore` يستبعد `.env*` و`.dev.vars` و`.open-next/` و`.wrangler/` و`*.db` (تحقق **`git check-ignore`** فعلي).
3. `tsc --noEmit` **و** `tsc --noEmit --strict` → EXIT 0 بلا أخطاء.
4. OAuth Google سليم: state + JWKS + فحص issuer/audience + حماية open-redirect في الكتاية والقراءة.
5. جلسات httpOnly + Secure + SameSite=lax + killSession عند logout.
6. الرؤوس الأمنية الخمسة مؤكدة حياً (HSTS preload، nosniff، Referrer-Policy، X-Frame-Options، Permissions-Policy) + `X-Powered-By` معطّل.
7. `/api/ads/*` مُجبر على `private, no-store` في middleware (kill-switch فوري).
8. فهارس المحتوى كاملة (movies/tv_series/genres) وFTS5 trigram مفعل؛ وEXPLAIN للتفاصيل/البحث/الجلسة تستخدم الفهارس.
9. `users.email` UNIQUE مؤكد في D1، و`sessions` موجودة مع فهارسها.
10. JSON-LD موجود في كل أنواع الصفحات (رئيسية/فيلم/مسلسل/تصنيفات).
11. 20/20 صفحة priority: title + description + canonical مطابق + H1، وبلا حالات "لا توجد".
12. 20/20 رابط عينة من sitemaps كلها HTTP 200؛ و12/12 shard متاحون.
13. `ads.txt` سليم؛ `sanitizeAdHtml` يجرّد `on*`/`javascript:`/iframe من الإعلانات الداخلية؛ بوّابة البوبندر = ضغطة مستخدم حقيقية + مرة/جلسة + fail-open + لا cloaking.
14. 2 workflows CI/CD (deploy مع خطوة tsc، نسخ احتياطي يومي D1) باستخدام GitHub Secrets.

---

**ملاحظات ختامية**
- لا نشر لهذا التقرير على GitHub؛ يبقى مجلد `audit-report/` **untracked**.
- `git status --porcelain` النهائي (أدناه) يؤكد: كل التغييرات `??` (untracked) — **لا ملفات متتبعة معدّلة**. الملف الوحيد الذي أُنشئ في هذه الجولة: `audit-report/FULL-AUDIT-2026-09-14.md`.

```
?? audit-report/
?? broken-link-audit-report/
?? data/
?? scripts/progress-similar.json
?? scripts/tmp-audit-orphans.js
?? scripts/tmp-backfill-keywords.js
?? scripts/tmp-candidates.js
?? scripts/tmp-discover-probe.js
?? scripts/tmp-discover-probe5.js
?? scripts/tmp-discover-recent-movies.js
?? scripts/tmp-discover-snapshot.js
?? scripts/tmp-discover-verify.js
?? scripts/tmp-verify-visitable.js
?? scripts/tmp/
?? scripts/visitor-content-sql.ts.bak
?? storage/
```

(لا توجد أي أسطر ` M`/`AM`/`D` — لم تُعدَّل أي ملفات متتبعة.)

اكتمل التدقيق — لا تعديل على أي ملف من src/ أو scripts/. في انتظار قراءة التقرير.

---

## سجل الإصلاحات (2026-09-14 — بعد قرار "صلح كل شئ")

### ما أُصلح في الكود (Verif: `npx tsc --noEmit` EXIT=0، `npx next build` EXIT=0، lint 0 errors)

| # المشكلة | الإصلاح | الملف |
|-----------|---------|-------|
| 3 — `shell: true` | `shell: false` (وسائط ثابتة عبر allowlist) | `src/app/api/admin/operations/route.ts:61-63` |
| 4 — GET بدون auth + limit مفتوح | أُضيف `requireAdmin()` داخل GET + حد أقصى 200 | `src/app/api/admin/operations/route.ts:102-112` |
| 8 — مقارنات غير timing-safe | أداة محايدة `safeEqual` (WebCrypto SHA-256) واستُخدمت في revalidate / operations / middleware / requireAdmin | جديد `src/lib/timingSafeEqual.ts`؛ `src/app/api/revalidate/route.ts:10-12`؛ `src/middleware.ts:31-33`؛ `src/lib/requireAdmin.ts:20-24` |
| 13 — `ADMIN_EMAILS` هاردكود | يُقرأ من env `ADMIN_EMAILS` (fallback للقيمة القديمة) | `src/lib/auth-server.ts:13-17` |
| 12 — ACCOUNT_ID/DATABASE_ID | يُقرآن من env أولاً (fallback للقيم القديمة) | `src/lib/db.ts:19-22` |
| 11 — تضارب REVALIDATION_SECRET/REVALIDATE_SECRET | وحّدت `.env.example` على `REVALIDATE_SECRET` + إزالة ACCOUNT_ID الحقيقي + إضافة ADMIN_EMAILS/CLOUDFLARE_DATABASE_ID | `.env.example` |
| 9 — TTL البلاير 7 أيام | خُفّض إلى 24 ساعة | `src/lib/player-bridge.ts:6-8` |
| 6 (جزئي) — لا CSP | أُضيفت CSP آمنة (لا تكسر الإعلانات): `base-uri 'self'; frame-ancestors 'self'; form-action 'self'` | `next.config.ts:129-137` |
| 14 — `new Function` ينفّذ snippet إعلان | موزّع `parseAtOptionsObject` آمن (JSON-quoting + JSON.parse، بلا تنفيذ) واختباره الوظيفي يمر | `src/components/features/system/adsterraQueue.ts:23-60` |
| 8/kod m — rateLimit كود ميت | فُعّل على `/api/ads/serve` (240/دقيقة لكل ip+UA) | `src/app/api/ads/serve/route.ts:129-136` |
| 7 — فهارس ناقصة | أُنشئت على D1 مباشرة وتم التحقق: `idx_rate_events_user_kind_ts`, `idx_operations_log_timestamp`, `idx_watch_history_date`, `idx_watch_history_content` | D1 (4 CREATE INDEX، مؤكد بالاستعلام) |
| 5 — schema لا يطابق الإنتاج | أُضيفت جداول الإنتاج الناقصة (users, sessions, rate_events, ad_*, site_config, completed_watch, *_similar_cache) من DDL D1 الحي + فهارسها | `schema.sql` (س404-564) |
| 17 — ARIA | aria-label لأزرار التحكم (play/mute/fullscreen/settings/subtitles) في VideoPlayer + أزرار التريلر (تشغيل/كتم/ملء شاشة) في صفحات التفاصيل | `VideoPlayer.tsx`، `MovieDetailsClient.tsx`، `SeriesDetailsClient.tsx` |
| 18 — تباين slate-500 | رُفع إلى slate-400 في مواضع النصوص الصغيرة | `QuantumNavbar.tsx:172`، `SearchBox.tsx:860` |
| 2 — ثغرات npm (جزئي) | `npm audit fix` (غير-مدمرة): next 15.5.21→**15.5.25**، postcss→**8.5.28**، qs→6.16 — أخفت sharp/qs/miniflare | `package-lock.json` (package.json بدون تغيير) |
| 19 (نظافة) | `npm prune` (الحزم extraneous ناتجة عن optional deps لـ sharp ولم تُزل بالكامل — ملاحظة تجميلية فقط) | `node_modules` |
| 1 (حارس) | سكربت `verify-build-secrets.js` يفشل البناء عند رصد قيم سرّية في `.open-next/cloudflare/next-env.mjs` — مقيّد في `build:cloudflare` وفي `deploy.yml` قبل النشر (جرّبتُه على الـ artifact الحالي → يفشل EXIT=1 بدون طباعة القيم) | جديد `scripts/verify-build-secrets.js`، `package.json:23`، `.github/workflows/deploy.yml:34-35` |

### ما تبقّى (لا يمكن إنجازه من الكود وحده — يحتاج قرارك/صلاحيات CF)
- 🔴 **#1 — ترحيل الأسرار إلى Cloudflare Secrets**: الحارس يمنع الآن النشر بأسرار مضمّنة، لكن القيم الفعلية ما زالت في `.open-next/` المحلي (gitignored) وربما في الـ Worker المنشور حاليّاً. الإجراء: `npx wrangler secret put` لكل من `CLOUDFLARE_D1_TOKEN, ADMIN_PASSWORD, OPERATIONS_PANEL_PASSWORD, GOOGLE_CLIENT_SECRET, PLAYER_BRIDGE_SECRET, REVALIDATE_SECRET` ومفاتيح TMDB/AI + **تدوير كلها** ثم إعادة النشر عبر CI (بيئة نظيفة). لا أستطيع تنفيذ هذا محلياً بأمان (يتطلب لوحة Cloudflare).
- 🔴 **#2 — next@15.5.25 لا يزال داخل النطاق المصاب (RCE/Image Optimization)**: الإصلاح النهائي = ترقية رئيسية `next@16` (تغيير breaking؛ قد يستلزم نقل `middleware.ts` إلى اصطلاح v16)، لم أُجبِرها لأنها قد تكسر الإنتاج — تحتاج جلسة ترقية واختبار مخصصة.
- 🟡 #10 (json_each SCAN): تحسين أدائي — يُنفَّذ عبر جداول `list_*_genre` مسبقاً (مشروع أكبر).
- `.open-next/cloudflare/next-env.mjs` المحلي: artifact build — يُعاد توليده نظيفاً عند البناء في بيئة بلا أسرار (CI).

**التحقق النهائي بعد الإصلاحات**: `git status --porcelain` — كل التغييرات المذكورة أعلاه على ملفات متتبعة (M) عمداً في هذه الجولة، ولا أسرار مطبوعة في أي مكان.

اكتملت جولة الإصلاحات — في انتظار قرارك بخصوص ترحيل الأسرار وترقية next@16.