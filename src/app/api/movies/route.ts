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
    
    // Sort
    const sort = searchParams.get('sort') || 'popularity'
    const order = searchParams.get('order') || 'desc'
    
    // Build WHERE clause
    const conditions: string[] = []
    const args: any[] = []
    
    if (genre) {
      conditions.push(`id IN (
        SELECT cg.content_id FROM content_genres cg
        JOIN genres g ON cg.genre_id = g.id
        WHERE g.slug = ? AND cg.content_type = 'movie'
      )`)
      args.push(genre)
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
      conditions.push('original_language = ?')
      args.push(language)
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
    
    // Get total count
    const countResult = await turso.execute({
      sql: `SELECT COUNT(*) as total FROM movies ${whereClause}`,
      args
    })
    const total = Number(countResult.rows[0]?.total || 0)
    
    // Get movies
    const moviesResult = await turso.execute({
      sql: `
        SELECT * FROM movies 
        ${whereClause}
        ORDER BY ${sortColumn} ${sortOrder}
        LIMIT ? OFFSET ?
      `,
      args: [...args, limit, offset]
    })
    
    return NextResponse.json({
      movies: moviesResult.rows || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching movies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch movies' },
      { status: 500 }
    )
  }
}
