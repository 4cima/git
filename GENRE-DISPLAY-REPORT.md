# 📊 تقرير عرض التصنيفات على الكروت

## 📋 بنية قاعدة البيانات

### الجداول الرئيسية

| الجدول | عدد الصفوف | الوصف |
|--------|-----------|-------|
| **movies** | 133,319 | الأفلام |
| **tv_series** | 44,620 | المسلسلات |
| **genres** | 27 | التصنيفات |
| **countries** | 251 | الدول |
| **languages** | 187 | اللغات |
| **global_keywords** | 105 | الكلمات المفتاحية |

### جدول movies - الأعمدة المهمة

```sql
- id (PRIMARY KEY)
- slug (UNIQUE)
- title_ar (عنوان بالعربي)
- title_en (عنوان بالإنجليزي)
- poster_path (رابط الملصق)
- backdrop_path (رابط الخلفية)
- vote_average (التقييم)
- vote_count (عدد التقييمات)
- popularity (الشعبية)
- release_year (سنة الإصدار)
- genres_json (التصنيفات بصيغة JSON) ⭐
- cast_json (الممثلين)
- countries_json (الدول)
- keywords_json (الكلمات المفتاحية)
- overview_ar (نظرة عامة بالعربي)
```

### شكل بيانات genres_json

```json
[
  {
    "id": 18,
    "tmdb_id": 18,
    "name_en": "Drama",
    "name_ar": "دراما",
    "slug": "drama"
  },
  {
    "id": 35,
    "tmdb_id": 35,
    "name_en": "Comedy",
    "name_ar": "كوميديا",
    "slug": "comedy"
  }
]
```

---

## 🔄 مسار البيانات من قاعدة البيانات إلى الواجهة

### المرحلة 1️⃣: قاعدة البيانات (Turso)

```
قاعدة البيانات: Turso (SQLite Cloud)
الاتصال: src/lib/turso.ts
```

**مثال على الاستعلام:**
```sql
SELECT id, slug, title_ar, title_en, poster_path,
       release_year as year, vote_average, genres_json
FROM movies 
WHERE poster_path IS NOT NULL AND vote_average > 0
ORDER BY popularity DESC 
LIMIT 50
```

**النتيجة:**
```json
{
  "id": 2,
  "slug": "ariel",
  "title_ar": "ارييل",
  "title_en": "Ariel",
  "poster_path": "/ojDg0PGvs6R9xYFodRct2kdI6wC.jpg",
  "year": 1988,
  "vote_average": 7.103,
  "genres_json": "[{\"id\":18,\"name_ar\":\"دراما\"}, ...]"
}
```

---

### المرحلة 2️⃣: API Routes (Next.js)

**الملفات:**
- `src/app/api/home/route.ts` - الصفحة الرئيسية
- `src/app/api/movies/route.ts` - صفحة الأفلام
- `src/app/api/series/route.ts` - صفحة المسلسلات

**مثال من `/api/home`:**
```typescript
export async function GET() {
  const [trendingMoviesRes] = await Promise.all([
    turso.execute({
      sql: `SELECT id, slug, title_ar, title_en, poster_path, 
                   release_year as year, vote_average, genres_json
            FROM movies 
            WHERE poster_path IS NOT NULL AND vote_average > 0
            ORDER BY popularity DESC 
            LIMIT 50`,
      args: []
    })
  ])

  return NextResponse.json({
    trendingMovies: trendingMoviesRes.rows,
    // ... أقسام أخرى
  })
}
```

---

### المرحلة 3️⃣: معالجة البيانات (Data Processing)

**الملف:** `src/app/page.tsx`

**دالة استخراج التصنيف:**
```typescript
function mapItems(items: RawItem[], type: 'movie' | 'tv'): MediaItem[] {
  return items.map((item) => ({
    id: item.id,
    slug: item.slug,
    title: item.title_ar || item.title_en,
    title_ar: item.title_ar,
    title_en: item.title_en,
    poster_path: item.poster_path,
    vote_average: Number(item.vote_average) || 0,
    year: item.year,
    media_type: type,
    primary_genre: (() => {
      try {
        const genres = JSON.parse(item.genres_json || '[]')
        return genres?.[0]?.name_ar || null  // ← استخراج أول تصنيف
      } catch {
        return null
      }
    })(),
  }))
}
```

**كيف يتم تكوين الـ Hero:**
```typescript
// 10 عناصر في الهيرو: 5 أفلام + 5 مسلسلات بالتناوب
const heroItems: MediaItem[] = []
for (let i = 0; i < 5; i++) {
  if (trendingMovies[i]) heroItems.push(trendingMovies[i])
  if (trendingSeries[i]) heroItems.push(trendingSeries[i])
}
```

---

### المرحلة 4️⃣: عرض البيانات (React Components)

**الملف:** `src/components/features/media/MovieCard.tsx`

