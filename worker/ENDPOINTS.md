# 🚀 Cloudflare Worker - جميع الـ Endpoints

**التاريخ:** 2026-05-04  
**الحالة:** ✅ مكتمل

---

## 📋 قائمة الـ Endpoints

### 🏥 Health Check
```
GET /health
```
**الرد:**
```json
{"status":"ok"}
```

---

## 🎬 الأفلام (Movies)

### 1. قائمة الأفلام
```
GET /api/movies?page=1
```
**المعاملات:**
- `page` (اختياري): رقم الصفحة (افتراضي: 1)

**الرد:**
```json
{
  "results": [
    {
      "id": 1,
      "slug": "movie-slug",
      "title_ar": "اسم الفيلم",
      "title_en": "Movie Title",
      "poster_path": "/path/to/poster.jpg",
      "vote_average": 8.5,
      "release_year": 2024
    }
  ],
  "page": 1,
  "limit": 20,
  "hasMore": true
}
```

### 2. تفاصيل فيلم واحد
```
GET /api/movies/:slug
```
**المثال:**
```
GET /api/movies/the-matrix
```

**الرد:**
```json
{
  "id": 1,
  "slug": "the-matrix",
  "title_ar": "المصفوفة",
  "title_en": "The Matrix",
  "overview_ar": "...",
  "poster_path": "/path/to/poster.jpg",
  "vote_average": 8.7,
  "release_year": 1999,
  ...
}
```

### 3. ممثلو الفيلم
```
GET /api/movies/:slug/cast
```
**المثال:**
```
GET /api/movies/the-matrix/cast
```

**الرد:**
```json
{
  "cast": [
    {
      "id": 1,
      "name_ar": "كيانو ريفز",
      "name_en": "Keanu Reeves",
      "character_name": "Neo",
      "profile_path": "/path/to/profile.jpg"
    }
  ]
}
```

### 4. أفلام مشابهة
```
GET /api/movies/:slug/similar
```
**المثال:**
```
GET /api/movies/the-matrix/similar
```

**الرد:**
```json
{
  "similar": [
    {
      "id": 2,
      "slug": "the-matrix-reloaded",
      "title_ar": "المصفوفة: إعادة التحميل",
      "title_en": "The Matrix Reloaded",
      "poster_path": "/path/to/poster.jpg",
      "vote_average": 7.2,
      "release_year": 2003
    }
  ]
}
```

---

## 📺 المسلسلات (TV Series)

### 1. قائمة المسلسلات
```
GET /api/tv?page=1
```
**المعاملات:**
- `page` (اختياري): رقم الصفحة (افتراضي: 1)

**الرد:**
```json
{
  "results": [
    {
      "id": 1,
      "slug": "series-slug",
      "title_ar": "اسم المسلسل",
      "title_en": "Series Title",
      "poster_path": "/path/to/poster.jpg",
      "vote_average": 8.5,
      "first_air_year": 2024
    }
  ],
  "page": 1,
  "limit": 20,
  "hasMore": true
}
```

### 2. تفاصيل مسلسل واحد
```
GET /api/tv/:slug
```
**المثال:**
```
GET /api/tv/breaking-bad
```

**الرد:**
```json
{
  "id": 1,
  "slug": "breaking-bad",
  "title_ar": "كسر السيء",
  "title_en": "Breaking Bad",
  "overview_ar": "...",
  "poster_path": "/path/to/poster.jpg",
  "vote_average": 9.5,
  "first_air_year": 2008,
  "number_of_seasons": 5,
  ...
}
```

### 3. مواسم المسلسل
```
GET /api/tv/:slug/seasons
```
**المثال:**
```
GET /api/tv/breaking-bad/seasons
```

**الرد:**
```json
{
  "seasons": [
    {
      "id": 1,
      "series_id": 1,
      "season_number": 1,
      "name": "Season 1",
      "episode_count": 7,
      "air_date": "2008-01-20"
    },
    {
      "id": 2,
      "series_id": 1,
      "season_number": 2,
      "name": "Season 2",
      "episode_count": 13,
      "air_date": "2009-03-09"
    }
  ]
}
```

### 4. حلقات الموسم
```
GET /api/tv/:slug/season/:season/episodes
```
**المثال:**
```
GET /api/tv/breaking-bad/season/1/episodes
```

