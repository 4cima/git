import { NextRequest, NextResponse } from 'next/server'
import { turso } from '@/lib/turso'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const cursor = searchParams.get('cursor')
    const genre  = searchParams.get('genre')
    const year   = searchParams.get('year')
    const rating = searchParams.get('rating')
    const limit  = 48

    // filter_status guard — always the first condition
    const conditions: string[] = [
      "(filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)"
    ]
    const args: (string | number)[] = []

    if (cursor) {
      conditions.push('id < ?')
      args.push(parseInt(cursor))
    }

    if (genre) {
      // genres_json structure: [{"id":...,"name":"...","name_ar":"..."}]
      conditions.push(`genres_json LIKE ?`)
      args.push(`%"name":"${genre}"%`)
    }

    if (year) {
      if (year.includes('-')) {
        const [start, end] = year.split('-')
        conditions.push('first_air_year >= ? AND first_air_year <= ?')
        args.push(parseInt(start), parseInt(end))
      } else {
        conditions.push('first_air_year = ?')
        args.push(parseInt(year))
      }
    }

    if (rating) {
      conditions.push('vote_average >= ?')
      args.push(parseFloat(rating))
    }

    const sql = `SELECT * FROM tv_series WHERE ${conditions.join(' AND ')} ORDER BY id DESC LIMIT ?`
    args.push(limit)

    const result = await turso.execute({ sql, args })
    const series = result.rows || []

    return NextResponse.json({
      series,
      results:    series,
      nextCursor: series.length === limit ? series[series.length - 1]?.id : null
    })
  } catch (error) {
    console.error('❌ [API /tv/explore] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}