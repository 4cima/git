import { NextRequest, NextResponse } from 'next/server'
import { turso } from '@/lib/turso'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

interface RouteParams {
  params: Promise<{ slug: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug } = await params
    
    console.log('🔄 [API /series/:slug] Fetching series:', slug)
    
    const result = await turso.execute({
      sql: 'SELECT * FROM tv_series WHERE slug = ? LIMIT 1',
      args: [slug]
    })
    
    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 })
    }
    
    const series = result.rows[0]
    
    // Fetch seasons for this series (if seasons table exists)
    let seasons = []
    try {
      const seasonsResult = await turso.execute({
        sql: 'SELECT * FROM tv_seasons WHERE tv_series_id = ? ORDER BY season_number ASC',
        args: [series.id]
      })
      seasons = seasonsResult.rows || []
    } catch (e) {
      // Table might not exist or be named differently
      console.log('Seasons table not found or different structure')
    }
    
    console.log('✅ [API /series/:slug] Series found:', series.name_ar || series.name_en)
    
    return NextResponse.json({
      ...series,
      seasons
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      }
    })
  } catch (error) {
    console.error('❌ [API /series/:slug] Error fetching series:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
