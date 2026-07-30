# Proposed Diff for Genre Filtering Fix

**Date:** 2026-07-28  
**Issue:** Replace `content_genres` JOIN (non-existent in Turso) with `json_each()` on `genres_json`  
**Approach:** Use precise numeric matching with `json_each()` instead of unreliable `LIKE` string matching

---

## File 1: `src/app/api/movies/route.ts`

### Current Code (Lines 33-39):
```typescript
if (genre) {
  conditions.push(`id IN (
    SELECT cg.content_id FROM content_genres cg
    JOIN genres g ON cg.genre_id = g.id
    WHERE g.slug = ? AND cg.content_type = 'movie'
  )`)
  args.push(genre)
}
```

### Proposed Fix:
```typescript
if (genre) {
  // Get genre tmdb_id from slug
  const genreResult = await turso.execute({
    sql: 'SELECT tmdb_id FROM genres WHERE slug = ? LIMIT 1',
    args: [genre]
  })
  
  if (genreResult.rows && genreResult.rows.length > 0) {
    const genreTmdbId = genreResult.rows[0].tmdb_id
    // TODO: Replace with genre_ids_csv + index when scaling beyond 10K items (see TECH_DEBT.md)
    conditions.push(`EXISTS (
      SELECT 1 FROM json_each(genres_json)
      WHERE CAST(json_extract(value, '$.id') AS INTEGER) = ?
    )`)
    args.push(genreTmdbId)
  }
}
```

**Why `json_each()` with CAST instead of LIKE:**
- `LIKE '%"id":28%'` would incorrectly match id=280, id=281, id=128, etc.
- `CAST(json_extract(...) AS INTEGER) = ?` ensures exact numeric match
- Performance is similar on current dataset (~500 items)
- Both will be replaced by `genre_ids_csv` + index at scale

---

## File 2: `src/app/api/series/route.ts`

### Current Code (Lines 35-41):
```typescript
if (genre) {
  conditions.push(`id IN (
    SELECT cg.content_id FROM content_genres cg
    JOIN genres g ON cg.genre_id = g.id
    WHERE g.slug = ? AND cg.content_type = 'tv_series'
  )`)
  args.push(genre)
}
```

### Proposed Fix:
```typescript
if (genre) {
  // Get genre tmdb_id from slug
  const genreResult = await turso.execute({
    sql: 'SELECT tmdb_id FROM genres WHERE slug = ? LIMIT 1',
    args: [genre]
  })
  
  if (genreResult.rows && genreResult.rows.length > 0) {
    const genreTmdbId = genreResult.rows[0].tmdb_id
    // TODO: Replace with genre_ids_csv + index when scaling beyond 10K items (see TECH_DEBT.md)
    conditions.push(`EXISTS (
      SELECT 1 FROM json_each(genres_json)
      WHERE CAST(json_extract(value, '$.id') AS INTEGER) = ?
    )`)
    args.push(genreTmdbId)
  }
}
```

---

## File 3: `src/app/api/genres/route.ts`

### Current Code (Lines 12-32):
```typescript
// Get all genres with counts
let query = `
  SELECT 
    g.*,
    (SELECT COUNT(*) FROM content_genres cg 
     WHERE cg.genre_id = g.id AND cg.content_type = 'movie') as movie_count,
    (SELECT COUNT(*) FROM content_genres cg 
     WHERE cg.genre_id = g.id AND cg.content_type = 'tv_series') as series_count
  FROM genres g
`

// Filter by type if specified
if (type === 'movie' || type === 'tv') {
  const contentType = type === 'movie' ? 'movie' : 'tv_series'
  query += `
    WHERE EXISTS (
      SELECT 1 FROM content_genres cg 
      WHERE cg.genre_id = g.id AND cg.content_type = '${contentType}'
    )
  `
}
```

### Proposed Fix:
```typescript
// Get all genres with counts
// TODO: Replace with genre_ids_csv + index when scaling beyond 10K items (see TECH_DEBT.md)
let query = `
  SELECT 
    g.*,
    (SELECT COUNT(*) FROM movies m
     WHERE EXISTS (
       SELECT 1 FROM json_each(m.genres_json)
       WHERE CAST(json_extract(value, '$.id') AS INTEGER) = g.tmdb_id
     )) as movie_count,
    (SELECT COUNT(*) FROM tv_series s
     WHERE EXISTS (
       SELECT 1 FROM json_each(s.genres_json)
       WHERE CAST(json_extract(value, '$.id') AS INTEGER) = g.tmdb_id
     )) as series_count
  FROM genres g
