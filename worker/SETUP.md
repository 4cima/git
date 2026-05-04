# 🚀 إعداد Cloudflare Worker - 4cima

## المرحلة 1: الاختبار المحلي

### الخطوة 1: تثبيت المكتبات
```bash
cd worker
npm install
```

### الخطوة 2: التحقق من المتغيرات
تأكد من أن ملف `.dev.vars` يحتوي على:
```
TURSO_DATABASE_URL=libsql://4cima-4cima.aws-eu-west-1.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

### الخطوة 3: تشغيل Worker محلياً
```bash
npm run dev
```

ستظهر رسالة مثل:
```
⛅ wrangler dev
 ⛅ wrangler dev
 ⛅ Wrangler 3.94.0
 ⛅ Listening on http://localhost:8787
```

### الخطوة 4: اختبار الـ Endpoints

#### في Terminal جديد:
```bash
# اختبار Health Check
curl http://localhost:8787/health

# اختبار /api/home
curl http://localhost:8787/api/home
```

#### أو استخدم الاختبار التلقائي:
```bash
node test-local.js
```

---

## النتائج المتوقعة

### Health Check:
```json
{
  "status": "ok"
}
```

### GET /api/home:
```json
{
  "status": "success",
  "data": {
    "trending": [
      {
        "id": 1,
        "slug": "movie-slug",
        "title_ar": "اسم الفيلم",
        "title_en": "Movie Title",
        "poster_path": "/path/to/poster.jpg",
        "vote_average": 8.5,
        "release_year": 2024
      },
      ...
    ],
    "topRated": [...],
    "recent": [...]
  },
  "timestamp": "2026-05-04T12:00:00.000Z"
}
```

---

## المرحلة 2: النشر على Cloudflare

### الخطوة 1: تسجيل الدخول
```bash
wrangler login
```

### الخطوة 2: إضافة المتغيرات على Cloudflare
```bash
wrangler secret put TURSO_AUTH_TOKEN
# ثم الصق التوكن
```

### الخطوة 3: النشر
```bash
npm run deploy
```

---

## الـ Endpoints المتاحة حالياً

### ✅ مفعّل (للاختبار):
- `GET /health` - Health check
- `GET /api/home` - البيانات الرئيسية

### ⏳ قريباً:
- `GET /api/movies` - قائمة الأفلام
- `GET /api/movies/:slug` - تفاصيل فيلم
- `GET /api/tv` - قائمة المسلسلات
- `GET /api/tv/:slug` - تفاصيل مسلسل
- `GET /api/search` - البحث
- `GET /api/genres` - الأنواع

---

## استكشاف الأخطاء

### خطأ: "Cannot find module '@libsql/client'"
```bash
npm install
```

### خطأ: "TURSO_DATABASE_URL is not defined"
تأكد من أن `.dev.vars` موجود وفيه البيانات الصحيحة

### خطأ: "Connection refused"
تأكد من أن Worker يعمل بـ `npm run dev`

---

## الملفات المهمة

```
worker/
├── src/
│   ├── index.ts          # الكود الرئيسي للـ Worker
│   └── types.ts          # أنواع TypeScript
├── wrangler.toml         # إعدادات Wrangler
├── .dev.vars             # المتغيرات المحلية
├── package.json          # المكتبات
└── test-local.js         # اختبار محلي
```

---

**آخر تحديث:** 2026-05-04
