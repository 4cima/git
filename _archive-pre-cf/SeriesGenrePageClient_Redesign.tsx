'use client'

// REDESIGNED VERSION - TRIAL FOR /series/genres/comedy ONLY
// DO NOT USE FOR OTHER GENRE PAGES YET

import { useState, useEffect, useCallback, useRef } from 'react'
import { Tv, Home, ChevronRight, TrendingUp } from 'lucide-react'
import { MovieCard } from '@/components/features/media/MovieCard'
import { getGenreColor } from '@/utils/genreColors'
import { useResponsiveGrid } from '@/hooks/useResponsiveGrid'
import Link from 'next/link'

const SORT_OPTIONS = [
  { value: 'popularity',   order: 'desc', label: 'الأكثر شهرة',     icon: '🔥' },
  { value: 'vote_average', order: 'desc', label: 'الأعلى تقييماً',  icon: '⭐' },
  { value: 'vote_count',   order: 'desc', label: 'الأكثر تقييماً',  icon: '📊' },
  { value: 'first_air_year', order: 'desc', label: 'الأحدث',       icon: '📅' },
  { value: 'first_air_year', order: 'asc',  label: 'الأقدم',       icon: '🕰️' },
]

// Genre descriptions for SEO
const GENRE_DESCRIPTIONS: Record<string, string> = {
  'comedy': 'استمتع بأفضل المسلسلات الكوميدية - من الكوميديا الخفيفة إلى السوداء، اكتشف أروع المسلسلات التي ستجعلك تضحك حتى البكاء',
  'drama': 'اكتشف عالم الدراما المؤثرة - قصص إنسانية عميقة ومسلسلات تأخذك في رحلة عاطفية لا تُنسى',
  'action': 'استعد للإثارة والمغامرة - أفضل مسلسلات الأكشن المليئة بالمشاهد الحماسية والتشويق المستمر'
}

