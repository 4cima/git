'use client'

import { useState, useEffect, useCallback, useRef, Fragment } from 'react'
import Link from 'next/link'
import { Film, ChevronLeft } from 'lucide-react'
import { MovieCard } from '@/components/features/media/MovieCard'
import { getGenreColor } from '@/utils/genreColors'
import { AdFrame } from '@/components/features/system/AdsterraBanner'
import { MobileStickyAd, DesktopOnly } from '@/components/features/system/MobileStickyAd'
import { Footer } from '@/components/layout/Footer'
import { AdInRowCard, AD_EVERY_N_CARDS } from './HomeAdCard'
import { getAdByNum } from '@/data/ads/4cima.com'
import { LISTING_PAGE_SIZE } from '@/lib/listing-config'

/* ===== إعلانات صفحة التصنيف — أرقام موحّدة من src/data/ads/4cima.com (نظام موحّد لكل صفحات القوائم) =====
   1: 728×90 هيدر | 2: 300×250 عمود جانبي | 3: 160×600 سكرايبر ديسكتوب
   4: 468×60 فاصل قبل الفوتر | 5: 160×300 كارت داخل الجريد (AdInRowCard)
   6: 320×50 شريط الموبايل الثابت (MobileStickyAd) */
const AD_HEADER = getAdByNum(1)! // 728×90
const AD_SIDE_RECT = getAdByNum(2)! // 300×250
const AD_SIDE_SKY = getAdByNum(3)! // 160×600
const AD_FOOTER_MID = getAdByNum(4)! // 468×60

const SORT_OPTIONS = [
  { value: 'popularity',   order: 'desc', label: 'الأكثر شهرة',     icon: '🔥' },
  { value: 'vote_average', order: 'desc', label: 'الأعلى تقييماً',  icon: '⭐' },
  { value: 'vote_count',   order: 'desc', label: 'الأكثر تقييماً',  icon: '📊' },
  { value: 'release_year', order: 'desc', label: 'الأحدث',         icon: '📅' },
  { value: 'release_year', order: 'asc',  label: 'الأقدم',         icon: '🕰️' },
]

interface MovieGenrePageClientProps {
  genre: any
  slug: string
  initialMovies: any[]
  initialHasMore: boolean
  /** مسار API مخصص للتحميل اللانهائي (افتراضي: /api/genres/{slug}) — تستخدمه صفحة /movies/arabic */
  listingPath?: string
}

