# Technical Debt Registry

**Purpose:** Centralized tracking of all temporary solutions, workarounds, and deferred optimizations that need attention before scaling.

**Last Updated:** 2026-07-28 (Added Item #2: type=all in-memory merge)

---

## 🔴 High Priority (Before 10K+ Items)

### 1. Genre Filtering Performance - Unindexed JSON Scan

**Current Implementation:** `json_each()` on `genres_json` column  
**Date Introduced:** 2026-07-28  
**Affected Files:**
- `src/app/api/movies/route.ts` (line ~35)
- `src/app/api/series/route.ts` (line ~37)
- `src/app/api/genres/route.ts` (line ~15)
- `src/app/api/genres/[slug]/route.ts` (lines ~54, 68, 84)

**Problem:**
- Full table scan on every genre filter query
- Performance degrades linearly with dataset size
- Currently acceptable with ~500 items (~30-50ms)
- Will become bottleneck at 10K+ items (~300-500ms)
- Unusable at 100K+ items (~3+ seconds)

**Root Cause:**
- `content_genres` relational table exists in local.db but was never migrated to Turso
- Current Turso schema uses denormalized `genres_json` TEXT column
- No index can be created on JSON content directly

**Proper Solution:**
```sql
-- 1. Add indexed CSV column to schema
ALTER TABLE movies ADD COLUMN genre_ids_csv TEXT;
ALTER TABLE tv_series ADD COLUMN genre_ids_csv TEXT;

-- 2. Create indexes
CREATE INDEX idx_movies_genre_ids ON movies(genre_ids_csv);
CREATE INDEX idx_series_genre_ids ON tv_series(genre_ids_csv);

-- 3. Populate from existing genres_json
UPDATE movies 
SET genre_ids_csv = (
  SELECT ',' || GROUP_CONCAT(json_extract(value, '$.id'), ',') || ','
  FROM json_each(genres_json)
);

-- 4. Update sync script to populate on insert
-- In 3-sync-to-turso.js, extract IDs:
const genreIdsCsv = movieGenres.length > 0
  ? ',' + movieGenres.map(g => g.id).join(',') + ','
  : null;

-- 5. Update API queries
WHERE ',' || genre_ids_csv || ',' LIKE '%,28,%'
```

**Estimated Effort:** 1 day (schema + script + API + testing)  
**Trigger:** When content reaches 5K-10K items OR if large bulk import planned  
**Reference:** `GENRE-FILTER-FIX-PLAN.md` Section 2, `CLEANUP_REPORT.md`

---

### 2. Genre Page (type=all) - In-Memory Merge and Sort

**Current Implementation:** Fetch all items, merge in JavaScript, paginate in memory  
**Date Introduced:** 2026-07-28  
**Affected Files:**
- `src/app/api/genres/[slug]/route.ts` (lines 88-139)

**Problem:**
- When `?type=all` is requested, fetches ALL movies with genre (no LIMIT)
- Then fetches ALL series with genre (no LIMIT)
- Merges in JavaScript: `const combined = [...movies, ...series]`
- Sorts in JavaScript by popularity
- Paginates in JavaScript: `combined.slice(offset, offset + limit)`
- Currently acceptable with ~283 items for drama genre
- Will become memory bottleneck at 1K+ items per genre (fetching 1000+ rows to return 20)
- Unusable at 10K+ items per genre (~30MB+ memory per request, 500ms+ response time)

**Root Cause:**
- SQL UNION ALL attempted during implementation but failed due to column count mismatch between movies/tv_series schemas
- Workaround solution: separate queries merged in JS instead of SQL
- No SQL-level LIMIT possible when sorting mixed content by popularity

**Relationship to Item #1:**
- This issue is a **direct consequence** of using `json_each()` without indexes
- Once `genre_ids_csv` solution (#1) is implemented, type=all can use proper SQL:
```sql
SELECT * FROM (
  SELECT *, 'movie' as media_type FROM movies 
  WHERE genre_ids_csv LIKE '%,28,%'
  UNION ALL
  SELECT *, 'tv' as media_type FROM tv_series 
  WHERE genre_ids_csv LIKE '%,28,%'
)
ORDER BY popularity DESC
LIMIT 20 OFFSET 0;
```

**Temporary Workaround (if urgent):**
- Add per-table LIMIT before merge: fetch top 1000 from each table instead of all
- Still wasteful but caps memory/time
```javascript
// In each query, add: LIMIT 1000
const moviesResult = await turso.execute({
  sql: `... WHERE json_each(...) LIMIT 1000`,
  args: [genreTmdbId]
})
```

**Proper Solution:**
- Wait for and implement `genre_ids_csv` solution (Item #1)
- Solves both performance AND type=all issues together
- Allows proper SQL UNION ALL with indexed WHERE clause

**Estimated Effort:** 
- Workaround: 30 minutes (add LIMIT 1000 to both queries)
- Proper: Included in Item #1 effort (1 day total)

**Trigger:** When any genre reaches 500+ items OR users report slow page loads  
**Priority:** High (same as #1) - both part of same scaling blocker  
**Reference:** User review 2026-07-28, curl test results showing 283 items fetched for pagination

---

## 🟡 Medium Priority (Before Major Feature Launch)

### 2. Series Seasons Fallback - Default Season 1

**Current Implementation:** Fallback to mock Season 1 when `seasons_json` is empty or invalid  
**Date Introduced:** ~2026-07-20 (during seasons_json migration fix)  
**Affected Files:**
- `src/app/series/[slug]/page.tsx` (season display logic)

**Problem:**
- Some series in Turso have empty/null `seasons_json` despite being marked "complete"
- UI falls back to showing fake "Season 1" to prevent crashes
- Misleading to users - shows season that may not exist

**Root Cause:**
- `seasons_json` was not populated correctly during initial migration
- Some series from old data source lacked season details
- Sync script `3-sync-to-turso.js` propagated empty data

**Proper Solution:**
1. Identify all series with empty `seasons_json` in Turso
2. Re-fetch season data from TMDB API for those series
3. Update `seasons_json` with real data
4. Remove fallback logic from UI (or make it more explicit as "Data Unavailable")

**Alternative (if season data truly unavailable):**
- Show clear "Season information unavailable" message
- Don't show fake season in list

**Estimated Effort:** 4-6 hours (identify + backfill + remove fallback)  
**Trigger:** Before public launch or when user reports become frequent  
**Reference:** Previous discussion during seasons_json fix (check chat history ~2026-07-20)

---

## 🟢 Low Priority (Future Optimization)

### 3. Full-Text Search on Content

**Current Implementation:** `LIKE '%search%'` on title/overview columns  
**Date Introduced:** Original implementation  
**Affected Files:**
- `src/app/api/search/route.ts`

**Problem:**
- Simple LIKE search without ranking or relevance
- No support for Arabic word stems, typos, or fuzzy matching
- Full table scan on large datasets

**Proper Solution:**
- Implement SQLite FTS5 (Full-Text Search) virtual tables
- Separate index for Arabic content with proper tokenization
- Ranking by relevance instead of just popularity

**Estimated Effort:** 2-3 days  
**Trigger:** When search quality complaints increase OR dataset > 50K items  
**Priority:** Low - current search works acceptably for target audience

---

## 📝 Completed Technical Debt

*(Items resolved - kept for historical reference)*

### ✅ Sync Script JSON Columns - Fixed 2026-07-23

**Problem:** Inconsistent JSON.stringify() usage in `3-sync-to-turso.js`  
**Solution:** Added `toJsonOrNull()` helper, standardized all JSON columns  
**Reference:** `SYNC-SCRIPT-FIX-REPORT.md`

### ✅ Missing `original_language` Column - Fixed 2026-07-23

**Problem:** Column missing from movies INSERT statement  
**Solution:** Added to schema, INSERT, args, and UPDATE clauses  
**Reference:** `SYNC-SCRIPT-FIX-REPORT.md`

---

## 🔍 How to Use This Document

**When adding new technical debt:**
1. Add entry under appropriate priority section
2. Include: Implementation, Date, Affected Files, Problem, Root Cause, Proper Solution, Estimated Effort, Trigger
3. Update "Last Updated" date at top
4. Reference this document in TODO comments: `// TODO: See TECH_DEBT.md #<number>`

**When resolving debt:**
1. Move item to "Completed Technical Debt" section with ✅
2. Add resolution date and reference to fix documentation
3. Remove TODO comments from code
4. Update "Last Updated" date

**Priority Levels:**
- 🔴 **High:** Blocks scaling or causes real user impact
- 🟡 **Medium:** Affects quality or maintainability, not urgent
- 🟢 **Low:** Nice-to-have optimization, no pressing need

---

**Note:** This document should be reviewed monthly and updated whenever:
- New temporary solution is implemented
- Existing debt is resolved
- Priority changes due to growth or user feedback
