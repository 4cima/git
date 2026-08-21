'use client'

/**
 * src/app/admin/review/page.tsx
 *
 * Content Review Dashboard — shows all needs_review items from D1
 * and allows approve / reject per item via /api/admin/review (POST).
 *
 * NOTE ON local.db SYNC:
 *   This page updates D1 only (Next.js API routes cannot write to the
 *   server-side SQLite file in production). After approving / rejecting
 *   here, run the CLI to keep local.db in sync:
 *     node scripts/review-content.js --approve <tmdb_id>
 *     node scripts/review-content.js --reject  <tmdb_id>
 */

import { useState, useEffect, useCallback } from 'react'
import { ShieldAlert, CheckCircle, XCircle, RefreshCw, Film, Tv, Star, Calendar, AlignLeft, Loader } from 'lucide-react'
import { StatsCard }        from '@/components/admin/StatsCard'
import { AdminLoadingState } from '@/components/admin/LoadingState'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface ReviewItem {
  tmdb_id:      number
  slug:         string | null
  title_ar:     string | null
  title_en:     string | null
  year:         number | null
  vote_average: number | null
  overview_ar:  string | null
  filter_status: string
  poster_path:  string | null
  type:         'movie' | 'series'
}

type ActionState = 'idle' | 'loading' | 'done' | 'error'
type SyncResult = { d1_synced: boolean; local_db_synced: boolean; local_db_warning?: string }

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function posterUrl(path: string | null) {
  if (!path) return null
  return `https://image.tmdb.org/t/p/w92${path}`
}

function ratingColor(v: number | null) {
  if (!v) return 'text-zinc-500'
  if (v >= 7.5) return 'text-emerald-400'
  if (v >= 6)   return 'text-yellow-400'
  return 'text-rose-400'
}

