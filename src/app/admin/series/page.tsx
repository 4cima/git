'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tv, Plus, Search, Edit, Trash2, Loader, X, Save } from 'lucide-react'
import { updateSeries, deleteSeries } from '@/services/adminContentAPI'

interface Series {
  id: number
  tmdb_id: number
  name_ar: string | null
  name_en: string | null
  first_air_year: number | null
  vote_average: number | null
  poster_path: string | null
}

interface EditState {
  tmdb_id: number
  name_ar: string
  name_en: string
}

export default function SeriesManage() {
  const [series,   setSeries]   = useState<Series[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [editing,  setEditing]  = useState<EditState | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  const fetchSeries = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/series?limit=50')
      const data = await res.json()
      setSeries(data.series || data || [])
    } catch (e) {
      console.error('Error fetching series:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSeries() }, [fetchSeries])

  const flash = (type: 'ok' | 'err', msg: string) => {
    setFeedback({ type, msg })
    setTimeout(() => setFeedback(null), 4000)
  }

  const handleEdit = (item: Series) => {
    setEditing({ tmdb_id: item.tmdb_id, name_ar: item.name_ar || '', name_en: item.name_en || '' })
  }

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    try {
      await updateSeries(editing.tmdb_id, { name_ar: editing.name_ar, name_en: editing.name_en })
      flash('ok', `تم تحديث "${editing.name_ar || editing.name_en}" بنجاح`)
      setEditing(null)
      fetchSeries()
    } catch (e: unknown) {
      flash('err', e instanceof Error ? e.message : 'فشل التحديث')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item: Series) => {
    if (!confirm(`هل أنت متأكد من حذف "${item.name_ar || item.name_en}"؟ هذا الإجراء لا يمكن التراجع عنه.`)) return
    setDeleting(item.tmdb_id)
    try {
      await deleteSeries(item.tmdb_id)
      flash('ok', `تم حذف "${item.name_ar || item.name_en}" بنجاح`)
      fetchSeries()
    } catch (e: unknown) {
      flash('err', e instanceof Error ? e.message : 'فشل الحذف')
    } finally {
      setDeleting(null)
    }
  }

  const filteredSeries = series.filter(s =>
    (s.name_ar || s.name_en || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Tv className="text-purple-400" /> إدارة المسلسلات
          </h1>
          <p className="text-sm text-zinc-400 mt-1">إجمالي {series.length} مسلسل معروض</p>
        </div>
        <button className="bg-purple-500 hover:bg-purple-400 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
          <Plus size={16} /> إضافة مسلسل
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${feedback.type === 'ok' ? 'bg-emerald-950/40 border border-emerald-700/40 text-emerald-300' : 'bg-rose-950/40 border border-rose-700/40 text-rose-300'}`}>
          {feedback.msg}
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" dir="rtl">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-zinc-100 mb-4">تعديل المسلسل (tmdb_id={editing.tmdb_id})</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">الاسم العربي</label>
                <input value={editing.name_ar} onChange={e => setEditing(p => p ? {...p, name_ar: e.target.value} : p)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-purple-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">الاسم الإنجليزي</label>
                <input value={editing.name_en} onChange={e => setEditing(p => p ? {...p, name_en: e.target.value} : p)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-purple-500 outline-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded-lg transition-colors disabled:opacity-50">
                {saving ? <Loader size={15} className="animate-spin" /> : <Save size={15} />}
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              <button onClick={() => setEditing(null)} disabled={saving}
                className="flex items-center gap-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors disabled:opacity-50">
                <X size={15} /> إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <input type="text" placeholder="بحث عن مسلسل..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pr-10 pl-4 text-sm text-zinc-100 focus:border-purple-500 outline-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-zinc-950 text-zinc-400 font-medium border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3">TMDB ID</th>
                <th className="px-4 py-3">الاسم</th>
                <th className="px-4 py-3">السنة</th>
                <th className="px-4 py-3">التقييم</th>
                <th className="px-4 py-3">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-500">جاري التحميل...</td></tr>
              ) : filteredSeries.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-500">لا توجد مسلسلات مطابقة</td></tr>
              ) : filteredSeries.map(item => (
                <tr key={item.tmdb_id} className="hover:bg-zinc-800/50 transition-colors group">
                  <td className="px-4 py-3 font-mono text-zinc-500 text-xs">{item.tmdb_id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {item.poster_path && (
                        <img src={`/tmdb/w92${item.poster_path}`} alt={item.name_ar || ''} className="w-8 h-12 object-cover rounded shadow-sm" loading="lazy" />
                      )}
                      <span className="font-semibold text-zinc-200 group-hover:text-purple-400 transition-colors line-clamp-1">
                        {item.name_ar || item.name_en}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{item.first_air_year || '—'}</td>
                  <td className="px-4 py-3">
                    {item.vote_average ? (
                      <span className={`font-bold ${item.vote_average >= 7 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {Number(item.vote_average).toFixed(1)}
                      </span>
                    ) : <span className="text-zinc-500">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEdit(item)}
                        className="p-1.5 hover:bg-blue-500/20 hover:text-blue-400 rounded-md transition-colors text-zinc-500" title="تعديل">
                        <Edit size={15} />
                      </button>
                      <button onClick={() => handleDelete(item)} disabled={deleting === item.tmdb_id}
                        className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-md transition-colors text-zinc-500 disabled:opacity-50" title="حذف">
                        {deleting === item.tmdb_id ? <Loader size={15} className="animate-spin" /> : <Trash2 size={15} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}