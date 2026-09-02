'use client'

/**
 * HomePageClient — Trending Movies & Series sections
 *
 * Extracted from HomePageClient and loaded via `next/dynamic` with `ssr:false`
 * so this heavy chunk (dozens of cards, badges, home actions) does NOT block
 * the critical rendering path → improves INP & initial bundle of the home page.
 */
import { Fragment, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Film, Play, Tv } from 'lucide-react'
import { StarIcon } from '../common/StarIcon'
import { getGenreColor, getMediaTypeColor } from '@/utils/genreColors'
import { sanitizeTitle } from '@/utils/textSanitizer'
import { HomeCardHeart } from './HomeCardHeart'
import { useDragScroll } from '@/hooks/useDragScroll'
import { AdsterraBanner } from '@/components/features/system/AdsterraBanner'
import { getAdByNum } from '@/data/ads/4cima.com'
import { HomeExtraSections, type ExtraSectionDef } from './HomeExtraSections'
import { AdInRowCard, AD_EVERY_N_CARDS } from './HomeAdCard'

/* إعلان رقم 4 (468×60) — شريط تكاملي بين قسمي الأفلام والمسلسلات */
const AD_BETWEEN = getAdByNum(4)!

/* كارت الإعلان رقم 5 (160×300) داخل الصفوف — معرّف في HomeAdCard ومُشارَك مع الأقسام الإضافية */

export interface MediaItem {
  id: number
  tmdb_id?: number
  slug: string
  title: string
  title_ar: string
  title_en: string
  poster_path: string
  backdrop_path: string
  vote_average: number
  overview_ar: string
  year: number
  media_type: 'movie' | 'tv'
  primary_genre: string | null
}

export type CardState = 'neutral' | 'favorite' | 'completed'

interface HomeData {
  trendingMovies: MediaItem[]
  trendingSeries: MediaItem[]
  topRatedMovies?: MediaItem[]
  topRatedSeries?: MediaItem[]
}

export interface HomeTrendingSectionsProps {
  data: HomeData
  isLoggedIn: boolean
  moviesDisplayCount: number
  seriesDisplayCount: number
  onMoviesLoadMore: () => void
  onSeriesLoadMore: () => void
  getCardState: (item: MediaItem) => CardState
  isCardLoading: (item: MediaItem) => boolean
  toggleCardState: (item: MediaItem, e?: React.MouseEvent) => void
}

type ScrollRef = React.RefObject<HTMLDivElement | null>