**استخراج التصنيف في الكارت:**
```typescript
// دالة استخراج التصنيف من JSON
const extractGenre = (genresJson: string | undefined): string | null => {
  if (!genresJson) return null
  try {
    const genres = typeof genresJson === 'string' 
      ? JSON.parse(genresJson) 
      : genresJson
    return Array.isArray(genres) && genres.length > 0 
      ? genres[0]?.name_ar || null 
      : null
  } catch {
    return null
  }
}

// استخدام التصنيف
const genreRaw = movie.primary_genre || extractGenre(movie.genres_json)
const genre = genreRaw ? genreRaw : null
```

**عرض التصنيف في الـ UI:**
```tsx
<div className="flex items-center gap-1 text-[9px]">
  {/* التقييم */}
  {rating != null && (
    <span className="flex items-center gap-0.5 text-lumen-gold">
      <Star size={10} fill="currentColor" />
      {rating}
    </span>
  )}

  {/* التصنيف */}
  {genre && (
    <>
      {rating != null && <span className="separator" />}
      <span className="truncate max-w-[80px]">{genre}</span>
    </>
  )}

  {/* السنة */}
  {year && (
    <>
      <span className="separator" />
      <span>{year}</span>
    </>
  )}
</div>
```

---

## 📊 إحصائيات قاعدة البيانات

### الأفلام
- **إجمالي الأفلام:** 133,319
- **أفلام بها تصنيفات:** 5,068 (3.8%)
- **أفلام بدون تصنيفات:** 128,251 (96.2%)

### المسلسلات
- **إجمالي المسلسلات:** 44,620

---

## ✅ ما تم إنجازه

### الملفات المعدلة

1. **`src/app/api/home/route.ts`**
   - ✓ إضافة `genres_json` للاستعلام
   - ✓ جميع الأقسام تحتوي على التصنيفات

2. **`src/app/api/movies/route.ts`**
   - ✓ إضافة `genres_json` للنتائج
   
3. **`src/app/api/series/route.ts`**
   - ✓ إضافة `genres_json` للنتائج

4. **`src/components/features/media/MovieCard.tsx`**
   - ✓ إضافة دالة `extractGenre`
   - ✓ استخراج التصنيف من `genres_json`
   - ✓ عرض التصنيف في الكارت بجانب التقييم والسنة
   - ✓ دعم التصنيفات بالعربية

5. **`src/app/page.tsx`**
   - ✓ استخراج التصنيف في دالة `mapItems`
   - ✓ إضافة `primary_genre` لكل عنصر

---

## 🎯 النتيجة النهائية

### شكل الكارت

```
┌─────────────────────┐
│                     │
│    [الملصق/Poster]   │
│                     │
│                     │
├─────────────────────┤
│  العنوان بالعربي    │
│  العنوان بالإنجليزي │
│                     │
│  ⭐ 7.1 • دراما • 1988│ ← التصنيف هنا
└─────────────────────┘
```

### مثال حقيقي

```
┌─────────────────────┐
│  [صورة فيلم ارييل]  │
├─────────────────────┤
│  ارييل              │
│  Ariel              │
│                     │
│  ⭐ 7.1 • دراما • 1988│
└─────────────────────┘
```

---

## ⚠️ الملاحظات

### الوضع الحالي

1. **التصنيف يظهر بنجاح** للأفلام والمسلسلات التي تحتوي على `genres_json`
2. **فقط 3.8% من الأفلام** لديها تصنيفات حالياً
3. الكود **جاهز ويعمل بشكل صحيح**

### توصيات للمستقبل

1. **ملء `genres_json` للأفلام المتبقية:**
   - يمكن استخدام TMDB API لجلب التصنيفات
   - تشغيل سكريبت لملء البيانات المفقودة

2. **تحسين الأداء:**
   - التصنيفات محفوظة بالفعل في `genres_json`
   - لا حاجة لـ JOIN مع جدول منفصل

3. **SEO:**
   - التصنيفات مهمة للـ SEO
   - يفضل ملئها لجميع الأفلام

---

## 🚀 كيفية التشغيل

```bash
# تشغيل السيرفر
npm run dev

# الموقع متاح على
http://localhost:3000
```

---

## 📝 ملاحظات تقنية

### بنية JSON للتصنيفات

التصنيفات محفوظة كـ JSON array في عمود واحد:
- **ميزة:** سريع، لا حاجة لـ JOIN
- **عيب:** صعوبة التصفية حسب تصنيف معين (يحتاج LIKE query)

### استخراج التصنيف

يتم استخراج **أول تصنيف فقط** من المصفوفة:
```typescript
genres[0]?.name_ar
```

لعرض جميع التصنيفات يمكن تعديل الكود لعمل loop.

---

**تاريخ التقرير:** 2026-07-19
**الحالة:** ✅ مكتمل ويعمل