// Related genres mapping
const RELATED_GENRES: Record<string, Array<{slug: string, name: string, icon: string}>> = {
  'comedy': [
    { slug: 'drama', name: 'دراما', icon: '🎭' },
    { slug: 'romance', name: 'رومانسية', icon: '💕' },
    { slug: 'family', name: 'عائلي', icon: '👨‍👩‍👧‍👦' },
    { slug: 'animation', name: 'رسوم متحركة', icon: '🎨' }
  ],
  'drama': [
    { slug: 'romance', name: 'رومانسية', icon: '💕' },
    { slug: 'crime', name: 'جريمة', icon: '🔍' },
    { slug: 'thriller', name: 'إثارة', icon: '🔪' },
    { slug: 'mystery', name: 'غموض', icon: '❓' }
  ],
  'action': [
    { slug: 'thriller', name: 'إثارة', icon: '🔪' },
    { slug: 'crime', name: 'جريمة', icon: '🔍' },
    { slug: 'adventure', name: 'مغامرة', icon: '🗺️' },
    { slug: 'sci-fi', name: 'خيال علمي', icon: '🚀' }
  ]
}

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
  const [totalLoaded, setTotalLoaded] = useState(initialSeries.length)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const observerTarget = useRef<HTMLDivElement>(null)
  const sortBarRef = useRef<HTMLDivElement>(null)
  const [isSortBarSticky, setIsSortBarSticky] = useState(false)
  const itemsPerPage = useResponsiveGrid(12)
  const SKELETON_COUNT = 24

  const genreColorScheme = getGenreColor(genre.name_ar || genre.name_en)
  const genreDescription = GENRE_DESCRIPTIONS[slug] || ''
  const relatedGenres = RELATED_GENRES[slug] || []

  // Sticky sort bar on scroll (mobile)
  useEffect(() => {
    const handleScroll = () => {
      if (sortBarRef.current) {
        const rect = sortBarRef.current.getBoundingClientRect()
        setIsSortBarSticky(rect.top <= 80)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Fetch series
  useEffect(() => {
    // Skip initial fetch if we already have data from SSR
    if (page === 1 && sort === 'popularity' && order === 'desc' && content.length > 0) {
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
    if (isFirstPage) {
      setLoading(true)
      setIsTransitioning(true)
    } else {
      setLoadingMore(true)
    }
    
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
        
        if (isFirstPage) {
          setTotalLoaded(newContent.length)
        } else {
          setTotalLoaded(prev => prev + newContent.length)
        }
        
        // Smooth transition
        setTimeout(() => setIsTransitioning(false), 300)
      })
      .catch(err => {
        if (!cancelled) {
          console.error('Failed to fetch series:', err)
          setContent(prev => isFirstPage ? [] : prev)
          setError('فشل تحميل المسلسلات. حاول مرة أخرى.')
          setIsTransitioning(false)
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
    setTotalLoaded(0)
  }, [])

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sort && o.order === order)?.label || 'الأكثر شهرة'

  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-12">
      <div className="page-container">
        {/* FEATURE 4: Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-zinc-400 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-cyan-400 transition-colors flex items-center gap-1">
            <Home className="w-4 h-4" />
            <span>الرئيسية</span>
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link href="/series" className="hover:text-cyan-400 transition-colors">
            مسلسلات
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-white font-semibold">{genre.name_ar}</span>
        </nav>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-3">
            <div className={`w-4 h-4 rounded-full ${genreColorScheme.bg} ${genreColorScheme.border} border-2 ${genreColorScheme.glow} shadow-xl`} />
            <h1 className={`text-4xl md:text-6xl font-black ${genreColorScheme.text} drop-shadow-lg`}>
              مسلسلات {genre.name_ar}
            </h1>
          </div>
          
          {/* FEATURE 3: Genre Description/SEO Block */}
          {genreDescription && (
            <p className="text-base md:text-lg text-zinc-300 leading-relaxed max-w-3xl">
              {genreDescription}
            </p>
          )}
          
          {!genreDescription && (
            <p className="text-lg text-zinc-400">
              {genre.name_en && genre.name_en !== genre.name_ar && (
                <span>{genre.name_en} • </span>
              )}
              استكشف جميع المسلسلات
            </p>
          )}
        </div>

        {/* FEATURE 5: Active Filter Indicator + Sort Options */}
        <div className="mb-6">
          {content.length > 0 && !loading && (
            <div className="flex items-center gap-2 text-sm text-zinc-400 mb-3">
              <TrendingUp className="w-4 h-4" />
              <span>
                {totalLoaded} مسلسل • مُرتب: {currentSortLabel}
              </span>
            </div>
          )}
          
          {/* FEATURE 8: Sticky Sort Bar (mobile) */}
          <div 
            ref={sortBarRef}
            className={`flex items-center gap-2 flex-wrap transition-all ${
              isSortBarSticky ? 'md:static fixed top-16 left-0 right-0 z-40 bg-black/95 backdrop-blur-xl px-4 py-3 shadow-lg' : ''
            }`}
          >
            {SORT_OPTIONS.map((option, idx) => (
              <button
                key={`${option.value}-${option.order}-${idx}`}
                onClick={() => resetAndFetch(() => { setSort(option.value); setOrder(option.order as 'asc' | 'desc') })}
                className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
                  sort === option.value && order === option.order
                    ? 'bg-cyan-500 text-white border-2 border-cyan-400 shadow-lg scale-105'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:scale-105 border-2 border-transparent'
                }`}
                aria-label={`ترتيب حسب ${option.label}`}
              >
                {option.icon} {option.label}
              </button>
            ))}
          </div>
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

        {/* FEATURE 1: Loading State with Text */}
        {/* FEATURE 10: Smooth Transition */}
        {loading ? (
          <div>
            <div className="flex items-center justify-center py-8 mb-6">
              <div className="flex flex-col items-center gap-3 text-zinc-400">
                <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-lg font-bold">نحمّل المحتوى...</span>
              </div>
            </div>
            <div className="grid-responsive gap-4">
              {[...Array(SKELETON_COUNT)].map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden bg-zinc-900/20 border border-zinc-800/60 animate-pulse">
                  <div className="aspect-[2/3] w-full bg-zinc-800" />
                  <div className="p-2.5 h-[52px] flex flex-col justify-center gap-2">
                    <div className="h-3 bg-zinc-800 rounded w-3/4" />
                    <div className="h-2 bg-zinc-800 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : content.length > 0 ? (
          <>
            {/* FEATURE 7: Enhanced Poster Cards with transition */}
            <div 
              className={`grid-responsive gap-4 transition-opacity duration-300 ${isTransitioning ? 'opacity-50' : 'opacity-100'}`} 
              suppressHydrationWarning
            >
              {content.map((item: any, index: number) => (
                <MovieCard key={item.id} movie={item} index={index} />
              ))}
            </div>

            <div ref={observerTarget} className="h-10 mt-6"></div>

            {/* FEATURE 6: Load More Polish with Progress */}
            {loadingMore && (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <div className="flex items-center gap-3 text-zinc-400">
                  <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-bold">جاري التحميل...</span>
                </div>
              </div>
            )}
            
            {!hasMore && content.length > 20 && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="inline-block px-6 py-3 bg-zinc-800/50 rounded-full border border-zinc-700/50">
                    <p className="text-zinc-400 text-sm font-semibold">
                      ✨ وصلت للنهاية • تم عرض {totalLoaded} مسلسل
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* FEATURE 2: Better Empty State with Related Genres */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-6">
              <Tv className="w-24 h-24 text-zinc-700 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-zinc-300 mb-2">لا توجد مسلسلات في هذا التصنيف حالياً</h2>
              <p className="text-zinc-500">عُد لاحقاً - نضيف محتوى جديد باستمرار</p>
            </div>
            
            {relatedGenres.length > 0 && (
              <div className="mt-8 w-full max-w-2xl">
                <h3 className="text-lg font-bold text-zinc-400 mb-4">جرب التصنيفات التالية:</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {relatedGenres.map(related => {
                    const relatedColorScheme = getGenreColor(related.name)
                    return (
                      <Link
                        key={related.slug}
                        href={`/series/genres/${related.slug}`}
                        className={`p-4 rounded-xl border-2 ${relatedColorScheme.border} ${relatedColorScheme.bg} bg-opacity-10 hover:bg-opacity-20 transition-all hover:scale-105`}
                      >
                        <div className="text-3xl mb-2">{related.icon}</div>
                        <div className={`text-sm font-bold ${relatedColorScheme.text}`}>{related.name}</div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* FEATURE 9: Related Genres Section (at bottom after content) */}
        {content.length > 0 && relatedGenres.length > 0 && (
          <div className="mt-16 pt-12 border-t border-zinc-800">
            <h2 className="text-2xl font-bold text-zinc-200 mb-6 flex items-center gap-2">
              <span>تصنيفات مشابهة</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedGenres.map(related => {
                const relatedColorScheme = getGenreColor(related.name)
                return (
                  <Link
                    key={related.slug}
                    href={`/series/genres/${related.slug}`}
                    className={`group p-6 rounded-2xl border-2 ${relatedColorScheme.border} ${relatedColorScheme.bg} bg-opacity-10 hover:bg-opacity-25 transition-all hover:scale-105 hover:shadow-2xl`}
                  >
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{related.icon}</div>
                    <div className={`text-base font-bold ${relatedColorScheme.text}`}>{related.name}</div>
                    <div className="text-xs text-zinc-500 mt-1">استكشف المزيد</div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
