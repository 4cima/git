import { NextRequest, NextResponse } from 'next/server'
import { turso } from '@/lib/turso'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    
    console.log('🔄 [API /tv/:slug] Fetching series:', slug)
    
    const result = await turso.execute({
      sql: 'SELECT * FROM series WHERE slug = ? LIMIT 1',
      args: [slug]
    })
    
    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 })
    }
    
    const series = result.rows[0]
    
    // Fetch seasons for this series
    const seasonsResult = await turso.execute({
      sql: 'SELECT * FROM seasons WHERE series_id = ? ORDER BY season_number ASC',
      args: [series.id]
    })
    
    console.log('✅ [API /tv/:slug] Series found:', series.name_ar || series.name_en)
    
    return NextResponse.json({
      ...series,
      seasons: seasonsResult.rows || []
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      }
    })
  } catch (error) {
    console.error('❌ [API /tv/:slug] Error fetching series:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
