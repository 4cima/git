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
    
    if (type === 'movie') {
      // Use limit+1 trick instead of COUNT for performance
      contentQuery = `
        SELECT m.*, 'movie' as media_type
        FROM movies m
        WHERE genres_json LIKE ?
        ORDER BY m.${sort} ${order.toUpperCase()}
        LIMIT ? OFFSET ?
      `
      
      const contentResult = await turso.execute({
        sql: contentQuery,
        args: [`%"name_ar":"${genre.name_ar}"%`, limit + 1, offset]
      })
      
      const rows = contentResult.rows || []
      const hasMore = rows.length > limit
      if (hasMore) rows.pop()
      
      return NextResponse.json({
        genre,
        content: rows,
        pagination: {
          page,
          limit,
          hasMore,
          totalPages: hasMore ? page + 1 : page
        }
      })
    } else if (type === 'tv') {
      // Use limit+1 trick instead of COUNT for performance
      contentQuery = `
        SELECT s.*, 'tv' as media_type
        FROM tv_series s
        WHERE genres_json LIKE ?
        ORDER BY s.${sort} ${order.toUpperCase()}
        LIMIT ? OFFSET ?
      `
      
      const contentResult = await turso.execute({
        sql: contentQuery,
        args: [`%"name_ar":"${genre.name_ar}"%`, limit + 1, offset]
      })
      
      const rows = contentResult.rows || []
      const hasMore = rows.length > limit
      if (hasMore) rows.pop()
      
      return NextResponse.json({
        genre,
        content: rows,
        pagination: {
          page,
          limit,
          hasMore,
          totalPages: hasMore ? page + 1 : page
        }
      })
    } else {
      // type === 'all' - Combined movies + series
      // TODO: For production, implement merge-sort with separate offsets (see Part B report in context)
      // Current approach: fetch all, sort in memory (acceptable for <10K results per genre)
      
      // Get movies
      const moviesResult = await turso.execute({
        sql: `
          SELECT m.*, 'movie' as media_type
          FROM movies m
          WHERE genres_json LIKE ?
        `,
        args: [`%"name_ar":"${genre.name_ar}"%`]
      })
      
      // Get series
      const seriesResult = await turso.execute({
        sql: `
          SELECT s.*, 'tv' as media_type
          FROM tv_series s
          WHERE genres_json LIKE ?
        `,
        args: [`%"name_ar":"${genre.name_ar}"%`]
      })
      
      // Combine and sort
      const combined = [...(moviesResult.rows || []), ...(seriesResult.rows || [])]
        .sort((a: any, b: any) => {
          const aVal = Number(a[sort] || 0)
          const bVal = Number(b[sort] || 0)
          return order.toLowerCase() === 'asc' ? aVal - bVal : bVal - aVal
        })
      
      // Paginate
      const paginatedContent = combined.slice(offset, offset + limit + 1)
      const hasMore = paginatedContent.length > limit
      if (hasMore) paginatedContent.pop()
      
      return NextResponse.json({
        genre,
        content: paginatedContent,
        pagination: {
          page,
          limit,
          hasMore,
          totalPages: hasMore ? page + 1 : page
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
