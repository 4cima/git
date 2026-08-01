import { NextRequest, NextResponse } from 'next/server'
import { turso } from '@/lib/turso'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '24')
    const offsetParam = searchParams.get('offset')
    const offset = offsetParam !== null ? parseInt(offsetParam) : (page - 1) * limit
    
    // Filters
    const genre = searchParams.get('genre')
    const year = searchParams.get('year')
    const country = searchParams.get('country')
    const ratingMin = searchParams.get('rating_min')
    const ageRating = searchParams.get('age_rating')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    
    // Sort
    const sort = searchParams.get('sort') || 'popularity'
    const order = searchParams.get('order') || 'desc'
    
    // Build WHERE clause
    const conditions: string[] = []
    const args: any[] = []
    
    if (genre) {
      conditions.push(`genres_json LIKE ?`)
      args.push(`%"name_ar":"${genre}"%`)
    }
    
    if (search) {
      conditions.push(`(name_ar LIKE ? OR name_en LIKE ?)`)
      args.push(`%${search}%`, `%${search}%`)
    }
    
    if (year) {
      if (year === 'before-1990') {
        conditions.push('first_air_year < 1990')
      } else if (year.includes('-')) {
        const [from, to] = year.split('-').map(Number)
        conditions.push('first_air_year BETWEEN ? AND ?')
        args.push(from, to)
      } else {
        conditions.push('first_air_year = ?')
        args.push(parseInt(year))
      }
    }
    
    if (country) {
      conditions.push('country_of_origin = ?')
      args.push(country)
    }
    
    if (ratingMin) {
      // Handle range format (e.g., "7.1-8" means 7.1 to 8.0, "0-1" means 0.0 to 1.0)
      if (ratingMin.includes('-')) {
        const [min, max] = ratingMin.split('-').map(parseFloat)
        // Use INDEXED BY to force using popularity index instead of vote_average
        // This is faster because we scan by popularity and filter vote_average
        conditions.push('vote_average BETWEEN ? AND ?')
        args.push(min, max)
      } else {
        // Fallback for old format
        conditions.push('vote_average >= ?')
        args.push(parseFloat(ratingMin))
      }
    }
    
    if (ageRating) {
      if (ageRating === 'kids') {
        // أطفال: TV-Y + TV-Y7
        conditions.push(`(age_rating IN ('TV-Y', 'TV-Y7'))`)
      } else if (ageRating === 'family') {
        // عائلي: TV-G + TV-PG + NR
        conditions.push(`(age_rating IN ('TV-G', 'TV-PG', 'NR'))`)
      } else if (ageRating === 'teens') {
        // مراهقين: TV-14
        conditions.push(`age_rating = 'TV-14'`)
      } else if (ageRating === 'mature') {
        // بالغين: TV-MA
        conditions.push(`age_rating = 'TV-MA'`)
      }
    }
    
    if (status) {
      if (status === 'ongoing') conditions.push(`status = 'ongoing'`)
      else if (status === 'ended') conditions.push(`status = 'ended'`)
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    
    const validSorts = ['popularity', 'vote_average', 'vote_count', 'first_air_year', 'created_at', 'name_ar']
    const sortColumn = validSorts.includes(sort) ? sort : 'popularity'
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
    
    // Single query - fetch limit+1 to know if there's a next page (no COUNT needed)
    const seriesResult = await turso.execute({
      sql: `
        SELECT
          id, slug, name_ar, name_en, poster_path,
          vote_average, first_air_year,
          genres_json, overview_ar, country_of_origin
        FROM tv_series
        ${whereClause}
        ORDER BY ${sortColumn} ${sortOrder}
        LIMIT ? OFFSET ?
      `,
      args: [...args, limit + 1, offset]
    })

    const rows = seriesResult.rows || []
    const hasMore = rows.length > limit
    if (hasMore) rows.pop()

    const response = NextResponse.json({
      series: rows,
      pagination: {
        page,
        limit,
        hasMore,
        totalPages: hasMore ? page + 1 : page
      }
    })

    // Longer cache for rating filters (they're slower)
    // Cache for 5 minutes for rating filters, 60 seconds for others
    const cacheTime = ratingMin ? 300 : 60
    response.headers.set('Cache-Control', `s-maxage=${cacheTime}, stale-while-revalidate=600`)

    return response

  } catch (error) {
    console.error('Error fetching series:', error)
    return NextResponse.json({ error: 'Failed to fetch series' }, { status: 500 })
  }
}
