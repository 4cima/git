import { NextRequest, NextResponse } from 'next/server'
import { turso } from '@/lib/turso'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit
    
    console.log('🔄 [API /tv] Fetching from Turso...')

    const result = await turso.execute({
      sql: 'SELECT * FROM series WHERE is_filtered = 0 ORDER BY created_at DESC LIMIT ? OFFSET ?',
      args: [limit, offset]
    })
    
    const countResult = await turso.execute({
      sql: 'SELECT COUNT(*) as total FROM series WHERE is_filtered = 0',
      args: []
    })
    
    const total = countResult.rows[0]?.total || 0
    
    console.log('✅ [API /tv] Data fetched successfully')

    return NextResponse.json({
      results: result.rows || [],
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('❌ [API /tv] Error:', error)
    return NextResponse.json({
      results: [],
      total: 0,
      page: 1,
      totalPages: 0
    }, { status: 500 })
  }
}
