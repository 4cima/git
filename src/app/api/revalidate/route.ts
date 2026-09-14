import { revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { safeEqual } from '@/lib/timingSafeEqual'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { secret, tag } = body

    // Verify the secret (constant-time comparison)
    const secretOk = await safeEqual(String(secret ?? ''), process.env.REVALIDATE_SECRET ?? '')
    if (!secretOk) {
      return NextResponse.json(
        { error: 'Invalid secret' },
        { status: 401 }
      )
    }

    // Validate tag
    if (!tag || typeof tag !== 'string') {
      return NextResponse.json(
        { error: 'Tag is required and must be a string' },
        { status: 400 }
      )
    }

    // Revalidate the specified cache tag
    revalidateTag(tag)

    return NextResponse.json({
      revalidated: true,
      tag,
      now: Date.now()
    })
  } catch (error) {
    console.error('Revalidation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
