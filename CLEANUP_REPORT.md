# 4CIMA Cleanup Report

## Out-of-Scope Features Requiring Decision

### 1. Quran Feature (@dnd-kit dependencies)
**Location:** `src/components/features/quran/`  
**Dependencies Added:** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (~100KB)  
**Files:**
- QueueView.tsx
- QueueItem.tsx
- QuranPlayer.tsx (if exists)

**Issue:** Quran (القرآن الكريم) feature is completely outside the scope of a movies/TV series platform (4CIMA).

**Recommendation:** Consider removing this feature and its dependencies to reduce bundle size, unless there's a specific reason to keep it (e.g., Ramadan special content, user engagement feature).

**Decision:** Deferred to project owner.

---

### 2. Social/Reviews Feature (@supabase/supabase-js)
**Location:** 
- `src/components/features/social/`
- `src/components/features/reviews/`
- `src/hooks/useAuth.ts`
- `src/lib/supabase.ts`
- `src/contexts/AuthContext.tsx`

**Dependencies Added:** `@supabase/supabase-js` (large package)  
**Related Dependencies:** `react-hot-toast`, `date-fns`, `axios`

**Features Included:**
- User authentication (Supabase)
- User reviews/ratings
- Social activity feed
- Notifications system
- User profiles

**Issue:** Full-featured social platform built on Supabase. Not clear if these features are actively used or if the Supabase backend is properly configured and maintained.

**Questions:**
1. Is the Supabase instance active and configured?
2. Are reviews/social features actually used by users?
3. Is this worth the bundle size and maintenance cost?

**Recommendation:** 
- If features are not used: Remove completely and use simpler TMDB ratings only
- If features are used: Keep but ensure proper error handling and fallbacks

**Decision:** Deferred to project owner. Requires checking analytics/usage data.

---

## Notes
- These features were discovered during build fix process
- All dependencies are now installed and working
- No immediate action required, but should be reviewed during next cleanup phase
- Removing unused features could significantly reduce bundle size and improve performance
