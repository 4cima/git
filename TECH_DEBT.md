# Technical Debt Registry

**Purpose:** Centralized tracking of all temporary solutions, workarounds, and deferred optimizations that need attention before scaling.

**Last Updated:** 2026-08-02 (Fixed critical search performance issue - moved from Low Priority to Completed)

---

## 🔴 High Priority (Before 10K+ Items)

### 1. Series Genre Filter - Sequential Scan Issue (Specific Genres Slow)

**Current Implementation:** `genres_json LIKE '%"name_ar":"genre"%'` sequential scan  
**Date Discovered:** 2026-08-02  
**Affected Files:**
- `src/app/api/series/route.ts` (line ~36)

**Problem:**
- Some genres load instantly (دراما: 2.3s, كوميديا: 1.2s)
- Other genres are very slow (رومانسي: 924ms, تاريخي: 1.1s)
- Root cause: **data distribution** not query complexity
  - Fast genres appear at start of table (ID 1-2)
  - Slow genres appear late in table (ID 1321-18398)
  - SQLite sequential scan from ID 1 → must scan thousands of rows before finding first match

**Evidence:**
```
Genre Location Analysis (52,775 total series):
- دراما: First match at ID 1 (row 1) → Fast ✅
- كوميديا: First match at ID 2 (row 2) → Fast ✅
- رومانسي: First match at ID 1,321 → Slow ❌
- تاريخي: First match at ID 18,398 → Very Slow ❌
```

**Why This Matters:**
- User perceives inconsistent performance between genres
- No amount of code optimization will fix this - it's a data layout issue
- Only solutions: indexed column OR reorder table data

