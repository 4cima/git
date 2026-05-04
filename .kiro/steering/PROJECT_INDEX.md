---
inclusion: auto
description: "فهرس المشروع الموحد - دليل شامل لبنية 4cima"
priority: high
---

# 📚 فهرس المشروع الموحد - 4CIMA

**آخر تحديث:** 2026-04-28  
**الحالة:** ✅ نشط ومُحدّث

---

## 🎯 نظرة عامة

**4cima** هو منصة بث حديثة مبنية على:
- **Frontend:** Next.js 16 (App Router)
- **Database:** Turso (LibSQL) للإنتاج + SQLite للتطوير
- **Auth:** Supabase (المصادقة فقط)
- **API:** Cloudflare Workers (قيد التطوير)
- **Data Source:** TMDB API

---

## 📁 هيكل المشروع

### 1. الجذر (Root)
```
4cima/
├── .env.local              # متغيرات البيئة (Turso, Supabase, TMDB)
├── .gitignore              # ملفات Git المستبعدة
├── package.json            # Dependencies
├── next.config.ts          # إعدادات Next.js
├── tsconfig.json           # إعدادات TypeScript
├── tailwind.config.ts      # إعدادات Tailwind
├── README.md               # توثيق المشروع
├── QUICK_START.md          # دليل البدء السريع
└── TURSO_SYNC_STRATEGY.md  # استراتيجية المزامنة مع Turso
```

### 2. المجلدات الرئيسية

#### 📂 `.kiro/` - إعدادات Kiro AI
```
.kiro/
├── settings/               # إعدادات Kiro
└── steering/               # قواعد وتوجيهات المشروع
    ├── CORE_DIRECTIVES.md          # القواعد الأساسية (غير قابلة للتفاوض)
    ├── PROJECT_ARCHITECTURE.md     # معمارية المشروع
    ├── DATABASE_ARCHITECTURE.md    # معمارية قاعدة البيانات
    ├── PROJECT_INDEX.md            # هذا الملف
    ├── STRICT-RULES.md             # قواعد صارمة
    ├── deferred-tasks.md           # المهام المؤجلة
    ├── CAST_DATA_MISSING.md        # مشكلة بيانات الممثلين
    ├── IFRAME_ALLOWFULLSCREEN_FIX.md
    ├── WATCH_PAGE_DESIGN.md
    └── API_ARCHITECTURE.md
```

#### 📂 `data/` - قاعدة البيانات المحلية
```
data/
└── 4cima-local.db          # SQLite - للتطوير والـ ingestion فقط
```

#### 📂 `scripts/` - سكريبتات جمع البيانات
```
scripts/
├── INGEST-MOVIES-LOGIC.js          # منطق سحب الأفلام من TMDB
├── INGEST-SERIES-LOGIC.js          # منطق سحب المسلسلات من TMDB
├── prepare-content-for-turso.js    # تحضير البيانات للمزامنة (JSON embedding)
├── sync-to-turso-optimized.js      # مزامنة محسّنة إلى Turso
├── turso-schema-optimized.sql      # Schema Turso المُحسّن
└── services/                       # خدمات مشتركة
    ├── local-db.js                 # اتصال SQLite المحلية
    ├── turso-client.js             # اتصال Turso
    ├── content-filter.js           # فلترة المحتوى غير المناسب
    ├── translation-service.js      # خدمة الترجمة (Google + Groq)
    ├── translation-service-cjs.js  # نسخة CommonJS
    ├── static-data-helpers.js      # مساعدات البيانات الثابتة
    └── error-logger.js             # تسجيل الأخطاء
```

