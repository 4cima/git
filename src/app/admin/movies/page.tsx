'use client'

import { useState, useEffect, useCallback } from 'react'
import { Film, Plus, Search, Edit, Trash2, Eye, X, Save, Loader } from 'lucide-react'
import { updateMovie, deleteMovie } from '@/services/adminContentAPI'

interface Movie {
  id: number
  tmdb_id: number
  title_ar: string | null
  title_en: string | null
  release_year: number | null
  vote_average: number | null
  poster_path: string | null
  views?: number
}

interface EditState {
  tmdb_id: number
  title_ar: string
  title_en: string
}

export default function MoviesManage() {
  const [movies,   setMovies]   = useState<Movie[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [editing,  setEditing]  = useState<EditState | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  const fetchMovies = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/movies/explore?limit=50')
      const data = await res.json()
      setMovies(data.movies || [])
    } catch (e) {
      console.error('Error fetching movies:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMovies() }, [fetchMovies])

  const flash = (type: 'ok' | 'err', msg: string) => {
    setFeedback({ type, msg })
    setTimeout(() => setFeedback(null), 4000)
  }

  const handleEdit = (movie: Movie) => {
    setEditing({ tmdb_id: movie.tmdb_id, title_ar: movie.title_ar || '', title_en: movie.title_en || '' })
  }

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    try {
      await updateMovie(editing.tmdb_id, { title_ar: editing.title_ar, title_en: editing.title_en })
      flash('ok', `تم تحديث "${editing.title_ar || editing.title_en}" بنجاح`)
      setEditing(null)
      fetchMovies()
    } catch (e: unknown) {
      flash('err', e instanceof Error ? e.message : 'فشل التحديث')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (movie: Movie) => {
    if (!confirm(`هل أنت متأكد من حذف "${movie.title_ar || movie.title_en}"؟ هذا الإجراء لا يمكن التراجع عنه.`)) return
    setDeleting(movie.tmdb_id)
    try {
      await deleteMovie(movie.tmdb_id)
      flash('ok', `تم حذف "${movie.title_ar || movie.title_en}" بنجاح`)
      fetchMovies()
    } catch (e: unknown) {
      flash('err', e instanceof Error ? e.message : 'فشل الحذف')
    } finally {
      setDeleting(null)
    }
  }

  const filteredMovies = movies.filter(m =>
    (m.title_ar || m.title_en || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Film className="text-cyan-400" /> إدارة الأفلام
          </h1>
          <p className="text-sm text-zinc-400 mt-1">إجمالي {movies.length} فيلم معروض</p>
        </div>
        <button className="bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
          <Plus size={16} /> إضافة فيلم
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
            <h2 className="text-lg font-bold text-zinc-100 mb-4">تعديل الفيلم (tmdb_id={editing.tmdb_id})</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">العنوان العربي</label>
                <input value={editing.title_ar} onChange={e => setEditing(p => p ? {...p, title_ar: e.target.value} : p)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-cyan-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">العنوان الإنجليزي</label>
                <input value={editing.title_en} onChange={e => setEditing(p => p ? {...p, title_en: e.target.value} : p)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-cyan-500 outline-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded-lg transition-colors disabled:opacity-50">
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
          <input type="text" placeholder="بحث عن فيلم..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pr-10 pl-4 text-sm text-zinc-100 focus:border-cyan-500 outline-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-zinc-950 text-zinc-400 font-medium border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3">TMDB ID</th>
                <th className="px-4 py-3">العنوان</th>
                <th className="px-4 py-3">السنة</th>
                <th className="px-4 py-3">التقييم</th>
                <th className="px-4 py-3">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-500">جاري التحميل...</td></tr>
              ) : filteredMovies.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-500">لا توجد أفلام مطابقة</td></tr>
              ) : filteredMovies.map(movie => (
                <tr key={movie.tmdb_id} className="hover:bg-zinc-800/50 transition-colors group">
                  <td className="px-4 py-3 font-mono text-zinc-500 text-xs">{movie.tmdb_id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {movie.poster_path && (
                        <img src={`/tmdb/w92${movie.poster_path}`} alt={movie.title_ar || ''} className="w-8 h-12 object-cover rounded shadow-sm" loading="lazy" />
                      )}
                      <span className="font-semibold text-zinc-200 group-hover:text-cyan-400 transition-colors line-clamp-1">
                        {movie.title_ar || movie.title_en}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{movie.release_year || '—'}</td>
                  <td className="px-4 py-3">
                    {movie.vote_average ? (
                      <span className={`font-bold ${movie.vote_average >= 7 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {Number(movie.vote_average).toFixed(1)}
                      </span>
                    ) : <span className="text-zinc-500">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEdit(movie)}
                        className="p-1.5 hover:bg-blue-500/20 hover:text-blue-400 rounded-md transition-colors text-zinc-500" title="تعديل">
                        <Edit size={15} />
                      </button>
                      <button onClick={() => handleDelete(movie)} disabled={deleting === movie.tmdb_id}
                        className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-md transition-colors text-zinc-500 disabled:opacity-50" title="حذف">
                        {deleting === movie.tmdb_id ? <Loader size={15} className="animate-spin" /> : <Trash2 size={15} />}
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