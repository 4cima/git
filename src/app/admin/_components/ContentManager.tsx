'use client'

/**
 * مدير محتوى موحّد للأفلام والمسلسلات — تصفح/بحث/فلترة حالة/تعديل/حذف.
 * يقرأ من /api/admin/{movies|series} (بلا بوابة filter_status — الأدمن يرى الكل).
 * الإضافة اليدوية غير متاحة عمدًا: المحتوى بيوصل عبر سكربتات المزامنة.
 */

import { useState, useEffect, useCallback } from 'react'
import { Search, Pencil, Trash2, Loader, ChevronRight, ChevronLeft, ExternalLink, X } from 'lucide-react'

type Type = 'movie' | 'series'

type Row = {
  tmdb_id: number
  slug: string | null
  title_ar?: string | null
  title_en?: string | null
  name_ar?: string | null
  name_en?: string | null
  poster_path: string | null
  release_year?: number | null
  first_air_year?: number | null
  vote_average: number | null
  filter_status: string | null
  updated_at: string | null
}

const STATUS_STYLES: Record<string, string> = {
  clean: 'bg-emerald-400/10 text-emerald-400',
  needs_review: 'bg-orange-400/10 text-orange-400',
  reviewed_approved: 'bg-cyan-400/10 text-cyan-400',
  reviewed_rejected: 'bg-zinc-500/10 text-zinc-400',
  blocked: 'bg-red-400/10 text-red-400',
}

function statusBadge(status: string | null) {
  const key = status || 'clean'
  return (
    <span className={`whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLES[key] ?? 'bg-purple-400/10 text-purple-400'}`}>
      {key}
    </span>
  )
}

function poster(path: string | null) {
  return path ? `https://image.tmdb.org/t/p/w92${path}` : null
}

