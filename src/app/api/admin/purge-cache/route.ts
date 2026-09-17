import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAdmin'
import { purgeCloudflareCache } from '@/lib/cloudflare-cache'

// Network call + no cacheable payload — never prerender/cache this route.
export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/purge-cache
 *
 * Manual "purge everything" trigger for the Cloudflare zone cache.
 * Protected exactly like the other admin routes:
 *   - src/middleware.ts guards /api/admin (Basic Auth OR admin/supervisor session)
 *   - requireAdmin() adds a second in-handler layer + a proper 401 for direct calls
 */
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const result = await purgeCloudflareCache()

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error ?? 'unknown_error',
          timestamp: new Date().toISOString(),
        },
        { status: result.error === 'missing_credentials' ? 500 : 502 },
      )
    }

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
