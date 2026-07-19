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
    const genreId = genre.id
    
    // Build query based on type
    let contentQuery = ''
    let countQuery = ''
    
    if (type === 'movie') {
      contentQuery = `
        SELECT m.*, 'movie' as media_type
        FROM movies m
        JOIN content_genres cg ON m.id = cg.content_id AND cg.content_type = 'movie'
        WHERE cg.genre_id = ?
        ORDER BY m.${sort} ${order.toUpperCase()}
        LIMIT ? OFFSET ?
      `
      countQuery = `
        SELECT COUNT(*) as total
        FROM content_genres
        WHERE genre_id = ? AND content_type = 'movie'
      `
    } else if (type === 'tv') {
      contentQuery = `
        SELECT s.*, 'tv' as media_type
        FROM tv_series s
        JOIN content_genres cg ON s.id = cg.content_id AND cg.content_type = 'tv_series'
        WHERE cg.genre_id = ?
        ORDER BY s.${sort} ${order.toUpperCase()}
        LIMIT ? OFFSET ?
      `
      countQuery = `
        SELECT COUNT(*) as total
        FROM content_genres
        WHERE genre_id = ? AND content_type = 'tv_series'
      `
    } else {
      // All content
      contentQuery = `
        SELECT * FROM (
          SELECT m.*, 'movie' as media_type, m.popularity as sort_value
          FROM movies m
          JOIN content_genres cg ON m.id = cg.content_id AND cg.content_type = 'movie'
          WHERE cg.genre_id = ?
          UNION ALL
          SELECT s.*, 'tv' as media_type, s.popularity as sort_value
          FROM tv_series s
          JOIN content_genres cg ON s.id = cg.content_id AND cg.content_type = 'tv_series'
          WHERE cg.genre_id = ?
        )
        ORDER BY sort_value ${order.toUpperCase()}
        LIMIT ? OFFSET ?
      `
      countQuery = `
        SELECT COUNT(*) as total
        FROM content_genres
        WHERE genre_id = ?
      `
    }
    
    // Get total count
    const countArgs = type === 'all' ? [genreId] : [genreId]
    const countResult = await turso.execute({
      sql: countQuery,
      args: countArgs
    })
    const total = Number(countResult.rows[0]?.total || 0)
    
    // Get content
    const contentArgs = type === 'all' 
      ? [genreId, genreId, limit, offset]
      : [genreId, limit, offset]
    
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
  } catch (error) {
    console.error('Error fetching genre content:', error)
    return NextResponse.json(
      { error: 'Failed to fetch genre content' },
      { status: 500 }
    )
  }
}
