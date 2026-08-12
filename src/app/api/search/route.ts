import { NextRequest, NextResponse } from 'next/server'
import { turso } from '@/lib/turso'
import { sanitizeSearchInput } from '@/lib/search-utils'

export const dynamic = 'force-dynamic'

// Smart ranking score calculator
function calculateScore(
  item: any,
  query: string,
  matchType: 'exact' | 'startsWith' | 'contains' | 'fuzzy'
): number {
  let score = 0
  
  // Match type priority (0-100)
  const matchScores = {
    exact: 100,
    startsWith: 70,
    contains: 40,
    fuzzy: 20
  }
  score += matchScores[matchType]
  
  // Length similarity bonus for short queries (0-50)
  const titleLength = Math.min(item.title_ar?.length || 999, item.title_en?.length || 999)
  const queryLength = query.length
  if (queryLength <= 3) {
    const lengthDiff = Math.abs(titleLength - queryLength)
    score += Math.max(0, 50 - (lengthDiff * 5))
  }
  
  // Popularity boost (0-30)
  const popularity = Number(item.popularity) || 0
  score += Math.min(30, popularity / 100)
  
  // Rating boost (0-20)
  const rating = Number(item.vote_average) || 0
  score += rating * 2
  
  // Recency boost (0-20)
  const year = item.release_year || item.first_air_year || 0
  if (year >= 2024) score += 20
  else if (year >= 2020) score += 15
  else if (year >= 2015) score += 10
  else if (year >= 2010) score += 5
  
  return score
}

// Check match type
function getMatchType(title: string, query: string): 'exact' | 'startsWith' | 'contains' | null {
  if (!title) return null
  const titleLower = title.toLowerCase()
  const queryLower = query.toLowerCase()
  
  if (titleLower === queryLower) return 'exact'
  if (titleLower.startsWith(queryLower)) return 'startsWith'
  if (titleLower.includes(queryLower)) return 'contains'
  return null
}

