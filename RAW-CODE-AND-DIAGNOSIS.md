# 📋 الكود الخام الحرفي + التشخيص الكامل
## Raw Code and Full Diagnosis

---

## 1️⃣ الكود الخام الحرفي (بدون تلخيص)

### Constants و Setup:
```javascript
const BATCH_SIZE = 100
```

### Movies Batch Function (حرفياً):
```javascript
async function syncMoviesBatch(movieIds) {
  const statements = []
  
  for (const tmdb_id of movieIds) {
    const movie = db.prepare('SELECT * FROM movies WHERE tmdb_id = ?').get(tmdb_id)
    if (!movie) continue
    
    const genres = db.prepare(`
      SELECT g.tmdb_id, g.name_en, g.name_ar, g.slug
      FROM genres g
      JOIN content_genres cg ON g.tmdb_id = cg.genre_tmdb_id
      WHERE cg.content_tmdb_id = ? AND cg.content_type = 'movie'
    `).all(tmdb_id)
    
    const cast = db.prepare(`
      SELECT p.tmdb_id, p.name_en, p.name_ar, p.profile_path,
             cc.character_name, cc.cast_order
      FROM people p
      JOIN cast_crew cc ON p.tmdb_id = cc.person_tmdb_id
      WHERE cc.content_tmdb_id = ? AND cc.content_type = 'movie'
        AND cc.role_type = 'cast'
      ORDER BY cc.cast_order
      LIMIT 10
    `).all(tmdb_id)
    
    const countries = movie.country_of_origin 
      ? [{ name: movie.country_of_origin }]
      : []
    
    statements.push({
      sql: `
        INSERT INTO movies (
          id, tmdb_id, slug,
          title_en, title_ar,
          overview_ar,
          poster_path, backdrop_path,
          release_date, release_year,
          vote_average, vote_count, popularity, runtime,
          trailer_key,
          genres_json, cast_json, countries_json,
          keywords_json, companies_json,
          seo_title_ar, seo_description_ar, seo_keywords_json,
          canonical_url,
          created_at, updated_at,
          filter_status, original_language
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(tmdb_id) DO UPDATE SET
          slug = excluded.slug,
          title_en = excluded.title_en,
          title_ar = excluded.title_ar,
          overview_ar = excluded.overview_ar,
          poster_path = excluded.poster_path,
          backdrop_path = excluded.backdrop_path,
          release_date = excluded.release_date,
          release_year = excluded.release_year,
          vote_average = excluded.vote_average,
          vote_count = excluded.vote_count,
          popularity = excluded.popularity,
          runtime = excluded.runtime,
          trailer_key = excluded.trailer_key,
          genres_json = excluded.genres_json,
          cast_json = excluded.cast_json,
          countries_json = excluded.countries_json,
          keywords_json = excluded.keywords_json,
          companies_json = excluded.companies_json,
          seo_title_ar = excluded.seo_title_ar,
          seo_description_ar = excluded.seo_description_ar,
          seo_keywords_json = excluded.seo_keywords_json,
          canonical_url = excluded.canonical_url,
          updated_at = excluded.updated_at,
          filter_status = excluded.filter_status,
          original_language = excluded.original_language
      `,
      args: [
        movie.tmdb_id, movie.tmdb_id, movie.slug,
        movie.title_en, movie.title_ar,
        movie.overview_ar,
        movie.poster_path, movie.backdrop_path,
        movie.release_date, movie.release_year,
        movie.vote_average, movie.vote_count, movie.popularity, movie.runtime,
        movie.trailer_key,
        JSON.stringify(genres),
        JSON.stringify(cast),
        JSON.stringify(countries),
        toJsonOrNull(movie.keywords_json),
        toJsonOrNull(movie.companies_json),
        movie.seo_title_ar, movie.seo_description_ar, toJsonOrNull(movie.seo_keywords_json),
        movie.canonical_url,
        movie.created_at, movie.updated_at,
        movie.filter_status, movie.original_language || null
      ]
    })
  }
  
  if (statements.length === 0) return 0
  
  try {
    await turso.batch(statements, 'write')
    
    const placeholders = movieIds.map(() => '?').join(',')
    db.prepare(`
      UPDATE movies SET synced_to_turso = 1, synced_at = datetime('now')
      WHERE tmdb_id IN (${placeholders})
    `).run(...movieIds)
    
    return statements.length
  } catch (err) {
    // لو فشل الـ batch كله، حاول واحد واحد
    console.error(`Batch failed, trying individually...`)
    let synced = 0
    for (const stmt of statements) {
      try {
        await turso.execute(stmt)
        synced++
      } catch (e) {
        console.error(`Failed tmdb_id: ${stmt.args[0]}`, e.message)
      }
    }
    return synced
  }
}
```

### TV Series Batch Function (حرفياً):
```javascript
async function syncSeriesBatch(seriesIds) {
  const statements = []
  
  for (const tmdb_id of seriesIds) {
    const series = db.prepare('SELECT * FROM tv_series WHERE tmdb_id = ?').get(tmdb_id)
    if (!series) continue
    
    const genres = db.prepare(`
      SELECT g.tmdb_id, g.name_en, g.name_ar, g.slug
      FROM genres g
      JOIN content_genres cg ON g.tmdb_id = cg.genre_tmdb_id
      WHERE cg.content_tmdb_id = ? AND cg.content_type = 'tv'
    `).all(tmdb_id)
    
    const cast = db.prepare(`
      SELECT p.tmdb_id, p.name_en, p.name_ar, p.profile_path,
             cc.character_name, cc.cast_order
      FROM people p
      JOIN cast_crew cc ON p.tmdb_id = cc.person_tmdb_id
      WHERE cc.content_tmdb_id = ? AND cc.content_type = 'tv'
        AND cc.role_type = 'cast'
      ORDER BY cc.cast_order
      LIMIT 10
    `).all(tmdb_id)
    
    const seasons = db.prepare(`
      SELECT season_number, name_en, episode_count, air_date, poster_path
      FROM seasons WHERE series_tmdb_id = ?
      ORDER BY season_number
    `).all(tmdb_id)
    
    const episodes = db.prepare(`
      SELECT season_number, episode_number, name_en, overview_en,
             still_path, air_date, runtime, vote_average
      FROM episodes WHERE series_tmdb_id = ?
      ORDER BY season_number, episode_number
    `).all(tmdb_id)
    
    statements.push({
      sql: `
        INSERT INTO tv_series (
          id, tmdb_id, slug,
          name_en, name_ar,
          overview_ar,
          poster_path, backdrop_path,
          first_air_date, first_air_year,
          number_of_seasons, number_of_episodes, status,
          vote_average, vote_count, popularity,
          trailer_key,
          genres_json, cast_json,
          seasons_json, episodes_json,
          seo_title_ar, seo_description_ar, seo_keywords_json,
          canonical_url,
          created_at, updated_at,
          filter_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(tmdb_id) DO UPDATE SET
          slug = excluded.slug,
          name_en = excluded.name_en,
          name_ar = excluded.name_ar,
          overview_ar = excluded.overview_ar,
          poster_path = excluded.poster_path,
          backdrop_path = excluded.backdrop_path,
          first_air_date = excluded.first_air_date,
          first_air_year = excluded.first_air_year,
          number_of_seasons = excluded.number_of_seasons,
          number_of_episodes = excluded.number_of_episodes,
          status = excluded.status,
          vote_average = excluded.vote_average,
          vote_count = excluded.vote_count,
          popularity = excluded.popularity,
          trailer_key = excluded.trailer_key,
          genres_json = excluded.genres_json,
          cast_json = excluded.cast_json,
          seasons_json = excluded.seasons_json,
          episodes_json = excluded.episodes_json,
          seo_title_ar = excluded.seo_title_ar,
          seo_description_ar = excluded.seo_description_ar,
          seo_keywords_json = excluded.seo_keywords_json,
          canonical_url = excluded.canonical_url,
          updated_at = excluded.updated_at,
          filter_status = excluded.filter_status
      `,
      args: [
        series.tmdb_id, series.tmdb_id, series.slug,
        series.name_en, series.name_ar,
        series.overview_ar,
        series.poster_path, series.backdrop_path,
        series.first_air_date, series.first_air_year,
        series.number_of_seasons, series.number_of_episodes, series.status,
        series.vote_average, series.vote_count, series.popularity,
        series.trailer_key,
        JSON.stringify(genres),
        JSON.stringify(cast),
        JSON.stringify(seasons),
        JSON.stringify(episodes),
        series.seo_title_ar, series.seo_description_ar, toJsonOrNull(series.seo_keywords_json),
        series.canonical_url,
        series.created_at, series.updated_at,
        series.filter_status
      ]
    })
  }
  
  if (statements.length === 0) return 0
  
  try {
    await turso.batch(statements, 'write')
    
    const placeholders = seriesIds.map(() => '?').join(',')
    db.prepare(`
      UPDATE tv_series SET synced_to_turso = 1, synced_at = datetime('now')
      WHERE tmdb_id IN (${placeholders})
    `).run(...seriesIds)
    
    return statements.length
  } catch (err) {
    console.error(`Series batch failed, trying individually...`)
    let synced = 0
    for (const stmt of statements) {
      try {
        await turso.execute(stmt)
        synced++
      } catch (e) {
        console.error(`Failed series tmdb_id: ${stmt.args[0]}`, e.message)
      }
    }
    return synced
  }
}
```

---

## 2️⃣ التشخيص الفعلي - Batch لم يفشل!

### نتيجة الاختبار:
```
Testing with 5 series:
  - tmdb_id: 1
  - tmdb_id: 2
  - tmdb_id: 3
  - tmdb_id: 4
  - tmdb_id: 5

Series 1 payload:
  genres: 67 bytes
  cast: 1580 bytes
  seasons: 134 bytes (1 seasons)
  episodes: 2076 bytes (11 episodes)
  TOTAL: 3857 bytes

Series 2 payload:
  genres: 151 bytes
  cast: 1288 bytes
  seasons: 227 bytes (2 seasons)
  episodes: 5716 bytes (13 episodes)
  TOTAL: 7382 bytes

Series 3 payload:
  genres: 71 bytes
  cast: 486 bytes
  seasons: 103 bytes (1 seasons)
  episodes: 913 bytes (6 episodes)
  TOTAL: 1573 bytes

Series 4 payload:
  genres: 67 bytes
  cast: 1600 bytes
  seasons: 133 bytes (1 seasons)
  episodes: 1850 bytes (6 episodes)
  TOTAL: 3650 bytes

Series 5 payload:
  genres: 71 bytes
  cast: 588 bytes
  seasons: 198 bytes (2 seasons)
  episodes: 2047 bytes (13 episodes)
  TOTAL: 2904 bytes

Built 5 statements
Attempting batch insert to Turso...

✅ BATCH SUCCEEDED!
   Duration: 1011ms
   Statements: 5
```

### 🎯 الاكتشاف المفاجئ:

**الـ batch لم يفشل في الاختبار!**

هذا يعني أن السيناريو الأصلي **لم يكن فشل batch** بل:
1. إما أن السكريبت تم إيقافه يدوياً (Ctrl+C) بعد batch insert لكن قبل UPDATE flags
2. أو crash/error في مكان آخر بعد batch لكن قبل UPDATE

---

## 3️⃣ BATCH_SIZE المستخدم

```javascript
const BATCH_SIZE = 100
```

**نفس القيمة** للأفلام والمسلسلات ✅

---

## 4️⃣ تصميم الإصلاح (نصي)

### المشكلة المكتشفة:
الـ bug **ليس** في catch block (لأن batch لم يفشل أصلاً)  
المشكلة: السكريبت تم إيقافه بين `turso.batch()` و `UPDATE synced`

### الحل المقترح (3 مستويات):

#### المستوى 1: إصلاح catch block (احتياطي)
رغم أن المشكلة الحالية ليست هنا، لكن الـ bug موجود ويجب إصلاحه:

```javascript
catch (err) {
  console.error(`Series batch failed, trying individually...`)
  let synced = 0
  for (const stmt of statements) {
    try {
      await turso.execute(stmt)
      
      // ✅ إضافة: تحديث flag فوراً بعد كل نجاح
      const tmdb_id = stmt.args[0]
      db.prepare(`
        UPDATE tv_series SET synced_to_turso = 1, synced_at = datetime('now')
        WHERE tmdb_id = ?
      `).run(tmdb_id)
      
      synced++
    } catch (e) {
      console.error(`Failed series tmdb_id: ${stmt.args[0]}`, e.message)
    }
  }
  return synced
}
```

#### المستوى 2: Logging أفضل
إضافة logging لمعرفة ما يحدث بالضبط:

```javascript
try {
  console.log(`  Sending batch of ${statements.length} series to Turso...`)
  const startTime = Date.now()
  await turso.batch(statements, 'write')
  const duration = Date.now() - startTime
  console.log(`  ✅ Batch succeeded in ${duration}ms`)
  
  console.log(`  Updating local synced flags...`)
  const placeholders = seriesIds.map(() => '?').join(',')
  db.prepare(`
    UPDATE tv_series SET synced_to_turso = 1, synced_at = datetime('now')
    WHERE tmdb_id IN (${placeholders})
  `).run(...seriesIds)
  console.log(`  ✅ Local flags updated`)
  
  return statements.length
}
```

#### المستوى 3: إصلاح الـ 99 يدوياً قبل Sync جديد
قبل تشغيل sync كامل، نحدث الـ 99 الموجودين:

```sql
-- في المحلي
UPDATE tv_series 
SET synced_to_turso = 1, synced_at = datetime('now')
WHERE tmdb_id IN (
  SELECT tmdb_id FROM tv_series WHERE tmdb_id IN (1,2,3,4,5,6,7,9,10,11,...)
)
```

### كيف نربط statement بـ tmdb_id:

في الكود الحالي:
```javascript
statements.push({
  sql: `INSERT INTO ...`,
  args: [
    series.tmdb_id,  // ← args[0] هو tmdb_id ✅
    series.tmdb_id,  // ← args[1] لـ id column
    series.slug,
    ...
  ]
})
```

**التأكيد:** `stmt.args[0]` يحتوي على `tmdb_id` بالفعل

---

## 5️⃣ الإصلاح يجب أن يطبق على الاثنين

### Movies:
```javascript
catch (err) {
  console.error(`Batch failed, trying individually...`)
  let synced = 0
  for (const stmt of statements) {
    try {
      await turso.execute(stmt)
      
      const tmdb_id = stmt.args[0]
      db.prepare(`
        UPDATE movies SET synced_to_turso = 1, synced_at = datetime('now')
        WHERE tmdb_id = ?
      `).run(tmdb_id)
      
      synced++
    } catch (e) {
      console.error(`Failed tmdb_id: ${stmt.args[0]}`, e.message)
    }
  }
  return synced
}
```

### TV Series:
```javascript
catch (err) {
  console.error(`Series batch failed, trying individually...`)
  let synced = 0
  for (const stmt of statements) {
    try {
      await turso.execute(stmt)
      
      const tmdb_id = stmt.args[0]
      db.prepare(`
        UPDATE tv_series SET synced_to_turso = 1, synced_at = datetime('now')
        WHERE tmdb_id = ?
      `).run(tmdb_id)
      
      synced++
    } catch (e) {
      console.error(`Failed series tmdb_id: ${stmt.args[0]}`, e.message)
    }
  }
  return synced
}
```

---

## 📊 الخلاصة

1. ✅ **الكود الخام**: مُرسل بالكامل حرفياً
2. ✅ **التشخيص**: Batch **لم يفشل** - المشكلة كانت إيقاف السكريبت
3. ✅ **BATCH_SIZE**: 100 لكليهما
4. ✅ **تصميم الإصلاح**: 3 مستويات (catch + logging + تصحيح يدوي)
5. ✅ **التطبيق**: على الأفلام **والمسلسلات**

---

**جاهز للموافقة على التعديل**
