'use client'

import { useState } from 'react'
import { Search, Film, Plus, Save, Loader, X, Calendar, Star } from 'lucide-react'

interface TMDBMovie {
  id: number
  title: string
  original_title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  genre_ids: number[]
}

interface SearchResult {
  results: TMDBMovie[]
}

export default function AddMoviePage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TMDBMovie[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<TMDBMovie | null>(null)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  const flash = (type: 'ok' | 'err', msg: string) => {
    setFeedback({ type, msg })
    setTimeout(() => setFeedback(null), 4000)
  }

  const searchMovies = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/tmdb/search?type=movie&query=${encodeURIComponent(query)}`)
      const data: SearchResult = await res.json()
      setResults(data.results || [])
    } catch (e) {
      flash('err', 'فشل البحث في TMDB')
    } finally {
      setLoading(false)
    }
  }

  const selectMovie = (movie: TMDBMovie) => {
    setSelected(movie)
    setResults([])
    setQuery('')
  }

  const saveMovie = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'movie',
          tmdb_id: selected.id,
          title_en: selected.title,
          original_title: selected.original_title,
          overview_en: selected.overview,
          poster_path: selected.poster_path,
          backdrop_path: selected.backdrop_path,
          release_date: selected.release_date,
          vote_average: selected.vote_average,
          genre_ids: selected.genre_ids,
        }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'فشل الحفظ')
      
      flash('ok', `تم إضافة "${selected.title}" بنجاح`)
      setSelected(null)
    } catch (e) {
      flash('err', e instanceof Error ? e.message : 'خطأ في الحفظ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          <Film className="text-cyan-400" /> إضافة فيلم جديد
        </h1>
        <p className="text-sm text-zinc-400 mt-1">ابحث في قاعدة TMDB واختر الفيلم لإضافته</p>
      </div>

      {feedback && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${feedback.type === 'ok' ? 'bg-emerald-950/40 border border-emerald-700/40 text-emerald-300' : 'bg-rose-950/40 border border-rose-700/40 text-rose-300'}`}>
          {feedback.msg}
        </div>
      )}

      {/* Search Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <form onSubmit={searchMovies} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              placeholder="ابحث في TMDB..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg py-3 pr-12 pl-4 text-zinc-100 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              dir="rtl"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-6 rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader size={16} className="animate-spin" /> : 'بحث'}
          </button>
        </form>

        {/* Results Grid */}
        {results.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-6">
            {results.map((movie) => (
              <button
                key={movie.id}
                onClick={() => selectMovie(movie)}
                className="group relative aspect-[2/3] rounded-lg overflow-hidden hover:ring-2 ring-cyan-500 transition-all"
              >
                {movie.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                    <Film className="text-zinc-600" size={32} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="font-bold text-sm text-white line-clamp-2">{movie.title}</p>
                  <p className="text-xs text-zinc-400">{movie.release_date?.split('-')[0]}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Movie Editor */}
      {selected && (
        <div className="grid md:grid-cols-[250px_1fr] gap-6 bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          {/* Preview */}
          <div className="space-y-3">
            <div className="aspect-[2/3] rounded-xl overflow-hidden border border-zinc-700 shadow-2xl">
              {selected.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w500${selected.poster_path}`}
                  alt={selected.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                  <Film className="text-zinc-600" size={48} />
                </div>
              )}
            </div>
            <div className="text-xs text-center text-zinc-500 font-mono">
              TMDB ID: {selected.id}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">{selected.title}</h2>
              {selected.original_title !== selected.title && (
                <p className="text-sm text-zinc-500">{selected.original_title}</p>
              )}
              <p className="text-zinc-400 leading-relaxed text-sm">{selected.overview}</p>
              <div className="flex gap-3 text-xs pt-2">
                <span className="flex items-center gap-1 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20 text-cyan-400">
                  <Calendar size={12} /> {selected.release_date}
                </span>
                <span className="flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20 text-yellow-400">
                  <Star size={12} /> {selected.vote_average.toFixed(1)}
                </span>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                onClick={saveMovie}
                disabled={saving}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    حفظ الفيلم
                  </>
                )}
              </button>
              <button
                onClick={() => setSelected(null)}
                disabled={saving}
                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <X size={18} />
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
