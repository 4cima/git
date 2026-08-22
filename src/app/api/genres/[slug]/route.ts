import { NextRequest, NextResponse } from 'next/server'
import { executeFirst, executeAll } from '@/lib/db'
import { getGenreWithSiblings, buildGenreWhereClause, buildGenreParams } from '@/lib/genre-siblings'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ slug: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug }       = await params
    const searchParams   = request.nextUrl.searchParams
    
    const page   = parseInt(searchParams.get('page')  || '1')
    const limit  = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit
    const type   = searchParams.get('type')
    const sort   = searchParams.get('sort')  || 'popularity'
    const order  = searchParams.get('order') || 'desc'
    
    const genre = await executeFirst(
      'SELECT tmdb_id, slug, name_en, name_ar FROM genres WHERE slug = ? LIMIT 1',
      [slug]
    )
    
    if (!genre) {
      return NextResponse.json({ error: 'Genre not found' }, { status: 404 })
    }
    
    const validSorts = ['popularity', 'vote_average', 'vote_count', 'release_year', 'first_air_year']
    const sortColumn = validSorts.includes(sort) ? sort : 'popularity'
    const sortOrder  = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
    
    const genreIds = getGenreWithSiblings(Number(genre.tmdb_id))
    const whereClause = buildGenreWhereClause(genreIds, 'm')
    const whereClauseSeries = buildGenreWhereClause(genreIds, 's')
    const genreParams = buildGenreParams(genreIds)

    if (type === 'movie') {
      const rows = await executeAll(
        `SELECT m.id, m.slug, m.title_ar, m.title_en, m.poster_path, m.backdrop_path,
                m.vote_average, m.vote_count, m.popularity, m.release_date, m.release_year,
                m.overview_ar, m.overview_en, m.genres_json, m.original_language,
                'movie' as media_type
         FROM movies m
         WHERE ${whereClause}
         ORDER BY m.${sortColumn} ${sortOrder}
         LIMIT ? OFFSET ?`,
        [...genreParams, limit + 1, offset]
      )
      const hasMore = rows.length > limit
      if (hasMore) rows.pop()
      return NextResponse.json({ genre, content: rows, pagination: { page, limit, hasMore, totalPages: hasMore ? page + 1 : page } })

    } else if (type === 'tv') {
      const rows = await executeAll(
        `SELECT s.id, s.slug, s.name_ar, s.name_en, s.poster_path, s.backdrop_path,
                s.vote_average, s.vote_count, s.popularity, s.first_air_date, s.first_air_year,
                s.overview_ar, s.overview_en, s.genres_json, s.original_language,
                'tv' as media_type
         FROM tv_series s
         WHERE ${whereClauseSeries}
         ORDER BY s.${sortColumn} ${sortOrder}
         LIMIT ? OFFSET ?`,
        [...genreParams, limit + 1, offset]
      )
      const hasMore = rows.length > limit
      if (hasMore) rows.pop()
      return NextResponse.json({ genre, content: rows, pagination: { page, limit, hasMore, totalPages: hasMore ? page + 1 : page } })

    } else {
      // type === 'all'
      const fetchLimit = Math.ceil(limit * 1.5)
      const [moviesRows, seriesRows] = await Promise.all([
        executeAll(
          `SELECT m.id, m.slug, m.title_ar, m.title_en, m.poster_path, m.backdrop_path,
                  m.vote_average, m.vote_count, m.popularity, m.release_date, m.release_year,
                  m.overview_ar, m.overview_en, m.genres_json, m.original_language,
                  'movie' as media_type
           FROM movies m WHERE ${whereClause}
           ORDER BY m.${sortColumn} ${sortOrder} LIMIT ?`,
          [...genreParams, fetchLimit]
        ),
        executeAll(
          `SELECT s.id, s.slug, s.name_ar, s.name_en, s.poster_path, s.backdrop_path,
                  s.vote_average, s.vote_count, s.popularity, s.first_air_date, s.first_air_year,
                  s.overview_ar, s.overview_en, s.genres_json, s.original_language,
                  'tv' as media_type
           FROM tv_series s WHERE ${whereClauseSeries}
           ORDER BY s.${sortColumn} ${sortOrder} LIMIT ?`,
          [...genreParams, fetchLimit]
        )
      ])
      
      const combined = [...moviesRows, ...seriesRows].sort((a: any, b: any) => {
        const aVal = Number(a[sortColumn] || 0)
        const bVal = Number(b[sortColumn] || 0)
        return order.toLowerCase() === 'asc' ? aVal - bVal : bVal - aVal
      })
      
      const paged   = combined.slice(offset, offset + limit + 1)
      const hasMore = paged.length > limit
      if (hasMore) paged.pop()
      
      return NextResponse.json({
        genre,
        content:    paged,
        pagination: { page, limit, hasMore, totalPages: hasMore ? page + 1 : page }
      }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } })
    }
  } catch (error) {
    console.error('Error fetching genre content:', error)
    return NextResponse.json({ error: 'Failed to fetch genre content' }, { status: 500 })
  }
}
