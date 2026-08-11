'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, Search, Shield, Ban, UserCheck, Loader, Calendar } from 'lucide-react'

interface Profile {
  id: string
  username: string | null
  email: string | null
  role: 'user' | 'admin' | 'supervisor' | null
  banned: boolean | null
  created_at: string | null
}

export default function UsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  const fetchProfiles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}`)
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Failed to fetch users')
      setProfiles(data.profiles || [])
    } catch (e) {
      flash('err', e instanceof Error ? e.message : 'خطأ في جلب البيانات')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => fetchProfiles(), 300)
    return () => clearTimeout(timer)
  }, [search, fetchProfiles])

  const flash = (type: 'ok' | 'err', msg: string) => {
    setFeedback({ type, msg })
    setTimeout(() => setFeedback(null), 4000)
  }

  const updateRole = async (id: string, role: 'user' | 'admin' | 'supervisor') => {
    setUpdating(id)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'role', role }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'فشل التحديث')
      flash('ok', 'تم تحديث الدور')
      fetchProfiles()
    } catch (e) {
      flash('err', e instanceof Error ? e.message : 'خطأ في التحديث')
    } finally {
      setUpdating(null)
    }
  }

  const toggleBan = async (id: string, currentBanned: boolean) => {
    setUpdating(id)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'ban', banned: !currentBanned }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'فشل التحديث')
      flash('ok', currentBanned ? 'تم إلغاء الحظر' : 'تم حظر المستخدم')
      fetchProfiles()
    } catch (e) {
      flash('err', e instanceof Error ? e.message : 'خطأ في التحديث')
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Users className="text-orange-400" /> إدارة المستخدمين
          </h1>
          <p className="text-sm text-zinc-400 mt-1">إجمالي {profiles.length} مستخدم</p>
        </div>
      </div>

      {feedback && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${feedback.type === 'ok' ? 'bg-emerald-950/40 border border-emerald-700/40 text-emerald-300' : 'bg-rose-950/40 border border-rose-700/40 text-rose-300'}`}>
          {feedback.msg}
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <input
            type="text"
            placeholder="بحث باسم المستخدم أو البريد..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pr-10 pl-4 text-sm text-zinc-100 focus:border-orange-500 outline-none"
          />
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-zinc-950 text-zinc-400 font-medium border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3">اسم المستخدم</th>
                <th className="px-4 py-3">البريد الإلكتروني</th>
                <th className="px-4 py-3">الدور</th>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3">تاريخ التسجيل</th>
                <th className="px-4 py-3">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`sk-${i}`}>
                    <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-zinc-800" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-32 animate-pulse rounded bg-zinc-800" /></td>
                    <td className="px-4 py-3"><div className="h-7 w-28 animate-pulse rounded bg-zinc-800" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-16 animate-pulse rounded bg-zinc-800" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-zinc-800" /></td>
                    <td className="px-4 py-3"><div className="h-7 w-20 animate-pulse rounded bg-zinc-800" /></td>
                  </tr>
                ))
              ) : profiles.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-500">لا يوجد مستخدمين</td></tr>
              ) : (
                profiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-zinc-200">{profile.username || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{profile.email || '—'}</td>
                    <td className="px-4 py-3">
                      <select
                        value={profile.role || 'user'}
                        onChange={(e) => updateRole(profile.id, e.target.value as 'user' | 'admin' | 'supervisor')}
                        disabled={updating === profile.id}
                        className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:border-orange-500 outline-none disabled:opacity-50"
                      >
                        <option value="user">مستخدم</option>
                        <option value="supervisor">مراقب</option>
                        <option value="admin">مشرف</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {profile.banned ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                          <Ban size={10} /> محظور
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                          <UserCheck size={10} /> نشط
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <Calendar size={11} />
                        {profile.created_at ? new Date(profile.created_at).toLocaleDateString('ar-EG') : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleBan(profile.id, profile.banned || false)}
                        disabled={updating === profile.id}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${
                          profile.banned
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                        }`}
                      >
                        {updating === profile.id ? (
                          <Loader size={12} className="animate-spin" />
                        ) : profile.banned ? (
                          <><Shield size={12} /> إلغاء الحظر</>
                        ) : (
                          <><Ban size={12} /> حظر</>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}