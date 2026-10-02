import { NextRequest, NextResponse } from 'next/server'
import { searchContent } from '@/lib/search-content'
import { guard } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // بوابة الاستهلاك: 30 طلب/دقيقة لكل زائر — الكتابة الطبيعية (مع debounce)
    // بتستخدم أقل من كده بكتير، والسكربتات بترجع 429 قبل لمس D1
    const blocked = guard(request, 'search', 30, 60_000)
    if (blocked) return blocked

    const q = request.nextUrl.searchParams.get('q')
    if (!q || q.length < 1) {
      return NextResponse.json({ results: [], searchStrategy: 'min-1-char' })
    }

    const { results, totalFound, searchStrategy } = await searchContent(q)
    return NextResponse.json({ results, totalFound, searchStrategy })
  } catch (error) {
    console.error('Error searching:', error)
    return NextResponse.json({ results: [], error: 'Search failed' })
  }
}
