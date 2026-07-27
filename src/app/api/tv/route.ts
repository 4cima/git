import { NextRequest, NextResponse } from 'next/server'
import { turso } from '@/lib/turso'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page  = parseInt(searchParams.get('page')  || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const [result, countResult] = await Promise.all([
      turso.execute({
        sql: `SELECT * FROM tv_series
              WHERE (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
              ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        args: [limit, offset]
      }),
      turso.execute({
        sql: `SELECT COUNT(*) as total FROM tv_series
              WHERE (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)`,
        args: []
      })
    ])

    const total = Number(countResult.rows[0]?.total || 0)

    return NextResponse.json({
      results:    result.rows || [],
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('❌ [API /tv] Error:', error)
    return NextResponse.json({ results: [], total: 0, page: 1, totalPages: 0 }, { status: 500 })
  }
}