export function HomeTrendingSections({
  data,
  isLoggedIn,
  moviesDisplayCount,
  seriesDisplayCount,
  onMoviesLoadMore,
  onSeriesLoadMore,
  getCardState,
  isCardLoading,
  toggleCardState,
}: HomeTrendingSectionsProps) {
  const moviesScrollRef = useRef<HTMLDivElement>(null)
  const seriesScrollRef = useRef<HTMLDivElement>(null)
  const moviesEndRef = useRef<HTMLDivElement>(null)
  const seriesEndRef = useRef<HTMLDivElement>(null)

  // Mouse drag-to-scroll (desktop only). Uses mouse events only, so native touch
  // scrolling & wheel scrolling are unaffected.
  const moviesDrag = useDragScroll<HTMLDivElement>()
  const seriesDrag = useDragScroll<HTMLDivElement>()

  const setMoviesRef = (el: HTMLDivElement | null) => {
    moviesScrollRef.current = el
    ;(moviesDrag.ref as React.MutableRefObject<HTMLDivElement | null>).current = el
  }
  const setSeriesRef = (el: HTMLDivElement | null) => {
    seriesScrollRef.current = el
    ;(seriesDrag.ref as React.MutableRefObject<HTMLDivElement | null>).current = el
  }

  // Intersection Observer → lazy-load more Movies
  useEffect(() => {
    if (!moviesEndRef.current || !data || moviesDisplayCount >= data.trendingMovies.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onMoviesLoadMore()
        }
      },
      {
        root: moviesScrollRef.current,
        rootMargin: '400px',
        threshold: 0,
      }
    )

    observer.observe(moviesEndRef.current)
    return () => observer.disconnect()
  }, [moviesDisplayCount, data, onMoviesLoadMore])

  // Intersection Observer → lazy-load more Series
  useEffect(() => {
    if (!seriesEndRef.current || !data || seriesDisplayCount >= data.trendingSeries.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onSeriesLoadMore()
        }
      },
      {
        root: seriesScrollRef.current,
        rootMargin: '400px',
        threshold: 0,
      }
    )

    observer.observe(seriesEndRef.current)
    return () => observer.disconnect()
  }, [seriesDisplayCount, data, onSeriesLoadMore])

  // Scroll helper functions
  const scrollHorizontal = useCallback((ref: ScrollRef, direction: 'left' | 'right') => {
    if (!ref.current) return
    const scrollAmount = 800
    ref.current.scrollBy({
      left: direction === 'right' ? scrollAmount : -scrollAmount,
      behavior: 'smooth',
    })
  }, [])

  // Mouse wheel → horizontal scroll
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (moviesScrollRef.current?.contains(e.target as Node)) {
        e.preventDefault()
        moviesScrollRef.current.scrollLeft += e.deltaY
      } else if (seriesScrollRef.current?.contains(e.target as Node)) {
        e.preventDefault()
        seriesScrollRef.current.scrollLeft += e.deltaY
      }
    }

    const moviesEl = moviesScrollRef.current
    const seriesEl = seriesScrollRef.current

    moviesEl?.addEventListener('wheel', handleWheel, { passive: false })
    seriesEl?.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      moviesEl?.removeEventListener('wheel', handleWheel)
      seriesEl?.removeEventListener('wheel', handleWheel)
    }
  }, [])

  // Keyboard navigation (← →)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && moviesScrollRef.current?.contains(document.activeElement)) {
        e.preventDefault()
        scrollHorizontal(moviesScrollRef, 'left')
      } else if (e.key === 'ArrowRight' && moviesScrollRef.current?.contains(document.activeElement)) {
        e.preventDefault()
        scrollHorizontal(moviesScrollRef, 'right')
      } else if (e.key === 'ArrowLeft' && seriesScrollRef.current?.contains(document.activeElement)) {
        e.preventDefault()
        scrollHorizontal(seriesScrollRef, 'left')
      } else if (e.key === 'ArrowRight' && seriesScrollRef.current?.contains(document.activeElement)) {
        e.preventDefault()
        scrollHorizontal(seriesScrollRef, 'right')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [scrollHorizontal])

  const currentYear = new Date().getFullYear()
  const allMedia = [...(data?.trendingMovies || []), ...(data?.trendingSeries || [])]
  /* تصفية بالتصنيف من نفس حمولة الرئيسية — بدون أي ريكوست إضافي.
     التصنيفات الأكثر بحثًا عند الجمهور العربي/الشرق الأوسط */
  const byGenre = (keywords: string[]) =>
    allMedia
      .filter((i) => !!i.primary_genre && keywords.some((k) => i.primary_genre!.includes(k)))
      .slice(0, 40)

  const extraSections: ExtraSectionDef[] = [
    {
      title: 'الأعلى تقييمًا — أفلام',
      icon: 'star',
      browseHref: '/movies',
      items: (data?.topRatedMovies || []).slice(0, 40),
    },
    {
      title: `أحدث أفلام ${currentYear}`,
      icon: 'calendar',
      browseHref: '/movies',
      items: (data?.trendingMovies || []).filter((m) => m.year === currentYear).slice(0, 40),
    },
    {
      title: 'الأعلى تقييمًا — مسلسلات',
      icon: 'star',
      browseHref: '/series',
      items: (data?.topRatedSeries || []).slice(0, 40),
    },
    {
      title: `أحدث مسلسلات ${currentYear}`,
      icon: 'calendar',
      browseHref: '/series',
      items: (data?.trendingSeries || []).filter((s) => s.year === currentYear).slice(0, 40),
    },
    {
      title: 'الأكشن والمغامرة',
      icon: 'flame',
      browseHref: '/movies',
      items: byGenre(['أكشن', 'مغامرة', 'حرب', 'خيال علمي']),
    },
    {
      title: 'الكوميديا',
      icon: 'laugh',
      browseHref: '/movies',
      items: byGenre(['كوميدي']),
    },
    {
      title: 'الرعب والتشويق',
      icon: 'ghost',
      browseHref: '/movies',
      items: byGenre(['رعب', 'غموض', 'إثارة']),
    },
    {
      title: 'الدراما والرومانسية',
      icon: 'drama',
      browseHref: '/movies',
      items: byGenre(['دراما', 'رومانسي', 'عائلي']),
    },
  ]

  return (
    <>
      {/* Trending Movies Section */}
      {data && data.trendingMovies.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl md:text-3xl font-black text-slate-100 flex items-center gap-3">
              <Film className="w-7 h-7 text-red-500" />
              <span>الأفلام الرائجة</span>
            </h2>
            <div className="flex items-center gap-2">
              {/* Navigation Arrows */}
              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={() => scrollHorizontal(moviesScrollRef, 'right')}
                  className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/60 transition-all hover:scale-110"
                  aria-label="Scroll right"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-300 rotate-180" />
                </button>
                <button
                  onClick={() => scrollHorizontal(moviesScrollRef, 'left')}
                  className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/60 transition-all hover:scale-110"
                  aria-label="Scroll left"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-300" />
                </button>
              </div>
            </div>
          </div>

          <div
            ref={setMoviesRef}
            onMouseDown={moviesDrag.handleMouseDown}
            className="horizontal-scroll -mx-4 px-4 cursor-grab active:cursor-grabbing"
            tabIndex={0}
            style={{ userSelect: 'none' }}
          >
            <div className="flex gap-4 pb-4" style={{ width: 'max-content' }}>
              {data.trendingMovies.slice(0, moviesDisplayCount).map((item, idx) => (
                <Fragment key={`movie-${item.id}`}>
                <Link
                  href={`/movies/${item.slug}`}
                  className="group flex-shrink-0 w-40 sm:w-48"
                  onClick={(e) => { if (moviesDrag.consumeIfDragged()) e.preventDefault() }}
                >
                  <div className="bg-slate-900/20 border border-slate-800/60 hover:border-slate-700/80 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-slate-950/50 relative">
                    {/* Poster with Overlay Badges */}
                    <div className="aspect-[2/3] w-full relative overflow-hidden bg-slate-950">
                      {item.poster_path ? (
                        <>
                          <div className="absolute inset-0 bg-slate-800 animate-pulse" />
                          <img
                            src={`/tmdb/w185${item.poster_path}`}
                            alt={item.title_ar}
                            width={185}
                            height={278}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 relative z-10"
                            loading={idx < 6 ? 'eager' : 'lazy'}
                            decoding="async"
                          />
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 p-4 text-center">
                          <Film className="w-8 h-8 text-slate-700 mb-2" />
                          <span className="text-[10px] text-slate-500">{item.title_ar}</span>
                        </div>
                      )}

                      {/* Dark gradient on hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                      {/* Top Left - Heart Button */}
                      <div className="absolute top-2 left-2 z-40">
                        <HomeCardHeart
                          state={getCardState(item)}
                          loading={isCardLoading(item)}
                          onClick={(e) => toggleCardState(item, e)}
                          isLoggedIn={isLoggedIn}
                        />
                      </div>

                      {/* Top Right - Media Type Badge */}
                      {(() => {
                        const mediaColorScheme = getMediaTypeColor(item.media_type)
                        return (
                          <div className="absolute top-2 right-2 z-20">
                            <span className={`${mediaColorScheme.bg} ${mediaColorScheme.text} border ${mediaColorScheme.border} px-2 py-1 rounded-lg text-[12px] font-bold backdrop-blur-md shadow-lg`}>
                              {mediaColorScheme.label}
                            </span>
                          </div>
                        )
                      })()}

                      {/* Bottom Right - Genre Badge */}
                      {item.primary_genre && (() => {
                        const genreColorScheme = getGenreColor(item.primary_genre)
                        return (
                          <div className="absolute bottom-2 right-2 z-20">
                            <span className={`${genreColorScheme.bg} ${genreColorScheme.text} border ${genreColorScheme.border} px-2 py-1 rounded-lg text-[12px] font-bold backdrop-blur-md shadow-lg`}>
                              {item.primary_genre}
                            </span>
                          </div>
                        )
                      })()}
{/* Bottom Left - Rating & Year */}
                      <div className="absolute bottom-2 left-2 z-20 flex flex-col gap-1">
                        {item.vote_average > 0 && (
                          <span className="flex items-center gap-1 bg-slate-900 text-yellow-400 border border-yellow-500/40 px-2 py-1 rounded-lg backdrop-blur-md shadow-lg">

                            <StarIcon className="w-[11px] h-[11px] fill-yellow-400 shrink-0" />
                            <span className="text-[12px] font-bold">{item.vote_average.toFixed(1)}</span>
                          </span>
                        )}
                        {item.year && (() => {
                          const y = Number(item.year)
                          const currentYear = new Date().getFullYear()

                          let yearStyle = ''
                          if (y === currentYear) {
                            yearStyle = 'bg-purple-500 text-white border border-purple-400 shadow-lg shadow-purple-500/50 animate-pulse'
                          } else if (y >= 2020 && y <= 2025) {
                            yearStyle = 'bg-blue-600 text-white border border-blue-500 shadow-md'
                          } else if (y >= 2010 && y <= 2019) {
                            yearStyle = 'bg-cyan-600 text-white border border-cyan-500 shadow-md'
                          } else if (y >= 2000 && y <= 2009) {
                            yearStyle = 'bg-slate-100 text-slate-900 border border-slate-200 shadow-md font-bold'
                          } else {
                            yearStyle = 'bg-slate-700 text-slate-300 border border-slate-600'
                          }

                          return (
                            <span className={`px-2 py-1 rounded-lg text-[12px] font-bold backdrop-blur-md shadow-lg ${yearStyle}`}>
                              {item.year}
                            </span>
                          )
                        })()}
                      </div>

                      {/* Play Hover Button - Center */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30 pointer-events-none">
                        <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300 pointer-events-auto">
                          <Play className="w-5 h-5 text-white fill-white mr-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Title Section - Reduced Height */}
                    <div className="p-2.5 h-[52px] flex flex-col justify-center relative overflow-hidden">
                      <h3 className="text-[13px] font-bold text-slate-200 line-clamp-1 group-hover:text-amber-400 transition leading-tight">
                        {sanitizeTitle(item.title_ar)}
                      </h3>
                      {item.title_en && (
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-1 leading-tight">
                          {item.title_en}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
                  {(idx + 1) % AD_EVERY_N_CARDS === 0 && idx + 1 < moviesDisplayCount && (
                    <AdInRowCard pos={`m-${idx + 1}`} />
                  )}
                </Fragment>
              ))}

              {/* إعلان رقم 5 — في المكان الفاضي أسفل القائمة */}
              <AdInRowCard pos="m-end" />

              {/* Sentinel for lazy loading */}
              {moviesDisplayCount < data.trendingMovies.length && (
                <div ref={moviesEndRef} className="flex-shrink-0 w-10" />
              )}

              {/* CTA Card - اذهب لقسم الأفلام */}
              <Link
                href="/movies"
                className="group flex-shrink-0 w-40 sm:w-48"
              >
                <div className="bg-gradient-to-br from-red-600/20 to-amber-600/20 border-2 border-red-500/40 hover:border-red-400 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-red-950/50 relative h-full">
                  <div className="aspect-[2/3] w-full relative overflow-hidden flex items-center justify-center p-6">
                    <div className="text-center space-y-4">
                      <Film className="w-16 h-16 text-red-400 mx-auto animate-pulse" />
                      <div>
                        <h3 className="text-lg font-black text-red-400 mb-2">اذهب لقسم الأفلام</h3>
                        <p className="text-xs text-slate-300">اكتشف المزيد من الأفلام الرائعة</p>
                      </div>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-600/30 border border-red-500/50 rounded-lg text-sm font-bold text-red-300 group-hover:bg-red-600/50 transition-colors">
                        <span>عرض الكل</span>
                        <ArrowLeft className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* إعلان رقم 4 — 468×60 بين قسمي الأفلام والمسلسلات (إعلان واحد فقط) بإطار متدرّج */}
      {data && data.trendingMovies.length > 0 && data.trendingSeries.length > 0 && (
        <div className="flex w-full justify-center">
          <div className="rounded-2xl bg-gradient-to-l from-red-500/60 via-slate-700/70 to-blue-500/60 p-[1.5px] shadow-lg shadow-slate-950/70">
            <div className="rounded-[14.5px] bg-slate-950 p-1">
              <AdsterraBanner ad={AD_BETWEEN} />
            </div>
          </div>
        </div>
      )}

      {/* Trending Series Section */}
      {data && data.trendingSeries.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl md:text-3xl font-black text-slate-100 flex items-center gap-3">
              <Tv className="w-7 h-7 text-blue-500" />
              <span>المسلسلات الرائجة</span>
            </h2>
            <div className="flex items-center gap-2">
              {/* Navigation Arrows */}
              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={() => scrollHorizontal(seriesScrollRef, 'right')}
                  className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/60 transition-all hover:scale-110"
                  aria-label="Scroll right"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-300 rotate-180" />
                </button>
                <button
                  onClick={() => scrollHorizontal(seriesScrollRef, 'left')}
                  className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/60 transition-all hover:scale-110"
                  aria-label="Scroll left"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-300" />
                </button>
              </div>
            </div>
          </div>

          <div
            ref={setSeriesRef}
            onMouseDown={seriesDrag.handleMouseDown}
            className="horizontal-scroll -mx-4 px-4 cursor-grab active:cursor-grabbing"
            tabIndex={0}
            style={{ userSelect: 'none' }}
          >
            <div className="flex gap-4 pb-4" style={{ width: 'max-content' }}>
              {data.trendingSeries.slice(0, seriesDisplayCount).map((item, idx) => (
                <Fragment key={`series-${item.id}`}>
                <Link
                  href={`/series/${item.slug}`}
                  className="group flex-shrink-0 w-40 sm:w-48"
                  onClick={(e) => { if (seriesDrag.consumeIfDragged()) e.preventDefault() }}
                >
                  <div className="bg-slate-900/20 border border-slate-800/60 hover:border-slate-700/80 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-slate-950/50 relative">
                    {/* Poster with Overlay Badges */}
                    <div className="aspect-[2/3] w-full relative overflow-hidden bg-slate-950">
                      {item.poster_path ? (
                        <>
                          <div className="absolute inset-0 bg-slate-800 animate-pulse" />
                          <img
                            src={`/tmdb/w185${item.poster_path}`}
                            alt={item.title_ar}
                            width={185}
                            height={278}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 relative z-10"
                            loading="lazy"
                            decoding="async"
                          />
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 p-4 text-center">
                          <Tv className="w-8 h-8 text-slate-700 mb-2" />
                          <span className="text-[10px] text-slate-500">{item.title_ar}</span>
                        </div>
                      )}

                      {/* Dark gradient on hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                      {/* Top Left - Heart Button */}
                      <div className="absolute top-2 left-2 z-40">
                        <HomeCardHeart
                          state={getCardState(item)}
                          loading={isCardLoading(item)}
                          onClick={(e) => toggleCardState(item, e)}
                          isLoggedIn={isLoggedIn}
                        />
                      </div>

                      {/* Top Right - Media Type Badge */}
                      {(() => {
                        const mediaColorScheme = getMediaTypeColor(item.media_type)
                        return (
                          <div className="absolute top-2 right-2 z-20">
                            <span className={`${mediaColorScheme.bg} ${mediaColorScheme.text} border ${mediaColorScheme.border} px-2 py-1 rounded-lg text-[12px] font-bold backdrop-blur-md shadow-lg`}>
                              {mediaColorScheme.label}
                            </span>
                          </div>
                        )
                      })()}

                      {/* Bottom Right - Genre Badge */}
                      {item.primary_genre && (() => {
                        const genreColorScheme = getGenreColor(item.primary_genre)
                        return (
                          <div className="absolute bottom-2 right-2 z-20">
                            <span className={`${genreColorScheme.bg} ${genreColorScheme.text} border ${genreColorScheme.border} px-2 py-1 rounded-lg text-[12px] font-bold backdrop-blur-md shadow-lg`}>
                              {item.primary_genre}
                            </span>
                          </div>
                        )
                      })()}
{/* Bottom Left - Rating & Year */}
                      <div className="absolute bottom-2 left-2 z-20 flex flex-col gap-1">
                        {item.vote_average > 0 && (
                          <span className="flex items-center gap-1 bg-slate-900 text-yellow-400 border border-yellow-500/40 px-2 py-1 rounded-lg backdrop-blur-md shadow-lg">
                            <StarIcon className="w-[11px] h-[11px] fill-yellow-400 shrink-0" />
                            <span className="text-[12px] font-bold">{item.vote_average.toFixed(1)}</span>
                          </span>
                        )}
                        {item.year && (() => {
                          const y = Number(item.year)
                          const currentYear = new Date().getFullYear()

                          let yearStyle = ''
                          if (y === currentYear) {
                            yearStyle = 'bg-purple-500 text-white border border-purple-400 shadow-lg shadow-purple-500/50 animate-pulse'
                          } else if (y >= 2020 && y <= 2025) {
                            yearStyle = 'bg-blue-600 text-white border border-blue-500 shadow-md'
                          } else if (y >= 2010 && y <= 2019) {
                            yearStyle = 'bg-cyan-600 text-white border border-cyan-500 shadow-md'
                          } else if (y >= 2000 && y <= 2009) {
                            yearStyle = 'bg-slate-100 text-slate-900 border border-slate-200 shadow-md font-bold'
                          } else {
                            yearStyle = 'bg-slate-700 text-slate-300 border border-slate-600'
                          }

                          return (
                            <span className={`px-2 py-1 rounded-lg text-[12px] font-bold backdrop-blur-md shadow-lg ${yearStyle}`}>
                              {item.year}
                            </span>
                          )
                        })()}
                      </div>

                      {/* Play Hover Button - Center */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30 pointer-events-none">
                        <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300 pointer-events-auto">
                          <Play className="w-5 h-5 text-white fill-white mr-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Title Section - Reduced Height */}
                    <div className="p-2.5 h-[52px] flex flex-col justify-center relative overflow-hidden">
                      <h3 className="text-[13px] font-bold text-slate-200 line-clamp-1 group-hover:text-amber-400 transition leading-tight">
                        {sanitizeTitle(item.title_ar)}
                      </h3>
                      {item.title_en && (
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-1 leading-tight">
                          {item.title_en}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
                  {(idx + 1) % AD_EVERY_N_CARDS === 0 && idx + 1 < seriesDisplayCount && (
                    <AdInRowCard pos={`s-${idx + 1}`} />
                  )}
                </Fragment>
              ))}

              {/* إعلان رقم 5 — في المكان الفاضي أسفل القائمة */}
              <AdInRowCard pos="s-end" />

              {/* Sentinel for lazy loading */}
              {seriesDisplayCount < data.trendingSeries.length && (
                <div ref={seriesEndRef} className="flex-shrink-0 w-10" />
              )}

              {/* CTA Card - اذهب لقسم المسلسلات */}
              <Link
                href="/series"
                className="group flex-shrink-0 w-40 sm:w-48"
              >
                <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-2 border-blue-500/40 hover:border-blue-400 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-blue-950/50 relative h-full">
                  <div className="aspect-[2/3] w-full relative overflow-hidden flex items-center justify-center p-6">
                    <div className="text-center space-y-4">
                      <Tv className="w-16 h-16 text-blue-400 mx-auto animate-pulse" />
                      <div>
                        <h3 className="text-lg font-black text-blue-400 mb-2">اذهب لقسم المسلسلات</h3>
                        <p className="text-xs text-slate-300">اكتشف المزيد من المسلسلات الرائعة</p>
                      </div>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/30 border border-blue-500/50 rounded-lg text-sm font-bold text-blue-300 group-hover:bg-blue-600/50 transition-colors">
                        <span>عرض الكل</span>
                        <ArrowLeft className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* أقسام إضافية: الأعلى تقييمًا + أحدث إضافات السنة */}
      <HomeExtraSections sections={extraSections} />
    </>
  )
}