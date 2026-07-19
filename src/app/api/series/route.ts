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
    const seasonsMin = searchParams.get('seasons_min')
    const seasonsMax = searchParams.get('seasons_max')
    const status = searchParams.get('status') // Returning Series, Ended, Canceled
    
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
        WHERE g.slug = ? AND cg.content_type = 'tv_series'
      )`)
      args.push(genre)
    }
    
    if (year) {
      conditions.push('first_air_year = ?')
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
    
    if (seasonsMin) {
      conditions.push('number_of_seasons >= ?')
      args.push(parseInt(seasonsMin))
    }
    
    if (seasonsMax) {
      conditions.push('number_of_seasons <= ?')
      args.push(parseInt(seasonsMax))
    }
    
    if (status) {
      conditions.push('status = ?')
      args.push(status)
    }
    
    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}`
      : ''
    
    // Valid sort columns
    const validSorts = ['popularity', 'vote_average', 'first_air_year', 'created_at', 'name_ar']
    const sortColumn = validSorts.includes(sort) ? sort : 'popularity'
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
    
    // Get total count
    const countResult = await turso.execute({
      sql: `SELECT COUNT(*) as total FROM tv_series ${whereClause}`,
      args
    })
    const total = Number(countResult.rows[0]?.total || 0)
    
    // Get series
    const seriesResult = await turso.execute({
      sql: `
        SELECT * FROM tv_series 
        ${whereClause}
        ORDER BY ${sortColumn} ${sortOrder}
        LIMIT ? OFFSET ?
      `,
      args: [...args, limit, offset]
    })
    
    return NextResponse.json({
      series: seriesResult.rows || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching series:', error)
    return NextResponse.json(
      { error: 'Failed to fetch series' },
      { status: 500 }
    )
  }
}
