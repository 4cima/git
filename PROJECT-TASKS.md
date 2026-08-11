# PROJECT TASKS - Consolidated Tracking

**Purpose:** Single source of truth for all pending, deferred, and completed work across the entire project.  
**Last Updated:** 2026-08-05  
**Rule:** Items marked "Done" only after production verification, not when code is written.

---

## 🔴 CRITICAL PRIORITY

### Database & Performance

| Status | Item | Notes |
|--------|------|-------|
| **Blocked** | **genre_ids_csv indexed column implementation** | Deferred pending decision. Fixes rare-genre slow queries (رومانسي: 924ms, تاريخي: 1.1s). Currently using unindexed `json_each()` on `genres_json` causing sequential scans. Full solution documented in TECH_DEBT.md #1-2. Estimated effort: 1 day (schema + scripts + API changes). **Trigger:** 5K-10K items or large bulk import. |
| **Blocked** | **Database slug normalization (remove "&" from stored genre slugs)** | Non-urgent cleanup. Three genres have "&" in slugs stored in database: `action-&-adventure`, `sci-fi-&-fantasy`, `war-&-politics`. Currently safe (see URL encoding item below) but inconsistent with other genre slug patterns. Low priority. |
| **Not Started** | **Genre counts table - automate refresh after ingestion** | `genre_counts` table stores precomputed counts but requires manual `node populate-genre-counts.js` run after each sync. Counts become stale as new content added. Solution: Add refresh to end of `3-sync-to-turso.js` OR implement genre_ids_csv index (eliminates need for precomputed counts). TECH_DEBT.md #3. Estimated: 2-3 hours automation. |
| **Not Started** | **Series seasons fallback - backfill missing data** | Some series have empty/null `seasons_json` causing UI fallback to fake "Season 1". Need to: identify affected series, re-fetch from TMDB, update database, remove/clarify fallback. TECH_DEBT.md Medium Priority #2. Estimated: 4-6 hours. |

### Code Quality & Architecture

| Status | Item | Notes |
|--------|------|-------|
| **Review** | **GenrePageClient.tsx type='all' redesign - REJECTED as unshippable** | Uncommitted diff (543 insertions/234 deletions). Attempted two-section layout (movies + series separately) but API endpoint has 7+ minute response time for type='all' (435,883ms measured). **Current status:** Leave uncommitted (do NOT discard code), needs complete rework as dedicated task. Files: `src/app/api/genres/[slug]/route.ts`, `src/components/pages/GenrePageClient.tsx`. |
| **Blocked** | **GenresQuickAccess.tsx and /genres page - unencoded string-template hrefs** | Both use template string hrefs like `` href={`/movies?genre=${genre.slug}`} `` which would break with "&" characters. **Currently safe:** Central `genres` table has ZERO genres with "&" in slugs. The 3 series genres with "&" (action-&-adventure, sci-fi-&-fantasy, war-&-politics) exist only in tv_series.genres_json, not exposed via these components. **Risk:** Low unless genres table is populated with "&" slugs in future. Files: `src/components/features/genres/GenresQuickAccess.tsx`, `src/app/genres/page.tsx`. |

---

## 🟡 HIGH PRIORITY

### Performance & Scalability

