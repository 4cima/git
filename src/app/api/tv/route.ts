import { NextRequest, NextResponse } from 'next/server'
import { turso } from '@/lib/turso'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page  = parseInt(searchParams.get('page')  || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit
    
    // Filters
    const language = searchParams.get('language')
    
    // Build WHERE clause
    const conditions: string[] = ['(filter_status IN (\'clean\', \'reviewed_approved\') OR filter_status IS NULL)']
    const args: any[] = []
    
    if (language) {
      // Support comma-separated language codes (e.g., "ko" or "hi,ta,ml")
      const languages = language.split(',').map(l => l.trim()).filter(l => l)
      if (languages.length === 1) {
        conditions.push('original_language = ?')
        args.push(languages[0])
      } else if (languages.length > 1) {
        const placeholders = languages.map(() => '?').join(',')
        conditions.push(`original_language IN (${placeholders})`)
        args.push(...languages)
      }
    }
    
    const whereClause = `WHERE ${conditions.join(' AND ')}`

    // Use limit+1 trick instead of COUNT(*) - fetch one extra row to check if there's more
    const result = await turso.execute({
      sql: `SELECT * FROM tv_series ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      args: [...args, limit + 1, offset]
    })

    const rows = result.rows || []
    const hasMore = rows.length > limit
    if (hasMore) rows.pop() // Remove the extra row

    return NextResponse.json({
      results: rows,
      page,
      limit,
      hasMore,
      totalPages: hasMore ? page + 1 : page
    })
  } catch (error) {
    console.error('❌ [API /tv] Error:', error)
    return NextResponse.json({ results: [], hasMore: false, page: 1, totalPages: 0 }, { status: 500 })
  }
}
