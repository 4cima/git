import { NextRequest, NextResponse } from 'next/server'
import { turso } from '@/lib/turso'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const cursor = searchParams.get('cursor')
    const limit = 48

    console.log('🔄 [API /movies/explore] Cursor:', cursor)

    let sql: string
    let args: any[]

    if (cursor) {
      // Cursor-based pagination (id < cursor)
      sql = 'SELECT * FROM movies WHERE is_filtered = 0 AND id < ? ORDER BY id DESC LIMIT ?'
      args = [parseInt(cursor), limit]
    } else {
      // First page
      sql = 'SELECT * FROM movies WHERE is_filtered = 0 ORDER BY id DESC LIMIT ?'
      args = [limit]
    }

    const result = await turso.execute({ sql, args })
    const movies = result.rows || []

    console.log('✅ [API /movies/explore] Fetched', movies.length, 'movies')

    return NextResponse.json({
      movies,
      nextCursor: movies.length === limit ? movies[movies.length - 1].id : null
    })
  } catch (error) {
    console.error('❌ [API /movies/explore] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
