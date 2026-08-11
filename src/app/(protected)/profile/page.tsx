/**
 * Profile Page - User profile (placeholder for now)
 * Will be expanded with watchlist, history, settings, etc.
 */

'use client'

import { useAuth } from '@/hooks/useAuth'
import { User, Mail, Calendar, Shield } from 'lucide-react'

export default function ProfilePage() {
  const { user, profile } = useAuth()

  if (!user || !profile) {
    return null
  }

  const joinDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'غير متوفر'

  const roleLabel = profile.role === 'admin' ? 'مشرف' : profile.role === 'supervisor' ? 'مراقب' : 'مستخدم'

  return (
    <div className="min-h-screen bg-zinc-950 py-8 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">الملف الشخصي</h1>
          <p className="text-zinc-400">معلومات حسابك على 4CIMA</p>
        </div>

        {/* Profile Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-xl overflow-hidden">
          {/* Avatar Section */}
          <div className="p-8 border-b border-zinc-800">
            <div className="flex items-center gap-6">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-24 h-24 rounded-full object-cover border-4 border-zinc-700"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-600 to-cyan-400 flex items-center justify-center text-white text-3xl font-bold">
                  {profile.username.charAt(0).toUpperCase()}
                </div>
              )}

              <div>
                <h2 className="text-2xl font-bold text-zinc-100 mb-1">{profile.username}</h2>
                <p className="text-zinc-400">{user.email}</p>
                {profile.role !== 'user' && (
                  <span className="inline-block mt-2 px-3 py-1 text-xs font-bold bg-cyan-400/10 text-cyan-400 rounded-full">
                    {roleLabel}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="p-8 space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800/50">
              <div className="p-2 rounded-lg bg-zinc-700 text-zinc-300">
                <User size={20} />
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1">اسم المستخدم</p>
                <p className="text-sm font-semibold text-zinc-100">{profile.username}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800/50">
              <div className="p-2 rounded-lg bg-zinc-700 text-zinc-300">
                <Mail size={20} />
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1">البريد الإلكتروني</p>
                <p className="text-sm font-semibold text-zinc-100">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800/50">
              <div className="p-2 rounded-lg bg-zinc-700 text-zinc-300">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1">تاريخ الانضمام</p>
                <p className="text-sm font-semibold text-zinc-100">{joinDate}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800/50">
              <div className="p-2 rounded-lg bg-zinc-700 text-zinc-300">
                <Shield size={20} />
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1">نوع الحساب</p>
                <p className="text-sm font-semibold text-zinc-100">{roleLabel}</p>
              </div>
            </div>
          </div>

          {/* Placeholder for future features */}
          <div className="p-8 border-t border-zinc-800 bg-zinc-800/30">
            <p className="text-sm text-zinc-500 text-center">
              قريباً: قائمة المتابعة، سجل المشاهدة، الإعدادات والمزيد...
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
