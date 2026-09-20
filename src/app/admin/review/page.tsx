'use client'

/**
 * طابور المراجعة — كل المحتوى بحالة needs_review مع موافقة/رفض عنصر بعنصر.
 * الموافقة/الرفض يحدث D1 مباشرة (الكتابة-ثم-التحقق في الـAPI) — مزامنة local.db
 * تتم تلقائيًا محليًا أو عبر scripts/review-content.js بعد النشر.
 */

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Loader, CheckCircle2, XCircle, Info } from 'lucide-react'

type Type = 'movie' | 'series'
type SyncResult = { d1_synced: boolean; local_db_synced: boolean; local_db_warning?: string }

interface ReviewItem {
  tmdb_id: number
  slug: string | null
  title_ar: string | null
  title_en: string | null
  year: number | null
  vote_average: number | null
  overview_ar: string | null
  filter_status: string
  poster_path: string | null
  type: Type
}

function posterUrl(path: string | null) {
  return path ? `https://image.tmdb.org/t/p/w92${path}` : null
}

function ratingColor(v: number | null) {
  if (!v) return 'text-zinc-500'
  if (v >= 7.5) return 'text-emerald-400'
  if (v >= 6) return 'text-amber-400'
  return 'text-rose-400'
}

function ReviewRow({
  item,
  onAction,
}: {
  item: ReviewItem
  onAction: (tmdb_id: number, type: Type, action: 'approve' | 'reject') => Promise<SyncResult>
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<'approved' | 'rejected' | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  const handle = async (action: 'approve' | 'reject') => {
    setState('loading')
    try {
      const sync = await onAction(item.tmdb_id, item.type, action)
      setResult(action === 'approve' ? 'approved' : 'rejected')
      setWarning(sync.local_db_warning || null)
      setState('done')
    } catch {
      setState('error')
    }
  }

  const poster = posterUrl(item.poster_path)

  return (
    <div className={`rounded-xl border p-4 transition-colors ${
      state === 'done' ? 'border-zinc-800 bg-zinc-900/40 opacity-60' : 'border-zinc-800 bg-zinc-900'
    }`}>
      <div className="flex gap-3">
        {poster ? (
          <img src={poster} alt="" className="h-24 w-16 shrink-0 rounded-lg object-cover" loading="lazy" />
        ) : (
          <div className="h-24 w-16 shrink-0 rounded-lg bg-zinc-800" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-zinc-100">{item.title_ar || item.title_en || `#${item.tmdb_id}`}</span>
            <span className={`text-xs font-bold ${ratingColor(item.vote_average)}`}>★ {item.vote_average?.toFixed(1) ?? '—'}</span>
            {item.year && <span className="text-xs text-zinc-500">{item.year}</span>}
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${item.type === 'movie' ? 'bg-blue-400/10 text-blue-400' : 'bg-purple-400/10 text-purple-400'}`}>
              {item.type === 'movie' ? 'فيلم' : 'مسلسل'}
            </span>
            {item.slug && (
              <a href={`/${item.type === 'movie' ? 'movies' : 'series'}/${item.slug}`} target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-cyan-500 hover:text-cyan-400">عرض الصفحة</a>
            )}
          </div>
          {item.overview_ar && <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{item.overview_ar}</p>}

          <div className="mt-2.5">
            {state === 'idle' && (
              <div className="flex gap-2">
                <button
                  onClick={() => handle('approve')}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> موافقة
                </button>
                <button
                  onClick={() => handle('reject')}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-red-600 hover:text-white"
                >
                  <XCircle className="h-3.5 w-3.5" /> رفض
                </button>
              </div>
            )}
            {state === 'loading' && (
              <span className="flex items-center gap-1.5 text-xs text-cyan-400"><Loader className="h-3.5 w-3.5 animate-spin" /> جاري التنفيذ…</span>
            )}
            {state === 'done' && (
              <div className="space-y-1">
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${result === 'approved' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {result === 'approved' ? '✓ تمت الموافقة (reviewed_approved)' : '✓ تم الرفض (reviewed_rejected)'}
                </span>
                {warning && (
                  <p className="flex items-center gap-1.5 text-[10px] text-zinc-600"><Info className="h-3 w-3" /> {warning}</p>
                )}
              </div>
            )}
            {state === 'error' && <span className="text-xs font-bold text-red-400">فشل — جرّب تاني</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Type>('movie')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetch('/api/admin/review', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'فشل التحميل')
      setItems([...data.movies, ...data.series])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطأ غير معروف')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const onAction = async (tmdb_id: number, type: Type, action: 'approve' | 'reject'): Promise<SyncResult> => {
    const res = await fetch('/api/admin/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdb_id, type, action }),
    })
    const data = await res.json()
    if (!res.ok || !data.ok) throw new Error(data.error || 'فشل التنفيذ')
    return data as SyncResult
  }

  const filtered = items.filter((i) => i.type === tab)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-black text-zinc-100">
          طابور المراجعة <span className="text-sm font-normal text-zinc-500">({items.length})</span>
        </h2>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> تحديث
        </button>
      </div>

      <div className="flex gap-2">
        {([['movie', `الأفلام (${items.filter((i) => i.type === 'movie').length})`], ['series', `المسلسلات (${items.filter((i) => i.type === 'series').length})`]] as [Type, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === key ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader className="h-6 w-6 animate-spin text-zinc-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 py-16 text-center">
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
          <p className="text-sm text-zinc-400">الطابور فاضي — مافيش محتوى بانتظار المراجعة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <ReviewRow key={`${item.type}-${item.tmdb_id}`} item={item} onAction={onAction} />
          ))}
        </div>
      )}
    </div>
  )
}
