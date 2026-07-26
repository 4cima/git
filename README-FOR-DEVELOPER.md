# 🎬 4CIMA Project - Quick Start للمبرمج

## 📋 الملفات المهمة

1. **SPECIFICATIONS-FOR-DEVELOPER.md** ← **ابدأ من هنا!** (المواصفات الكاملة)
2. **LOCAL-SCHEMA-CLEAN.sql** ← الـ schema النظيف للقاعدة المحلية
3. **.env.local** ← المتغيرات (موجود)
4. **BACKUP/** ← الكود القديم (للمراجعة فقط، **لا تستخدمه**)

---

## 🎯 الهدف الرئيسي

إعادة بناء نظام سحب ومزامنة من الصفر، بدون legacy issues:
- ✅ `tmdb_id` كـ PRIMARY KEY (مفيش `id` منفصل)
- ✅ Slugs آمنة (atomic, no race conditions)
- ✅ Movies تستخدم `title_en/title_ar`
- ✅ TV Series تستخدم `name_en/name_ar`
- ✅ Normalized في المحلي → JSON في Turso

---

## 🚀 Quick Start

### 1. Setup
```bash
# حذف القاعدة القديمة
rm data/4cima-local.db

# إنشاء القاعدة الجديدة
sqlite3 data/4cima-local.db < LOCAL-SCHEMA-CLEAN.sql

# التحقق
sqlite3 data/4cima-local.db ".schema movies" | grep PRIMARY
# Output: tmdb_id INTEGER PRIMARY KEY ✅
```

### 2. السكريبتات المطلوبة (3 فقط)
```
scripts/
  1-fetch-and-enrich.js    ← سحب من TMDB
  2-enrich-incomplete.js   ← تحديث الناقص
  3-sync-to-turso.js       ← رفع لـ Turso
```

### 3. Test Run
```bash
# اختبار صغير (50 فيلم)
node scripts/1-fetch-and-enrich.js --limit 50

# تحقق
sqlite3 data/4cima-local.db "SELECT tmdb_id, slug, title_en FROM movies LIMIT 10"

# sync
node scripts/3-sync-to-turso.js
```

---

## ⚠️ المشاكل التاريخية (تجنبها!)

### ❌ Problem 1: `id != tmdb_id`
```javascript
// ❌ القديم (معطوب):
CREATE TABLE movies (id INTEGER PRIMARY KEY, tmdb_id INTEGER)
INSERT INTO movies (tmdb_id, ...) VALUES (?, ...)  // ← id يأخذ autoincrement!

// ✅ الجديد (صحيح):
CREATE TABLE movies (tmdb_id INTEGER PRIMARY KEY)
INSERT INTO movies (tmdb_id, ...) VALUES (?, ...)  // ← مفيش id أصلاً!
```

### ❌ Problem 2: Race Condition في Slugs
```javascript
// ❌ خطأ:
const slug = await generateSlug(...)
// ... delay ...
db.run('INSERT ... slug = ?', [slug])  // ← race condition!

// ✅ صحيح:
db.transaction(() => {
  const slug = generateSlug(...)
  db.run('INSERT ... slug = ?', [slug])
})()
```

### ❌ Problem 3: title vs name
```javascript
// ❌ خطأ:
SELECT title_en FROM tv_series  // ← مفيش title في المسلسلات!

// ✅ صحيح:
SELECT title_en FROM movies      // للأفلام
SELECT name_en FROM tv_series    // للمسلسلات
```

---

## 📊 البنية الحالية

### Turso (Production):
- Movies: **139,755** ✅
- Schema: `scripts/turso-schema-final.sql`

### المحلي (القديم - معطوب):
- Movies: 134,252
- **منهم 128,319 فيلم `id != tmdb_id`** ❌
- **الحل:** حذف كل شيء والبدء من صفر

---

## 🔑 القواعد الذهبية

1. **في المحلي:** `tmdb_id` هو PRIMARY KEY الوحيد
2. **في Turso:** `id = tmdb_id` (نفس القيمة)
3. **في الـ slugs:** إنجليزي فقط، no IDs
4. **Atomic:** slugs داخل transactions
5. **Foreign keys:** تشير لـ `tmdb_id` مش `id`
6. **Movies:** `title_en/title_ar`
7. **TV Series:** `name_en/name_ar`
8. **Normalized locally**, **JSON in Turso**

---

## 📞 المساعدة

### عندك سؤال؟
1. راجع **SPECIFICATIONS-FOR-DEVELOPER.md** (شامل كل شيء)
2. راجع **LOCAL-SCHEMA-CLEAN.sql** (الـ schema)
3. راجع `.env.local` (المتغيرات)

### عايز تشوف الكود القديم؟
- **BACKUP/scripts/** ← للمراجعة فقط
- ⚠️ **لا تستخدمه** (فيه الـ bugs القديمة)

---

## ✅ معايير النجاح

- [ ] 100% من السجلات: `tmdb_id` هو PK
- [ ] 0 duplicate slugs
- [ ] 0 IDs في slugs
- [ ] 0 Arabic في slugs
- [ ] Movies تستخدم `title_*`
- [ ] TV Series تستخدم `name_*`
- [ ] Foreign keys صحيحة
- [ ] Turso sync شغال

---

## 🎓 Resources

- **TMDB API:** https://developers.themoviedb.org/3
- **Turso Docs:** https://docs.turso.tech/
- **better-sqlite3:** https://github.com/WiseLibs/better-sqlite3

---

**Good Luck! 🚀**

**Questions? راجع SPECIFICATIONS-FOR-DEVELOPER.md**
