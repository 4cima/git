'use client'

import { useState, useEffect } from 'react'
import { Film, Plus, Search, Edit, Trash2, Eye, X, Save } from 'lucide-react'

export default function MoviesManage() {
  const [movies, setMovies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const res = await fetch('/api/movies/explore?limit=50')
        const data = await res.json()
        setMovies(data.movies || [])
      } catch (error) {
        console.error('Error fetching movies:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchMovies()
  }, [])

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

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <input
            type="text"
            placeholder="بحث عن فيلم..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pr-10 pl-4 text-sm text-zinc-100 focus:border-cyan-500 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-zinc-950 text-zinc-400 font-medium border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">العنوان</th>
                <th className="px-4 py-3">السنة</th>
                <th className="px-4 py-3">التقييم</th>
                <th className="px-4 py-3">المشاهدات</th>
                <th className="px-4 py-3">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                    جاري التحميل...
                  </td>
                </tr>
              ) : filteredMovies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                    لا توجد أفلام مطابقة
                  </td>
                </tr>
              ) : (
                filteredMovies.map(movie => (
                  <tr key={movie.id} className="hover:bg-zinc-800/50 transition-colors group">
                    <td className="px-4 py-3 font-mono text-zinc-500">{movie.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {movie.poster_path && (
                          <img
                            src={`/tmdb/w92${movie.poster_path}`}
                            alt={movie.title_ar || movie.title_en}
                            className="w-8 h-12 object-cover rounded shadow-sm"
                            loading="lazy"
                          />
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
                      ) : (
                        <span className="text-zinc-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 flex items-center gap-1">
                      <Eye size={14} className="text-zinc-500" />
                      {movie.views || 0}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 hover:bg-blue-500/20 hover:text-blue-400 rounded-md transition-colors" title="تعديل">
                          <Edit size={16} />
                        </button>
                        <button className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-md transition-colors" title="حذف">
                          <Trash2 size={16} />
                        </button>
                      </div>
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