// Cascading search with fallback
async function cascadingSearch(query: string, queryLength: number) {
  let allResults: any[] = []
  
  // Level 1: Exact length match
  if (queryLength <= 2) {
    const moviesExact = await turso.execute({
      sql: `
        SELECT *, 'movie' as media_type, ${queryLength} as search_level
        FROM movies
        WHERE (LENGTH(title_ar) = ? OR LENGTH(title_en) = ?)
          AND (
            LOWER(title_ar) = LOWER(?) OR LOWER(title_en) = LOWER(?)
            OR LOWER(title_ar) LIKE LOWER(?) || '%' OR LOWER(title_en) LIKE LOWER(?) || '%'
            OR LOWER(title_ar) LIKE '%' || LOWER(?) || '%' OR LOWER(title_en) LIKE '%' || LOWER(?) || '%'
          )
          AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
        ORDER BY popularity DESC
        LIMIT 20
      `,
      args: [queryLength, queryLength, query, query, query, query, query, query]
    })
    
    const seriesExact = await turso.execute({
      sql: `
        SELECT *, 'tv' as media_type, ${queryLength} as search_level
        FROM tv_series
        WHERE (LENGTH(name_ar) = ? OR LENGTH(name_en) = ?)
          AND (
            LOWER(name_ar) = LOWER(?) OR LOWER(name_en) = LOWER(?)
            OR LOWER(name_ar) LIKE LOWER(?) || '%' OR LOWER(name_en) LIKE LOWER(?) || '%'
            OR LOWER(name_ar) LIKE '%' || LOWER(?) || '%' OR LOWER(name_en) LIKE '%' || LOWER(?) || '%'
          )
          AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
        ORDER BY popularity DESC
        LIMIT 20
      `,
      args: [queryLength, queryLength, query, query, query, query, query, query]
    })
    
    allResults.push(...moviesExact.rows, ...seriesExact.rows)
  }
  
  // Level 2: +1 character fallback (only if level 1 returned ZERO results)
  if (allResults.length === 0 && queryLength <= 2) {
    const nextLength = queryLength + 1
    const moviesNext = await turso.execute({
      sql: `
        SELECT *, 'movie' as media_type, ${nextLength} as search_level
        FROM movies
        WHERE (LENGTH(title_ar) = ? OR LENGTH(title_en) = ?)
          AND (
            LOWER(title_ar) LIKE LOWER(?) || '%' OR LOWER(title_en) LIKE LOWER(?) || '%'
            OR LOWER(title_ar) LIKE '%' || LOWER(?) || '%' OR LOWER(title_en) LIKE '%' || LOWER(?) || '%'
          )
          AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
        ORDER BY popularity DESC
        LIMIT 15
      `,
      args: [nextLength, nextLength, query, query, query, query]
    })
    
    const seriesNext = await turso.execute({
      sql: `
        SELECT *, 'tv' as media_type, ${nextLength} as search_level
        FROM tv_series
        WHERE (LENGTH(name_ar) = ? OR LENGTH(name_en) = ?)
          AND (
            LOWER(name_ar) LIKE LOWER(?) || '%' OR LOWER(name_en) LIKE LOWER(?) || '%'
            OR LOWER(name_ar) LIKE '%' || LOWER(?) || '%' OR LOWER(name_en) LIKE '%' || LOWER(?) || '%'
          )
          AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
        ORDER BY popularity DESC
        LIMIT 15
      `,
      args: [nextLength, nextLength, query, query, query, query]
    })
    
    allResults.push(...moviesNext.rows, ...seriesNext.rows)
  }
  
  // Level 3: +2 characters fallback (only if levels 1+2 returned ZERO results)
  if (allResults.length === 0 && queryLength <= 2) {
    const nextLength = queryLength + 2
    const moviesNext2 = await turso.execute({
      sql: `
        SELECT *, 'movie' as media_type, ${nextLength} as search_level
        FROM movies
        WHERE (LENGTH(title_ar) = ? OR LENGTH(title_en) = ?)
          AND (
            LOWER(title_ar) LIKE LOWER(?) || '%' OR LOWER(title_en) LIKE LOWER(?) || '%'
            OR LOWER(title_ar) LIKE '%' || LOWER(?) || '%' OR LOWER(title_en) LIKE '%' || LOWER(?) || '%'
          )
          AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
        ORDER BY popularity DESC
        LIMIT 10
      `,
      args: [nextLength, nextLength, query, query, query, query]
    })
    
    const seriesNext2 = await turso.execute({
      sql: `
        SELECT *, 'tv' as media_type, ${nextLength} as search_level
        FROM tv_series
        WHERE (LENGTH(name_ar) = ? OR LENGTH(name_en) = ?)
          AND (
            LOWER(name_ar) LIKE LOWER(?) || '%' OR LOWER(name_en) LIKE LOWER(?) || '%'
            OR LOWER(name_ar) LIKE '%' || LOWER(?) || '%' OR LOWER(name_en) LIKE '%' || LOWER(?) || '%'
          )
          AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
        ORDER BY popularity DESC
        LIMIT 10
      `,
      args: [nextLength, nextLength, query, query, query, query]
    })
    
    allResults.push(...moviesNext2.rows, ...seriesNext2.rows)
  }
  
  // Level 4: Full FTS5 search (only if all length-based levels returned ZERO, or query >= 3 chars)
  if (allResults.length === 0 || queryLength >= 3) {
    try {
      const searchTerm = sanitizeSearchInput(query)
      
      const moviesFTS = await turso.execute({
        sql: `
          SELECT movies.*, 'movie' as media_type, 999 as search_level
          FROM movies
          JOIN movies_fts ON movies.id = movies_fts.rowid
          WHERE movies_fts MATCH ?
            AND (movies.filter_status IN ('clean', 'reviewed_approved') OR movies.filter_status IS NULL)
          ORDER BY rank
          LIMIT 30
        `,
        args: [searchTerm]
      })
      
      const seriesFTS = await turso.execute({
        sql: `
          SELECT tv_series.*, 'tv' as media_type, 999 as search_level
          FROM tv_series
          JOIN series_fts ON tv_series.id = series_fts.rowid
          WHERE series_fts MATCH ?
            AND (tv_series.filter_status IN ('clean', 'reviewed_approved') OR tv_series.filter_status IS NULL)
          ORDER BY rank
          LIMIT 30
        `,
        args: [searchTerm]
      })
      
      allResults.push(...moviesFTS.rows, ...seriesFTS.rows)
    } catch (error) {
      console.log('FTS5 search failed, continuing with fallback')
    }
  }
  
  // Level 5: Broad partial match (only if still ZERO results)
  if (allResults.length === 0) {
    const moviesPartial = await turso.execute({
      sql: `
        SELECT *, 'movie' as media_type, 1000 as search_level
        FROM movies
        WHERE (
          LOWER(title_ar) LIKE '%' || LOWER(?) || '%' 
          OR LOWER(title_en) LIKE '%' || LOWER(?) || '%'
        )
        AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
        ORDER BY 
          CASE 
            WHEN LOWER(title_ar) LIKE LOWER(?) || '%' OR LOWER(title_en) LIKE LOWER(?) || '%' THEN 1
            ELSE 2 
          END,
          popularity DESC,
          vote_average DESC
        LIMIT 20
      `,
      args: [query, query, query, query]
    })
    
    const seriesPartial = await turso.execute({
      sql: `
        SELECT *, 'tv' as media_type, 1000 as search_level
        FROM tv_series
        WHERE (
          LOWER(name_ar) LIKE '%' || LOWER(?) || '%' 
          OR LOWER(name_en) LIKE '%' || LOWER(?) || '%'
        )
        AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
        ORDER BY 
          CASE 
            WHEN LOWER(name_ar) LIKE LOWER(?) || '%' OR LOWER(name_en) LIKE LOWER(?) || '%' THEN 1
            ELSE 2 
          END,
          popularity DESC,
          vote_average DESC
        LIMIT 20
      `,
      args: [query, query, query, query]
    })
    
    allResults.push(...moviesPartial.rows, ...seriesPartial.rows)
  }
  
  // Level 6: Character-by-character fuzzy (last resort, only if still ZERO results)
  if (allResults.length === 0 && queryLength >= 2) {
    // Search for each character in query
    const chars = query.split('').slice(0, 3).join('%')
    
    const moviesFuzzy = await turso.execute({
      sql: `
        SELECT *, 'movie' as media_type, 1001 as search_level
        FROM movies
        WHERE (
          LOWER(title_ar) LIKE '%' || LOWER(?) || '%' 
          OR LOWER(title_en) LIKE '%' || LOWER(?) || '%'
        )
        AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
        ORDER BY popularity DESC, vote_average DESC
        LIMIT 15
      `,
      args: [chars, chars]
    })
    
    const seriesFuzzy = await turso.execute({
      sql: `
        SELECT *, 'tv' as media_type, 1001 as search_level
        FROM tv_series
        WHERE (
          LOWER(name_ar) LIKE '%' || LOWER(?) || '%' 
          OR LOWER(name_en) LIKE '%' || LOWER(?) || '%'
        )
        AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
        ORDER BY popularity DESC, vote_average DESC
        LIMIT 15
      `,
      args: [chars, chars]
    })
    
    allResults.push(...moviesFuzzy.rows, ...seriesFuzzy.rows)
  }
  
  return allResults
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const q = searchParams.get('q')
    
    if (!q || q.length < 1) {
      return NextResponse.json({ results: [] })
    }
    
    const queryLength = q.length
    
    // Execute cascading search with multiple fallback levels
    const allResults = await cascadingSearch(q, queryLength)
    
    // Remove duplicates and calculate smart scores
    const seenIds = new Set<string>()
    const uniqueResults = allResults
      .filter(item => {
        const id = `${item.media_type}-${item.id}`
        if (seenIds.has(id)) return false
        seenIds.add(id)
        return true
      })
      .map(item => {
        // Determine match type
        const titleAr = item.title_ar || item.name_ar || ''
        const titleEn = item.title_en || item.name_en || ''
        
        const matchTypeAr = getMatchType(titleAr, q)
        const matchTypeEn = getMatchType(titleEn, q)
        const bestMatchType = matchTypeAr === 'exact' || matchTypeEn === 'exact' ? 'exact' :
                             matchTypeAr === 'startsWith' || matchTypeEn === 'startsWith' ? 'startsWith' :
                             matchTypeAr === 'contains' || matchTypeEn === 'contains' ? 'contains' : 'fuzzy'
        
        // Calculate smart score
        const score = calculateScore(item, q, bestMatchType)
        
        return {
          ...item,
          _score: score,
          _matchType: bestMatchType
        }
      })
      .sort((a, b) => b._score - a._score)
      .slice(0, 50) // Return top 50 results
    
    return NextResponse.json({ 
      results: uniqueResults,
      totalFound: uniqueResults.length,
      searchStrategy: queryLength <= 2 ? 'smart-cascading' : 'fts5-enhanced'
    })
  } catch (error) {
    console.error('Error searching:', error)
    return NextResponse.json({ results: [], error: 'Search failed' })
  }
}
