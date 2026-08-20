import { NextRequest, NextResponse } from 'next/server'
import { executeFirst } from '@/lib/db'

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
    
    const series = await executeFirst(
      'SELECT * FROM tv_series WHERE slug = ? LIMIT 1',
      [slug]
    )
    
    if (!series) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 })
    }
    
    // seasons_json is stored in tv_series — no separate tv_seasons table
    let seasons: unknown[] = []
    try {
      seasons = series.seasons_json
        ? JSON.parse(series.seasons_json as string)
        : []
    } catch {
      console.log('seasons_json parse failed')
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
