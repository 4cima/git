/**
 * src/lib/search-content.ts
 *
 * منطق البحث المشترك — مصدر واحد يخدم:
 *   - /api/search (البحث المنسدل في الهيدر — SearchBox)
 *   - صفحة /search (src/app/search/page.tsx)
 *
 * المنطق منقول حرفياً من src/app/api/search/route.ts (كان مضمّناً في الـ route
 * قبل استخراجه لدالة مشتركة) — لا تكرار لمنطق FTS.
 */
import { executeAll } from '@/lib/db'
import { sanitizeSearchInput } from '@/lib/search-utils'
import { filterExcludedGenres } from '@/utils/excludedGenres'

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface SearchContentItem {
  id: number
  slug: string
  media_type?: string
  title_ar?: string
  title_en?: string
  name_ar?: string
  name_en?: string
  poster_path?: string | null
  backdrop_path?: string | null
  release_year?: number
  first_air_year?: number
  vote_average?: number
  popularity?: number
  filter_status?: string | null
  genres_json?: string
  [key: string]: any
}

export interface SearchContentResult {
  results: SearchContentItem[]
  totalFound: number
  searchStrategy: string
}

function calculateScore(
  item: any,
  query: string,
  matchType: 'exact' | 'startsWith' | 'contains' | 'fuzzy'
): number {
  let score = 0
  const matchScores = { exact: 100, startsWith: 70, contains: 40, fuzzy: 20 }
  score += matchScores[matchType]
  const titleLength = Math.min(item.title_ar?.length || 999, item.title_en?.length || 999)
  const queryLength = query.length
  if (queryLength <= 3) {
    const lengthDiff = Math.abs(titleLength - queryLength)
    score += Math.max(0, 50 - (lengthDiff * 5))
  }
  score += Math.min(30, (Number(item.popularity) || 0) / 100)
  score += (Number(item.vote_average) || 0) * 2
  const year = item.release_year || item.first_air_year || 0
  if (year >= 2024) score += 20
  else if (year >= 2020) score += 15
  else if (year >= 2015) score += 10
  else if (year >= 2010) score += 5
  return score
}

function getMatchType(title: string, query: string): 'exact' | 'startsWith' | 'contains' | null {
  if (!title) return null
  const t = title.toLowerCase()
  const q = query.toLowerCase()
  if (t === q) return 'exact'
  if (t.startsWith(q)) return 'startsWith'
  if (t.includes(q)) return 'contains'
  return null
}

async function cascadingSearch(query: string, queryLength: number) {
  let allResults: any[] = []

  // FTS5 search (>= 2 chars minimum)
  if (queryLength >= 2) {
    try {
      const searchTerm = sanitizeSearchInput(query)
      const [moviesFTS, seriesFTS] = await Promise.all([
        executeAll(
          `SELECT movies.id, movies.tmdb_id, movies.slug, movies.title_en, movies.title_ar,
                  movies.poster_path, movies.release_year, movies.vote_average,
                  movies.popularity, movies.filter_status, movies.genres_json,
                  'movie' as media_type, 999 as search_level
           FROM movies
           JOIN movies_fts ON movies.id = movies_fts.rowid
           WHERE movies_fts MATCH ?
             AND (movies.filter_status IN ('clean', 'reviewed_approved') OR movies.filter_status IS NULL)
           AND (movies.release_year IS NOT NULL AND movies.release_year >= 2000)
           ORDER BY rank
           LIMIT 30`,
          [searchTerm]
        ),
        executeAll(
          `SELECT tv_series.id, tv_series.tmdb_id, tv_series.slug, tv_series.name_en, tv_series.name_ar,
                  tv_series.poster_path, tv_series.first_air_year, tv_series.vote_average,
                  tv_series.popularity, tv_series.filter_status, tv_series.genres_json,
                  'tv' as media_type, 999 as search_level
           FROM tv_series
           JOIN series_fts ON tv_series.id = series_fts.rowid
           WHERE series_fts MATCH ?
             AND (tv_series.filter_status IN ('clean', 'reviewed_approved') OR tv_series.filter_status IS NULL)
           AND (tv_series.first_air_year IS NOT NULL AND tv_series.first_air_year >= 2000)
           ORDER BY rank
           LIMIT 30`,
          [searchTerm]
        )
      ])
      // فلتر: Talk Show + War & Politics + Documentary + History
      allResults.push(...filterExcludedGenres([...moviesFTS, ...seriesFTS]))
    } catch {
      console.log('FTS5 search failed, continuing with fallback')
    }
  }

  // Prefix search for 2-char queries - DISABLED (use FTS only)
  // Level 998 queries on movies/tv_series tables removed to avoid full table scans

  return allResults
}

/**
 * نفس سلوك GET /api/search بالضبط — تُستدعى من الـ route ومن صفحة /search من السيرفر
 */
export async function searchContent(q: string): Promise<SearchContentResult> {
  const queryLength = q.length

  // 1-char & 2-char: short_titles_lookup (pre-indexed lists — instant, no full table scans)
  if (queryLength <= 2) {
    const results = await executeAll<SearchContentItem>(
      `SELECT source_id as id, media_type, slug,
              title_ar, title_en, name_ar, name_en,
              poster_path, release_year, first_air_year,
              vote_average, popularity, filter_status
       FROM short_titles_lookup
       WHERE title_length = ?
         AND (LOWER(title_ar) LIKE LOWER(?) || '%' OR LOWER(title_en) LIKE LOWER(?) || '%'
           OR LOWER(name_ar)  LIKE LOWER(?) || '%' OR LOWER(name_en)  LIKE LOWER(?) || '%')
         AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
         AND ((media_type = 'movie' AND release_year IS NOT NULL AND release_year >= 2000)
           OR (media_type = 'tv' AND first_air_year IS NOT NULL AND first_air_year >= 2000))
       ORDER BY
         CASE WHEN LOWER(title_ar) = LOWER(?) OR LOWER(title_en) = LOWER(?)
                   OR LOWER(name_ar) = LOWER(?) OR LOWER(name_en) = LOWER(?) THEN 1
              ELSE 2 END,
         popularity DESC
       LIMIT 50`,
      [queryLength, q, q, q, q, q, q, q, q]
    )
    // فلتر دفاعي (short_titles_lookup لا يحتوي genres_json — الفلتر no-op هنا)
    const filteredResults = filterExcludedGenres(results)
    return { results: filteredResults, totalFound: filteredResults.length, searchStrategy: 'short-title-lookup' }
  }

  const allResults = await cascadingSearch(q, queryLength)
  const seenIds    = new Set<string>()
  const unique     = allResults
    .filter(item => {
      const id = `${item.media_type}-${item.id}`
      if (seenIds.has(id)) return false
      seenIds.add(id)
      return true
    })
    .map(item => {
      const titleAr = item.title_ar || item.name_ar || ''
      const titleEn = item.title_en || item.name_en || ''
      const mtAr    = getMatchType(titleAr, q)
      const mtEn    = getMatchType(titleEn, q)
      const best    = mtAr === 'exact' || mtEn === 'exact' ? 'exact'
                    : mtAr === 'startsWith' || mtEn === 'startsWith' ? 'startsWith'
                    : mtAr === 'contains'   || mtEn === 'contains'   ? 'contains' : 'fuzzy'
      return { ...item, _score: calculateScore(item, q, best), _matchType: best }
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, 50)

  return { results: unique, totalFound: unique.length, searchStrategy: 'fts5-enhanced' }
}
