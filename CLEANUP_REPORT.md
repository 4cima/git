# 4CIMA Cleanup Report

## Data Quality Issues

### 1. Genre Database Inconsistencies

#### Missing TV-Specific Genres
**Issue:** 5 TV-specific genres defined in `worker/src/db/seed-genres.sql` are not synced to production database (Turso):
- `Kids` (10762) - أطفال
- `News` (10763) - أخبار  
- `Reality` (10764) - ريالتي
- `Soap` (10766) - مسلسل درامي
- `War & Politics` (10768) - حرب وسياسة

**Current State:**
- Seed file contains 27 TMDB genres
- Local DB (data/4cima-local.db) contains only 22 genres
- Turso production DB also contains only 22 genres

**Impact:**
- TV series with these genres will not display genre information correctly
- Genre filtering for these types will not work
- Navigation/discovery features incomplete

**Recommendation:** 
1. Decide if these TV-specific genres are needed for the platform
2. If yes: Sync them from seed file to both local and Turso
3. If no: Remove them from seed file to avoid confusion

**Note:** Most are US TV-specific (Talk shows, News, Soap operas) and may not be relevant for Arabic audience focus.

---

#### Unescaped Special Characters in Genre Slugs
**Issue:** Genre slugs contain unescaped `&` character:
- `/genres/action-&-adventure` (should be `/genres/action-and-adventure`)
- `/genres/sci-fi-&-fantasy` (should be `/genres/sci-fi-and-fantasy`)

**Impact:**
- URL encoding issues in browsers (& → %26)
- Inconsistent URL patterns
- Potential routing problems
- Poor SEO

**Recommendation:** Update slugs to use `-and-` instead of `-&-` for URL-safe format.

**Priority:** Medium (affects URLs but currently functional)

---

## Out-of-Scope Features Requiring Decision

### 1. Quran Feature (REMOVED ✅)
**Status:** DELETED in commit `6dac242`

**Previously:**
- Location: `src/components/features/quran/`  
- Dependencies: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (~100KB)

**Action Taken:** Complete removal - out of scope for movies/TV platform.

---

### 2. Social/Reviews Feature (REMOVED ✅)
**Status:** DELETED in commit `2217296`

**Previously:**
- Locations: `src/components/features/social/`, `src/components/features/reviews/`
- Dependencies: `@supabase/supabase-js` (large package)
- Features: User auth, reviews/ratings, social activity, notifications

**Action Taken:** Complete removal - not actively used, reduces bundle size significantly.

---

## Notes
- These features were discovered during build fix process
- All dependencies are now installed and working
- No immediate action required, but should be reviewed during next cleanup phase
- Removing unused features could significantly reduce bundle size and improve performance