**Proper Solution (Part of Genre Index Project):**
- Implement `genre_ids_csv` indexed column (see item #2 below)
- Index eliminates sequential scan entirely
- All genres will have consistent performance

**Workaround (If Not Implementing Index Soon):**
- Increase cache time for slow genres specifically
- Or: periodic VACUUM to reorganize table (risky, requires maintenance window)

**Estimated Effort:** Part of Item #2 (1 day total)  
**Trigger:** User complaints about inconsistent genre filter speed  
**Status:** Deferred - will be resolved by Item #2 implementation

---

### 2. Genre Filtering Performance - Unindexed JSON Scan

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

### 3. Genre Counts Table - Manual Update Required After Ingestion

**Current Implementation:** Precomputed `genre_counts` table populated once manually  
**Date Introduced:** 2026-07-31  
**Affected Files:**
- `src/lib/genres.ts` (uses genre_counts)
- `src/app/api/genres/route.ts` (uses shared function)
- `src/app/genres/page.tsx` (uses shared function)
- `populate-genre-counts.js` (population script)

**Problem:**
- `genre_counts` table stores precomputed movie/series counts per genre
- Created as optimization to avoid expensive `json_each()` queries on 321K rows
- Table is **NOT automatically updated** after ingestion/sync runs
- Counts will become stale and inaccurate as new content is added
- Users will see outdated numbers on /genres page

**Why This Approach:**
- Original genre queries used `json_each()` causing 60+ second timeouts at build time
- Solution was to precompute counts in dedicated table
- Immediate fix for build failures, but creates maintenance requirement

**Current Maintenance Process (Manual):**
1. After running ingestion/sync scripts
2. Manually run: `node populate-genre-counts.js`
3. Verify counts are updated in production database

**Proper Long-Term Solutions:**

**Option A: Automate in Sync Scripts (Recommended)**
- Add genre count recalculation to end of `3-sync-to-turso.js`
- Runs automatically after each sync completes
- Ensures counts always match current data
```javascript
// At end of 3-sync-to-turso.js
console.log('Updating genre counts...')
await updateGenreCounts()
```

**Option B: Trigger-Based Updates (If Turso Supports)**
- Use database triggers to update counts on INSERT/UPDATE
- Automatic, no script changes needed
- Check if Turso/libSQL supports triggers

**Option C: Resolve Root Cause (Item #1)**
- Implement `genre_ids_csv` indexed column solution
- Eliminates need for precomputed counts entirely
- Queries fast enough to run on-demand
- This is the proper long-term fix

**Estimated Effort:**
- Option A (automation): 2-3 hours
- Option B (triggers): 1 day (research + implement + test)
- Option C (full fix): Included in Item #1 (1 day total)

**Trigger:** Before next major content ingestion OR monthly maintenance schedule  
**Priority:** High - impacts data accuracy visible to users  
**Relationship:** Temporary workaround for Item #1 (genre filtering performance)  
**Reference:** `populate-genre-counts.js`, conversation 2026-07-31

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

*(No items currently)*

---

## 📝 Completed Technical Debt

*(Items resolved - kept for historical reference)*

### ✅ Genre Page type='all' Redesign - Fixed 2026-08-03

**Problem:** type='all' fetched ALL movies + ALL series (70K+ rows) into memory, causing timeouts  
**Original Approach Considered:** Dual-cursor merge-sort pagination with separate offsets  
**Final Solution Implemented:** Two separate preview sections instead of merged sorted feed  
- "أفلام [genre]" section: fetches one batch (12-24 items) using type='movie', no infinite scroll
- "مسلسلات [genre]" section: fetches one batch (12-24 items) using type='tv', no infinite scroll
- "شوف كل الأفلام" / "شوف كل المسلسلات" buttons switch to dedicated tabs with full infinite scroll
- Eliminates need for complex merge logic entirely
- Both sections use same limit+1/hasMore pattern as type='movie' and type='tv' tabs (no COUNT)

**Performance:** Each section loads independently in <2s, no memory issues  
**Files Changed:** 
- `src/components/pages/GenrePageClient.tsx` (two-section layout for "الكل" view)
- `TECH_DEBT.md` (item closed)

**Date Fixed:** 2026-08-03  
**Reference:** Conversation 2026-08-03

### ✅ Search Performance Crisis - Fixed 2026-08-02

**Problem:** Single search consuming 50,000-100,000 Turso reads, burning through 500M monthly free tier  
**Root Cause:** 
- `/api/movies/route.ts` and `/api/series/route.ts` used `LIKE '%term%'` with wildcards on both sides
- This defeats all B-tree indexes and forces full table scan of 320K+ rows
- `/api/search/route.ts` had FTS5 but browse/filter pages didn't

**Solution Implemented:**
1. Created FTS5 virtual tables with trigram tokenizer:
   - `movies_fts` (268,755 movies indexed)
   - `series_fts` (52,775 series indexed)
2. Added auto-sync triggers (INSERT/UPDATE/DELETE) to keep FTS5 tables current
3. Replaced LIKE queries in movies/route.ts and series/route.ts with FTS5 joins
4. Created search sanitization utility to handle FTS5 operator characters
5. Query now uses: `JOIN movies_fts ON movies.id = movies_fts.rowid WHERE movies_fts MATCH sanitizeSearchInput(?)`

**Performance Improvement:**
- **Speed:** 12.4x faster (6969ms → 564ms)
- **Reads:** ~99% reduction (50-100K → <500 per search)
- **Scalability:** Monthly search capacity increased from ~5K to ~1M searches on free tier

**Files Changed:**
- `src/app/api/movies/route.ts` (search logic with FTS5 + sanitization)
- `src/app/api/series/route.ts` (search logic with FTS5 + sanitization)
- `src/app/api/search/route.ts` (added sanitization to existing FTS5)
- `src/lib/search-utils.ts` (NEW - search input sanitization utility)
- `scripts/setup-fts5-search.js` (FTS5 table creation)
- `add-fts5-triggers.js` (auto-sync triggers)

**Verification:**
- Test script: `verify-search-fix.js`
- Query plan changed from `SCAN movies` to `SCAN movies_fts VIRTUAL TABLE INDEX`
- Special character handling tested: "Spider-Man", "It's", "9-1-1" (all pass)
- Search sanitization verified: operators escaped, FTS5 index still used
- Real-world titles confirmed: "Spider-Man" (3 results), "It's a Wonderful Life" (3 results)

**Date Fixed:** 2026-08-02  
**Reference:** `verify-search-fix.js`, `diagnose-fts5-search.js`, conversation 2026-08-02

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
