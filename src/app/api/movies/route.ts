import { NextRequest, NextResponse } from 'next/server'
import { turso } from '@/lib/turso'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit
    
    const result = await turso.execute({
      sql: 'SELECT * FROM movies WHERE is_filtered = 0 ORDER BY created_at DESC LIMIT ? OFFSET ?',
      args: [limit, offset]
    })
    
    const countResult = await turso.execute({
      sql: 'SELECT COUNT(*) as total FROM movies WHERE is_filtered = 0',
      args: []
    })
    
    const total = countResult.rows[0]?.total || 0
    
    return NextResponse.json({
      results: result.rows || [],
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('Error fetching movies:', error)
    return NextResponse.json({ results: [], total: 0 }, { status: 500 })
  }
}