#### 📂 `src/` - تطبيق Next.js
```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Layout رئيسي
│   ├── page.tsx            # الصفحة الرئيسية
│   ├── providers.tsx       # React Query & Theme Providers
│   ├── globals.css         # Styles عامة
│   ├── api/                # API Routes (Proxy)
│   │   ├── home/
│   │   ├── movies/
│   │   ├── tv/
│   │   ├── search/
│   │   └── genres/
│   ├── movies/             # صفحات الأفلام
│   │   ├── page.tsx
│   │   ├── [category]/
│   │   └── [slug]/
│   ├── series/             # صفحات المسلسلات
│   │   ├── page.tsx
│   │   └── [slug]/
│   ├── watch/              # صفحات المشاهدة
│   │   └── [type]/[slug]/
│   ├── anime/              # صفحة الأنمي
│   ├── quran/              # مشغل القرآن
│   ├── plays/              # المسرحيات
│   └── software/           # البرامج
│
├── components/             # مكونات React
│   ├── common/             # مكونات مشتركة
│   ├── features/           # مكونات الميزات
│   ├── layout/             # مكونات التخطيط
│   ├── pages/              # مكونات الصفحات
│   ├── effects/            # تأثيرات بصرية
│   ├── admin/              # مكونات الإدارة
│   ├── dev/                # أدوات التطوير
│   ├── routing/            # مكونات التوجيه
│   ├── ui/                 # مكونات UI
│   ├── unified/            # مكونات موحدة
│   └── utils/              # مكونات مساعدة
│
├── lib/                    # مكتبات ومساعدات
│   ├── api.ts              # API client
│   ├── supabase.ts         # Supabase client (Auth only)
│   ├── constants.ts        # ثوابت
│   ├── utils.ts            # مساعدات عامة
│   ├── slugGenerator.ts    # توليد Slugs
│   ├── toast-manager.ts    # إدارة Toast
│   ├── genres.ts           # الأنواع
│   ├── tmdb.ts             # TMDB helpers
│   └── ...                 # مكتبات أخرى
│
├── services/               # خدمات API
│   ├── contentAPI.ts       # API المحتوى
│   ├── contentQueries.ts   # استعلامات المحتوى
│   ├── embedService.ts     # خدمة Embeds
│   ├── recommendations.ts  # التوصيات
│   └── ...
│
├── hooks/                  # Custom React Hooks
│   ├── useAuth.ts
│   ├── useFetchContent.ts
│   ├── useGenres.ts
│   └── ...
│
├── types/                  # TypeScript Types
│   ├── database.ts
│   ├── db.ts
│   ├── genre.ts
│   └── ...
│
├── state/                  # State Management (Zustand)
│   ├── useLang.ts
│   └── useQuranPlayerStore.ts
│
├── styles/                 # Styles
│   ├── theme.ts
│   ├── animations.ts
│   └── ...
│
├── contexts/               # React Contexts
│   ├── AuthContext.tsx
│   └── ToastContext.tsx
│
├── config/                 # Configuration
│   └── api.ts
│
├── data/                   # Static Data
│   ├── quran.ts
│   └── software.ts
│
└── utils/                  # Utilities
    ├── adNeutralizer.ts
    └── genreTranslator.ts
```

#### 📂 `public/` - ملفات ثابتة
```
public/
├── public/                 # Assets
│   ├── icons/
│   ├── downloads/
│   ├── dummy-ads/
│   ├── logo.svg
│   ├── manifest.webmanifest
│   ├── robots.txt
│   ├── sitemap.xml
│   └── ...
└── ...
```

---

## 🔄 سير العمل (Data Flow)

### 1. جمع البيانات (Ingestion)
```
TMDB API
    ↓
[INGEST-MOVIES-LOGIC.js]
[INGEST-SERIES-LOGIC.js]
    ↓
SQLite Local (data/4cima-local.db)
    ↓ (فلترة + ترجمة + معالجة)
[prepare-content-for-turso.js]
    ↓ (دمج JSON)
[sync-to-turso-optimized.js]
    ↓
Turso (Production Database)
```

### 2. عرض المحتوى (Content Display)
```
User Request
    ↓
Next.js App (src/app/)
    ↓
API Routes (src/app/api/) أو Direct Fetch
    ↓
Turso Database
    ↓
Response → User
```

### 3. المصادقة (Authentication)
```
User Login/Signup
    ↓
Supabase Auth
    ↓
AuthContext (src/contexts/AuthContext.tsx)
    ↓
Protected Routes
```

