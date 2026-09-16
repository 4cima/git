# 🟠 مشاكل قاعدة البيانات — إعادة تدقيق `HEAD = 469c38d` (13 سبتمبر 2026، قراءة فقط)

> **نتيجة حرجة مؤكدة بالقراءة:** لا يوجد `CREATE TABLE users` ولا `CREATE TABLE sessions` في `schema.sql` ولا في `migrations/` — و`ON CONFLICT(email)` في `auth-server.ts:111` سيفشل وقت التشغيل إن لم يكن `UNIQUE(email)` موجوداً في D1 الفعلي. هذا أخطر بند منطقي في المشروع (تسجيل الدخول كله يعتمد عليه) ويحتاج migration جديد — موثّق هنا فقط، بلا أي تغيير كود.
> **ملاحظة ثانية:** `LIMIT` غير المقيّد في `GET operations_log` (`route.ts:98-99`: `Number(...) || 50` بلا حد أعلى) يسمح بـ `?limit=1000000` — يحتاج `Math.min(..., 200)`.

## 4.1 — عدم وجود Index على slug
**الملف:** `src/app/api/movies/route.ts`

```sql
WHERE slug = ? OR tmdb_id = ?
```

**المشكلة:** `OR` يُجبر full table scan إذا لم يكن هناك composite index  
**الحل:**
```sql
CREATE INDEX idx_movies_slug ON movies(slug);
CREATE INDEX idx_movies_tmdb_id ON movies(tmdb_id);
-- أو استخدام UNION بدلاً من OR
```

---

## 4.2 — JSON columns بدلاً من Normalized Tables
**الملف:** `schema.sql`

- `genres_json`, `cast_json`, `countries_json`, `keywords_json`, `companies_json`
- كل استعلام فلتر يحتاج `json_each()` + `json_extract()`

**الحل:** إنشاء جداول علائقية
```sql
CREATE TABLE movies_genres (
  movie_id INTEGER REFERENCES movies(id),
  genre_id INTEGER,
  PRIMARY KEY (movie_id, genre_id)
);

CREATE TABLE movies_cast (
  movie_id INTEGER REFERENCES movies(id),
  person_id INTEGER,
  character_name TEXT,
  sort_order INTEGER
);
```

---

## 4.3 — FTS5 Trigram يحتاج 3 أحرف
**الملف:** `src/lib/search-content.ts`

```sql
WHERE movies_fts MATCH ?
```

- Trigram tokenizer يحتاج ≥3 أحرف
- البحث بحرف واحد يُرجع نتائج فارغة

---

## 4.4 — عدم وجود VACUUM أو OPTIMIZE
**سكريبتات:** لا يوجد سكريبت VACUUM

- D1 (SQLite) يحتاج VACUUM دوري
- خاصة بعد operations كثيرة (DELETE + INSERT)

---

## 4.5 — rate_events بدون Index
**الملف:** `src/app/api/user/favorites/route.ts`

```sql
DELETE FROM rate_events WHERE ts < datetime('now', '-2 hours') LIMIT 100
```

**المشكلة:** لا يوجد index على `ts` أو `user_id, kind`  
**الحل:**
```sql
CREATE INDEX idx_rate_events_ts ON rate_events(ts);
CREATE INDEX idx_rate_events_user_kind ON rate_events(user_id, kind);
```

---

## 4.6 — operations_log بدون Index
**الملف:** `src/app/api/admin/operations/route.ts`

- الجدول ينمو بدون حدود
- `ORDER BY timestamp DESC LIMIT ?` بدون index

---

## 4.7 — Double INSERT في handleAuthCallback
**الملف:** `src/lib/auth-server.ts`

```sql
INSERT INTO users (...) VALUES (...) ON CONFLICT DO NOTHING
UPDATE users SET ... WHERE id = ?
```

**الحل:**
```sql
INSERT INTO users (...) VALUES (...)
ON CONFLICT(email) DO UPDATE SET name = excluded.name, ...
```
