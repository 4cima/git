'use client'

/**
 * المجتمع — اقتراحات الزوار (site_suggestions) + مراجعات المستخدمين (user_reviews).
 * أول واجهة إدارية للجدولين: قراءة + تصنيف الاقتراحات (جديد/مشاهدة/مؤرشف) + حذف.
 */

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Loader, Trash2, MessageSquare, Star } from 'lucide-react'

type Suggestion = {
  id: number
  subject: string
  message: string
  user_agent: string | null
  status: string | null
  created_at: string
}
type UserReview = {
  id: number
  username: string | null
  content_type: string | null
  tmdb_id: number | null
  title: string | null
  rating: number | null
  review_text: string
  created_at: string
}

export default function CommunityPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [reviews, setReviews] = useState<UserReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [flash, setFlash] = useState<{ ok: boolean; msg: string } | null>(null)
  const [deleting, setDeleting] = useState<{ type: 'suggestion' | 'review'; id: number; label: string } | null>(null)

  const note = (ok: boolean, msg: string) => {
    setFlash({ ok, msg })
    setTimeout(() => setFlash(null), 4000)
  }

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetch('/api/admin/community', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'فشل التحميل')
      setSuggestions(data.suggestions || [])
      setReviews(data.reviews || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطأ غير معروف')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const setStatus = async (s: Suggestion, status: string) => {
    setBusy(`s${s.id}`)
    const res = await fetch('/api/admin/community', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'suggestion', id: s.id, status }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(null)
    if (res.ok && data.ok) note(true, data.message || 'تم')
    else note(false, data.error || 'فشل التحديث')
    load()
  }

  const doDelete = async () => {
    if (!deleting) return
    setBusy(`d${deleting.id}`)
    const res = await fetch(`/api/admin/community?type=${deleting.type}&id=${deleting.id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    setBusy(null)
    setDeleting(null)
    if (res.ok && data.ok) note(true, data.message || 'حُذف')
    else note(false, data.error || 'فشل الحذف')
    load()
  }

  const statusBadge = (status: string | null) => {
    const s = status || 'new'
    const styles: Record<string, string> = {
      new: 'bg-cyan-400/10 text-cyan-400',
      seen: 'bg-zinc-500/10 text-zinc-400',
      archived: 'bg-zinc-800 text-zinc-500',
    }
    const labels: Record<string, string> = { new: 'جديد', seen: 'مشاهدة', archived: 'مؤرشف' }
    return <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${styles[s] ?? styles.new}`}>{labels[s] ?? 'جديد'}</span>
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xl font-black text-zinc-100">
          <MessageSquare className="h-5 w-5 text-cyan-400" /> الاقتراحات والمراجعات
        </h2>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> تحديث
        </button>
      </div>

      {flash && (
        <p className={`rounded-lg px-3 py-2 text-sm font-bold ${flash.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {flash.msg}
        </p>
      )}
      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
      {loading && <div className="flex justify-center py-16"><Loader className="h-6 w-6 animate-spin text-zinc-400" /></div>}

      {!loading && (
        <>
          {/* الاقتراحات */}
          <section>
            <h3 className="mb-2 text-sm font-black text-cyan-400">اقتراحات الزوار <span className="text-zinc-600">({suggestions.length})</span></h3>
            {suggestions.length === 0 ? (
              <p className="rounded-xl border border-zinc-800 bg-zinc-900 py-10 text-center text-sm text-zinc-500">لا اقتراحات بعد</p>
            ) : (
              <div className="space-y-2">
                {suggestions.map((s) => (
                  <div key={s.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-bold text-zinc-100">{s.subject || 'بدون عنوان'}</span>
                      {statusBadge(s.status)}
                      <span className="text-[10px] text-zinc-600" dir="ltr">{s.created_at?.slice(0, 16)}</span>
                    </div>
                    <p className="mb-3 whitespace-pre-wrap text-sm text-zinc-300">{s.message}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {s.status !== 'seen' && (
                        <button onClick={() => setStatus(s, 'seen')} disabled={busy === `s${s.id}`} className="rounded-md bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-700">
                          مشاهدة
                        </button>
                      )}
                      {s.status !== 'archived' && (
                        <button onClick={() => setStatus(s, 'archived')} disabled={busy === `s${s.id}`} className="rounded-md bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-700">
                          أرشفة
                        </button>
                      )}
                      {s.status !== 'new' && (
                        <button onClick={() => setStatus(s, 'new')} disabled={busy === `s${s.id}`} className="rounded-md bg-zinc-800 px-2.5 py-1 text-xs text-cyan-400 hover:bg-zinc-700">
                          إرجاع جديد
                        </button>
                      )}
                      <button
                        onClick={() => setDeleting({ type: 'suggestion', id: s.id, label: s.subject || 'اقتراح' })}
                        className="mr-auto rounded-md bg-zinc-800 p-1.5 text-zinc-400 hover:bg-red-600 hover:text-white"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* المراجعات */}
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-black text-amber-400">
              <Star className="h-4 w-4" /> مراجعات المستخدمين <span className="text-zinc-600">({reviews.length})</span>
            </h3>
            {reviews.length === 0 ? (
              <p className="rounded-xl border border-zinc-800 bg-zinc-900 py-10 text-center text-sm text-zinc-500">لا مراجعات بعد</p>
            ) : (
              <div className="space-y-2">
                {reviews.map((r) => (
                  <div key={r.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-bold text-zinc-100">{r.username || 'مستخدم'}</span>
                      <span className="text-xs font-bold text-amber-400">★ {r.rating ?? '—'}</span>
                      <span className="text-xs text-zinc-500">
                        على «{r.title || `#${r.tmdb_id}`}» {r.content_type === 'movie' ? '(فيلم)' : r.content_type === 'series' ? '(مسلسل)' : ''}
                      </span>
                      <span className="text-[10px] text-zinc-600" dir="ltr">{r.created_at?.slice(0, 16)}</span>
                    </div>
                    <p className="mb-2 whitespace-pre-wrap text-sm text-zinc-300">{r.review_text}</p>
                    <button
                      onClick={() => setDeleting({ type: 'review', id: r.id, label: `مراجعة ${r.username || ''}` })}
                      className="rounded-md bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400 hover:bg-red-600 hover:text-white"
                    >
                      حذف المراجعة
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* تأكيد الحذف */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setDeleting(null)}>
          <div className="w-full max-w-sm rounded-xl border border-red-500/30 bg-zinc-900 p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 font-bold text-red-400">تأكيد الحذف</h3>
            <p className="mb-5 text-sm text-zinc-300">هتحذف «{deleting.label}» نهائيًا؟</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleting(null)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">إلغاء</button>
              <button onClick={doDelete} disabled={busy === `d${deleting.id}`}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50">
                {busy === `d${deleting.id}` ? <Loader className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
