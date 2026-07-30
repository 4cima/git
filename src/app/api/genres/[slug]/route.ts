import { NextRequest, NextResponse } from 'next/server'
import { turso } from '@/lib/turso'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ slug: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug } = await params
    const searchParams = request.nextUrl.searchParams
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit
    
    // Content type filter
    const type = searchParams.get('type') // 'movie' | 'tv' | 'all'
    
    // Sort
    const sort = searchParams.get('sort') || 'popularity'
    const order = searchParams.get('order') || 'desc'
    
    // Get genre info
    const genreResult = await turso.execute({
      sql: 'SELECT * FROM genres WHERE slug = ? LIMIT 1',
      args: [slug]
    })
    
    if (!genreResult.rows || genreResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Genre not found' },
        { status: 404 }
      )
    }
    
    const genre = genreResult.rows[0]
    const genreTmdbId = genre.tmdb_id
    
    // Build query based on type
    let contentQuery = ''
    let countQuery = ''
    
    if (type === 'movie') {
      // TODO: Replace with genre_ids_csv + index when scaling beyond 10K items (see TECH_DEBT.md #1)
      contentQuery = `
        SELECT m.*, 'movie' as media_type
        FROM movies m
        WHERE EXISTS (
          SELECT 1 FROM json_each(m.genres_json)
          WHERE CAST(json_extract(value, '$.id') AS INTEGER) = ?
        )
        ORDER BY m.${sort} ${order.toUpperCase()}
        LIMIT ? OFFSET ?
      `
      countQuery = `
        SELECT COUNT(*) as total
        FROM movies m
        WHERE EXISTS (
          SELECT 1 FROM json_each(m.genres_json)
          WHERE CAST(json_extract(value, '$.id') AS INTEGER) = ?
        )
      `
    } else if (type === 'tv') {
      // TODO: Replace with genre_ids_csv + index when scaling beyond 10K items (see TECH_DEBT.md #1)
      contentQuery = `
        SELECT s.*, 'tv' as media_type
        FROM tv_series s
        WHERE EXISTS (
          SELECT 1 FROM json_each(s.genres_json)
          WHERE CAST(json_extract(value, '$.id') AS INTEGER) = ?
        )
        ORDER BY s.${sort} ${order.toUpperCase()}
        LIMIT ? OFFSET ?
      `
      countQuery = `
        SELECT COUNT(*) as total
        FROM tv_series s
        WHERE EXISTS (
          SELECT 1 FROM json_each(s.genres_json)
          WHERE CAST(json_extract(value, '$.id') AS INTEGER) = ?
        )
      `
    } else {
      // All content - fetch separately and combine in code (movies/series have different column counts)
      // TODO: Replace with genre_ids_csv + index when scaling beyond 10K items (see TECH_DEBT.md #1)
      
      // Get movies
      const moviesResult = await turso.execute({
        sql: `
          SELECT m.*, 'movie' as media_type
          FROM movies m
          WHERE EXISTS (
            SELECT 1 FROM json_each(m.genres_json)
            WHERE CAST(json_extract(value, '$.id') AS INTEGER) = ?
          )
        `,
        args: [genreTmdbId]
      })
      
      // Get series
      const seriesResult = await turso.execute({
        sql: `
          SELECT s.*, 'tv' as media_type
          FROM tv_series s
          WHERE EXISTS (
            SELECT 1 FROM json_each(s.genres_json)
            WHERE CAST(json_extract(value, '$.id') AS INTEGER) = ?
          )
        `,
        args: [genreTmdbId]
      })
      
      // Combine and sort by popularity
      const combined = [...(moviesResult.rows || []), ...(seriesResult.rows || [])]
        .sort((a: any, b: any) => {
          const aVal = Number(a.popularity || 0)
          const bVal = Number(b.popularity || 0)
          return order.toLowerCase() === 'asc' ? aVal - bVal : bVal - aVal
        })
      
      const total = combined.length
      const paginatedContent = combined.slice(offset, offset + limit)
      
      return NextResponse.json({
        genre,
        content: paginatedContent,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      })
    }
    
    // Get total count (only for movie and tv types, 'all' is handled above)
    if (type !== 'all') {
      const countArgs = [genreTmdbId]
      const countResult = await turso.execute({
        sql: countQuery,
        args: countArgs
      })
      const total = Number(countResult.rows[0]?.total || 0)
      
      // Get content
      const contentArgs = [genreTmdbId, limit, offset]
      
      const contentResult = await turso.execute({
        sql: contentQuery,
        args: contentArgs
      })
      
      return NextResponse.json({
        genre,
        content: contentResult.rows || [],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      })
    }
  } catch (error) {
    console.error('Error fetching genre content:', error)
    return NextResponse.json(
      { error: 'Failed to fetch genre content' },
      { status: 500 }
    )
  }
}
