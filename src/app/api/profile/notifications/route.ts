import { NextRequest, NextResponse } from 'next/server'
import { executeAll, executeFirst } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-server'

const RATE_LIMIT_HOURS = 24

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const row = await executeFirst<{
    email_notifications: number
    new_content_notifications: number
  }>(
    `SELECT email_notifications, new_content_notifications FROM user_notification_settings WHERE user_id = ?`,
    [user.id]
  )

  return NextResponse.json({
    emailNotifications: row ? Boolean(row.email_notifications)       : true,
    newContentNotif:    row ? Boolean(row.new_content_notifications)  : true,
  })
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit check
  const existing = await executeFirst<{ updated_at: string }>(
    `SELECT updated_at FROM user_notification_settings WHERE user_id = ?`,
    [user.id]
  )
  if (existing?.updated_at) {
    const lastUpdate = new Date(existing.updated_at).getTime()
    const hoursSince = (Date.now() - lastUpdate) / 3_600_000
    if (hoursSince < RATE_LIMIT_HOURS) {
      const hoursLeft = Math.ceil(RATE_LIMIT_HOURS - hoursSince)
      return NextResponse.json(
        { error: `يمكنك تعديل إعدادات الإشعارات مرة واحدة كل 24 ساعة. انتظر ${hoursLeft} ساعة.` },
        { status: 429 }
      )
    }
  }

  const { emailNotifications, newContentNotif } = await request.json()

  await executeAll(
    `INSERT INTO user_notification_settings (user_id, email_notifications, new_content_notifications, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       email_notifications       = excluded.email_notifications,
       new_content_notifications = excluded.new_content_notifications,
       updated_at                = excluded.updated_at`,
    [user.id, emailNotifications ? 1 : 0, newContentNotif ? 1 : 0]
  )

  return NextResponse.json({ ok: true })
}
