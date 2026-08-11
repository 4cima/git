'use client'

import { useState, useEffect, useCallback } from 'react'
import { Film, Plus, Search, Edit, Trash2, X, Save, Loader, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { updateMovie, deleteMovie } from '@/services/adminContentAPI'
import { getGenreColor } from '@/utils/genreColors'
import Link from 'next/link'

const GENRES = [
  { name: 'دراما',        slug: 'drama' },
  { name: 'كوميديا',      slug: 'comedy' },
  { name: 'أكشن',         slug: 'action' },
  { name: 'إثارة',        slug: 'thriller' },
  { name: 'رومانسي',      slug: 'romance' },
  { name: 'خيال علمي',   slug: 'science-fiction' },
  { name: 'رعب',          slug: 'horror' },
  { name: 'جريمة',        slug: 'crime' },
  { name: 'مغامرة',       slug: 'adventure' },
  { name: 'رسوم متحركة', slug: 'animation' },
  { name: 'عائلي',        slug: 'family' },
  { name: 'فانتازيا',     slug: 'fantasy' },
  { name: 'حرب',          slug: 'war' },
] as const

const YEARS = [
  { value: 'all', label: 'كل السنوات' },
  { value: '2026', label: '2026' },
  { value: '2025', label: '2025' },
  { value: '2024', label: '2024' },
  { value: '2023', label: '2023' },
  { value: '2022', label: '2022' },
  { value: '2021', label: '2021' },
  { value: '2020', label: '2020' },
  { value: '2019', label: '2019' },
  { value: '2018', label: '2018' },
]

const RATINGS = [
  { value: 'all',     label: 'كل التقييمات' },
  { value: '9',       label: '⭐ 9+ ممتاز' },
  { value: '8',       label: '⭐ 8+ جيد جداً' },
  { value: '7',       label: '⭐ 7+ جيد' },
  { value: '6',       label: '⭐ 6+ مقبول' },
]

const SORT_OPTIONS = [
  { value: 'popularity',   order: 'desc', label: 'الأكثر شهرة' },
  { value: 'vote_average', order: 'desc', label: 'الأعلى تقييماً' },
  { value: 'release_year', order: 'desc', label: 'الأحدث' },
  { value: 'release_year', order: 'asc',  label: 'الأقدم' },
]

interface Movie {
  id: number
  tmdb_id: number
  title_ar: string | null
  title_en: string | null
  release_year: number | null
  vote_average: number | null
  poster_path: string | null
  genres_json?: string
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
  const [selectedGenre, setSelectedGenre] = useState<string>('all')
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [selectedRating, setSelectedRating] = useState<string>('all')
  const [sortBy, setSortBy] = useState('popularity')
  const [sortOrder, setSortOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [jumpToPage, setJumpToPage] = useState('')
  const [editing,  setEditing]  = useState<EditState | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  const [openDropdown, setOpenDropdown] = useState<'genre'|'year'|'rating'|'sort'|null>(null)
  
  const ITEMS_PER_PAGE = 100

  const fetchMovies = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        sort: sortBy,
        order: sortOrder
      })
      
      if (selectedGenre !== 'all') {
        const genre = GENRES.find(g => g.name === selectedGenre)
        params.set('genre', genre?.slug || selectedGenre)
      }
      if (selectedYear !== 'all') params.set('year', selectedYear)
      if (selectedRating !== 'all') params.set('rating_min', selectedRating)
      if (search.trim()) params.set('search', search.trim())
      
      const res = await fetch(`/api/movies?${params}`)
      const data = await res.json()
      
      setMovies(data.movies || [])
      setTotalPages(data.pagination?.totalPages || 0)
      setTotalCount(data.pagination?.total || 0)
    } catch (e) {
      console.error('Error fetching movies:', e)
      setMovies([])
    } finally {
      setLoading(false)
    }
  }, [page, search, selectedGenre, selectedYear, selectedRating, sortBy, sortOrder])

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

  const handleFilterChange = (callback: () => void) => {
    callback()
    setPage(1)
  }

  const handlePageJump = () => {
    const pageNum = parseInt(jumpToPage)
    if (pageNum >= 1 && pageNum <= totalPages) {
      setPage(pageNum)
      setJumpToPage('')
    }
  }

  const getPageNumbers = () => {
    const pages: number[] = []
    const maxVisible = 5
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (page <= 3) {
        for (let i = 1; i <= maxVisible; i++) pages.push(i)
      } else if (page >= totalPages - 2) {
        for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) pages.push(i)
      } else {
        for (let i = page - 2; i <= page + 2; i++) pages.push(i)
      }
    }
    
    return pages
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Film className="text-cyan-400" /> إدارة الأفلام
          </h1>
          <p className="text-sm text-zinc-400 mt-1">إجمالي {totalCount} فيلم • صفحة {page} من {totalPages}</p>
        </div>
        <Link href="/admin/add-movie" className="bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
          <Plus size={16} /> إضافة فيلم
        </Link>
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

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input type="text" placeholder="بحث عن فيلم..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pr-10 pl-4 text-sm text-zinc-100 focus:border-cyan-500 outline-none" />
          </div>

          {/* Genre Filter */}
          <div className="relative">
            <button onClick={() => setOpenDropdown(openDropdown === 'genre' ? null : 'genre')}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-cyan-500 outline-none flex items-center gap-2 min-w-[140px] justify-between">
              <span>{selectedGenre === 'all' ? 'كل التصنيفات' : selectedGenre}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'genre' ? 'rotate-180' : ''}`} />
            </button>
            {openDropdown === 'genre' && (
              <div className="absolute top-full left-0 mt-1 bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl z-50 min-w-full max-h-[300px] overflow-y-auto">
                <button onClick={() => { handleFilterChange(() => setSelectedGenre('all')); setOpenDropdown(null) }}
                  className={`w-full text-right px-3 py-2 text-sm hover:bg-zinc-800 ${selectedGenre === 'all' ? 'bg-zinc-800 text-cyan-400' : 'text-zinc-100'}`}>
                  كل التصنيفات
                </button>
                {GENRES.map(g => (
                  <button key={g.name} onClick={() => { handleFilterChange(() => setSelectedGenre(g.name)); setOpenDropdown(null) }}
                    className={`w-full text-right px-3 py-2 text-sm hover:bg-zinc-800 whitespace-nowrap ${selectedGenre === g.name ? 'bg-zinc-800 text-cyan-400' : 'text-zinc-100'}`}>
                    {g.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Year Filter */}
          <div className="relative">
            <button onClick={() => setOpenDropdown(openDropdown === 'year' ? null : 'year')}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-cyan-500 outline-none flex items-center gap-2 min-w-[120px] justify-between">
              <span>{YEARS.find(y => y.value === selectedYear)?.label || 'كل السنوات'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'year' ? 'rotate-180' : ''}`} />
            </button>
            {openDropdown === 'year' && (
              <div className="absolute top-full left-0 mt-1 bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl z-50 min-w-full max-h-[300px] overflow-y-auto">
                {YEARS.map(y => (
                  <button key={y.value} onClick={() => { handleFilterChange(() => setSelectedYear(y.value)); setOpenDropdown(null) }}
                    className={`w-full text-right px-3 py-2 text-sm hover:bg-zinc-800 ${selectedYear === y.value ? 'bg-zinc-800 text-cyan-400' : 'text-zinc-100'}`}>
                    {y.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Rating Filter */}
          <div className="relative">
            <button onClick={() => setOpenDropdown(openDropdown === 'rating' ? null : 'rating')}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-cyan-500 outline-none flex items-center gap-2 min-w-[140px] justify-between">
              <span>{RATINGS.find(r => r.value === selectedRating)?.label || 'كل التقييمات'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'rating' ? 'rotate-180' : ''}`} />
            </button>
            {openDropdown === 'rating' && (
              <div className="absolute top-full left-0 mt-1 bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl z-50 min-w-full max-h-[300px] overflow-y-auto">
                {RATINGS.map(r => (
                  <button key={r.value} onClick={() => { handleFilterChange(() => setSelectedRating(r.value)); setOpenDropdown(null) }}
                    className={`w-full text-right px-3 py-2 text-sm hover:bg-zinc-800 ${selectedRating === r.value ? 'bg-zinc-800 text-cyan-400' : 'text-zinc-100'}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <button onClick={() => setOpenDropdown(openDropdown === 'sort' ? null : 'sort')}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-cyan-500 outline-none flex items-center gap-2 min-w-[130px] justify-between">
              <span>{SORT_OPTIONS.find(s => s.value === sortBy && s.order === sortOrder)?.label}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'sort' ? 'rotate-180' : ''}`} />
            </button>
            {openDropdown === 'sort' && (
              <div className="absolute top-full left-0 mt-1 bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl z-50 min-w-full max-h-[300px] overflow-y-auto">
                {SORT_OPTIONS.map((o, idx) => (
                  <button key={idx} onClick={() => { handleFilterChange(() => { setSortBy(o.value); setSortOrder(o.order) }); setOpenDropdown(null) }}
                    className={`w-full text-right px-3 py-2 text-sm hover:bg-zinc-800 whitespace-nowrap ${sortBy === o.value && sortOrder === o.order ? 'bg-zinc-800 text-cyan-400' : 'text-zinc-100'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
          {[...Array(24)].map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden bg-zinc-900/20 border border-zinc-800">
              <div className="aspect-[2/3] w-full bg-zinc-800 animate-pulse" />
              <div className="p-2 h-[48px] flex flex-col gap-1.5">
                <div className="h-3 bg-zinc-800 rounded animate-pulse w-3/4" />
                <div className="h-2 bg-zinc-800 rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : movies.length === 0 ? (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-12 text-center">
          <Film className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">لا توجد أفلام مطابقة</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
          {movies.map((movie) => {
            let primaryGenre = null
            try { const g = JSON.parse(movie.genres_json || '[]'); primaryGenre = g?.[0]?.name_ar || null } catch {}
            
            return (
              <div key={movie.id} className="group relative bg-zinc-900/20 border border-zinc-800/60 hover:border-cyan-500/50 rounded-xl overflow-hidden transition-all duration-300">
                <div className="aspect-[2/3] w-full relative overflow-hidden bg-zinc-950">
                  {movie.poster_path ? (
                    <img src={`/tmdb/w185${movie.poster_path}`} alt={movie.title_ar || movie.title_en || ''}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                      <Film className="w-12 h-12 text-zinc-700" />
                    </div>
                  )}
                  
                  {/* Badges */}
                  {movie.vote_average && movie.vote_average > 0 && (
                    <div className="absolute top-2 left-2 z-20">
                      <span className={`px-2 py-1 rounded-lg text-[9px] font-bold backdrop-blur-md shadow-lg ${
                        movie.vote_average >= 7 ? 'bg-green-600/90 text-white' : 'bg-yellow-600/90 text-white'
                      }`}>
                        ⭐ {Number(movie.vote_average).toFixed(1)}
                      </span>
                    </div>
                  )}
                  
                  {primaryGenre && (
                    <div className="absolute bottom-2 right-2 z-20">
                      <span className={`${getGenreColor(primaryGenre).bg} ${getGenreColor(primaryGenre).text} border ${getGenreColor(primaryGenre).border} px-2 py-1 rounded-lg text-[9px] font-bold backdrop-blur-md shadow-lg`}>
                        {primaryGenre}
                      </span>
                    </div>
                  )}
                  
                  {movie.release_year && (
                    <div className="absolute bottom-2 left-2 z-20">
                      <span className="bg-slate-900/90 text-slate-200 border border-slate-700 px-2 py-1 rounded-lg text-[9px] font-bold backdrop-blur-md shadow-lg">
                        {movie.release_year}
                      </span>
                    </div>
                  )}
                  
                  {/* Edit/Delete overlay */}
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 z-30">
                    <button onClick={() => handleEdit(movie)}
                      className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors" title="تعديل">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(movie)} disabled={deleting === movie.tmdb_id}
                      className="p-3 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50" title="حذف">
                      {deleting === movie.tmdb_id ? <Loader size={18} className="animate-spin" /> : <Trash2 size={18} />}
                    </button>
                  </div>
                </div>
                
                <div className="p-2 h-[48px] flex flex-col justify-center">
                  <h3 className="text-[11px] font-bold text-zinc-200 line-clamp-1 leading-tight">{movie.title_ar || movie.title_en}</h3>
                  {movie.title_en && movie.title_ar && (
                    <p className="text-[9px] text-zinc-400 line-clamp-1 mt-0.5 leading-tight">{movie.title_en}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-sm text-zinc-400">
            صفحة {page} من {totalPages} • {totalCount} فيلم
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(1)} disabled={page === 1}
              className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight size={16} />
            </button>
            
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              السابق
            </button>
            
            <div className="flex items-center gap-1">
              {getPageNumbers().map(pageNum => (
                <button key={pageNum} onClick={() => setPage(pageNum)}
                  className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors ${
                    page === pageNum 
                      ? 'bg-cyan-600 text-white' 
                      : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-100'
                  }`}>
                  {pageNum}
                </button>
              ))}
            </div>
            
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              التالي
            </button>
            
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
              className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft size={16} />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">الانتقال إلى</span>
            <input type="number" min="1" max={totalPages} value={jumpToPage}
              onChange={e => setJumpToPage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePageJump()}
              placeholder={page.toString()}
              className="w-16 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-sm text-zinc-100 text-center focus:border-cyan-500 outline-none" />
            <button onClick={handlePageJump} disabled={!jumpToPage}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              اذهب
            </button>
          </div>
        </div>
      )}
    </div>
  )
}