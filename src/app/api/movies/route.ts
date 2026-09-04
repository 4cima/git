import { NextRequest, NextResponse } from 'next/server'
import { executeAll, executeFirst } from '@/lib/db'
import { sanitizeSearchInput } from '@/lib/search-utils'
import { filterExcludedGenres } from '@/utils/excludedGenres'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    const page  = Math.max(1, parseInt(searchParams.get('page')  || '1')  || 1)
    const limit = Math.min(60, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20))
    const offset = (page - 1) * limit
    
    const genre    = searchParams.get('genre')
    const year     = searchParams.get('year')
    const country  = searchParams.get('country')
    const language = searchParams.get('language')
    const ratingMin = searchParams.get('rating_min')
    const ratingMax = searchParams.get('rating_max')
    const runtimeMin = searchParams.get('runtime_min')
    const runtimeMax = searchParams.get('runtime_max')
    const search   = searchParams.get('search')
    const sort     = searchParams.get('sort') || 'popularity'
    const order    = searchParams.get('order') || 'desc'
    
    const conditions: string[] = []
    const args: (string | number)[] = []
    
    let ftsJoin = ''
    if (search) {
      const sanitized = sanitizeSearchInput(search)
      if (sanitized) {
        ftsJoin = 'JOIN movies_fts ON movies.id = movies_fts.rowid'
        conditions.push('movies_fts MATCH ?')
        args.push(sanitized)
      }
    }

    if (genre) {
      /* مطابقة دقيقة وموحّدة: slug → tmdb_id من جدول genres ثم مطابقة المعرّف داخل genres_json.
         تحل مشكلتين: تضارب صيغة الـslug بين جدول genres و genres_json (مثل action-adventure
         مقابل action-&-adventure)، وأي تصادم substring في أرقام المعرّفات. */
      const genreRow = await executeFirst('SELECT tmdb_id FROM genres WHERE slug = ? LIMIT 1', [genre]).catch(() => null)
      if (genreRow && genreRow.tmdb_id != null) {
        conditions.push(`(genres_json LIKE ? OR genres_json LIKE ?)`)
        args.push(`%"tmdb_id":${genreRow.tmdb_id},%`, `%"tmdb_id":${genreRow.tmdb_id}}%`)
      } else {
        conditions.push(`genres_json LIKE ?`)
        args.push(`%"slug":"${genre}"%`)
      }
    }
    
    if (year) {
      if (year === 'before-1990') {
        conditions.push('release_year < 1990')
      } else if (year.includes('-')) {
        const [from, to] = year.split('-').map(Number)
        if (Number.isFinite(from) && Number.isFinite(to)) {
          conditions.push('release_year BETWEEN ? AND ?')
          args.push(from, to)
        }
      } else {
        const y = parseInt(year)
        if (Number.isFinite(y)) {
          conditions.push('release_year = ?')
          args.push(y)
        }
      }
    }
    
    if (country) {
      conditions.push(`countries_json LIKE ?`)
      args.push(`%${country}%`)
    }
    
    if (language) {
      const languages = language.split(',').map(l => l.trim()).filter(l => l)
      if (languages.length === 1) {
        conditions.push('original_language = ?')
        args.push(languages[0])
      } else if (languages.length > 1) {
        const placeholders = languages.map(() => '?').join(',')
        conditions.push(`original_language IN (${placeholders})`)
        args.push(...languages)
      }
    }
    
    if (ratingMin) {
      if (ratingMin.includes('-')) {
        const [min, max] = ratingMin.split('-').map(parseFloat)
        conditions.push('vote_average BETWEEN ? AND ?')
        args.push(min, max)
      } else {
        conditions.push('vote_average >= ?')
        args.push(parseFloat(ratingMin))
      }
    }
    
    if (ratingMax) {
      conditions.push('vote_average <= ?')
      args.push(parseFloat(ratingMax))
    }
    
    if (runtimeMin) {
      conditions.push('runtime >= ?')
      args.push(parseInt(runtimeMin))
    }
    
    if (runtimeMax) {
      conditions.push('runtime <= ?')
      args.push(parseInt(runtimeMax))
    }

    // Exclude unwanted genres (Talk Show, War & Politics, Documentary, History) at SQL level
    // — keeps pagination accurate (no short pages from post-JS filtering)
    conditions.push(`(genres_json IS NULL OR NOT EXISTS (
      SELECT 1 FROM json_each(movies.genres_json)
      WHERE json_extract(value, '$.tmdb_id') IN (10767, 10768, 99, 36)
    ))`)
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const validSorts = ['popularity', 'vote_average', 'vote_count', 'release_year']
    const sortColumn = validSorts.includes(sort) ? sort : 'popularity'
    const sortOrder  = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
    
    // Use cache for first page top rated with no filters
    if (page === 1 && sort === 'vote_average' && !genre && !year && !country && !language && !ratingMin && !ratingMax && !runtimeMin && !runtimeMax && !search) {
      try {
        const cacheRows = await executeAll(
          `SELECT id, tmdb_id, slug, title_ar, title_en, poster_path,
                  vote_average, release_year, genres_json, overview_ar
           FROM list_movies_top_rated
           ORDER BY rank ASC
           LIMIT ? OFFSET ?`,
          [limit + 1, offset]
        )
        const hasMore = cacheRows.length > limit
        if (hasMore) cacheRows.pop()
        const filteredCache = filterExcludedGenres(cacheRows)
        const response = NextResponse.json({
          movies: filteredCache,
          pagination: { page, limit, hasMore, totalPages: hasMore ? page + 1 : page }
        })
        response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
        return response
      } catch (err) {
        console.error('Cache query failed, returning empty:', err)
        return NextResponse.json({
          movies: [],
          pagination: { page, limit, hasMore: false, totalPages: 1 }
        })
      }
    }
    
    const rows = await executeAll(
      `SELECT movies.id, movies.tmdb_id, movies.slug, movies.title_ar, movies.title_en, movies.poster_path,
              movies.vote_average, movies.release_year,
              movies.genres_json, movies.overview_ar, movies.original_language
       FROM movies
       ${ftsJoin}
       ${whereClause}
       ORDER BY ${search ? 'rank,' : ''} ${sortColumn} ${sortOrder}
       LIMIT ? OFFSET ?`,
      [...args, limit + 1, offset]
    )

    const hasMore = rows.length > limit
    if (hasMore) rows.pop()
    const filteredRows = filterExcludedGenres(rows)

    // Broad listings are stable — cache longer at the CDN; narrow/heavy filters less so
    const cacheTime = (genre || ratingMin || ratingMax || runtimeMin || runtimeMax || search) ? 120 : 300
    const response = NextResponse.json({
      movies: filteredRows,
      pagination: { page, limit, hasMore, totalPages: hasMore ? page + 1 : page }
    })
    response.headers.set('Cache-Control', `public, s-maxage=${cacheTime}, stale-while-revalidate=600`)
    return response
  } catch (error) {
    console.error('Error fetching movies:', error)
    return NextResponse.json({ error: 'Failed to fetch movies' }, { status: 500 })
  }
}