`

// Filter by type if specified
if (type === 'movie') {
  query += `
    WHERE EXISTS (
      SELECT 1 FROM movies m
      WHERE EXISTS (
        SELECT 1 FROM json_each(m.genres_json)
        WHERE CAST(json_extract(value, '$.id') AS INTEGER) = g.tmdb_id
      )
    )
  `
} else if (type === 'tv') {
  query += `
    WHERE EXISTS (
      SELECT 1 FROM tv_series s
      WHERE EXISTS (
        SELECT 1 FROM json_each(s.genres_json)
        WHERE CAST(json_extract(value, '$.id') AS INTEGER) = g.tmdb_id
      )
    )
  `
}
```

**Note:** This endpoint will be slower than the others (nested json_each in subqueries) but:
- It's cached for 1 hour (`revalidate = 3600`)
- It's not a frequently-hit endpoint (genre list page)
- Will be replaced by indexed solution before scale

---

## File 4: `src/app/api/genres/[slug]/route.ts`

This file is more complex - it has 3 different query patterns (movie, tv, all). All need fixing.

### Current Code - Movie Type (Lines 51-64):
```typescript
if (type === 'movie') {
  contentQuery = `
    SELECT m.*, 'movie' as media_type
    FROM movies m
    JOIN content_genres cg ON m.id = cg.content_id AND cg.content_type = 'movie'
    WHERE cg.genre_id = ?
    ORDER BY m.${sort} ${order.toUpperCase()}
    LIMIT ? OFFSET ?
  `
  countQuery = `
    SELECT COUNT(*) as total
    FROM content_genres
    WHERE genre_id = ? AND content_type = 'movie'
  `
}
```

### Proposed Fix - Movie Type:
```typescript
if (type === 'movie') {
  // TODO: Replace with genre_ids_csv + index when scaling beyond 10K items (see TECH_DEBT.md)
  contentQuery = `
    SELECT m.*, 'movie' as media_type
    FROM movies m
    WHERE EXISTS (
      SELECT 1 FROM json_each(m.genres_json)
      WHERE CAST(json_extract(value, '$.id') AS INTEGER) = ?
    )
    ORDER BY m.${sort} ${order.toUpperCase()}
    LIMIT ? OFFSET ?
  `
  countQuery = `
    SELECT COUNT(*) as total
    FROM movies m
    WHERE EXISTS (
      SELECT 1 FROM json_each(m.genres_json)
      WHERE CAST(json_extract(value, '$.id') AS INTEGER) = ?
    )
  `
}
```

### Current Code - TV Type (Lines 65-78):
```typescript
else if (type === 'tv') {
  contentQuery = `
    SELECT s.*, 'tv' as media_type
    FROM tv_series s
    JOIN content_genres cg ON s.id = cg.content_id AND cg.content_type = 'tv_series'
    WHERE cg.genre_id = ?
    ORDER BY s.${sort} ${order.toUpperCase()}
    LIMIT ? OFFSET ?
  `
  countQuery = `
    SELECT COUNT(*) as total
    FROM content_genres
    WHERE genre_id = ? AND content_type = 'tv_series'
  `
}
```

### Proposed Fix - TV Type:
```typescript
else if (type === 'tv') {
  // TODO: Replace with genre_ids_csv + index when scaling beyond 10K items (see TECH_DEBT.md)
  contentQuery = `
    SELECT s.*, 'tv' as media_type
    FROM tv_series s
    WHERE EXISTS (
      SELECT 1 FROM json_each(s.genres_json)
      WHERE CAST(json_extract(value, '$.id') AS INTEGER) = ?
    )
    ORDER BY s.${sort} ${order.toUpperCase()}
    LIMIT ? OFFSET ?
  `
  countQuery = `
    SELECT COUNT(*) as total
    FROM tv_series s
    WHERE EXISTS (
      SELECT 1 FROM json_each(s.genres_json)
      WHERE CAST(json_extract(value, '$.id') AS INTEGER) = ?
    )
  `
}
```

### Current Code - All Type (Lines 79-101):
```typescript
else {
  // All content
  contentQuery = `
    SELECT * FROM (
      SELECT m.*, 'movie' as media_type, m.popularity as sort_value
      FROM movies m
      JOIN content_genres cg ON m.id = cg.content_id AND cg.content_type = 'movie'
      WHERE cg.genre_id = ?
      UNION ALL
      SELECT s.*, 'tv' as media_type, s.popularity as sort_value
      FROM tv_series s
      JOIN content_genres cg ON s.id = cg.content_id AND cg.content_type = 'tv_series'
      WHERE cg.genre_id = ?
    )
    ORDER BY sort_value ${order.toUpperCase()}
    LIMIT ? OFFSET ?
  `
  countQuery = `
    SELECT COUNT(*) as total
    FROM content_genres
    WHERE genre_id = ?
  `
}
```

