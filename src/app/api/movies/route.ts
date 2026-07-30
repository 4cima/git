import { NextRequest, NextResponse } from 'next/server'
import { turso } from '@/lib/turso'

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
    
    if (search) {
      conditions.push(`(title_ar LIKE ? OR title_en LIKE ?)`)
      args.push(`%${search}%`, `%${search}%`)
    }

    if (genre) {
      const genreResult = await turso.execute({
        sql: 'SELECT tmdb_id FROM genres WHERE slug = ? LIMIT 1',
        args: [genre]
      })
      
      if (genreResult.rows && genreResult.rows.length > 0) {
        const genreTmdbId = genreResult.rows[0].tmdb_id
        // TODO: Replace with genre_ids_csv + index when scaling beyond 10K items (see TECH_DEBT.md #1)
        conditions.push(`EXISTS (
          SELECT 1 FROM json_each(genres_json)
          WHERE CAST(json_extract(value, '$.id') AS INTEGER) = ?
        )`)
        args.push(genreTmdbId)
      } else {
        // Genre slug not found - return empty results instead of all movies
        conditions.push('1 = 0')
      }
    }
    
    if (year) {
      conditions.push('release_year = ?')
      args.push(parseInt(year))
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
      conditions.push('vote_average >= ?')
      args.push(parseFloat(ratingMin))
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
    const validSorts = ['popularity', 'vote_average', 'release_year', 'created_at', 'title_ar']
    const sortColumn = validSorts.includes(sort) ? sort : 'popularity'
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
    
    // Get total count - removed, use limit+1 trick instead
    
    // Get movies
    const moviesResult = await turso.execute({
      sql: `
        SELECT id, slug, title_ar, title_en, poster_path,
               vote_average, release_year, year,
               genres_json, overview_ar, original_language
        FROM movies
        ${whereClause}
        ORDER BY ${sortColumn} ${sortOrder}
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
