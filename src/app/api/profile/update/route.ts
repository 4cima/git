import { NextRequest, NextResponse } from 'next/server'
import { executeAll, executeFirst } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-server'
import { validateUsername, canChangeUsername } from '@/lib/usernameValidator'

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { username, avatar_url } = await request.json()

  if (!username?.trim()) {
    return NextResponse.json({ error: 'اسم المستخدم مطلوب' }, { status: 400 })
  }

  /* قفل مصدر avatar_url — نفس قايمة upload-avatar البيضا:
     null (مسح) أو data:URL بصيغة JPG/PNG/WebP أو رابط Google https.
   بيمنع data:image/svg+xml (سكريبت بنفس الأصل لو اتفتح مباشرة)
     وأي scheme تاني (javascript:/text/html وغيرها). */
  const SAFE_AVATAR_DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/
  const avatar = avatar_url || null
  if (avatar && !avatar.startsWith('https://') && !SAFE_AVATAR_DATA_URL.test(avatar)) {
    return NextResponse.json({ error: 'صيغة الصورة غير مدعومة — المسموح: JPG أو PNG أو WebP' }, { status: 400 })
  }

  const trimmed = username.trim()

  // Get current user row from D1
  const current = await executeFirst<{ name: string | null; name_last_changed: string | null }>(
    `SELECT name, name_last_changed FROM users WHERE id = ?`,
    [user.id]
  )

  const isNameChanging = current?.name !== trimmed

  if (isNameChanging) {
    const validation = validateUsername(trimmed)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // 24h cooldown on name change
    if (current?.name_last_changed) {
      const check = canChangeUsername(current.name_last_changed)
      if (!check.canChange) {
        return NextResponse.json({ error: check.error }, { status: 429 })
      }
    }
  }

  const now = new Date().toISOString()
  const nameUpdate = isNameChanging
    ? `name = ?, avatar_url = ?, name_last_changed = ?`
    : `avatar_url = ?`
  const params = isNameChanging
    ? [trimmed, avatar, now, user.id]
    : [avatar, user.id]

  await executeAll(
    `UPDATE users SET ${nameUpdate} WHERE id = ?`,
    params
  )

  return NextResponse.json({ ok: true })
}
