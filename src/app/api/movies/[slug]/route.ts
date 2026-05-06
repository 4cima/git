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
    
    console.log('🔄 [API /movies/:slug] Fetching movie:', slug)
    
    const result = await turso.execute({
      sql: 'SELECT * FROM movies WHERE slug = ? LIMIT 1',
      args: [slug]
    })
    
    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 })
    }
    
    const movie = result.rows[0]
    
    console.log('✅ [API /movies/:slug] Movie found:', movie.title_ar || movie.title_en)
    
    return NextResponse.json(movie, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      }
    })
  } catch (error) {
    console.error('❌ [API /movies/:slug] Error fetching movie:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
