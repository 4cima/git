import { NextRequest, NextResponse } from 'next/server'
import { resolveCanonicalSlug } from '@/lib/slug-resolve'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; season: string }> }
) {
  try {
    const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || 'http://localhost:8787'
    const { slug, season } = await params
    /* المرحلة 2 بند 3: حلّ أي صيغة سلاج إلى السلاج القانوني قبل التمرير للـ worker */
    const canonical = await resolveCanonicalSlug(slug, 'tv_series').catch(() => null)
    const target = canonical || slug
    
    console.log('🔄 [API /tv/episodes] Fetching:', `${WORKER_URL}/api/tv/${target}/season/${season}/episodes`)
    
    const response = await fetch(`${WORKER_URL}/api/tv/${target}/season/${season}/episodes`)
    
    console.log('📡 [API /tv/episodes] Worker response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [API /tv/episodes] Error:', errorText)
      return NextResponse.json({ episodes: [], servers: [] }, { status: 200 })
    }
    
    const data = await response.json()
    console.log('✅ [API /tv/episodes] Data received')
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ [API /tv/episodes] Error:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack)
    }
    return NextResponse.json({ episodes: [], servers: [] }, { status: 200 })
  }
}
