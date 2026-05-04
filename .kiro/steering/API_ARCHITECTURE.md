---
inclusion: auto
description: "معمارية API والـ endpoints في المشروع"
---

# معمارية API - API Architecture

## 🎯 البنية الحالية

```
Next.js Frontend (Port 3000)
    ↓
Next.js API Routes (src/app/api/*)
    ↓ (Proxy)
Cloudflare Worker (Port 8787 dev / Production)
    ↓
Turso Database (Production)
```

---

## 📊 التفاصيل

### 1. Next.js API Routes (Proxy Layer)
**الموقع:** `src/app/api/`

**الوظيفة:** 
- تعمل كـ proxy بين Frontend و Worker
- تمرر الطلبات إلى Worker
- تتعامل مع الأخطاء وتوفر fallback

**الملفات:**
- `src/app/api/home/route.ts` - الصفحة الرئيسية
- `src/app/api/movies/route.ts` - قائمة الأفلام
- `src/app/api/movies/[slug]/route.ts` - تفاصيل فيلم
- `src/app/api/tv/route.ts` - قائمة المسلسلات
- `src/app/api/tv/[slug]/route.ts` - تفاصيل مسلسل
- `src/app/api/search/route.ts` - البحث
- `src/app/api/genres/route.ts` - الأنواع

**المتغيرات:**
```env
NEXT_PUBLIC_WORKER_URL=http://localhost:8787  # Development
NEXT_PUBLIC_WORKER_URL=https://4cima-worker.workers.dev  # Production
```

---

### 2. Cloudflare Worker (API Layer)
**الموقع:** `worker/src/index.ts`

**الوظيفة:**
- يتصل بـ Turso مباشرة
- يوفر جميع endpoints
- يدير الـ caching
- يشغل cron jobs

**الاتصال بـ Turso:**
```typescript
// worker/src/db/turso.ts
import { createClient } from '@libsql/client'

const db = createClient({
  url: env.TURSO_DATABASE_URL,
  authToken: env.TURSO_AUTH_TOKEN
})
```

**Secrets المطلوبة (Production):**
```bash
npx wrangler secret put TURSO_DATABASE_URL
npx wrangler secret put TURSO_AUTH_TOKEN
npx wrangler secret put TMDB_API_KEY
```

**Development (.dev.vars):**
```env
TURSO_DATABASE_URL=libsql://4cima-4cima.aws-eu-west-1.turso.io
TURSO_AUTH_TOKEN=<token>
```

---

### 3. Turso Database
**الاستخدام:** قاعدة البيانات الرئيسية للإنتاج

**الاتصال:**
- Worker يتصل مباشرة عبر `@libsql/client`
- Next.js API routes لا تتصل مباشرة (تستخدم Worker كـ proxy)

---

## 🔄 سير الطلب (Request Flow)

### مثال: جلب قائمة الأفلام

1. **Frontend** يطلب: `GET /api/movies?page=1`
2. **Next.js API Route** (`src/app/api/movies/route.ts`):
   - يستقبل الطلب
   - يمرره إلى Worker: `http://localhost:8787/api/movies?page=1`
3. **Worker** (`worker/src/index.ts`):
   - يستقبل الطلب
   - يتصل بـ Turso
   - يجلب البيانات
   - يرجع JSON
4. **Next.js API Route**:
   - يستقبل الرد من Worker
   - يمرره للـ Frontend
5. **Frontend** يعرض البيانات

---

## ⚙️ التشغيل

### Development:
```bash
# Terminal 1: Worker
cd worker
npm run dev

# Terminal 2: Next.js
npm run dev
```

### Production:
```bash
# Deploy Worker
cd worker
npx wrangler deploy

# Deploy Next.js
npm run build
```

---

## ✅ التحقق من الاتصال

### 1. Worker متصل بـ Turso:
```bash
cd worker
npx wrangler secret list
# يجب أن يظهر: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN
```

### 2. Next.js متصل بـ Worker:
```bash
# في .env.local
NEXT_PUBLIC_WORKER_URL=http://localhost:8787
```

### 3. اختبار الاتصال:
```bash
# Worker
curl http://localhost:8787/health

# Next.js API
curl http://localhost:3000/api/home
```

---

**آخر تحديث:** 2026-04-27
