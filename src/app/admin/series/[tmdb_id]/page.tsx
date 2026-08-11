'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Tv, Plus, Trash2, Loader, ArrowLeft, Calendar, Layers, Save } from 'lucide-react'

interface Series {
  tmdb_id: number
  name_ar: string | null
  name_en: string | null
  poster_path: string | null
  overview_ar: string | null
  first_air_year: number | null
  vote_average: number | null
}

interface Season {
  id: number
  series_id: number
  season_number: number
  name: string | null
  overview: string | null
  air_date: string | null
  episode_count: number | null
  poster_path: string | null
}

export default function SeriesDetailPage() {
  const params = useParams()
  const router = useRouter()
  const tmdb_id = Number(params.tmdb_id)

  const [series, setSeries] = useState<Series | null>(null)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  // New season form
  const [seasonNumber, setSeasonNumber] = useState(1)
  const [seasonName, setSeasonName] = useState('')
  const [seasonOverview, setSeasonOverview] = useState('')
  const [seasonAirDate, setSeasonAirDate] = useState('')
  const [seasonEpisodeCount, setSeasonEpisodeCount] = useState<number>(0)

  const flash = (type: 'ok' | 'err', msg: string) => {
    setFeedback({ type, msg })
    setTimeout(() => setFeedback(null), 4000)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/series/${tmdb_id}`)
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'فشل جلب البيانات')
      
      setSeries(data.series)
      setSeasons(data.seasons || [])
      
      // Set next season number
      const maxSeason = data.seasons?.length > 0 
        ? Math.max(...data.seasons.map((s: Season) => s.season_number))
        : 0
      setSeasonNumber(maxSeason + 1)
    } catch (e) {
      flash('err', e instanceof Error ? e.message : 'خطأ في جلب البيانات')
    } finally {
      setLoading(false)
    }
  }, [tmdb_id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const addSeason = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    try {
      const res = await fetch(`/api/admin/series/${tmdb_id}/seasons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          season_number: seasonNumber,
          name: seasonName || `Season ${seasonNumber}`,
          overview: seasonOverview,
          air_date: seasonAirDate || null,
          episode_count: seasonEpisodeCount || 0,
        }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'فشل الإضافة')

      flash('ok', `تم إضافة الموسم ${seasonNumber}`)
      
      // Reset form
      setSeasonNumber(seasonNumber + 1)
      setSeasonName('')
      setSeasonOverview('')
      setSeasonAirDate('')
      setSeasonEpisodeCount(0)
      
      fetchData()
    } catch (e) {
      flash('err', e instanceof Error ? e.message : 'خطأ في الإضافة')
    } finally {
      setAdding(false)
    }
  }

  const deleteSeason = async (id: number, seasonNum: number) => {
    if (!confirm(`هل أنت متأكد من حذف الموسم ${seasonNum}؟`)) return
    
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/series/${tmdb_id}/seasons`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ season_id: id }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'فشل الحذف')

      flash('ok', `تم حذف الموسم ${seasonNum}`)
      fetchData()
    } catch (e) {
      flash('err', e instanceof Error ? e.message : 'خطأ في الحذف')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader size={32} className="animate-spin text-purple-400" />
      </div>
    )
  }

  if (!series) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-zinc-500">
        المسلسل غير موجود
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/admin/series')}
          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-zinc-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Tv className="text-purple-400" /> {series.name_ar || series.name_en}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">إدارة المواسم</p>
        </div>
      </div>

      {feedback && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${feedback.type === 'ok' ? 'bg-emerald-950/40 border border-emerald-700/40 text-emerald-300' : 'bg-rose-950/40 border border-rose-700/40 text-rose-300'}`}>
          {feedback.msg}
        </div>
      )}

      {/* Series Info */}
      <div className="flex items-start gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
        {series.poster_path && (
          <img
            src={`/tmdb/w200${series.poster_path}`}
            alt={series.name_ar || series.name_en || ''}
            className="w-24 h-36 object-cover rounded-lg shadow-lg"
          />
        )}
        <div className="flex-1 space-y-2">
          <h2 className="text-xl font-bold text-white">{series.name_ar || series.name_en}</h2>
          {series.overview_ar && (
            <p className="text-sm text-zinc-400 line-clamp-3">{series.overview_ar}</p>
          )}
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <Calendar size={12} /> {series.first_air_year}
            </span>
            <span className="flex items-center gap-1">
              <Layers size={12} /> {seasons.length} موسم
            </span>
          </div>
        </div>
      </div>

      {/* Add Season Form */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
          <Plus className="text-purple-400" />
          إضافة موسم جديد
        </h2>
        <form onSubmit={addSeason} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">رقم الموسم</label>
            <input
              type="number"
              value={seasonNumber}
              onChange={(e) => setSeasonNumber(Number(e.target.value))}
              min="0"
              required
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-purple-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">الاسم (اختياري)</label>
            <input
              type="text"
              value={seasonName}
              onChange={(e) => setSeasonName(e.target.value)}
              placeholder={`Season ${seasonNumber}`}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-purple-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">تاريخ العرض (اختياري)</label>
            <input
              type="date"
              value={seasonAirDate}
              onChange={(e) => setSeasonAirDate(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-purple-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">عدد الحلقات</label>
            <input
              type="number"
              value={seasonEpisodeCount}
              onChange={(e) => setSeasonEpisodeCount(Number(e.target.value))}
              min="0"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-purple-500 outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-zinc-400 mb-1">الوصف (اختياري)</label>
            <textarea
              value={seasonOverview}
              onChange={(e) => setSeasonOverview(e.target.value)}
              rows={3}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-purple-500 outline-none resize-none"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={adding}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {adding ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
              {adding ? 'جاري الإضافة...' : 'إضافة الموسم'}
            </button>
          </div>
        </form>
      </div>

      {/* Seasons List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <Layers className="text-purple-400" />
            المواسم ({seasons.length})
          </h2>
        </div>
        {seasons.length === 0 ? (
          <div className="px-6 py-12 text-center text-zinc-500">لا توجد مواسم مضافة بعد</div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {seasons.map((season) => (
              <div key={season.id} className="px-6 py-4 hover:bg-zinc-800/50 transition-colors flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="inline-flex items-center gap-1 text-sm font-bold bg-purple-500/10 px-2 py-1 rounded text-purple-400 border border-purple-500/20">
                      الموسم {season.season_number}
                    </span>
                    <span className="text-sm font-semibold text-zinc-200">
                      {season.name || `Season ${season.season_number}`}
                    </span>
                  </div>
                  {season.overview && (
                    <p className="text-xs text-zinc-500 line-clamp-2 mb-2">{season.overview}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-zinc-600">
                    {season.air_date && (
                      <span className="flex items-center gap-1">
                        <Calendar size={10} /> {season.air_date}
                      </span>
                    )}
                    <span>{season.episode_count || 0} حلقة</span>
                  </div>
                </div>
                <button
                  onClick={() => deleteSeason(season.id, season.season_number)}
                  disabled={deleting === season.id}
                  className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors text-zinc-500 disabled:opacity-50"
                  title="حذف"
                >
                  {deleting === season.id ? (
                    <Loader size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
