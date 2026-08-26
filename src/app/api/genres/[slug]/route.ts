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

    // Use cache for first page default sort (popularity) movie/tv type with single genre
    if (page === 1 && sort === 'popularity' && genreIds.length === 1) {
      if (type === 'movie') {
        try {
          const cacheRows = await executeAll(
            `SELECT id, tmdb_id, slug, title_ar, title_en, poster_path, backdrop_path,
                    vote_average, release_year, overview_ar, genres_json, popularity,
                    printf('%04d-01-01', release_year) as release_date,
                    'movie' as media_type
             FROM list_movies_genre
             WHERE genre_tmdb_id = ?
             ORDER BY rank ASC
             LIMIT ? OFFSET ?`,
            [genre.tmdb_id, limit + 1, offset]
          )
          const hasMore = cacheRows.length > limit
          if (hasMore) cacheRows.pop()
          return NextResponse.json({ 
            genre, 
            content: cacheRows, 
            pagination: { page, limit, hasMore, totalPages: hasMore ? page + 1 : page } 
          }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } })
        } catch (err) {
          console.error('Cache query failed, returning empty:', err)
          return NextResponse.json({ 
            genre, 
            content: [], 
            pagination: { page, limit, hasMore: false, totalPages: 1 } 
          })
        }
      } else if (type === 'tv') {
        try {
          const cacheRows = await executeAll(
            `SELECT id, tmdb_id, slug, 
                    name_ar as title_ar, name_en as title_en,
                    poster_path, backdrop_path,
                    vote_average, first_air_year, overview_ar, genres_json, popularity,
                    printf('%04d-01-01', first_air_year) as first_air_date,
                    'tv' as media_type
             FROM list_series_genre
             WHERE genre_tmdb_id = ?
             ORDER BY rank ASC
             LIMIT ? OFFSET ?`,
            [genre.tmdb_id, limit + 1, offset]
          )
          const hasMore = cacheRows.length > limit
          if (hasMore) cacheRows.pop()
          return NextResponse.json({ 
            genre, 
            content: cacheRows, 
            pagination: { page, limit, hasMore, totalPages: hasMore ? page + 1 : page } 
          }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } })
        } catch (err) {
          console.error('Cache query failed, returning empty:', err)
          return NextResponse.json({ 
            genre, 
            content: [], 
            pagination: { page, limit, hasMore: false, totalPages: 1 } 
          })
        }
      }
    }

    if (type === 'movie') {
      const rows = await executeAll(
        `SELECT m.id, m.tmdb_id, m.slug, m.title_ar, m.title_en, m.poster_path, m.backdrop_path,
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
        `SELECT s.id, s.tmdb_id, s.slug, s.name_ar, s.name_en, s.poster_path, s.backdrop_path,
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
          `SELECT m.id, m.tmdb_id, m.slug, m.title_ar, m.title_en, m.poster_path, m.backdrop_path,
                  m.vote_average, m.vote_count, m.popularity, m.release_date, m.release_year,
                  m.overview_ar, m.overview_en, m.genres_json, m.original_language,
                  'movie' as media_type
           FROM movies m WHERE ${whereClause}
           ORDER BY m.${sortColumn} ${sortOrder} LIMIT ?`,
          [...genreParams, fetchLimit]
        ),
        executeAll(
          `SELECT s.id, s.tmdb_id, s.slug, s.name_ar, s.name_en, s.poster_path, s.backdrop_path,
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
