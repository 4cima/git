import { NextRequest, NextResponse } from 'next/server'
import { executeAll } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page     = parseInt(searchParams.get('page')  || '1')
    const limit    = parseInt(searchParams.get('limit') || '20')
    const offset   = (page - 1) * limit
    const language = searchParams.get('language')
    
    const conditions: string[] = ["(filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)"]
    const args: (string | number)[] = []
    
    if (language) {
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

    const rows = await executeAll(
      `SELECT id, slug, name_ar, name_en,
              poster_path, backdrop_path, overview_ar,
              first_air_year, vote_average, vote_count,
              genres_json, status
       FROM tv_series ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...args, limit + 1, offset]
    )

    const hasMore = rows.length > limit
    if (hasMore) rows.pop()

    return NextResponse.json({
      results: rows,
      page,
      limit,
      hasMore,
      totalPages: hasMore ? page + 1 : page
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' }
    })
  } catch (error) {
    console.error('❌ [API /tv] Error:', error)
    return NextResponse.json({ results: [], hasMore: false, page: 1, totalPages: 0 }, { status: 500 })
  }
}
