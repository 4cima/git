import { NextRequest, NextResponse } from 'next/server'
import { executeAll } from '@/lib/db'
import { sanitizeSearchInput } from '@/lib/search-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    const page        = parseInt(searchParams.get('page')   || '1')
    const limit       = parseInt(searchParams.get('limit')  || '24')
    const offsetParam = searchParams.get('offset')
    const offset      = offsetParam !== null ? parseInt(offsetParam) : (page - 1) * limit
    
    const genre     = searchParams.get('genre')
    const year      = searchParams.get('year')
    const country   = searchParams.get('country')
    const ratingMin = searchParams.get('rating_min')
    const status    = searchParams.get('status')
    const search    = searchParams.get('search')
    const sort      = searchParams.get('sort')  || 'popularity'
    const order     = searchParams.get('order') || 'desc'
    
    const conditions: string[] = []
    const args: (string | number)[] = []
    
    if (genre) {
      conditions.push(`genres_json LIKE ?`)
      args.push(`%"slug":"${genre}"%`)
    }
    
    let ftsJoin = ''
    if (search) {
      const sanitized = sanitizeSearchInput(search)
      if (sanitized) {
        ftsJoin = 'JOIN series_fts ON tv_series.id = series_fts.rowid'
        conditions.push('series_fts MATCH ?')
        args.push(sanitized)
      }
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
      if (ratingMin.includes('-')) {
        const [min, max] = ratingMin.split('-').map(parseFloat)
        conditions.push('vote_average BETWEEN ? AND ?')
        args.push(min, max)
      } else {
        conditions.push('vote_average >= ?')
        args.push(parseFloat(ratingMin))
      }
    }
    
    if (status) {
      if (status === 'ongoing') conditions.push(`status = 'ongoing'`)
      else if (status === 'ended') conditions.push(`status = 'ended'`)
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const validSorts  = ['popularity', 'vote_average', 'vote_count', 'first_air_year']
    const sortColumn  = validSorts.includes(sort) ? sort : 'popularity'
    const sortOrder   = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
    
    const rows = await executeAll(
      `SELECT
          tv_series.id, tv_series.tmdb_id, tv_series.slug, tv_series.name_ar, tv_series.name_en, tv_series.poster_path,
          tv_series.vote_average, tv_series.first_air_year,
          tv_series.genres_json, tv_series.overview_ar, tv_series.country_of_origin
       FROM tv_series
       ${ftsJoin}
       ${whereClause}
       ORDER BY ${search ? 'rank,' : ''} ${sortColumn} ${sortOrder}
       LIMIT ? OFFSET ?`,
      [...args, limit + 1, offset]
    )

    const hasMore = rows.length > limit
    if (hasMore) rows.pop()

    const cacheTime = ratingMin ? 300 : 60
    const response  = NextResponse.json({
      series:     rows,
      pagination: { page, limit, hasMore, totalPages: hasMore ? page + 1 : page }
    })
    response.headers.set('Cache-Control', `public, s-maxage=${cacheTime}, stale-while-revalidate=600`)
    return response
  } catch (error) {
    console.error('Error fetching series:', error)
    return NextResponse.json({ error: 'Failed to fetch series' }, { status: 500 })
  }
}
