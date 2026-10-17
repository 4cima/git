import { NextRequest, NextResponse } from 'next/server'
import { resolveCanonicalSlug } from '@/lib/slug-resolve'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || 'http://127.0.0.1:8787'
    
    const { slug } = await params
    /* المرحلة 2 بند 3: حلّ أي صيغة سلاج إلى السلاج القانوني قبل التمرير للـ worker */
    const canonical = await resolveCanonicalSlug(slug, 'tv_series').catch(() => null)
    const target = canonical || slug
    
    const response = await fetch(`${WORKER_URL}/api/tv/${target}/seasons`)
    
    if (!response.ok) {
      return NextResponse.json({ data: [] }, { status: 200 })
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching seasons:', error)
    return NextResponse.json({ data: [] }, { status: 200 })
  }
}
