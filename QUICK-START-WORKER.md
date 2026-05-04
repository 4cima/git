# ⚡ البدء السريع - Cloudflare Worker

## 🚀 3 خطوات فقط للاختبار المحلي

### 1️⃣ تثبيت المكتبات
```bash
cd worker
npm install
```

### 2️⃣ تشغيل Worker
```bash
npm run dev
```

### 3️⃣ اختبار الـ Endpoints

#### في terminal جديد:
```bash
# اختبار سريع
node test-local.js

# أو استخدم curl:
curl http://localhost:8787/health
curl http://localhost:8787/api/home
```

---

## ✅ النتائج المتوقعة

### Health Check:
```json
{"status":"ok"}
```

### /api/home:
```json
{
  "status": "success",
  "data": {
    "trending": [...],
    "topRated": [...],
    "recent": [...]
  }
}
```

---

## 📝 الملفات المهمة

```
worker/
├── src/index.ts          ← الكود الرئيسي
├── wrangler.toml         ← الإعدادات
├── .dev.vars             ← المتغيرات المحلية
├── test-local.js         ← الاختبار
└── SETUP.md              ← الدليل الكامل
```

---

## 🎯 الخطوة التالية

بعد التأكد من أن كل شيء يعمل:
1. إضافة باقي الـ endpoints
2. نشر على Cloudflare
3. توجيه الفرونت إند

---

**مستني رد كيرو!** 🚀
