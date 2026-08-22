import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // All accounts use Google OAuth — no password to change
  return NextResponse.json(
    { error: 'حسابك مرتبط بـ Google. لا يمكن تغيير كلمة المرور.' },
    { status: 400 }
  )
}
