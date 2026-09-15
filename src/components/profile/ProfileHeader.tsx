'use client'

/**
 * src/components/profile/ProfileHeader.tsx
 * هيدر البروفايل: أفاتار + اسم + بريد + تاريخ انضمام + زر الخروج.
 * زر الخروج موجود هنا فقط — ممنوع تكراره في أي مكان آخر داخل البروفايل.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { formatDateAr } from './utils'

export function ProfileHeader() {
  const { user, profile, signOut } = useAuth()
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const name =
    profile?.username || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'مستخدم'
  const email = user?.email ?? ''
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || null
  const joinedAt = formatDateAr(user?.created_at ?? null)
  const initial = name.trim().charAt(0).toUpperCase() || '؟'

  /** الخروج عبر /api/auth/logout (داخل useAuth.signOut) ثم توجيه لصفحة الدخول */
  const handleLogout = async () => {
    if (busy) return
    setBusy(true)
    try {
      await signOut()
    } finally {
      router.push('/login')
    }
  }

  return (
    <header className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-l from-zinc-900 via-zinc-900/80 to-zinc-950 p-5 shadow-xl md:p-7">
      {/* توهج ذهبي خافت */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
        {/* الأفاتار */}
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-amber-500/60 md:h-24 md:w-24">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-zinc-800 text-3xl font-black text-amber-400">
              {initial}
            </span>
          )}
        </div>

        {/* الاسم والبريد وتاريخ الانضمام */}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-black text-white md:text-3xl">{name}</h1>
          {email && <p className="mt-1 truncate text-sm text-zinc-400" dir="ltr">{email}</p>}
          {joinedAt && (
            <p className="mt-1.5 text-xs text-zinc-500">
              عضو منذ <span className="text-amber-400/90">{joinedAt}</span>
            </p>
          )}
        </div>

        {/* زر الخروج — الوحيد في صفحة البروفايل */}
        <button
          type="button"
          onClick={handleLogout}
          disabled={busy}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
          aria-label="تسجيل الخروج"
        >
          <LogOut className="h-4 w-4" />
          {busy ? 'جاري الخروج...' : 'خروج'}
        </button>
      </div>
    </header>
  )
}
