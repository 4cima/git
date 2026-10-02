import { NextRequest, NextResponse } from 'next/server'
import { searchContent } from '@/lib/search-content'
import { guard, clientKey } from '@/lib/rateLimit'
import { getCloudflareContext } from '@opennextjs/cloudflare'

export const dynamic = 'force-dynamic'

/** 429 جاهز بـno-store */
function rateLimited() {
  return NextResponse.json(
    { error: 'rate_limited', remaining: 0 },
    { status: 429, headers: { 'Cache-Control': 'private, no-store' } }
  )
}

export async function GET(request: NextRequest) {
  try {
    // بوابة الاستهلاك: 30 طلب/دقيقة لكل زائر — الكتابة الطبيعية (مع debounce)
    // بتستخدم أقل من كده بكتير، والسكربتات بترجع 429 قبل لمس D1.
    // الأولوية للربط العالمي (Rate Limiting API — محسوب مركزيًا عبر كل نسخ
    // العامل)، ولو مش متوفر نرجع للحارس المحلي في الذاكرة (أضعف بكتير).
    try {
      const limiter = (getCloudflareContext().env as any)?.SEARCH_RATE_LIMITER
      if (limiter?.limit) {
        // الحدود صريحة في الاستدعاء (30/60s) — تغطي وضعي الإعداد (simple/يدوي)
        const res = await limiter.limit({ key: clientKey(request, 'search'), requests: 30, period: 60 })
        console.log('[rl] binding called — success:', res?.success)
        if (!res?.success) return rateLimited()
      } else {
        console.log('[rl] binding missing — memory fallback')
        const blocked = guard(request, 'search', 30, 60_000)
        if (blocked) return blocked
      }
    } catch (e) {
      console.error('[rl] binding error:', e instanceof Error ? e.message : String(e))
      const blocked = guard(request, 'search', 30, 60_000)
      if (blocked) return blocked
    }

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