---

## 🗄️ قواعد البيانات

### SQLite المحلية (data/4cima-local.db)
**الاستخدام:** تطوير + ingestion فقط

**الجداول:**
- `movies` - الأفلام (كل البيانات)
- `tv_series` - المسلسلات (كل البيانات)
- `tv_seasons` - المواسم
- `tv_episodes` - الحلقات
- `people` - الممثلين والطاقم
- `cast_crew` - علاقات الممثلين بالمحتوى
- `genres` - الأنواع
- `content_genres` - علاقات الأنواع بالمحتوى
- `countries` - الدول
- `content_countries` - علاقات الدول بالمحتوى
- `keywords` - الكلمات المفتاحية
- `content_keywords` - علاقات الكلمات بالمحتوى
- `production_companies` - شركات الإنتاج
- `content_production_companies` - علاقات الشركات بالمحتوى
- `networks` - الشبكات (للمسلسلات)
- `tv_networks` - علاقات الشبكات بالمسلسلات
- `translation_cache` - ذاكرة تخزين الترجمات
- `ingestion_progress` - تتبع تقدم السحب

**الأعمدة الإضافية للمزامنة:**
- `synced_to_turso` - هل تم المزامنة؟
- `synced_at` - وقت المزامنة
- `sync_priority` - أولوية المزامنة (1-5)
- `sync_error` - خطأ المزامنة (إن وجد)
- `is_filtered` - هل تم فلترته؟
- `filter_reason` - سبب الفلترة

### Turso (Production)
**الاستخدام:** الإنتاج فقط

**الجداول المُحسّنة (مع JSON embedding):**
- `movies` - الأفلام (مع genres_json, cast_json, crew_json, countries_json, keywords_json, companies_json)
- `tv_series` - المسلسلات (مع genres_json, cast_json, crew_json, countries_json, keywords_json, networks_json)
- `tv_seasons` - المواسم
- `tv_episodes` - الحلقات
- `genres` - الأنواع (بيانات ثابتة)
- `countries` - الدول (بيانات ثابتة)
- `languages` - اللغات (بيانات ثابتة)

**ملاحظة:** لا توجد جداول منفصلة للممثلين والعلاقات - كل شيء مدمج في JSON!

### Supabase
**الاستخدام:** المصادقة فقط (Auth & User Data)

**الجداول:**
- `users` - بيانات المستخدمين
- `profiles` - ملفات المستخدمين
- (لا محتوى - فقط Auth!)

---

## 🔑 المتغيرات البيئية (.env.local)

```env
# Turso (Production Database)
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...

# Supabase (Auth Only)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# TMDB API
TMDB_API_KEY=...
TMDB_API_KEY_2=...

# Groq API (للترجمة)
GROQ_API_KEY=...

# Worker URL (قيد التطوير)
NEXT_PUBLIC_WORKER_URL=...
```

---

## 📦 Dependencies الرئيسية

### Production
- `next@16.2.4` - Framework
- `react@19.2.4` - UI Library
- `@libsql/client` - Turso client
- `@supabase/supabase-js` - Supabase client
- `@tanstack/react-query` - Data fetching
- `zustand` - State management
- `framer-motion` - Animations
- `tailwindcss` - Styling
- `axios` - HTTP client

### Development
- `better-sqlite3` - SQLite للسكريبتات
- `typescript` - Type safety
- `eslint` - Linting

---

## 🎯 استراتيجية المزامنة مع Turso

### المبدأ:
**تقليل الكتابات بنسبة 90% من خلال دمج البيانات في JSON**

### قبل التحسين:
- 1 فيلم = 10 كتابات (فيلم + أنواع + ممثلين + دول + ...)
- 1.3M محتوى × 10 = 13M كتابة/شهر ❌

### بعد التحسين:
- 1 فيلم = 1 كتابة (كل شيء مدمج في JSON)
- 350K محتوى × 1 = 350K كتابة/شهر ✅