**الرد:**
```json
{
  "episodes": [
    {
      "id": 1,
      "season_id": 1,
      "episode_number": 1,
      "name": "Pilot",
      "overview": "...",
      "air_date": "2008-01-20",
      "still_path": "/path/to/still.jpg"
    },
    {
      "id": 2,
      "season_id": 1,
      "episode_number": 2,
      "name": "Cat's in the Bag...",
      "overview": "...",
      "air_date": "2008-01-27",
      "still_path": "/path/to/still.jpg"
    }
  ]
}
```

### 5. ممثلو المسلسل
```
GET /api/tv/:slug/cast
```
**المثال:**
```
GET /api/tv/breaking-bad/cast
```

**الرد:**
```json
{
  "cast": [
    {
      "id": 1,
      "name_ar": "براين كرانستون",
      "name_en": "Bryan Cranston",
      "character_name": "Walter White",
      "profile_path": "/path/to/profile.jpg"
    }
  ]
}
```

### 6. مسلسلات مشابهة
```
GET /api/tv/:slug/similar
```
**المثال:**
```
GET /api/tv/breaking-bad/similar
```

**الرد:**
```json
{
  "similar": [
    {
      "id": 2,
      "slug": "better-call-saul",
      "title_ar": "أفضل استدعاء لـ ساول",
      "title_en": "Better Call Saul",
      "poster_path": "/path/to/poster.jpg",
      "vote_average": 9.3,
      "first_air_year": 2015
    }
  ]
}
```

---

## 🔍 البحث (Search)

### البحث عن أفلام ومسلسلات
```
GET /api/search?q=query&type=all
```
**المعاملات:**
- `q` (مطلوب): نص البحث (يجب أن يكون 2 حرف على الأقل)
- `type` (اختياري): نوع البحث (`all`, `movie`, `series`) - افتراضي: `all`

**المثال:**
```
GET /api/search?q=matrix&type=all
GET /api/search?q=breaking&type=series
```

**الرد:**
```json
{
  "results": [
    {
      "id": 1,
      "slug": "the-matrix",
      "title_ar": "المصفوفة",
      "title_en": "The Matrix",
      "poster_path": "/path/to/poster.jpg",
      "vote_average": 8.7,
      "release_year": 1999,
      "type": "movie"
    },
    {
      "id": 2,
      "slug": "the-matrix-reloaded",
      "title_ar": "المصفوفة: إعادة التحميل",
      "title_en": "The Matrix Reloaded",
      "poster_path": "/path/to/poster.jpg",
      "vote_average": 7.2,
      "release_year": 2003,
      "type": "movie"
    }
  ]
}
```

---

## 📂 الأنواع (Genres)

### قائمة الأنواع
```
GET /api/genres
```

**الرد:**
```json
{
  "genres": [
    {
      "id": 1,
      "name_ar": "أكشن",
      "name_en": "Action",
      "slug": "action"
    },
    {
      "id": 2,
      "name_ar": "دراما",
      "name_en": "Drama",
      "slug": "drama"
    },
    {
      "id": 3,
      "name_ar": "خيال علمي",
      "name_en": "Science Fiction",
      "slug": "science-fiction"
    }
  ]
}
```

---

## 🏠 الرئيسية (Home)

### البيانات الرئيسية
```
GET /api/home
```

**الرد:**
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
      }
    ],
    "topRated": [...],
    "recent": [...]
  },
  "timestamp": "2026-05-04T12:00:00.000Z"
}
```

---

## ⚠️ معالجة الأخطاء

### خطأ 404 - غير موجود
```json
{
  "error": "Movie not found"
}
```

### خطأ 500 - خطأ في الخادم
```json
{
  "status": "error",
  "message": "Error message here"
}
```

---

## 🔗 أمثلة الاستخدام

### استخدام curl
```bash
# الحصول على قائمة الأفلام
curl http://localhost:8787/api/movies

# البحث عن فيلم
curl "http://localhost:8787/api/search?q=matrix"

# الحصول على تفاصيل فيلم
curl http://localhost:8787/api/movies/the-matrix

# الحصول على ممثلي فيلم
curl http://localhost:8787/api/movies/the-matrix/cast

# الحصول على حلقات موسم
curl http://localhost:8787/api/tv/breaking-bad/season/1/episodes
```

### استخدام JavaScript/Fetch
```javascript
// الحصول على قائمة الأفلام
const response = await fetch('http://localhost:8787/api/movies?page=1')
const data = await response.json()
console.log(data.results)

// البحث
const searchResponse = await fetch('http://localhost:8787/api/search?q=matrix')
const searchData = await searchResponse.json()
console.log(searchData.results)
```

---

**آخر تحديث:** 2026-05-04
