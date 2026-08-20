import { NextRequest, NextResponse } from 'next/server'
import { executeFirst } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    
    console.log('🔄 [API /movies/:slug] Fetching movie:', slug)
    
    const movie = await executeFirst(
      `SELECT * FROM movies 
            WHERE slug = ? 
              AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
            LIMIT 1`,
      [slug]
    )
    
    if (!movie) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 })
    }
    
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
