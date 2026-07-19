'use client'

import { useState, useEffect } from 'react'
import { Tv, Plus, Search, Edit, Trash2, Eye } from 'lucide-react'

export default function SeriesManage() {
  const [series, setSeries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchSeries = async () => {
      try {
        const res = await fetch('/api/tv/explore?limit=50')
        const data = await res.json()
        setSeries(data.series || [])
      } catch (error) {
        console.error('Error fetching series:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchSeries()
  }, [])

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

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <input
            type="text"
            placeholder="بحث عن مسلسل..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pr-10 pl-4 text-sm text-zinc-100 focus:border-purple-500 outline-none transition-colors"
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
              ) : filteredSeries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                    لا توجد مسلسلات مطابقة
                  </td>
                </tr>
              ) : (
                filteredSeries.map(item => (
                  <tr key={item.id} className="hover:bg-zinc-800/50 transition-colors group">
                    <td className="px-4 py-3 font-mono text-zinc-500">{item.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.poster_path && (
                          <img
                            src={`/tmdb/w92${item.poster_path}`}
                            alt={item.name_ar || item.name_en}
                            className="w-8 h-12 object-cover rounded shadow-sm"
                            loading="lazy"
                          />
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
                      ) : (
                        <span className="text-zinc-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 flex items-center gap-1">
                      <Eye size={14} className="text-zinc-500" />
                      {item.views || 0}
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