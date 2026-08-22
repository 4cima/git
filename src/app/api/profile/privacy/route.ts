import { NextRequest, NextResponse } from 'next/server'
import { executeAll, executeFirst } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-server'

// Rate limit: max 1 write per 24h per user per setting type
const RATE_LIMIT_HOURS = 24

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const row = await executeFirst<{
    show_watch_history: number
    show_favorites: number
  }>(
    `SELECT show_watch_history, show_favorites FROM user_privacy_settings WHERE user_id = ?`,
    [user.id]
  )

  return NextResponse.json({
    showWatchHistory: row ? Boolean(row.show_watch_history) : true,
    showFavorites:    row ? Boolean(row.show_favorites)     : true,
  })
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit check
  const existing = await executeFirst<{ updated_at: string }>(
    `SELECT updated_at FROM user_privacy_settings WHERE user_id = ?`,
    [user.id]
  )
  if (existing?.updated_at) {
    const lastUpdate = new Date(existing.updated_at).getTime()
    const hoursSince = (Date.now() - lastUpdate) / 3_600_000
    if (hoursSince < RATE_LIMIT_HOURS) {
      const hoursLeft = Math.ceil(RATE_LIMIT_HOURS - hoursSince)
      return NextResponse.json(
        { error: `يمكنك تعديل إعدادات الخصوصية مرة واحدة كل 24 ساعة. انتظر ${hoursLeft} ساعة.` },
        { status: 429 }
      )
    }
  }

  const { showWatchHistory, showFavorites } = await request.json()

  await executeAll(
    `INSERT INTO user_privacy_settings (user_id, show_watch_history, show_favorites, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       show_watch_history = excluded.show_watch_history,
       show_favorites     = excluded.show_favorites,
       updated_at         = excluded.updated_at`,
    [user.id, showWatchHistory ? 1 : 0, showFavorites ? 1 : 0]
  )

  return NextResponse.json({ ok: true })
}