// ─────────────────────────────────────────────────────────────
// Row component
// ─────────────────────────────────────────────────────────────
function ReviewRow({
  item,
  onAction,
}: {
  item:     ReviewItem
  onAction: (tmdb_id: number, type: 'movie' | 'series', action: 'approve' | 'reject') => Promise<SyncResult>
}) {
  const [state,      setState]      = useState<ActionState>('idle')
  const [result,     setResult]     = useState<'approved' | 'rejected' | null>(null)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)

  const handleAction = async (action: 'approve' | 'reject') => {
    setState('loading')
    try {
      const sync = await onAction(item.tmdb_id, item.type, action)
      setResult(action === 'approve' ? 'approved' : 'rejected')
      setSyncResult(sync)
      setState('done')
    } catch {
      setState('error')
    }
  }

  const title = item.title_ar || item.title_en || `ID ${item.tmdb_id}`

  // After action — show compact confirmation row
  if (state === 'done' && result) {
    const bothSynced = syncResult?.local_db_synced !== false
    return (
      <tr className={`border-t border-zinc-800/50 ${result === 'approved' ? 'bg-emerald-950/20' : 'bg-rose-950/20'}`}>
        <td colSpan={6} className="px-4 py-3">
          <div className="flex flex-col gap-1">
            <div className={`flex items-center gap-2 text-sm font-medium ${result === 'approved' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {result === 'approved'
                ? <><CheckCircle size={16} /> تم قبول «{title}»</>
                : <><XCircle    size={16} /> تم رفض «{title}»</>}
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-emerald-500">
                <CheckCircle size={11} /> D1 ✓
              </span>
              {syncResult?.local_db_synced ? (
                <span className="flex items-center gap-1 text-emerald-500">
                  <CheckCircle size={11} /> local.db ✓
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400" title={syncResult?.local_db_warning}>
                  <ShieldAlert size={11} /> local.db — {syncResult?.local_db_warning ?? 'not synced'}
                </span>
              )}
              {!bothSynced && (
                <span className="text-zinc-600 italic">
                  (شغّل: node scripts/review-content.js --{result === 'approved' ? 'approve' : 'reject'} {item.tmdb_id})
                </span>
              )}
            </div>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-t border-zinc-800/50 hover:bg-zinc-800/30 transition-colors group">
      {/* Poster + Title */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {posterUrl(item.poster_path) ? (
            <img
              src={posterUrl(item.poster_path)!}
              alt={title}
              className="w-8 h-12 object-cover rounded shadow"
              loading="lazy"
            />
          ) : (
            <div className="w-8 h-12 bg-zinc-800 rounded flex items-center justify-center">
              {item.type === 'movie' ? <Film size={14} className="text-zinc-600" /> : <Tv size={14} className="text-zinc-600" />}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-semibold text-zinc-100 truncate max-w-[200px]" title={title}>{title}</div>
            {item.title_en && item.title_ar && (
              <div className="text-xs text-zinc-500 truncate max-w-[200px]">{item.title_en}</div>
            )}
          </div>
        </div>
      </td>

      {/* Type badge */}
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
          item.type === 'movie'
            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
        }`}>
          {item.type === 'movie' ? <Film size={10} /> : <Tv size={10} />}
          {item.type === 'movie' ? 'فيلم' : 'مسلسل'}
        </span>
      </td>

      {/* Year */}
      <td className="px-4 py-3">
        <span className="flex items-center gap-1 text-sm text-zinc-400">
          <Calendar size={12} className="text-zinc-600" />
          {item.year ?? '—'}
        </span>
      </td>

      {/* Rating */}
      <td className="px-4 py-3">
        <span className={`flex items-center gap-1 text-sm font-bold ${ratingColor(item.vote_average)}`}>
          <Star size={12} />
          {item.vote_average ? Number(item.vote_average).toFixed(1) : '—'}
        </span>
      </td>

      {/* Overview snippet */}
      <td className="px-4 py-3 max-w-xs">
        <span className="flex items-start gap-1 text-xs text-zinc-500 line-clamp-2">
          <AlignLeft size={11} className="mt-0.5 shrink-0 text-zinc-700" />
          {item.overview_ar
            ? item.overview_ar.slice(0, 120) + (item.overview_ar.length > 120 ? '…' : '')
            : <span className="italic text-zinc-700">لا يوجد وصف</span>}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        {state === 'loading' ? (
          <Loader size={18} className="animate-spin text-zinc-400" />
        ) : state === 'error' ? (
          <span className="text-xs text-rose-400">خطأ — أعد المحاولة</span>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAction('approve')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
              title={`قبول tmdb_id=${item.tmdb_id}`}
            >
              <CheckCircle size={13} /> قبول
            </button>
            <button
              onClick={() => handleAction('reject')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
              title={`رفض tmdb_id=${item.tmdb_id}`}
            >
              <XCircle size={13} /> رفض
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
export default function ReviewPage() {
  const [items,   setItems]   = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/admin/review')
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Unknown error')
      const all: ReviewItem[] = [
        ...(data.movies || []),
        ...(data.series || []),
      ]
      setItems(all)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  // Called by each ReviewRow — sends to API then triggers list refresh
  const handleAction = useCallback(
    async (tmdb_id: number, type: 'movie' | 'series', action: 'approve' | 'reject') => {
      const res = await fetch('/api/admin/review', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tmdb_id, action, type }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Update failed')
      // Return sync info so ReviewRow can show it
      return data as { d1_synced: boolean; local_db_synced: boolean; local_db_warning?: string }
    },
    [],
  )

  // ── Derived counts ────────────────────────────────────────
  const movieCount  = items.filter((i) => i.type === 'movie').length
  const seriesCount = items.filter((i) => i.type === 'series').length

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <ShieldAlert className="text-amber-400" size={24} />
            مراجعة المحتوى
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            محتوى أوقفه فلتر الأمان تلقائياً — راجع كل عنصر واقبله أو ارفضه
          </p>
        </div>
        <button
          onClick={fetchItems}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          تحديث
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="إجمالي يحتاج مراجعة"
          value={items.length}
          icon={ShieldAlert}
          color="yellow"
        />
        <StatsCard
          title="أفلام"
          value={movieCount}
          icon={Film}
          color="blue"
        />
        <StatsCard
          title="مسلسلات"
          value={seriesCount}
          icon={Tv}
          color="purple"
        />
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8">
            <AdminLoadingState type="spinner" message="جاري جلب المحتوى من D1..." />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 text-sm">
            <XCircle className="mx-auto mb-2" size={32} />
            خطأ: {error}
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle className="mx-auto mb-3 text-emerald-500" size={40} />
            <p className="text-zinc-300 font-semibold text-lg">لا يوجد محتوى يحتاج مراجعة</p>
            <p className="text-zinc-500 text-sm mt-1">كل المحتوى تمت مراجعته أو لم يُفلتر</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-zinc-950 text-zinc-400 font-medium border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-3 text-right">العنوان</th>
                  <th className="px-4 py-3 text-right">النوع</th>
                  <th className="px-4 py-3 text-right">السنة</th>
                  <th className="px-4 py-3 text-right">التقييم</th>
                  <th className="px-4 py-3 text-right">الوصف</th>
                  <th className="px-4 py-3 text-right">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <ReviewRow
                    key={`${item.type}-${item.tmdb_id}`}
                    item={item}
                    onAction={handleAction}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}