'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Tv } from 'lucide-react'
import { MovieCard } from '@/components/features/media/MovieCard'
import { getGenreColor } from '@/utils/genreColors'
import { useResponsiveGrid } from '@/hooks/useResponsiveGrid'

const SORT_OPTIONS = [
  { value: 'popularity',   order: 'desc', label: 'الأكثر شهرة',     icon: '🔥' },
  { value: 'vote_average', order: 'desc', label: 'الأعلى تقييماً',  icon: '⭐' },
  { value: 'vote_count',   order: 'desc', label: 'الأكثر تقييماً',  icon: '📊' },
  { value: 'first_air_year', order: 'desc', label: 'الأحدث',       icon: '📅' },
  { value: 'first_air_year', order: 'asc',  label: 'الأقدم',       icon: '🕰️' },
]

interface SeriesGenrePageClientProps {
  genre: any
  slug: string
  initialSeries: any[]
  initialHasMore: boolean
}

export function SeriesGenrePageClient({ genre, slug, initialSeries, initialHasMore }: SeriesGenrePageClientProps) {
  const [content, setContent] = useState<any[]>(initialSeries)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState('popularity')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')

  const observerTarget = useRef<HTMLDivElement>(null)
  const itemsPerPage = useResponsiveGrid(12)
  const SKELETON_COUNT = 24

  const genreColorScheme = getGenreColor(genre.name_ar || genre.name_en)

  // Fetch series
  useEffect(() => {
    // Skip initial fetch if we already have data from SSR
    if (page === 1 && sort === 'popularity' && order === 'desc' && initialSeries.length > 0) {
      return
    }
    
    let cancelled = false
    
    const params = new URLSearchParams({
      type: 'tv',
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
          console.error('Failed to fetch series:', err)
          setContent(prev => isFirstPage ? [] : prev)
          setError('فشل تحميل المسلسلات. حاول مرة أخرى.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
          setLoadingMore(false)
        }
      })
    
    return () => { cancelled = true }
  }, [slug, sort, order, page, itemsPerPage, initialSeries.length])

  // Infinite scroll observer
  useEffect(() => {
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
  }, [hasMore, loading, loadingMore])

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
              مسلسلات {genre.name_ar}
            </h1>
          </div>
          <p className="text-lg text-zinc-400">
            {genre.name_en && genre.name_en !== genre.name_ar && (
              <span>{genre.name_en} • </span>
            )}
            استكشف جميع المسلسلات
          </p>
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

        {/* Content */}
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
            <div className="grid-responsive gap-4" suppressHydrationWarning>
              {content.map((item: any, index: number) => (
                <MovieCard key={item.id} movie={item} index={index} />
              ))}
            </div>

            <div ref={observerTarget} className="h-10 mt-6"></div>

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
            <Tv className="w-16 h-16 text-zinc-700 mb-4" />
            <p className="text-xl text-zinc-400">لا توجد مسلسلات في هذا التصنيف</p>
          </div>
        )}
      </div>
    </div>
  )
}
