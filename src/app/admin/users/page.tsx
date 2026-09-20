'use client'

import { useEffect, useState, useCallback } from 'react'
import { Search, Loader, ShieldCheck, ShieldAlert } from 'lucide-react'

type AdminUser = {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  role: string
  created_at: string | null
  last_login_at: string | null
}

const ROLES = ['user', 'supervisor', 'admin'] as const
const roleLabel: Record<string, string> = { user: 'مستخدم', supervisor: 'مشرف', admin: 'مدير' }

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [flash, setFlash] = useState<{ ok: boolean; msg: string } | null>(null)

  const note = (ok: boolean, msg: string) => {
    setFlash({ ok, msg })
    setTimeout(() => setFlash(null), 4000)
  }

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const url = query ? '/api/admin/users?q=' + encodeURIComponent(query) : '/api/admin/users'
      const res = await fetch(url, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'فشل التحميل')
      setUsers(data.users || [])
      setTotal(data.total ?? 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطأ غير معروف')
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => { load() }, [load])

  const changeRole = async (u: AdminUser, role: string) => {
    if (role === u.role) return
    setBusyId(u.id)
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id, role }),
    })
    const data = await res.json().catch(() => ({}))
    setBusyId(null)
    if (res.ok && data.ok) {
      note(true, `${u.name || u.email} → ${roleLabel[role]}`)
      load()
    } else {
      note(false, data.error || 'فشل التحديث')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-black text-zinc-100">المستخدمون <span className="text-sm font-normal text-zinc-500">({total.toLocaleString('en-US')})</span></h2>
        <form onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()) }} className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="بحث بالاسم أو البريد…"
            className="w-64 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
          />
          <button type="submit" className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-500">
            <Search className="h-4 w-4" />
          </button>
        </form>
      </div>

      {flash && (
        <p className={`rounded-lg px-3 py-2 text-sm font-bold ${flash.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {flash.msg}
        </p>
      )}
      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900">
        {loading ? (
          <div className="flex justify-center py-16"><Loader className="h-6 w-6 animate-spin text-zinc-400" /></div>
        ) : users.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-500">لا نتائج</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-right text-xs text-zinc-500">
                <th className="px-3 py-3 font-bold">المستخدم</th>
                <th className="px-3 py-3 font-bold">البريد</th>
                <th className="px-3 py-3 font-bold">الدور</th>
                <th className="px-3 py-3 font-bold">آخر دخول</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs text-zinc-400">
                          {(u.name || u.email).slice(0, 1)}
                        </div>
                      )}
                      <span className="font-bold text-zinc-100">{u.name || u.email.split('@')[0]}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-zinc-400" dir="ltr">{u.email}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {u.role === 'admin' ? <ShieldCheck className="h-4 w-4 text-emerald-400" />
                        : u.role !== 'user' ? <ShieldAlert className="h-4 w-4 text-orange-400" /> : null}
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u, e.target.value)}
                        disabled={busyId === u.id}
                        className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-white outline-none focus:border-cyan-500 disabled:opacity-50"
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
                      </select>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-zinc-500" dir="ltr">{u.last_login_at?.slice(0, 16) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-zinc-600">أول 100 نتيجة — استخدم البحث للوصول لباقي الحسابات.</p>
    </div>
  )
}