### Proposed Fix - All Type:
```typescript
else {
  // All content
  // TODO: Replace with genre_ids_csv + index when scaling beyond 10K items (see TECH_DEBT.md)
  contentQuery = `
    SELECT * FROM (
      SELECT m.*, 'movie' as media_type, m.popularity as sort_value
      FROM movies m
      WHERE EXISTS (
        SELECT 1 FROM json_each(m.genres_json)
        WHERE CAST(json_extract(value, '$.id') AS INTEGER) = ?
      )
      UNION ALL
      SELECT s.*, 'tv' as media_type, s.popularity as sort_value
      FROM tv_series s
      WHERE EXISTS (
        SELECT 1 FROM json_each(s.genres_json)
        WHERE CAST(json_extract(value, '$.id') AS INTEGER) = ?
      )
    )
    ORDER BY sort_value ${order.toUpperCase()}
    LIMIT ? OFFSET ?
  `
  countQuery = `
    SELECT COUNT(*) as total FROM (
      SELECT 1 FROM movies m
      WHERE EXISTS (
        SELECT 1 FROM json_each(m.genres_json)
        WHERE CAST(json_extract(value, '$.id') AS INTEGER) = ?
      )
      UNION ALL
      SELECT 1 FROM tv_series s
      WHERE EXISTS (
        SELECT 1 FROM json_each(s.genres_json)
        WHERE CAST(json_extract(value, '$.id') AS INTEGER) = ?
      )
    )
  `
}
```

**Important Note for File 4:**
- The `genreId` variable needs to be changed to `genreTmdbId` since we're now matching against `tmdb_id` not `id`
- Change line 45: `const genreId = genre.id` → `const genreTmdbId = genre.tmdb_id`
- Update all query arguments to use `genreTmdbId` instead of `genreId`

---

## Additional Changes Required

### In `src/app/api/genres/[slug]/route.ts`:

**Change variable name (Line 45):**
```typescript
// OLD:
const genreId = genre.id

// NEW:
const genreTmdbId = genre.tmdb_id
```

**Update countArgs (Lines 104-106):**
```typescript
// OLD:
const countArgs = type === 'all' ? [genreId] : [genreId]

// NEW (for 'all' type - needs 2 IDs for UNION):
const countArgs = type === 'all' ? [genreTmdbId, genreTmdbId] : [genreTmdbId]
```

**Update contentArgs (Lines 111-113):**
```typescript
// OLD:
const contentArgs = type === 'all' 
  ? [genreId, genreId, limit, offset]
  : [genreId, limit, offset]

// NEW:
const contentArgs = type === 'all' 
  ? [genreTmdbId, genreTmdbId, limit, offset]
  : [genreTmdbId, limit, offset]
```

---

## Summary of Changes

**Total Files Modified:** 4

**Pattern Applied:**
```sql
-- OLD (broken - table doesn't exist):
JOIN content_genres cg ON ...
WHERE cg.genre_id = g.id

-- NEW (works - uses existing genres_json):
WHERE EXISTS (
  SELECT 1 FROM json_each(genres_json)
  WHERE CAST(json_extract(value, '$.id') AS INTEGER) = ?
)
```

**Why CAST is necessary:**
- `json_extract()` returns text by default
- CAST ensures numeric comparison (28 = 28, not "28" = "280")
- Prevents false matches from substring overlap

**TODO Comments Added:**
Every `json_each()` usage includes a TODO pointing to TECH_DEBT.md for future optimization with `genre_ids_csv` + index.

---

## Testing Plan (To Execute After Implementation)

### 1. Test `/api/movies?genre=action`
```bash
curl "http://localhost:3000/api/movies?genre=action" | jq '.pagination.total, .movies[0].genres_json'
```
**Expected:** Returns movies with Action genre (id=28), verify genres_json contains `{"id":28,...}`

### 2. Test `/api/series?genre=comedy`
```bash
curl "http://localhost:3000/api/series?genre=comedy" | jq '.pagination.total, .series[0].genres_json'
```
**Expected:** Returns series with Comedy genre (id=35), verify genres_json contains `{"id":35,...}`

### 3. Test `/api/genres` (list with counts)
```bash
curl "http://localhost:3000/api/genres" | jq '.genres[] | select(.slug == "action") | {slug, movie_count, series_count}'
```
**Expected:** Returns genre with accurate counts based on genres_json

### 4. Test `/api/genres/action?type=movie`
```bash
curl "http://localhost:3000/api/genres/action?type=movie" | jq '.pagination.total, .content[0].genres_json'
```
**Expected:** Returns movies with Action genre, verify total matches

### 5. Test `/api/genres/drama?type=all`
```bash
curl "http://localhost:3000/api/genres/drama?type=all" | jq '.pagination.total, .content[].media_type'
```
**Expected:** Returns both movies and series with Drama genre

---

**Status:** ⏳ Awaiting approval before implementation
