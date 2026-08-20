import { NextRequest, NextResponse } from 'next/server'
import { executeAll } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const cursor = searchParams.get('cursor')
    const genre  = searchParams.get('genre')
    const year   = searchParams.get('year')
    const rating = searchParams.get('rating')
    const limit  = 48

    const conditions: string[] = [
      "(filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)"
    ]
    const args: (string | number)[] = []

    if (cursor) {
      conditions.push('id < ?')
      args.push(parseInt(cursor))
    }

    if (genre) {
      conditions.push(`genres_json LIKE ?`)
      args.push(`%"name":"${genre}"%`)
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

    args.push(limit)
    const movies = await executeAll(
      `SELECT id, slug, title_ar, title_en,
              poster_path, backdrop_path,
              overview_ar, release_year,
              vote_average, vote_count,
              genres_json
       FROM movies WHERE ${conditions.join(' AND ')} ORDER BY id DESC LIMIT ?`,
      args
    )

    return NextResponse.json({
      movies,
      results:    movies,
      nextCursor: movies.length === limit ? (movies[movies.length - 1] as any)?.id : null
    })
  } catch (error) {
    console.error('❌ [API /movies/explore] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