### الأولويات:
1. **Priority 1:** حديث (≥2020) + تقييم عالي (≥7.0)
2. **Priority 2:** شهير (≥7.5 rating, ≥1000 votes)
3. **Priority 3:** جيد (≥6.5 rating)
4. **Priority 4:** مكتمل (is_complete = 1)
5. **Priority 5:** باقي المحتوى (لا يُزامن)

### الأوامر:
```bash
# مزامنة أولوية 1
node scripts/sync-to-turso-optimized.js --priority=1 --limit=1000

# مزامنة أولوية 2
node scripts/sync-to-turso-optimized.js --priority=2 --limit=1000

# مزامنة الأفلام فقط
node scripts/sync-to-turso-optimized.js --priority=1 --type=movies

# مزامنة المسلسلات فقط
node scripts/sync-to-turso-optimized.js --priority=1 --type=tv
```

---

## 🛡️ نظام الفلترة

**الموقع:** `scripts/services/content-filter.js`

### القواعد:
1. ✅ استثناء المحتوى ذو التقييم العالي (≥7.0)
2. ✅ استثناء أفلام 2026 من فلترة الأصوات
3. ✅ استثناء السياق الدرامي من الكلمات الخفيفة
4. ❌ فلترة المحتوى الصريح (adult, explicit keywords)
5. ❌ فلترة المحتوى ذو التقييم المنخفض (<4.0)
6. ❌ فلترة المحتوى بدون poster أو overview

### النتيجة:
- المحتوى المفلتر يُحفظ في SQLite المحلية
- لا يُزامن إلى Turso
- يُوضع علامة `is_filtered = 1` مع `filter_reason`

---

## 🌐 نظام الترجمة

**الموقع:** `scripts/services/translation-service.js`

### الاستراتيجية:
1. **Google Translate** (مجاني، سريع)
2. **Groq API** (fallback إذا فشل Google)
3. **Cache** (في `translation_cache` لتجنب التكرار)

### الاستخدام:
- ترجمة العناوين (title_en → title_ar)
- ترجمة الأوصاف (overview_en → overview_ar)
- ترجمة أسماء الممثلين
- ترجمة السير الذاتية

---

## 🚀 الأوامر المهمة

### التطوير:
```bash
# تشغيل Next.js
npm run dev

# Build
npm run build

# Start production
npm start
```

### جمع البيانات:
```bash
# سحب الأفلام
node scripts/INGEST-MOVIES-LOGIC.js

# سحب المسلسلات
node scripts/INGEST-SERIES-LOGIC.js
```

### المزامنة:
```bash
# مزامنة إلى Turso
node scripts/sync-to-turso-optimized.js --priority=1 --limit=1000
```

---

## 📝 ملاحظات مهمة

### ✅ افعل:
- استخدم Turso للإنتاج
- استخدم SQLite للتطوير والـ ingestion
- استخدم Supabase للمصادقة فقط
- استخدم `toast-manager.ts` للـ toasts
- استخدم English slugs دائماً
- اقرأ من Turso في الإنتاج

### ❌ لا تفعل:
- لا تستخدم CockroachDB (هذا لـ cinma.online)
- لا تستخدم SQLite في الإنتاج
- لا تستخدم Supabase للمحتوى
- لا تستخدم `import { toast } from 'sonner'`
- لا تستخدم Arabic slugs
- لا تقرأ من SQLite في الإنتاج

---

## 🔗 الملفات المرجعية

- **القواعد الأساسية:** `.kiro/steering/CORE_DIRECTIVES.md`
- **معمارية المشروع:** `.kiro/steering/PROJECT_ARCHITECTURE.md`
- **معمارية قاعدة البيانات:** `.kiro/steering/DATABASE_ARCHITECTURE.md`
- **استراتيجية Turso:** `TURSO_SYNC_STRATEGY.md`
- **دليل البدء:** `QUICK_START.md`
- **المهام المؤجلة:** `.kiro/steering/deferred-tasks.md`

---

**هذا الملف هو المرجع الموحد لكل شيء في المشروع. يُحدّث باستمرار.**
