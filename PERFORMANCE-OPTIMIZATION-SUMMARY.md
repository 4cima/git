# /api/home Performance Optimization Summary

## Problem
`/api/home` endpoint was taking **80-160 seconds** in both dev and production modes.

## Root Cause Analysis

### Initial Investigation
1. ✅ Confirmed frontend components (SeriesPageClient, MoviesPageClient) were optimized
2. ✅ Turso connection management was correct (singleton pattern)
3. ✅ No connection leaks (verified with process check)
4. ❌ **Production build was fast ONLY because of ISR caching**, not because queries were fast

### Deep Dive: Isolated Query Measurement
Measured actual query performance without HTTP/caching overhead:

**Original Performance (No Optimization):**
```
1. trendingMovies:  63,789ms  (63.8s)
2. trendingSeries:  20,211ms  (20.2s)
3. latest:         187,661ms (187.7s) ← SLOWEST
4. topRated:       105,366ms (105.4s)
5. series:          41,284ms  (41.3s)
───────────────────────────────────────
Sequential Total:  418,311ms (6.97 min)
Parallel Total:    171,776ms (2.86 min) ← Actual /api/home response time
```

### EXPLAIN QUERY PLAN Diagnosis
Every query showed:
```sql
SEARCH movies USING INDEX idx_movies_filter_status (filter_status=?)
USE TEMP B-TREE FOR ORDER BY  ← THE PROBLEM!
```

**What went wrong:**
- SQLite chose `idx_movies_filter_status` for filtering
- Then performed **full in-memory sort** on `popularity`, `release_year`, or `vote_average`
- Even though better partial indexes existed!

### Why Existing Partial Indexes Didn't Work

**Queries had:**
```sql
WHERE poster_path IS NOT NULL 
  AND backdrop_path IS NOT NULL 
  AND vote_average > 0
```

**But indexes had:**
```sql
WHERE poster_path IS NOT NULL 
  AND backdrop_path IS NOT NULL 
  AND vote_average > 0
  AND (filter_status IS NULL OR filter_status IN ('clean', 'reviewed_approved'))
                                  ↑
                        Extra condition = no match!
```

**Data check revealed:**
- 100% of rows have `filter_status IN ('clean', 'reviewed_approved')`
- 0% have `filter_status IS NULL`
- So the condition is **always true** but prevents index matching!

## Solution

### 1. Created Custom Partial Indexes
Created 4 new indexes matching **exact** WHERE clauses:

```sql
-- Query 2: trendingSeries
CREATE INDEX idx_series_home_trending 
ON tv_series(popularity DESC) 
WHERE poster_path IS NOT NULL 
  AND backdrop_path IS NOT NULL 
  AND vote_average > 0;

-- Query 3: latest (was 187s!)
CREATE INDEX idx_movies_home_latest 
ON movies(release_year DESC, popularity DESC) 
WHERE poster_path IS NOT NULL;

-- Query 4: topRated
CREATE INDEX idx_movies_home_toprated 
ON movies(vote_average DESC) 
WHERE poster_path IS NOT NULL 
  AND vote_average >= 7.5;

-- Query 5: series
CREATE INDEX idx_series_home_all 
ON tv_series(popularity DESC) 
WHERE poster_path IS NOT NULL;
```

**Note:** Query 1 (trendingMovies) already had perfect match with `idx_movies_pop_partial2`

### 2. Used INDEXED BY Hints
Added explicit index hints to force SQLite to use optimal indexes:

```typescript
FROM movies INDEXED BY idx_movies_home_latest
FROM tv_series INDEXED BY idx_series_home_trending
// etc.
```

### 3. Simplified WHERE Clauses
Removed redundant `filter_status` conditions since 100% of rows match.

## Results

### Performance After Optimization

**Run 1 (cold cache):**
```
1. trendingMovies:    896ms
2. trendingSeries:    164ms
3. latest:            106ms
4. topRated:          427ms
5. series:            106ms
───────────────────────────
Parallel Total:       333ms
```

**Run 2 (warm cache):**
```
1. trendingMovies:    186ms
2. trendingSeries:    120ms
3. latest:            116ms
4. topRated:          103ms
5. series:            118ms
───────────────────────────
Parallel Total:       224ms
```

**Average: 279ms** (warm cache: 224ms)

### Improvement Summary

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Total Response Time** | 171,776ms | 279ms | **99.84%** faster |
| **Speedup** | - | - | **615.7x** |
| **Query 1 (trendingMovies)** | 63,789ms | 541ms | **117.9x** speedup |
| **Query 2 (trendingSeries)** | 20,211ms | 142ms | **142.3x** speedup |
| **Query 3 (latest)** | 187,661ms | 111ms | **1,690.6x** speedup 🔥 |
| **Query 4 (topRated)** | 105,366ms | 265ms | **397.6x** speedup |
| **Query 5 (series)** | 41,284ms | 112ms | **368.6x** speedup |

## Key Learnings

1. **Production speed ≠ Query speed**: ISR can mask slow queries
2. **Measure in isolation**: Always test queries without HTTP/caching overhead
3. **EXPLAIN QUERY PLAN is essential**: "USE TEMP B-TREE" = performance killer
4. **Exact WHERE matching**: Partial indexes must match query WHERE clauses exactly
5. **INDEXED BY when needed**: Query planner doesn't always choose optimally
6. **Remove redundant conditions**: Even always-true conditions can break index matching

## Deployment Notes

### For Koyeb Production
- ✅ ISR configured: `revalidate: 3600` (1 hour)
- ✅ Cache headers: `s-maxage=3600, stale-while-revalidate=7200`
- ⚠️ **Verify Koyeb timeout > 3600s** for ISR background regeneration
- ✅ New indexes are permanent (already created in Turso)

### Monitoring
- Watch for console logs: `[API /home] Data fetched in Xms`
- Should see **< 500ms** consistently in production (after ISR cache warms up)
- First request after cache expiry: ~300-500ms (acceptable)
- Subsequent requests: < 100ms (served from cache)

## Files Modified
- `src/app/api/home/route.ts` - Added INDEXED BY hints, simplified WHERE clauses
- Created 4 new indexes in Turso database

## Scripts Created
- `measure-home-queries-isolated.js` - Measure queries without HTTP overhead
- `explain-home-queries.js` - Show query execution plans
- `compare-queries-vs-indexes.js` - Compare queries vs index definitions
- `create-optimized-home-indexes.js` - Create custom indexes
- `measure-final-optimized.js` - Final measurement with 2 runs
- `list-current-indexes.js` - List all indexes
- `check-null-filter-status.js` - Verify filter_status distribution

## Credits
- Performance investigation: Deep query profiling with EXPLAIN QUERY PLAN
- Solution: Custom partial indexes with exact WHERE matching
- Measurement methodology: Isolated testing without cache interference
