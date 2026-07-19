import { NextRequest, NextResponse } from 'next/server'
import { turso } from '@/lib/turso'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const cursor = searchParams.get('cursor')
    const genre = searchParams.get('genre')
    const year = searchParams.get('year')
    const rating = searchParams.get('rating')
    const limit = 48

    console.log('🔄 [API /movies/explore] Params:', { cursor, genre, year, rating })

    let conditions = []
    let args = []

    if (cursor) {
      conditions.push('id < ?')
      args.push(parseInt(cursor))
    }

    if (genre) {
      conditions.push(`genres_json LIKE ?`)
      args.push(`%"slug":"${genre}"%`)
    }

    if (year) {
      if (year.includes('-')) {
        const [start, end] = year.split('-')
        conditions.push('release_year >= ? AND release_year <= ?')
        args.push(parseInt(start), parseInt(end))
      } else {
        conditions.push('release_year = ?')
        args.push(parseInt(year))
      }
    }

    if (rating) {
      conditions.push('vote_average >= ?')
      args.push(parseFloat(rating))
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const sql = `SELECT * FROM movies ${whereClause} ORDER BY id DESC LIMIT ?`
    args.push(limit)

    const result = await turso.execute({ sql, args })
    const movies = result.rows || []

    console.log('✅ [API /movies/explore] Fetched', movies.length, 'movies')

    return NextResponse.json({
      results: movies,
      nextCursor: movies.length === limit ? movies[movies.length - 1].id : null
    })
  } catch (error) {
    console.error('❌ [API /movies/explore] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
