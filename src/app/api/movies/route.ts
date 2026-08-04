import { NextRequest, NextResponse } from 'next/server'
import { turso } from '@/lib/turso'
import { sanitizeSearchInput } from '@/lib/search-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit
    
    // Filters
    const genre = searchParams.get('genre') // slug
    const year = searchParams.get('year')
    const country = searchParams.get('country')
    const language = searchParams.get('language')
    const ratingMin = searchParams.get('rating_min')
    const ratingMax = searchParams.get('rating_max')
    const runtimeMin = searchParams.get('runtime_min')
    const runtimeMax = searchParams.get('runtime_max')
    const search = searchParams.get('search')
    
    // Sort
    const sort = searchParams.get('sort') || 'popularity'
    const order = searchParams.get('order') || 'desc'
    
    // Build WHERE clause
    const conditions: string[] = []
    const args: any[] = []
    
    // FTS5 search join (if search parameter provided)
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
      // Temporary: use LIKE on slug until genre_ids_csv index is implemented
      // This is faster than json_each() without index (see TECH_DEBT.md #2)
      conditions.push(`genres_json LIKE ?`)
      args.push(`%"slug":"${genre}"%`)
    }
    
    if (year) {
      if (year === 'before-1990') {
        conditions.push('release_year < 1990')
      } else if (year.includes('-')) {
        const [from, to] = year.split('-').map(Number)
        conditions.push('release_year BETWEEN ? AND ?')
        args.push(from, to)
      } else {
        conditions.push('release_year = ?')
        args.push(parseInt(year))
      }
    }
    
    if (country) {
      conditions.push(`countries_json LIKE ?`)
      args.push(`%${country}%`)
    }
    
    if (language) {
      // Support comma-separated language codes (e.g., "hi,ta,ml" or "zh,cn")
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
      // Handle range format (e.g., "7.1-8" means 7.1 to 8.0, "9.1-10" means 9.1 to 10.0)
      if (ratingMin.includes('-')) {
        const [min, max] = ratingMin.split('-').map(parseFloat)
        conditions.push('vote_average BETWEEN ? AND ?')
        args.push(min, max)
      } else {
        // Fallback for old format
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
    
    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}`
      : ''
    
    // Valid sort columns
    const validSorts = ['popularity', 'vote_average', 'vote_count', 'release_year', 'created_at', 'title_ar']
    const sortColumn = validSorts.includes(sort) ? sort : 'popularity'
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
    
    // Get total count - removed, use limit+1 trick instead
    
    // Get movies
    const moviesResult = await turso.execute({
      sql: `
        SELECT movies.id, movies.slug, movies.title_ar, movies.title_en, movies.poster_path,
               movies.vote_average, movies.release_year,
               movies.genres_json, movies.overview_ar, movies.original_language
        FROM movies
        ${ftsJoin}
        ${whereClause}
        ORDER BY ${search ? 'rank,' : ''} ${sortColumn} ${sortOrder}
        LIMIT ? OFFSET ?
      `,
      args: [...args, limit + 1, offset]
    })

    const rows = moviesResult.rows || []
    const hasMore = rows.length > limit
    if (hasMore) rows.pop()

    const response = NextResponse.json({
      movies: rows,
      pagination: { page, limit, hasMore, totalPages: hasMore ? page + 1 : page }
    })
    response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
    return response
  } catch (error) {
    console.error('Error fetching movies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch movies' },
      { status: 500 }
    )
  }
}
