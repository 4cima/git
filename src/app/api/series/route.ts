import { NextRequest, NextResponse } from 'next/server'
import { executeAll, executeFirst } from '@/lib/db'
import { sanitizeSearchInput } from '@/lib/search-utils'
import { filterExcludedGenres } from '@/utils/excludedGenres'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    const page        = Math.max(1, parseInt(searchParams.get('page')   || '1')  || 1)
    const limit       = Math.min(60, Math.max(1, parseInt(searchParams.get('limit')  || '24') || 24))
    const offsetParam = searchParams.get('offset')
    const offset      = offsetParam !== null ? Math.max(0, parseInt(offsetParam) || 0) : (page - 1) * limit
    
    const genre     = searchParams.get('genre')
    const year      = searchParams.get('year')
    const country   = searchParams.get('country')
    const language  = searchParams.get('language')
    const ratingMin = searchParams.get('rating_min')
    const status    = searchParams.get('status')
    const search    = searchParams.get('search')
    const sort      = searchParams.get('sort')  || 'popularity'
    const order     = searchParams.get('order') || 'desc'
    
    const conditions: string[] = []
    const args: (string | number)[] = []
    
    if (genre) {
      /* مطابقة دقيقة وموحّدة: slug → tmdb_id من جدول genres ثم مطابقة المعرّف داخل genres_json
         (تتجنب تضارب صيغة الـslug بين جدول genres و genres_json وتصادم أرقام المعرّفات) */
      const genreRow = await executeFirst('SELECT tmdb_id FROM genres WHERE slug = ? LIMIT 1', [genre]).catch(() => null)
      if (genreRow && genreRow.tmdb_id != null) {
        conditions.push(`(genres_json LIKE ? OR genres_json LIKE ?)`)
        args.push(`%"tmdb_id":${genreRow.tmdb_id},%`, `%"tmdb_id":${genreRow.tmdb_id}}%`)
      } else {
        conditions.push(`genres_json LIKE ?`)
        args.push(`%"slug":"${genre}"%`)
      }
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
        if (Number.isFinite(from) && Number.isFinite(to)) {
          conditions.push('first_air_year BETWEEN ? AND ?')
          args.push(from, to)
        }
      } else {
        const y = parseInt(year)
        if (Number.isFinite(y)) {
          conditions.push('first_air_year = ?')
          args.push(y)
        }
      }
    }
    
    if (language) {
      const languages = language.split(',').map(l => l.trim().toLowerCase()).filter(Boolean)
      if (languages.length === 1) {
        conditions.push('original_language = ?')
        args.push(languages[0])
      } else if (languages.length > 1) {
        const placeholders = languages.map(() => '?').join(',')
        conditions.push(`original_language IN (${placeholders})`)
        args.push(...languages)
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

    // Exclude unwanted genres (Talk Show, War & Politics, Documentary, History) at SQL level
    // — keeps pagination accurate (no short pages from post-JS filtering)
    conditions.push(`(genres_json IS NULL OR NOT EXISTS (
      SELECT 1 FROM json_each(tv_series.genres_json)
      WHERE json_extract(value, '$.tmdb_id') IN (10767, 10768, 99, 36)
    ))`)
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const validSorts  = ['popularity', 'vote_average', 'vote_count', 'first_air_year']
    const sortColumn  = validSorts.includes(sort) ? sort : 'popularity'
    const sortOrder   = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
    
    // Use cache for first page top rated with no filters
    if (page === 1 && sort === 'vote_average' && !genre && !year && !country && !language && !ratingMin && !status && !search) {
      try {
        const cacheRows = await executeAll(
          `SELECT id, tmdb_id, slug, name_ar, name_en, poster_path,
                  vote_average, first_air_year, genres_json, overview_ar
           FROM list_series_top_rated
           ORDER BY rank ASC
           LIMIT ? OFFSET ?`,
          [limit + 1, offset]
        )
        const hasMore = cacheRows.length > limit
        if (hasMore) cacheRows.pop()
        const filteredCache = filterExcludedGenres(cacheRows)
        const response = NextResponse.json({
          series: filteredCache,
          pagination: { page, limit, hasMore, totalPages: hasMore ? page + 1 : page }
        })
        response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
        return response
      } catch (err) {
        console.error('Cache query failed, returning empty:', err)
        return NextResponse.json({
          series: [],
          pagination: { page, limit, hasMore: false, totalPages: 1 }
        })
      }
    }
    
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
    const filteredRows = filterExcludedGenres(rows)

    // Broad listings are stable — cache longer at the CDN; narrow/heavy filters less so
    const cacheTime = (genre || ratingMin || search) ? 120 : 300
    const response  = NextResponse.json({
      series:     filteredRows,
      pagination: { page, limit, hasMore, totalPages: hasMore ? page + 1 : page }
    })
    response.headers.set('Cache-Control', `public, s-maxage=${cacheTime}, stale-while-revalidate=600`)
    return response
  } catch (error) {
    console.error('Error fetching series:', error)
    return NextResponse.json({ error: 'Failed to fetch series' }, { status: 500 })
  }
}
