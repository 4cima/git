'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Film, Tv, ChevronLeft } from 'lucide-react'
import { MovieCard } from '@/components/features/media/MovieCard'
import { getGenreColor } from '@/utils/genreColors'
import { useResponsiveGrid } from '@/hooks/useResponsiveGrid'

const SORT_OPTIONS = [
  { value: 'popularity',   order: 'desc', label: 'الأكثر شهرة',     icon: '🔥' },
  { value: 'vote_average', order: 'desc', label: 'الأعلى تقييماً',  icon: '⭐' },
  { value: 'vote_count',   order: 'desc', label: 'الأكثر تقييماً',  icon: '📊' },
  { value: 'release_year', order: 'desc', label: 'الأحدث',         icon: '📅' },
  { value: 'release_year', order: 'asc',  label: 'الأقدم',         icon: '🕰️' },
]

interface GenrePageClientProps {
  initialData: any
  slug: string
}

export function GenrePageClient({ initialData, slug }: GenrePageClientProps) {
  // Single-type view state (movie or tv)
  const [content, setContent] = useState<any[]>(initialData.content || [])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(initialData.pagination?.hasMore || false)
  const [page, setPage] = useState(1)
  
  // 'all' view state (two separate preview sections)
  const [moviesPreview, setMoviesPreview] = useState<any[]>([])
  const [seriesPreview, setSeriesPreview] = useState<any[]>([])
  const [moviesHasMore, setMoviesHasMore] = useState(false)
  const [seriesHasMore, setSeriesHasMore] = useState(false)
  const [loadingMoviesPreview, setLoadingMoviesPreview] = useState(false)
  const [loadingSeriesPreview, setLoadingSeriesPreview] = useState(false)
  
  const [contentType, setContentType] = useState<'all' | 'movie' | 'tv'>('all')
  const [sort, setSort] = useState('popularity')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')

  const observerTarget = useRef<HTMLDivElement>(null)
  const itemsPerPage = useResponsiveGrid(12)
  const SKELETON_COUNT = 24

  const genre = initialData.genre
  const genreColorScheme = getGenreColor(genre.name_ar || genre.name_en)

  // Fetch single-type content (movie or tv) with infinite scroll
  useEffect(() => {
    if (contentType === 'all') return // Skip for 'all' view
    
    let cancelled = false
    
    const params = new URLSearchParams({
      type: contentType,
      page: page.toString(),
      limit: itemsPerPage.toString(),
      sort,
      order
    })

    const isFirstPage = page === 1
    if (isFirstPage) setLoading(true)
    else setLoadingMore(true)
    
    setError(null)
    
    fetch(`/api/genres/${slug}?${params}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        if (cancelled) return
        const newContent = data.content || []
        
        // Dedupe by id using functional update
        setContent(prevContent => {
          const combined = isFirstPage ? newContent : [...prevContent, ...newContent]
          const seenIds = new Set<number>()
          return combined.filter((item: any) => {
            if (seenIds.has(item.id)) return false
            seenIds.add(item.id)
            return true
          })
        })
        
        setHasMore(data.pagination?.hasMore || false)
      })
      .catch(err => {
        if (!cancelled) {
          console.error('Failed to fetch genre content:', err)
          setContent(prev => isFirstPage ? [] : prev)
          setError('فشل تحميل المحتوى. حاول مرة أخرى.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
          setLoadingMore(false)
        }
      })
    
    return () => { cancelled = true }
  }, [slug, contentType, sort, order, page, itemsPerPage])

  // Fetch preview sections for 'all' view (one batch each, no infinite scroll)
  useEffect(() => {
    if (contentType !== 'all') return // Skip for single-type views
    
    let cancelled = false
    
    // Fetch movies preview
    setLoadingMoviesPreview(true)
    const moviesParams = new URLSearchParams({
      type: 'movie',
      page: '1',
      limit: itemsPerPage.toString(),
      sort,
      order
    })
    
    fetch(`/api/genres/${slug}?${moviesParams}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => {
        if (!cancelled) {
          setMoviesPreview(data.content || [])
          setMoviesHasMore(data.pagination?.hasMore || false)
        }
      })
      .catch(err => {
        if (!cancelled) console.error('Failed to fetch movies preview:', err)
      })
      .finally(() => {
        if (!cancelled) setLoadingMoviesPreview(false)
      })
    
    // Fetch series preview
    setLoadingSeriesPreview(true)
    const seriesParams = new URLSearchParams({
      type: 'tv',
      page: '1',
      limit: itemsPerPage.toString(),
      sort,
      order
    })
    
    fetch(`/api/genres/${slug}?${seriesParams}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => {
        if (!cancelled) {
          setSeriesPreview(data.content || [])
          setSeriesHasMore(data.pagination?.hasMore || false)
        }
      })
      .catch(err => {
        if (!cancelled) console.error('Failed to fetch series preview:', err)
      })
      .finally(() => {
        if (!cancelled) setLoadingSeriesPreview(false)
      })
    
    return () => { cancelled = true }
  }, [slug, contentType, sort, order, itemsPerPage])

  // Infinite scroll observer (only for single-type views)
  useEffect(() => {
    if (contentType === 'all') return // No infinite scroll in 'all' view
    
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          setPage(prev => prev + 1)
        }
      },
      { threshold: 0.1, rootMargin: '400px' }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) observer.observe(currentTarget)

    return () => {
      if (currentTarget) observer.unobserve(currentTarget)
    }
  }, [contentType, hasMore, loading, loadingMore])

  // Reset to page 1 when filters change
  const resetAndFetch = useCallback((callback: () => void) => {
    callback()
    setPage(1)
    setContent([])
    setError(null)
  }, [])

  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-12">
      <div className="page-container">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-4 h-4 rounded-full ${genreColorScheme.bg} ${genreColorScheme.border} border-2 ${genreColorScheme.glow} shadow-xl`} />
            <h1 className={`text-4xl md:text-6xl font-black ${genreColorScheme.text} drop-shadow-lg`}>
              {genre.name_ar}
            </h1>
          </div>
          <p className="text-lg text-zinc-400">
            {genre.name_en && genre.name_en !== genre.name_ar && (
              <span>{genre.name_en} • </span>
            )}
            استكشف أفضل الأفلام والمسلسلات
          </p>
        </div>

        {/* Content Type Tabs */}
        <div className="flex items-center gap-2 mb-6" role="tablist" aria-label="نوع المحتوى">
          <button
            onClick={() => resetAndFetch(() => setContentType('all'))}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              contentType === 'all'
                ? `${genreColorScheme.bg} ${genreColorScheme.text} border-2 ${genreColorScheme.border} ${genreColorScheme.glow} shadow-lg`
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border-2 border-transparent'
            }`}
            role="tab"
            aria-selected={contentType === 'all'}
            aria-label="عرض كل المحتوى"
          >
            الكل
          </button>
          <button
            onClick={() => resetAndFetch(() => setContentType('movie'))}
            className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
              contentType === 'movie'
                ? `${genreColorScheme.bg} ${genreColorScheme.text} border-2 ${genreColorScheme.border} ${genreColorScheme.glow} shadow-lg`
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border-2 border-transparent'
            }`}
            role="tab"
            aria-selected={contentType === 'movie'}
            aria-label="عرض الأفلام فقط"
          >
            <Film className="w-4 h-4" />
            أفلام
          </button>
          <button
            onClick={() => resetAndFetch(() => setContentType('tv'))}
            className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
              contentType === 'tv'
                ? `${genreColorScheme.bg} ${genreColorScheme.text} border-2 ${genreColorScheme.border} ${genreColorScheme.glow} shadow-lg`
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border-2 border-transparent'
            }`}
            role="tab"
            aria-selected={contentType === 'tv'}
            aria-label="عرض المسلسلات فقط"
          >
            <Tv className="w-4 h-4" />
            مسلسلات
          </button>
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {SORT_OPTIONS.map((option, idx) => (
            <button
              key={`${option.value}-${option.order}-${idx}`}
              onClick={() => resetAndFetch(() => { setSort(option.value); setOrder(option.order as 'asc' | 'desc') })}
              className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
                sort === option.value && order === option.order
                  ? 'bg-cyan-500 text-white border-2 border-cyan-400 shadow-lg'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border-2 border-transparent'
              }`}
              aria-label={`ترتيب حسب ${option.label}`}
            >
              {option.icon} {option.label}
            </button>
          ))}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
            <div className="text-red-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-red-300 text-sm font-bold">{error}</p>
            </div>
            <button 
              onClick={() => setPage(1)}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-300 text-sm font-bold transition-colors"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Content: Two separate sections for 'all' view */}
        {contentType === 'all' ? (
          <div className="space-y-12">
            {/* Movies Section */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-zinc-100 flex items-center gap-3">
                  <Film className="w-6 h-6 text-red-500" />
                  أفلام {genre.name_ar}
                </h2>
                {moviesHasMore && (
                  <button
                    onClick={() => resetAndFetch(() => setContentType('movie'))}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-semibold transition-colors text-zinc-300"
                  >
                    <span>شوف كل الأفلام</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {loadingMoviesPreview ? (
                <div className="grid-responsive gap-4">
                  {[...Array(SKELETON_COUNT)].map((_, i) => (
                    <div key={i} className="rounded-2xl overflow-hidden bg-zinc-900/20 border border-zinc-800/60">
                      <div className="aspect-[2/3] w-full bg-zinc-800 animate-pulse" />
                      <div className="p-2.5 h-[52px] flex flex-col justify-center gap-2">
                        <div className="h-3 bg-zinc-800 rounded animate-pulse w-3/4" />
                        <div className="h-2 bg-zinc-800 rounded animate-pulse w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : moviesPreview.length > 0 ? (
                <div className="grid-responsive gap-4">
                  {moviesPreview.map((item: any, index: number) => (
                    <MovieCard key={item.id} movie={item} index={index} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center bg-zinc-900/20 rounded-xl border border-zinc-800/60">
                  <Film className="w-12 h-12 text-zinc-700 mb-3" />
                  <p className="text-zinc-400">لا توجد أفلام في هذا التصنيف</p>
                </div>
              )}
            </section>

            {/* Series Section */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-zinc-100 flex items-center gap-3">
                  <Tv className="w-6 h-6 text-blue-500" />
                  مسلسلات {genre.name_ar}
                </h2>
                {seriesHasMore && (
                  <button
                    onClick={() => resetAndFetch(() => setContentType('tv'))}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-semibold transition-colors text-zinc-300"
                  >
                    <span>شوف كل المسلسلات</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {loadingSeriesPreview ? (
                <div className="grid-responsive gap-4">
                  {[...Array(SKELETON_COUNT)].map((_, i) => (
                    <div key={i} className="rounded-2xl overflow-hidden bg-zinc-900/20 border border-zinc-800/60">
                      <div className="aspect-[2/3] w-full bg-zinc-800 animate-pulse" />
                      <div className="p-2.5 h-[52px] flex flex-col justify-center gap-2">
                        <div className="h-3 bg-zinc-800 rounded animate-pulse w-3/4" />
                        <div className="h-2 bg-zinc-800 rounded animate-pulse w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : seriesPreview.length > 0 ? (
                <div className="grid-responsive gap-4">
                  {seriesPreview.map((item: any, index: number) => (
                    <MovieCard key={item.id} movie={item} index={index} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center bg-zinc-900/20 rounded-xl border border-zinc-800/60">
                  <Tv className="w-12 h-12 text-zinc-700 mb-3" />
                  <p className="text-zinc-400">لا توجد مسلسلات في هذا التصنيف</p>
                </div>
              )}
            </section>
          </div>
        ) : (
          /* Single-type view (movie or tv) with infinite scroll */
          <>
            {loading ? (
              <div className="grid-responsive gap-4">
                {[...Array(SKELETON_COUNT)].map((_, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden bg-zinc-900/20 border border-zinc-800/60">
                    <div className="aspect-[2/3] w-full bg-zinc-800 animate-pulse" />
                    <div className="p-2.5 h-[52px] flex flex-col justify-center gap-2">
                      <div className="h-3 bg-zinc-800 rounded animate-pulse w-3/4" />
                      <div className="h-2 bg-zinc-800 rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : content.length > 0 ? (
              <>
                <div className="grid-responsive gap-4">
                  {content.map((item: any, index: number) => (
                    <MovieCard key={item.id} movie={item} index={index} />
                  ))}
                </div>

                {/* Infinite scroll trigger */}
                <div ref={observerTarget} className="h-10 mt-6"></div>

                {/* Loading indicator */}
                {loadingMore && (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-3 text-zinc-400">
                      <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm font-bold">جاري التحميل...</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <Film className="w-16 h-16 text-zinc-700 mb-4" />
                <p className="text-xl text-zinc-400">لا توجد نتائج</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
