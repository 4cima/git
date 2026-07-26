# 📊 مقارنة: البنية القديمة vs البنية الجديدة

## 🔴 البنية القديمة (معطوبة)

### Schema:
```sql
CREATE TABLE movies (
  id INTEGER PRIMARY KEY,              -- ← autoincrement
  tmdb_id INTEGER UNIQUE NOT NULL,     -- ← قيمة مختلفة!
  slug TEXT,
  title_en TEXT,
  title_ar TEXT,
  ...
  genres_json TEXT,                    -- ← JSON في المحلي
  cast_json TEXT
);
```

### INSERT:
```javascript
// ❌ ناسي يحدد id صراحة
db.prepare(`
  INSERT INTO movies (tmdb_id, title_en, ...)
  VALUES (?, ?, ...)
`).run(550, 'Fight Club', ...)

// النتيجة:
// id = 1 (autoincrement)
// tmdb_id = 550
// ❌ id != tmdb_id
```

### Slug Generation:
```javascript
// ❌ Race condition
const slug = await generateSlug(...)    // فحص
// ... await translation ...             // فجوة زمنية!
db.run('UPDATE movies SET slug = ?')   // كتابة

// المشكلة: فيلمين بنفس الاسم ممكن ياخدوا نفس الـ slug
```

### TV Series:
```javascript
// ❌ استخدام title بدل name
db.prepare(`
  INSERT INTO tv_series (tmdb_id, title_en, title_ar, ...)
  VALUES (?, ?, ?, ...)
`).run(...)

// المشكلة: Turso بيستخدم name_en/name_ar
// → mismatch عند المزامنة
```

### النتيجة:
- ❌ 128,319 فيلم من 134,252 عندهم `id != tmdb_id`
- ❌ Race conditions في الـ slugs
- ❌ Mismatch في المسلسلات
- ❌ تلوث بيانات

---

## 🟢 البنية الجديدة (نظيفة)

### Schema:
```sql
CREATE TABLE movies (
  tmdb_id INTEGER PRIMARY KEY,         -- ← مفيش id منفصل!
  slug TEXT UNIQUE,
  title_en TEXT,
  title_ar TEXT,
  ...
);

-- Normalized (مش JSON)
CREATE TABLE content_genres (
  content_tmdb_id INTEGER,
  genre_tmdb_id INTEGER,
  FOREIGN KEY (content_tmdb_id) REFERENCES movies(tmdb_id)
);

CREATE TABLE cast_crew (
  content_tmdb_id INTEGER,
  person_tmdb_id INTEGER,
  FOREIGN KEY (content_tmdb_id) REFERENCES movies(tmdb_id)
);
```

### INSERT:
```javascript
// ✅ tmdb_id هو PK - مفيش id أصلاً
db.prepare(`
  INSERT INTO movies (tmdb_id, title_en, ...)
  VALUES (?, ?, ...)
`).run(550, 'Fight Club', ...)

// النتيجة:
// tmdb_id = 550 (PRIMARY KEY)
// ✅ مفيش confusion
```

### Slug Generation:
```javascript
// ✅ Atomic operation
db.transaction(() => {
  const slug = generateSlug(...)       // فحص + كتابة
  db.run('INSERT ... slug = ?')        // في نفس transaction
})()

// الحل: مستحيل يحصل race condition
```

### TV Series:
```sql
CREATE TABLE tv_series (
  tmdb_id INTEGER PRIMARY KEY,
  name_en TEXT,                        -- ← name مش title!
  name_ar TEXT,
  ...
);
```

```javascript
// ✅ استخدام name (متطابق مع Turso)
db.prepare(`
  INSERT INTO tv_series (tmdb_id, name_en, name_ar, ...)
  VALUES (?, ?, ?, ...)
`).run(...)
```

### النتيجة:
- ✅ 100% من السجلات: `tmdb_id` هو PK الوحيد
- ✅ Zero race conditions
- ✅ Perfect match مع Turso
- ✅ بيانات نظيفة

---

## 📈 المقارنة المباشرة

| Feature | القديم ❌ | الجديد ✅ |
|---------|----------|----------|
| **Primary Key** | `id` (autoincrement) | `tmdb_id` |
| **TMDB ID** | عمود منفصل | PRIMARY KEY نفسه |
| **Bug Possibility** | عالي جداً | صفر |
| **Slugs** | Race conditions | Atomic |
| **Movies Columns** | `title_en/title_ar` | `title_en/title_ar` ✅ |
| **TV Series Columns** | `title_en/title_ar` ❌ | `name_en/name_ar` ✅ |
| **Genres/Cast** | JSON في المحلي | Normalized → JSON عند sync |
| **Foreign Keys** | تشير لـ `id` | تشير لـ `tmdb_id` |
| **Turso Sync** | مشاكل في الربط | `ON CONFLICT(tmdb_id)` |
| **Data Quality** | ملوثة (128K سجل خطأ) | نظيفة 100% |

---

## 🔄 Migration Path

### الخطوات:
1. ✅ حذف القاعدة القديمة بالكامل
2. ✅ تطبيق `LOCAL-SCHEMA-CLEAN.sql`
3. ✅ سحب من TMDB من جديد
4. ✅ المزامنة لـ Turso

### ليه مش Fix القديم؟
- ❌ 128,319 سجل محتاج update
- ❌ Foreign keys كلها غلط
- ❌ Race conditions في الكود
- ❌ Mismatch في المسلسلات
- ✅ **أسرع وأضمن: ابدأ من صفر**

---

## 🎯 الخلاصة

### القديم:
```
TMDB (id=550) → Local (id=1, tmdb_id=550) → Turso (id=???, tmdb_id=550)
                        ↑ المشكلة هنا!
```

### الجديد:
```
TMDB (id=550) → Local (tmdb_id=550) → Turso (id=550, tmdb_id=550)
                       ✅ نفس القيمة    ✅ متطابق
```

---

**النتيجة النهائية:** البنية الجديدة تقفل نهائيًا على كل الـ bugs التاريخية! 🎉
