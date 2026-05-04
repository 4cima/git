---
inclusion: auto
description: "معمارية قاعدة البيانات والفرق بين SQLite المحلية و Turso"
---

# معمارية قاعدة البيانات - Database Architecture

## 🔴 القاعدة الذهبية - CRITICAL

**⛔ لا تلمس Turso إلا بإذن صريح من المستخدم!**

### ✅ القاعدة المحلية (SQLite):
- **الموقع:** `data/4cima-local.db`
- **الاستخدام:** كل العمل يتم عليها
- **من يستخدمها:**
  - جميع سكريبتات السحب من TMDB
  - المعالجة والترجمة والفلترة
  - التطوير والاختبار
- **بدون إذن:** يمكن العمل عليها مباشرة

### ⛔ Turso (Production):
- **الاستخدام:** الإنتاج فقط
- **لا نلمسها إلا:**
  1. عند تشغيل سكريبت المزامنة بأمر مباشر من المستخدم
  2. بأمر واضح وصريح من المستخدم فقط
- **ممنوع:**
  - ❌ تطبيق Schema تلقائياً
  - ❌ إضافة بيانات تلقائياً
  - ❌ المزامنة بدون إذن
  - ❌ أي تعديل بدون أمر صريح

---

## 🎯 المبدأ الأساسي

**القاعدة المحلية (SQLite) = مخزن مؤقت لجمع البيانات**
**Turso = قاعدة البيانات الرئيسية للإنتاج**

---

## 📊 البنية

### 1. القاعدة المحلية (Local SQLite)
- **الموقع:** `data/4cima-local.db`
- **الاستخدام:** مخزن مؤقت لجمع البيانات من TMDB
- **من يستخدمها:**
  - `scripts/` - سكريبتات جمع البيانات
  - `local-api-server.js` - للتطوير المحلي فقط
  - `scripts/services/local-db.js` - خدمة الوصول للقاعدة المحلية

### 2. Turso (Production Database)
- **الاستخدام:** قاعدة البيانات الرئيسية للإنتاج
- **من يستخدمها:**
  - `worker/src/` - Cloudflare Worker (API الإنتاج)
  - `src/` - Next.js App (Frontend)
  - جميع endpoints الإنتاج

---

## 🔄 سير العمل (Workflow)

```
TMDB API
    ↓
[Scripts] → SQLite Local (data/4cima-local.db) ← كل العمل هنا
    ↓
    ↓ (فقط عند المزامنة بأمر صريح)
    ↓
[Sync Scripts] → Turso (Production) ← لا نلمسها إلا بإذن!
    ↓
[Worker API] ← Turso
    ↓
[Next.js App] ← Worker API
```

---

## ⚠️ قواعد مهمة

### 🔴 القاعدة #1: لا تلمس Turso!
- ⛔ **NEVER** apply schema to Turso automatically
- ⛔ **NEVER** add data to Turso automatically  
- ⛔ **NEVER** sync to Turso without explicit user command
- ✅ **ONLY** touch Turso when user explicitly says so

### 1. لا تقرأ من SQLite المحلية في الإنتاج
   - المشروع (Next.js + Worker) يقرأ من Turso فقط
   
2. **SQLite المحلية = كل العمل**
   - استخدمها لجمع البيانات
   - استخدمها للمعالجة والترجمة
   - استخدمها للتطوير المحلي
   - **كل السكريبتات تعمل عليها**
   
3. **المزامنة اتجاه واحد - بإذن فقط**
   - من SQLite المحلية → إلى Turso
   - ليس العكس

4. **Worker يستخدم Turso دائماً**
   - `worker/src/db/turso.ts` يستخدم `@libsql/client`
   - لا يستخدم `better-sqlite3` أبداً

---

## 📁 الملفات المهمة

### استخدام Turso:
- `worker/src/db/turso.ts` - اتصال Turso
- `worker/src/index.ts` - Worker API
- جميع ملفات `worker/src/db/*.ts` - أدوات قاعدة البيانات

### استخدام SQLite المحلية:
- `scripts/services/local-db.js` - اتصال SQLite
- `scripts/STABLE-INGEST-*.js` - سكريبتات جمع البيانات
- `local-api-server.js` - سيرفر تطوير محلي

### المزامنة:
- `scripts/STABLE-SYNC-TO-TURSO.js` - مزامنة من Local إلى Turso
- `scripts/3-SYNC-TO-TURSO.js` - نسخة بديلة

---

## 🔧 Dependencies

### Worker (Production):
```json
{
  "@libsql/client": "^0.17.2",  // Turso فقط
  "hono": "^4.7.11"
}
```

### Scripts (Development):
```json
{
  "better-sqlite3": "^12.9.0"  // SQLite المحلية فقط
}
```

---

**آخر تحديث:** 2026-04-27