export function MovieGenrePageClient({ genre, slug, initialMovies, initialHasMore, listingPath }: MovieGenrePageClientProps) {

  const [content, setContent] = useState<any[]>(initialMovies)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  /* تحديث بدون قفز: عند ترتيب/تغيير والمحتوى معروض يبقى مكانه + شريط رفيع */
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState('popularity')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  /* إعادة المحاولة: زيادة الرقم تجبر الـeffect على العمل حتى لو نفس الصفحة/الترتيب */
  const [retryNonce, setRetryNonce] = useState(0)

  const observerTarget = useRef<HTMLDivElement>(null)
  const SKELETON_COUNT = 24

  const genreColorScheme = getGenreColor(genre.name_ar || genre.name_en)

  // Fetch movies
  useEffect(() => {
    // Skip initial fetch if we already have data from SSR (unless retry requested)
    if (retryNonce === 0 && page === 1 && sort === 'popularity' && order === 'desc' && content.length > 0) {
      return
    }
    
    let cancelled = false
    
    const params = new URLSearchParams({
      type: 'movie',
      page: page.toString(),
      limit: LISTING_PAGE_SIZE.toString(),
      sort,
      order
    })

    const isFirstPage = page === 1
    if (isFirstPage) {
      // محتوى معروض؟ حدّث مكانه بشريط رفيع (لا سكبور — لا قفز)
      if (content.length > 0) setRefreshing(true)
      else setLoading(true)
    }
    else setLoadingMore(true)
    
    setError(null)
    
    fetch(`${listingPath ?? `/api/genres/${slug}`}?${params}`)

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
          console.error('Failed to fetch movies:', err)
          // نحتفظ بالمحتوى المعروض — لا نسقطه (يمنع القفز)
          setError('فشل تحميل الأفلام. حاول مرة أخرى.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
          setLoadingMore(false)
          setRefreshing(false)
        }
      })
    
    return () => { cancelled = true }
  }, [slug, sort, order, page, initialMovies.length, listingPath, retryNonce])

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore && !refreshing) {
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
  }, [hasMore, loading, loadingMore, refreshing])

  // Reset to page 1 when filters change — مع الإبقاء على المحتوى المعروض
  const resetAndFetch = useCallback((callback: () => void) => {
    callback()
    setPage(1)
    setError(null)
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-20 pb-12">
      <div className="page-container">
        {/* بنر 728×90 — نظام AdFrame */}
        <div className="mb-6 flex justify-center">
          <AdFrame ad={AD_HEADER} variant="x" />
        </div>

        {/* مسار التنقل */}
        <nav aria-label="مسار التنقل" className="mb-5 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
          <Link href="/" className="transition-colors hover:text-zinc-300">الرئيسية</Link>
          <span aria-hidden="true">/</span>
          <Link href="/genres" className="transition-colors hover:text-zinc-300">التصنيفات</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/genres/${slug}`} className="transition-colors hover:text-zinc-300">{genre.name_ar}</Link>
          <span aria-hidden="true">/</span>
          <span className="font-bold text-red-400">أفلام</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
            <div className={`w-3.5 h-3.5 rounded-full ${genreColorScheme.bg} ${genreColorScheme.border} border-2 ${genreColorScheme.glow} shadow-xl`} />
            <h1 className={`text-4xl md:text-6xl font-black ${genreColorScheme.text} drop-shadow-lg`}>
              أفلام {genre.name_ar}
            </h1>
            {genre.name_en && genre.name_en !== genre.name_ar && (
              <span className="text-lg font-bold text-zinc-500">{genre.name_en}</span>
            )}
          </div>
          <p className="mb-5 text-lg text-zinc-400">استكشف جميع أفلام {genre.name_ar} المترجمة</p>

          {/* تنقّل سريع: نظرة عامة + نظير المسلسلات */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/genres/${slug}`}
              className="rounded-xl border border-zinc-700/60 bg-slate-900/60 px-4 py-2 text-sm font-bold text-zinc-300 transition-all duration-300 hover:border-zinc-500 hover:text-white"
            >
              نظرة عامة على {genre.name_ar}
            </Link>
            <Link
              href={`/series/genres/${slug}`}
              className="group flex items-center gap-2 rounded-xl border border-blue-500/25 bg-blue-600/10 px-4 py-2 text-sm font-bold text-blue-300 transition-all duration-300 hover:border-blue-500/60 hover:bg-blue-600/25"
            >
              <span>مسلسلات {genre.name_ar}</span>
              <ChevronLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
            </Link>
          </div>
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {SORT_OPTIONS.map((option, idx) => (
            <button
              key={`${option.value}-${option.order}-${idx}`}
              onClick={() => resetAndFetch(() => { setSort(option.value); setOrder(option.order as 'asc' | 'desc') })}
              className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
                sort === option.value && order === option.order
                  ? 'bg-red-500 text-white border-2 border-red-400 shadow-lg shadow-red-900/40'
                  : 'bg-slate-900/60 text-zinc-400 hover:bg-slate-800 border-2 border-transparent'
              }`}
              aria-label={`ترتيب حسب ${option.label}`}
            >
              {option.icon} {option.label}
            </button>
          ))}
        </div>

        {/* المنطق الموحد: شبكة الأعمال + العمود الجانبي الإعلاني (نفس نظام صفحات الأقسام) */}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">

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
              onClick={() => setRetryNonce(n => n + 1)}
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
            {/* شبكة ثابتة: مساحة محجزة + شريط تحديث رفيع (لا تغيّر ارتفاعها) */}
            <div className="relative min-h-[320px]">
              {refreshing && (
                <div className="absolute top-0 left-0 right-0 z-20 h-0.5 overflow-hidden rounded-full bg-slate-800/80" aria-hidden="true">
                  <div className="h-full w-1/2 rounded-full bg-gradient-to-l from-red-500 via-amber-400 to-red-500 animate-pulse" />
                </div>
              )}
            <div className="grid-responsive gap-4" suppressHydrationWarning>
              {content.map((item: any, index: number) => (
                <Fragment key={item.id}>
                  <MovieCard key={item.id} movie={item} index={index} />
                  {(index + 1) % AD_EVERY_N_CARDS === 0 && (
                    <div className="flex justify-center">
                      <AdInRowCard pos={`gm-${index + 1}`} />
                    </div>
                  )}
                </Fragment>
              ))}
            </div>
            </div>

            <div ref={observerTarget} className="h-10 mt-6"></div>

            {loadingMore && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3 text-zinc-400">
                  <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-bold">جاري التحميل...</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <Film className="w-16 h-16 text-zinc-700 mb-4" />
            <p className="text-xl text-zinc-400">لا توجد أفلام في هذا التصنيف</p>
          </div>
        )}

          </div>

          {/* العمود الجانبي (يسار في RTL) — لاصق أثناء السكرول:
              إعلان 2 (300×250) دائمًا + إعلان 3 (160×600) ديسكتوب فقط */}
          <aside className="flex w-full flex-col items-center gap-6 lg:w-[300px] lg:shrink-0 lg:sticky lg:top-24 lg:self-start">
            <AdFrame ad={AD_SIDE_RECT} variant="y" />
            <DesktopOnly>
              <div className="w-full">
                <AdFrame ad={AD_SIDE_SKY} variant="y" />
              </div>
            </DesktopOnly>
          </aside>
        </div>

        {/* إعلان 4 (468×60) — فاصل خفيف قبل الفوتر (نفس نظام صفحات الأقسام) */}
        <div className="flex justify-center px-4 py-2 mt-8">
          <AdFrame ad={AD_FOOTER_MID} variant="x" />
        </div>
      </div>

      <div className="pb-12"><Footer /></div>

      {/* شريط الموبايل الثابت — إعلان 6 (320×50) */}
      <MobileStickyAd />
    </div>
  )
}
