# 🎬 4CIMA Data Ingestion - دليل الاستخدام

## 📋 الإعداد الأولي

### 1. تثبيت المكتبات
```bash
npm install
```

### 2. ملف البيئة `.env.local`
تأكد من وجود المفاتيح التالية:
```env
TMDB_API_KEY=your_tmdb_key_here
GROQ_API_KEY=your_groq_key_here
TURSO_DATABASE_URL=your_turso_url_here
TURSO_AUTH_TOKEN=your_turso_token_here
```

### 3. ملف الـ Schema
تأكد من وجود `LOCAL-SCHEMA-CLEAN.sql` في الجذر

---

## 🚀 سير العمل الكامل

### الطريقة الأوتوماتيكية (موصى بها)
```bash
npm run full-workflow
```

### الطريقة اليدوية (خطوة بخطوة)

#### **الخطوة 1: تحميل IDs**
```bash
npm run download-ids
```
- يحمل قائمة IDs من TMDB Daily Export
- يحفظها في قاعدة البيانات المحلية
- الوقت المتوقع: 2-5 دقائق

#### **الخطوة 2: جلب البيانات وإثرائها**
```bash
npm run fetch
```
- يسحب بيانات من TMDB API
- يترجم للعربية (TMDB أولاً، ثم Groq AI)
- يفلتر المحتوى غير المناسب
- الوقت المتوقع: عدة ساعات حسب العدد

#### **الخطوة 3: إكمال البيانات الناقصة** (اختياري)
```bash
npm run enrich
```
- يبحث عن سجلات غير مكتملة
- يعيد محاولة استكمالها

#### **الخطوة 4: المزامنة مع Turso**
```bash
npm run sync
```
- يرفع البيانات المكتملة لـ Turso
- يستخدم batch operations للسرعة
- الوقت المتوقع: 10-30 دقيقة

---

## 📁 بنية الملفات

```
scripts/
├── 0-download-ids.js          # تحميل IDs
├── 1-fetch-and-enrich.js      # السحب والإثراء الرئيسي
├── 2-enrich-incomplete.js     # إكمال الناقص
├── 3-sync-to-turso.js         # المزامنة
└── services/
    ├── local-db.js            # إدارة SQLite
    ├── slug-generator.js      # توليد slugs آمن
    ├── tmdb-api.js            # واجهة TMDB
    ├── translation-service.js # الترجمة (TMDB + Groq)
    └── content-filter.js      # فلترة المحتوى

data/
└── 4cima-local.db            # قاعدة البيانات المحلية
```

---

## ⚙️ الإعدادات القابلة للتعديل

### في `1-fetch-and-enrich.js`:
```javascript
const CONCURRENCY = 20  // عدد الطلبات المتزامنة
const BATCH_SIZE = 100  // حجم الـ batch
```

### في `3-sync-to-turso.js`:
```javascript
const BATCH_SIZE = 100  // حجم batch الرفع
```

---

## 🔍 التحقق من البيانات

### عرض إحصائيات محلية
```bash
node -e "const db=require('./scripts/services/local-db'); console.log(db.prepare('SELECT COUNT(*) as count FROM movies WHERE is_complete=1').get())"
```

### عرض أمثلة
```bash
node -e "const db=require('./scripts/services/local-db'); console.log(db.prepare('SELECT tmdb_id, title_ar, slug FROM movies LIMIT 5').all())"
```

---

## 🐛 استكشاف الأخطاء

### "Database locked"
- `better-sqlite3` synchronous، ممنوع `await` داخل `db.transaction()`

### "Slug collision"
- الـ slug generator فيه fallbacks تلقائية

### "API Rate Limit"
- قلل `CONCURRENCY` في السكريبت

---

## 📊 الأداء المتوقع

| عدد الأفلام | الوقت التقريبي (fetch) |
|-------------|----------------------|
| 1,000       | 20-30 دقيقة           |
| 10,000      | 3-5 ساعات            |
| 100,000+    | 30-50 ساعة           |

**ملاحظة:** المسلسلات أبطأ لأنها تتطلب سحب المواسم والحلقات

---

## ✅ الإجابة على أسئلة المبرمج

### 1. **استخدام TMDB Daily Export**
✅ **نعم!** السكريبت `0-download-ids.js` يحمل من:
```
http://files.tmdb.org/p/exports/movie_ids_MM_DD_YYYY.json.gz
```

### 2. **ترجمة TMDB أولاً قبل AI**
✅ **نعم!** `translation-service.js` يحاول `translations.ar` من TMDB أولاً

### 3. **سحب المواسم والحلقات**
✅ **في السكريبت الرئيسي** `1-fetch-and-enrich.js` تلقائياً لكل مسلسل

### 4. **Run واحد أم Cron؟**
✅ **Run واحد طويل** حالياً، لكن يمكن تحويله لـ cron بتعديل بسيط

### 5. **تغيير المفاتيح**
⚠️ **المبرمج قال ينتظر إجابتك يا إسلام** - لو المفاتيح في التقرير حقيقية لازم تغييرها فوراً

---

**🎯 جاهز للانطلاق!**
