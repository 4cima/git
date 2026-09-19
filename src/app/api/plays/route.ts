import { NextRequest, NextResponse } from 'next/server'
import { guard } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // بروكسي قراءة لخدمة العدادات — حد سخي يكفي الاستخدام الطبيعي ويسدّ العبث
  const limited = guard(request, 'plays', 30)
  if (limited) return limited
  try {
    const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || 'http://localhost:8787'
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()
    
    const response = await fetch(`${WORKER_URL}/api/plays?${queryString}`, {
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    })
    
    if (!response.ok) {
      return NextResponse.json({
        results: [],
        total: 0,
        page: 1,
        totalPages: 0
      }, { status: 200 })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ [API /plays] Error:', error)
    return NextResponse.json({
      results: [],
      total: 0,
      page: 1,
      totalPages: 0
    }, { status: 200 })
  }
}