export default function ContentManager({ type }: { type: Type }) {
  const isMovie = type === 'movie'
  const api = isMovie ? '/api/admin/movies' : '/api/admin/series'
  const titleField = isMovie ? 'title_ar' : 'name_ar'
  const titleFieldEn = isMovie ? 'title_en' : 'name_en'

  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('updated_at')

  const [editing, setEditing] = useState<Row | null>(null)
  const [editAr, setEditAr] = useState('')
  const [editEn, setEditEn] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<Row | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [flash, setFlash] = useState<{ ok: boolean; msg: string } | null>(null)

  const note = (ok: boolean, msg: string) => {
    setFlash({ ok, msg })
    setTimeout(() => setFlash(null), 4000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', sort })
      if (search) params.set('search', search)
      if (status) params.set('filter_status', status)
      const res = await fetch(`${api}?${params}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'فشل التحميل')
      setRows(isMovie ? data.movies : data.series)
      setHasMore(data.pagination?.hasMore ?? false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطأ غير معروف')
    } finally {
      setLoading(false)
    }
  }, [api, page, search, status, sort, isMovie])

  useEffect(() => {
    load()
  }, [load])

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  const openEdit = (row: Row) => {
    setEditing(row)
    setEditAr((isMovie ? row.title_ar : row.name_ar) || '')
    setEditEn((isMovie ? row.title_en : row.name_en) || '')
  }

  const saveEdit = async () => {
    if (!editing) return
    setSaving(true)
    try {
      const fields: Record<string, string> = {}
      if (editAr !== ((isMovie ? editing.title_ar : editing.name_ar) || '')) fields[titleField] = editAr
      if (editEn !== ((isMovie ? editing.title_en : editing.name_en) || '')) fields[titleFieldEn] = editEn
      if (Object.keys(fields).length === 0) {
        setEditing(null)
        return
      }
      const res = await fetch(api, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdb_id: editing.tmdb_id, fields }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'فشل الحفظ')
      note(true, 'تم الحفظ' + (data.cache_purged ? ' + مسح الكاش ✓' : ''))
      setEditing(null)
      load()
    } catch (e) {
      note(false, e instanceof Error ? e.message : 'خطأ في الحفظ')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setBusyId(deleting.tmdb_id)
    try {
      const res = await fetch(api, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdb_id: deleting.tmdb_id }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'فشل الحذف')
      note(true, `حُذف «${data.deleted_title || data.deleted_name}»` + (data.cache_purged ? ' + مسح الكاش ✓' : ''))
      setDeleting(null)
      load()
    } catch (e) {
      note(false, e instanceof Error ? e.message : 'خطأ في الحذف')
    } finally {
      setBusyId(null)
    }
  }

  const rowTitle = (r: Row) => (isMovie ? r.title_ar || r.title_en : r.name_ar || r.name_en) || `#${r.tmdb_id}`

  return (
    <div className="space-y-4">
      {/* فلاتر */}
      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={submitSearch} className="flex min-w-[240px] flex-1 gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={`بحث بالعنوان أو TMDB ID…`}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
          />
          <button type="submit" className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-500">
            <Search className="h-4 w-4" />
          </button>
        </form>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
        >
          <option value="">كل الحالات</option>
          <option value="clean">clean</option>
          <option value="needs_review">needs_review</option>
          <option value="reviewed_approved">reviewed_approved</option>
          <option value="reviewed_rejected">reviewed_rejected</option>
          <option value="blocked">blocked</option>
          <option value="other">أخرى/فارغة</option>
        </select>
        <select
          value={sort}
          onChange={(e) => { setSort(e.target.value); setPage(1) }}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
        >
          <option value="updated_at">آخر تحديث</option>
          <option value={isMovie ? 'release_year' : 'first_air_year'}>السنة</option>
          <option value="vote_average">التقييم</option>
          <option value="popularity">الشعبية</option>
        </select>
      </div>

      {flash && (
        <p className={`rounded-lg px-3 py-2 text-sm font-bold ${flash.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {flash.msg}
        </p>
      )}
      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

      {/* الجدول */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-zinc-400">
            <Loader className="h-5 w-5 animate-spin" /> جاري التحميل…
          </div>
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-500">لا نتائج</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-right text-xs text-zinc-500">
                <th className="px-3 py-3 font-bold">العمل</th>
                <th className="px-3 py-3 font-bold">السنة</th>
                <th className="px-3 py-3 font-bold">التقييم</th>
                <th className="px-3 py-3 font-bold">الحالة</th>
                <th className="px-3 py-3 font-bold">آخر تحديث</th>
                <th className="px-3 py-3 font-bold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.tmdb_id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      {poster(r.poster_path) ? (
                        <img src={poster(r.poster_path)!} alt="" className="h-12 w-8 shrink-0 rounded object-cover" loading="lazy" />
                      ) : (
                        <div className="h-12 w-8 shrink-0 rounded bg-zinc-800" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-bold text-zinc-100">{rowTitle(r)}</p>
                        <p dir="ltr" className="truncate text-[10px] text-zinc-500">{(isMovie ? r.title_en : r.name_en) || '—'} · #{r.tmdb_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-zinc-300">{(isMovie ? r.release_year : r.first_air_year) || '—'}</td>
                  <td className="px-3 py-2.5 text-amber-400">★ {r.vote_average?.toFixed(1) ?? '—'}</td>
                  <td className="px-3 py-2.5">{statusBadge(r.filter_status)}</td>
                  <td className="px-3 py-2.5 text-xs text-zinc-500" dir="ltr">{r.updated_at?.slice(0, 16) || '—'}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openEdit(r)} disabled={busyId === r.tmdb_id}
                        className="rounded-md bg-zinc-800 p-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-cyan-400" title="تعديل">
                        <Pencil className="h-4 w-4" />
                      </button>
                      {r.slug && (
                        <a href={`/${isMovie ? 'movies' : 'series'}/${r.slug}`} target="_blank" rel="noopener noreferrer"
                          className="rounded-md bg-zinc-800 p-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-emerald-400" title="فتح الصفحة">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      <button onClick={() => setDeleting(r)} disabled={busyId === r.tmdb_id}
                        className="rounded-md bg-zinc-800 p-1.5 text-zinc-300 hover:bg-red-600 hover:text-white" title="حذف">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ترقيم */}
      <div className="flex items-center justify-between">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || loading}
          className="flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-30">
          <ChevronRight className="h-4 w-4" /> السابق
        </button>
        <span className="text-xs text-zinc-500">صفحة {page}</span>
        <button onClick={() => setPage((p) => Math.min(100, p + 1))} disabled={!hasMore || loading || page >= 100}
          className="flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-30">
          التالي <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* نافذة التعديل */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-zinc-100">تعديل: {rowTitle(editing)}</h3>
              <button onClick={() => setEditing(null)} className="text-zinc-400 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <label className="mb-1 block text-xs font-bold text-zinc-400">العنوان بالعربية</label>
            <input value={editAr} onChange={(e) => setEditAr(e.target.value)}
              className="mb-3 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500" dir="rtl" />
            <label className="mb-1 block text-xs font-bold text-zinc-400">العنوان بالإنجليزية</label>
            <input value={editEn} onChange={(e) => setEditEn(e.target.value)} dir="ltr"
              className="mb-5 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">إلغاء</button>
              <button onClick={saveEdit} disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-50">
                {saving ? <Loader className="h-4 w-4 animate-spin" /> : null} حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* تأكيد الحذف */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setDeleting(null)}>
          <div className="w-full max-w-sm rounded-xl border border-red-500/30 bg-zinc-900 p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 font-bold text-red-400">تأكيد الحذف</h3>
            <p className="mb-1 text-sm text-zinc-300">هتحذف «{rowTitle(deleting)}» نهائيًا من قاعدة البيانات؟</p>
            <p className="mb-5 text-xs text-zinc-500">سيتم مسح كاش الحافة تلقائيًا بعد الحذف.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleting(null)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">إلغاء</button>
              <button onClick={confirmDelete} disabled={busyId === deleting.tmdb_id}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50">
                {busyId === deleting.tmdb_id ? <Loader className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} حذف نهائي
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