| Status | Item | Notes |
|--------|------|-------|
| **Not Started** | **SSR/static caching for /movies, /series, /genres, home pages** | **Confirmed 2026-08-05:** 3 out of 4 main pages ship empty client-fetched shells (bad for SEO, doesn't reduce Turso reads). Evidence: (1) Home page `/` - has `'use client'`, 100% client-side. (2) `/movies` - MoviesPageClient.tsx has `'use client'`, revalidate setting ineffective. (3) `/series` - SeriesPageClient.tsx has `'use client'`, revalidate setting ineffective. (4) `/genres` - ✅ Has real SSR with `getGenresWithCounts()`. **Impact:** Poor SEO, higher Turso read usage, slower perceived load times. **Solution:** Needs investigation - don't implement yet. |
| **Not Started** | **sitemap.xml coverage gap** | Only includes 10,000 of 268,755 movies and 10,000 of 52,775 series. Total coverage: ~3.7% of movies, ~19% of series. Likely hardcoded LIMIT or pagination issue. **Impact:** 90%+ of content not indexed by search engines. **Priority:** High for SEO. |
| **Not Started** | **Homepage infinite scroll/pagination verification** | Flagged months ago as "shows fixed content only, no infinite scroll". **Status:** Never verified with real evidence. Need to: (1) Read `src/app/page.tsx` code, (2) Test actual homepage behavior, (3) Confirm if issue exists or was already fixed. Don't assume - verify first. |

### Features & Functionality

| Status | Item | Notes |
|--------|------|-------|
| **Not Started** | **Login system not working - needs investigation** | Newly reported. **Investigation required:** (a) Search git log 3-5 months ago for auth/login/admin commits, (b) Identify last working version and auth approach (was it Supabase?), (c) Test current login flow, capture exact errors, (d) Report findings: was auth removed entirely? Options for revival? **Action:** See Task 4 in current work session. Investigation only, no code changes yet. |
| **Not Started** | **Admin panel restoration/investigation** | Related to login system. Past mention of "removing Supabase/social-auth features" - need to determine if admin panel was completely removed or just broken. See Task 4 investigation. |
| **Done** | **Content genre cleanup (news + talk + documentary + reality)** | ✅ COMPLETED 2026-08-05. Deleted 36,361 items from Turso (28,289 movies + 8,072 series) using ONLY-genre-match rule. Updated `scripts/1-fetch-and-enrich.js` to exclude these genres from future ingestion. Politics genre skipped (doesn't exist). Local database empty (no filtering needed). Database reduced from 289,568 → 253,207 items (-12.56%). Commit: `bf757e1`. Report: `GENRE-CLEANUP-REPORT.md`. |

---

## 🟢 MEDIUM PRIORITY

### UI/UX Improvements (from BACKLOG.md)

| Status | Item | Notes |
|--------|------|-------|
| **Not Started** | **Loading skeleton for images and posters** | Improve perceived performance during image loading. |
| **Not Started** | **Improve lazy loading for images** | Optimize image loading strategy. |
| **Not Started** | **Progressive image loading** | Load low-res placeholder → full image. |
| **Not Started** | **Improve infinite scroll performance** | General optimization (specific to homepage needs verification first). |

### Accessibility (from BACKLOG.md)

| Status | Item | Notes |
|--------|------|-------|
| **Not Started** | **Comprehensive aria labels for all components** | Accessibility compliance work. |
| **Not Started** | **Improve keyboard navigation** | Full keyboard support across site. |
| **Not Started** | **Add clear focus indicators** | Visual feedback for keyboard navigation. |
| **Not Started** | **Full screen reader support** | Test and optimize for screen readers. |
| **Not Started** | **WCAG 2.1 compliance testing** | Professional accessibility audit needed. **Note:** Full validation requires manual testing with assistive technologies. |

### SEO & Metadata (from BACKLOG.md)

| Status | Item | Notes |
|--------|------|-------|
| **Not Started** | **Improve meta tags for each page** | Page-specific SEO optimization. |
| **Not Started** | **Add structured data (Schema.org)** | Rich snippets for search engines. |
| **Not Started** | **Improve Open Graph tags** | Better social media sharing. |
| **Not Started** | **Add Twitter Card metadata** | Twitter-specific sharing optimization. |
| **Not Started** | **Add optimized robots.txt** | Search engine crawling directives. |

---

## 🔵 LOW PRIORITY

### PWA Features (from BACKLOG.md)

| Status | Item | Notes |
|--------|------|-------|
| **Not Started** | **Service worker for offline support** | PWA functionality. |
| **Not Started** | **Optimized app manifest** | PWA metadata. |
| **Not Started** | **Improve caching strategy** | Offline-first approach. |
| **Not Started** | **Add install prompt** | Encourage PWA installation. |
| **Not Started** | **Push notifications support** | User engagement feature. |
| **Not Started** | **Background sync** | Offline data synchronization. |

### Video Features (from BACKLOG.md)

| Status | Item | Notes |
|--------|------|-------|
| **Not Started** | **Picture-in-picture mode** | Enhanced video viewing. |
| **Not Started** | **Improve video player controls** | Better UX for video playback. |
| **Not Started** | **Keyboard shortcuts for player** | Power user features. |
| **Not Started** | **Multiple video quality support** | Adaptive streaming. |
| **Not Started** | **Enhanced subtitle support** | Better caption handling. |

### Monitoring & Analytics (from BACKLOG.md)

| Status | Item | Notes |
|--------|------|-------|
| **Not Started** | **Google Analytics integration** | User behavior tracking. |
| **Not Started** | **Error tracking (Sentry)** | Production error monitoring. |
| **Not Started** | **Performance monitoring** | Real user monitoring (RUM). |
| **Not Started** | **User behavior analytics** | Conversion and engagement tracking. |

### Security (from BACKLOG.md)

| Status | Item | Notes |
|--------|------|-------|
| **Not Started** | **Rate limiting** | API abuse prevention. |
| **Not Started** | **Improve CORS policies** | Cross-origin security. |
| **Not Started** | **Add CSP headers** | Content Security Policy. |
| **Not Started** | **Review API endpoint security** | Security audit. |
| **Not Started** | **Comprehensive input validation** | XSS/injection prevention. |

### Internationalization (from BACKLOG.md)

| Status | Item | Notes |
|--------|------|-------|
| **Not Started** | **Additional language support** | Multi-language UI. |
| **Not Started** | **RTL/LTR switching** | Bidirectional text support. |
| **Not Started** | **Translate all text** | Full localization. |

### State Management (from BACKLOG.md)

| Status | Item | Notes |
|--------|------|-------|
| **Not Started** | **Improve global state management** | Architecture optimization. |
| **Not Started** | **Add caching layer** | Reduce redundant fetches. |
| **Not Started** | **Improve data fetching strategy** | Better data loading patterns. |
| **Not Started** | **Optimistic updates** | Faster perceived responses. |

### Documentation (from BACKLOG.md)

| Status | Item | Notes |
|--------|------|-------|
| **Not Started** | **API documentation** | Document all endpoints. |
| **Not Started** | **Component Storybook** | Visual component documentation. |
| **Not Started** | **Deployment guide** | Production deployment docs. |
| **Not Started** | **Contributing guidelines** | Open source contribution docs. |

---

## ✅ COMPLETED & VERIFIED

### Performance Fixes

| Date | Item | Verification |
|------|------|--------------|
| 2026-08-05 | **Content genre cleanup (news/talk/documentary/reality)** | ✅ Deleted 36,361 items (12.56% of database). Movies: 239,376→211,087. Series: 50,192→42,120. Updated ingestion script to prevent re-sync. ONLY-genre rule preserved mixed-genre content. Commit: `bf757e1`. |
| 2026-08-05 | **Fixed production grid layout bug (missing CSS)** | ✅ Committed `globals.css` with `.grid-responsive` styles (commit 239054a). Koyeb auto-deploy triggered and succeeded. Production site verified working. |
| 2026-08-03 | **Genre Page type='all' redesign - Two-section preview layout** | ✅ Implemented separate movies/series preview sections instead of merged feed. Each section loads <2s. Eliminated 70K+ row memory issue. Files: `GenrePageClient.tsx`. **NOTE:** This is the OLD completed implementation. Current uncommitted diff (reviewed 2026-08-05) attempted different approach that failed (7+ min response time). |
| 2026-08-02 | **Search performance crisis fixed** | ✅ Implemented FTS5 virtual tables with trigram tokenizer. 12.4x faster (6969ms → 564ms). ~99% read reduction (50-100K → <500 per search). Files: `movies/route.ts`, `series/route.ts`, `src/lib/search-utils.ts`, `setup-fts5-search.js`. |
| 2026-07-23 | **Sync script JSON columns standardized** | ✅ Added `toJsonOrNull()` helper, fixed inconsistent JSON.stringify() usage in `3-sync-to-turso.js`. |
| 2026-07-23 | **Missing `original_language` column added** | ✅ Added to schema, INSERT, args, UPDATE clauses. |

### Infrastructure & Deployment

| Date | Item | Verification |
|------|------|--------------|
| 2026-08-05 | **Reviewed Koyeb auto-deploy workflow security** | ✅ Verified workflow uses `${{ secrets.KOYEB_API_TOKEN }}` (secure). No hardcoded token in committed `.github/workflows/deploy.yml`. **Warning:** Raw token was exposed in conversation terminal output - recommend rotation. **New rule:** Never trigger production deploy/redeploy without explicit approval. |

### Code Quality

| Date | Item | Verification |
|------|------|--------------|
| Earlier | **Grid dynamic rows with full rows** | ✅ Completed (from BACKLOG.md). |
| Earlier | **Smart background brightness analysis system** | ✅ Completed (from BACKLOG.md). |
| Earlier | **Progressive background fade from bottom** | ✅ Completed (from BACKLOG.md). |
| Earlier | **Comprehensive improvements (debounced resize, error handling, useCallback)** | ✅ Completed (from BACKLOG.md). |
| Earlier | **Fixed duplicate keys in series** | ✅ Completed (from BACKLOG.md). |
| Earlier | **Increased background clarity on detail pages** | ✅ Completed (from BACKLOG.md). |
| Earlier | **Footer alignment with other page components** | ✅ Completed (from BACKLOG.md). |

---

## 📋 CURRENT WORK SESSION (2026-08-05)

### Completed ✅

1. ✅ **Task 1:** Acknowledged - uncommitted diff left as-is (not discarded)
2. ✅ **Task 2:** Created `PROJECT-TASKS.md` - Consolidated all pending items
3. ✅ **Task 3:** SSR/Static Caching Investigation - Confirmed 3 of 4 pages are 100% client-side
4. ✅ **Task 4:** Login System Investigation - System working perfectly (HTTP Basic Auth)
5. ✅ **Task 5:** Content Genre Cleanup - **EXECUTED AND COMPLETED**
   - Queried exact counts: 36,361 items (28,289 movies + 8,072 series)
   - Deleted all from Turso: news (74), talk (369), documentary (33,113), reality (2,805)
   - Politics genre skipped (doesn't exist as standalone)
   - Updated `scripts/1-fetch-and-enrich.js` with genre exclusions
   - Local database empty (no filtering needed)
   - Verified: 0 single-genre items remaining
   - Committed changes: `bf757e1`
   - Report created: `GENRE-CLEANUP-REPORT.md`

### Investigation Findings (Task 3 - SSR/Static Caching)

**Report Date:** 2026-08-05  
**Status:** Investigation complete, report added to HIGH PRIORITY section above.

**Evidence:**
- Home page (`/`) - `'use client'` directive at line 1 → 100% client-side
- Movies page (`/movies`) - MoviesPageClient.tsx has `'use client'` → 100% client-side
- Series page (`/series`) - SeriesPageClient.tsx has `'use client'` → 100% client-side
- Genres page (`/genres`) - ✅ Real server-side rendering with `getGenresWithCounts()`

**Conclusion:** 3 out of 4 main pages ship empty shells. The `revalidate` exports in movies/series page.tsx files are ineffective because they return client components.

---

## 🔍 STATUS KEY

- **Not Started** - Task identified but no work begun
- **In Progress** - Currently being worked on
- **Blocked** - Waiting on decision, external dependency, or prerequisite
- **Review** - Code written, needs review/testing before merge
- **Done** - ✅ Completed AND verified working in production

---

## 📝 NOTES

### Standing Rules (Established 2026-08-05)

1. **No production actions without approval** - Never trigger deploy/redeploy, schema changes, or deletions without explicit go-ahead
2. **Items marked "Done" only after real verification** - Code written ≠ Done. Must verify working in production.
3. **Uncommitted diff handling** - The 543/234 diff reviewed 2026-08-05 should remain uncommitted (not discarded) for future revisit

### Technical Context

- **Database:** Turso production with 268,755 movies and 52,775 series
- **Dev server:** Running on Terminal ID 1, localhost:3000
- **Auto-deploy:** GitHub Actions → Koyeb on push to main branch
- **FTS5 search:** Implemented with trigram tokenizer (movies_fts, series_fts tables)
- **Performance indexes:** 6 indexes exist for movies/series sorting (vote_average, vote_count, year_popularity, etc.)
- **Genre slugs with "&":** Three series genres (action-&-adventure, sci-fi-&-fantasy, war-&-politics) - currently safe, not in nav links

### Security Notes

- **Koyeb API token exposure:** Token `1l4xy7i22slpw1oh7nibqdoqadjqllddjnpjnm7ml3jvsqix3trq5i1sx5s0jqm2` visible in conversation terminal output - consider rotating
- **Workflow security:** Verified `.github/workflows/deploy.yml` uses secrets reference (secure)

---

**Last Updated:** 2026-08-05  
**Next Review:** When new items added or priorities change
