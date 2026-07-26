# 🔍 الكود الفعلي لاستخراج الـgenre - سطر بسطر

## ═══════════════════════════════════════════════════════════════════

## 1️⃣ بناء Map من المحلي (Bulk Load - مرة واحدة)

### السطر الفعلي:

```javascript
// السطر 170-180 في rebuild-movies-slugs.js
const localGenreMap = new Map() // tmdb_id → primary_genre

const localGenres = localDb.prepare(`
  SELECT tmdb_id, primary_genre
  FROM movies
  WHERE primary_genre IS NOT NULL AND primary_genre != ''
`).all()

localGenres.forEach(row => {
  localGenreMap.set(row.tmdb_id, row.primary_genre)
})
```

### التوضيح:

- ✅ **Bulk load** - كل الgenres تُجلب مرة واحدة في الذاكرة
- ✅ **O(n)** - استعلام واحد يرجع ~77,546 صف
- ✅ **Map** - O(1) lookup لكل فيلم
- ❌ **ليس** استعلام منفصل لكل فيلم (كان هيكون كارثة!)

---

## 2️⃣ استخراج primary_genre (من Turso أولاً، ثم fallback)

### السطر الفعلي (السطور 196-217):

```javascript
// استخراج primary_genre
let primaryGenre = null

// 1️⃣ محاولة أولى: genres_json من Turso (أولوية)
if (movie.genres_json && movie.genres_json !== '' && movie.genres_json !== '[]') {
  try {
    const genresArray = JSON.parse(movie.genres_json)
    if (genresArray.length > 0 && genresArray[0].name_en) {
      primaryGenre = genresArray[0].name_en
    }
  } catch (e) {
    // parsing failed - سنستخدم fallback
  }
}

// 2️⃣ fallback: primary_genre من المحلي
if (!primaryGenre) {
  primaryGenre = localGenreMap.get(movie.tmdb_id) || null
}
```

### التوضيح سطر بسطر:

#### السطر 1: `let primaryGenre = null`
- نبدأ بـnull (افتراضياً مفيش genre)

#### السطر 2-3: الفحص الأولي
```javascript
if (movie.genres_json && movie.genres_json !== '' && movie.genres_json !== '[]')
```
- ✅ `movie.genres_json` موجود (ليس null/undefined)
- ✅ مش string فاضي `''`
- ✅ مش array فاضي `'[]'`

#### السطر 4-10: Parsing + استخراج
```javascript
try {
  const genresArray = JSON.parse(movie.genres_json)
  if (genresArray.length > 0 && genresArray[0].name_en) {
    primaryGenre = genresArray[0].name_en
  }
} catch (e) {
  // parsing failed
}
```

**مثال genres_json:**
```json
[
  {"id":18, "tmdb_id":18, "name_en":"Drama", "name_ar":"دراما"},
  {"id":28, "tmdb_id":28, "name_en":"Action", "name_ar":"أكشن"}
]
```

**الاستخراج:**
- `genresArray[0]` → أول genre
- `.name_en` → الاسم الإنجليزي
- `primaryGenre = "Drama"`

**لو parsing فشل:**
- `catch` يمسك الerror
- `primaryGenre` يفضل `null`
- نروح للfallback

#### السطر 11-13: Fallback من المحلي
```javascript
if (!primaryGenre) {
  primaryGenre = localGenreMap.get(movie.tmdb_id) || null
}
```

- ✅ **O(1) lookup** - من الMap المحملة في الذاكرة
- ❌ **ليس SQL query** لكل فيلم
- لو مش موجود في Map → يرجع `null`

---

## 3️⃣ الاستخدام في generateUniqueSlug

```javascript
const newSlug = generateUniqueSlug(
  movie.title_en,
  movie.release_year,
  primaryGenre,  // ← من Turso أولاً، أو من المحلي
  slugMap
)
```

---

## 📊 مقارنة: قبل vs بعد

### ❌ قبل التصحيح (كارثة أداء):

```javascript
// استعلام SQL لكل فيلم - O(n) × 139,755 = كارثة!
const localData = localDb.prepare(`
  SELECT primary_genre FROM movies WHERE tmdb_id = ? LIMIT 1
`).get(movie.tmdb_id)

const primaryGenre = localData?.primary_genre || null
```

**المشكلة:**
- 139,755 استعلام SQL منفصل
- كل استعلام = disk I/O
- الوقت المتوقع: **10-15 دقيقة** (بطيء جداً!)

---

### ✅ بعد التصحيح (سريع):

```javascript
// Bulk load مرة واحدة - O(n) واحدة
const localGenreMap = new Map()
const localGenres = localDb.prepare(`SELECT ...`).all()
localGenres.forEach(row => localGenreMap.set(...))

// Lookup من الذاكرة - O(1) لكل فيلم
primaryGenre = localGenreMap.get(movie.tmdb_id) || null
```

**المميزات:**
- استعلام واحد بس (77,546 صف)
- كل lookup = RAM access (O(1))
- الوقت المتوقع: **< 5 ثواني** للgenres + parsing

---

## 🎯 التدفق الكامل:

```
مرة واحدة في البداية:
┌─────────────────────────────────────┐
│ جلب كل genres من المحلي (bulk)     │
│ → localGenreMap (77,546 صف)       │
└─────────────────────────────────────┘

لكل فيلم من 139,755:
┌─────────────────────────────────────┐
│ 1. فحص genres_json من Turso        │
│    ├─ موجود؟ → parse + استخرج     │
│    └─ مش موجود؟ → نروح للfallback  │
│                                     │
│ 2. Fallback: localGenreMap.get()   │
│    ├─ موجود؟ → استخدمه             │
│    └─ مش موجود؟ → null             │
│                                     │
│ 3. generateUniqueSlug(primaryGenre) │
└─────────────────────────────────────┘
```

---

## ✅ الضمانات:

1. ✅ **صفر استعلامات SQL داخل الloop** - كلها من Map في الذاكرة
2. ✅ **Turso له الأولوية** - genres_json أولاً (9.91% تغطية)
3. ✅ **Fallback ذكي** - المحلي ثانياً (6.36% تغطية إضافية)
4. ✅ **Bulk load** - كل الgenres تُحمل مرة واحدة
5. ✅ **O(1) lookup** - لكل فيلم من الـ139,755

---

## 📈 التغطية المتوقعة:

```
genres_json (Turso):  13,848 فيلم (9.91%)
+ fallback (المحلي):  ~5,000 فيلم إضافي (تقدير)
────────────────────────────────────────
= إجمالي التغطية:    ~18,848 فيلم (13.5%)
```

**أفضل من 6.36% بـ116%!**
