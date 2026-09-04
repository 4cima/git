'use client'

/**
 * HomePageClient — قسم الرائج المُدمج + الأقسام الإضافية
 *
 * الهيكلة الجديدة: قسم واحد مختلط (أفلام + مسلسلات بتداخل الكروت: فيلم/مسلسل/فيلم...)
 * بعنوان = الزر المنقسم السينمائي (SectionSplitHeader): زر «أفلام» | كلمة القسم | زر «مسلسلات».
 * نفس المفهوم مستنسَخ لكل الأقسام الإضافية (خيال علمي، أنمي، جريمة، عربي).
 * لا زر «عرض الكل» ولا كارت CTA — الروابط كلها من الزر المنقسم.
 *
 * يُحمَّل عبر `next/dynamic` (ssr:true) خارج مسار الرندر الحرج لتحسين INP وحجم الباندل.
 */
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Film, Flame, Play } from 'lucide-react'
import { StarIcon } from '../common/StarIcon'
import { getGenreColor, getMediaTypeColor } from '@/utils/genreColors'
import { sanitizeTitle } from '@/utils/textSanitizer'
import { getYearBadgeStyle } from '@/utils/yearBadge'
import { HomeCardHeart } from './HomeCardHeart'
import { useDragScroll } from '@/hooks/useDragScroll'
import { HomeExtraSections, type ExtraSectionDef } from './HomeExtraSections'
import { interleave, mapItems } from './homeSectionUtils'
import { AdInRowCard, AD_EVERY_N_CARDS } from './HomeAdCard'
import { SectionSplitHeader, SectionNavArrows } from './SectionSplitHeader'

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
  sciFi?: MediaItem[]
  anime?: MediaItem[]
  crime?: MediaItem[]
  arabicMovies?: MediaItem[]
  arabicSeries?: MediaItem[]
}

export interface HomeTrendingSectionsProps {
  data: HomeData
  isLoggedIn: boolean
  trendingDisplayCount: number
  onTrendingLoadMore: () => void
  getCardState: (item: MediaItem) => CardState
  isCardLoading: (item: MediaItem) => boolean
  toggleCardState: (item: MediaItem, e?: React.MouseEvent) => void
}

type ScrollRef = React.RefObject<HTMLDivElement | null>

/** كارت موحّد للرائج (فيلم أو مسلسل) — نفس هوية الكارت السابقة تمامًا */
function TrendingCard({
  item,
  eager,
  isLoggedIn,
  getCardState,
  isCardLoading,
  toggleCardState,
  onCardClick,
}: {
  item: MediaItem
  eager?: boolean
  isLoggedIn: boolean
  getCardState: (item: MediaItem) => CardState
  isCardLoading: (item: MediaItem) => boolean
  toggleCardState: (item: MediaItem, e?: React.MouseEvent) => void
  onCardClick?: (e: React.MouseEvent) => void
}) {
  const mediaColorScheme = getMediaTypeColor(item.media_type)
  const genreColorScheme = item.primary_genre ? getGenreColor(item.primary_genre) : null
  const href = item.media_type === 'movie' ? `/movies/${item.slug}` : `/series/${item.slug}`

  return (
    <Link href={href} onClick={onCardClick} className="group flex-shrink-0 w-40 sm:w-48">
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
                loading={eager ? 'eager' : 'lazy'}
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

          {/* Top Right - Media Type Badge (فيلم / مسلسل) */}
          <div className="absolute top-2 right-2 z-20">
            <span className={`${mediaColorScheme.bg} ${mediaColorScheme.text} border ${mediaColorScheme.border} px-2 py-1 rounded-lg text-[12px] font-bold backdrop-blur-md shadow-lg`}>
              {mediaColorScheme.label}
            </span>
          </div>

          {/* Bottom Right - Genre Badge */}
          {genreColorScheme && (
            <div className="absolute bottom-2 right-2 z-20">
              <span className={`${genreColorScheme.bg} ${genreColorScheme.text} border ${genreColorScheme.border} px-2 py-1 rounded-lg text-[12px] font-bold backdrop-blur-md shadow-lg`}>
                {item.primary_genre}
              </span>
            </div>
          )}

          {/* Bottom Left - Rating & Year */}
          <div className="absolute bottom-2 left-2 z-20 flex flex-col gap-1">
            {item.vote_average > 0 && (
              <span className="flex items-center gap-1 bg-slate-900 text-yellow-400 border border-yellow-500/40 px-2 py-1 rounded-lg backdrop-blur-md shadow-lg">
                <StarIcon className="w-[11px] h-[11px] fill-yellow-400 shrink-0" />
                <span className="text-[12px] font-bold">{item.vote_average.toFixed(1)}</span>
              </span>
            )}
            {item.year && (
              <span className={`px-2 py-1 rounded-lg text-[12px] font-bold backdrop-blur-md shadow-lg ${getYearBadgeStyle(item.year)}`}>
                {item.year}
              </span>
            )}
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
  )
}

export function HomeTrendingSections({
  data,
  isLoggedIn,
  trendingDisplayCount,
  onTrendingLoadMore,
  getCardState,
  isCardLoading,
  toggleCardState,
}: HomeTrendingSectionsProps) {
  const trendingScrollRef = useRef<HTMLDivElement>(null)
  const trendingEndRef = useRef<HTMLDivElement>(null)

  /* الأقسام الإضافية — تُجلب من /api/home-sections بعد أول رسم (خارج HTML
     الرئيسي لتخفيف حجمه إلى النصف تقريبًا) مع skeleton أثناء التحميل */
  type ExtraRaw = { sciFi?: unknown[]; anime?: unknown[]; crime?: unknown[]; arabicMovies?: unknown[]; arabicSeries?: unknown[] }
  const [extraRaw, setExtraRaw] = useState<ExtraRaw | null>(null)
  const [extraLoading, setExtraLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/home-sections')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: ExtraRaw) => {
        if (!cancelled) {
          setExtraRaw(json)
          setExtraLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setExtraLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Mouse drag-to-scroll (desktop only). Uses mouse events only, so native touch
  // scrolling & wheel scrolling are unaffected.
  const trendingDrag = useDragScroll<HTMLDivElement>()

  const setTrendingRef = (el: HTMLDivElement | null) => {
    trendingScrollRef.current = el
    ;(trendingDrag.ref as React.MutableRefObject<HTMLDivElement | null>).current = el
  }

  /* قسم الرائج الموحّد — أفلام + مسلسلات بتداخل الكروت (فيلم/مسلسل/فيلم...) */
  const trendingItems = interleave([
    ...(data?.trendingMovies || []),
    ...(data?.trendingSeries || []),
  ])

  // Intersection Observer → lazy-load more trending items
  useEffect(() => {
    if (!trendingEndRef.current || !data || trendingDisplayCount >= trendingItems.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onTrendingLoadMore()
        }
      },
      {
        root: trendingScrollRef.current,
        rootMargin: '400px',
        threshold: 0,
      }
    )

    observer.observe(trendingEndRef.current)
    return () => observer.disconnect()
  }, [trendingDisplayCount, data, onTrendingLoadMore, trendingItems.length])


  // Scroll helper functions
  const scrollHorizontal = useCallback((ref: ScrollRef, direction: 'left' | 'right') => {
    if (!ref.current) return
    const scrollAmount = 800
    ref.current.scrollBy({
      left: direction === 'right' ? scrollAmount : -scrollAmount,
      behavior: 'smooth',
    })
  }, [])

  // العجلة (wheel): لا نعترضها إطلاقاً — التمرير الرأسي بالعجلة يبقى يسكرول الصفحة
  // فوق وتحت بشكل طبيعي، والتنقل الأفقي يكون عبر الأسهم/السحب/لوحة المفاتيح فقط.

  // Keyboard navigation (← →)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && trendingScrollRef.current?.contains(document.activeElement)) {
        e.preventDefault()
        scrollHorizontal(trendingScrollRef, 'left')
      } else if (e.key === 'ArrowRight' && trendingScrollRef.current?.contains(document.activeElement)) {
        e.preventDefault()
        scrollHorizontal(trendingScrollRef, 'right')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [scrollHorizontal])

  /* 4 أقسام إضافية — كل قسم مختلط (أفلام + مسلسلات) مع تداخل الكروت
     والزر المنقسم يوصل لصفحتي الأفلام والمسلسلات الخاصة بكل قسم */
  const extraSections: ExtraSectionDef[] = [
    {
      title: 'الخيال العلمي',
      icon: 'rocket',
      labelHref: '/genres/science-fiction',
      moviesHref: '/movies/genres/science-fiction',
      seriesHref: '/series/genres/science-fiction',
      items: interleave(mapItems(extraRaw?.sciFi, 'tv')).slice(0, 100),
    },
    {
      title: 'الأنمي والرسوم المتحركة',
      icon: 'sparkles',
      labelHref: '/genres/animation',
      moviesHref: '/movies/genres/animation',
      seriesHref: '/series/genres/animation',
      items: interleave(mapItems(extraRaw?.anime, 'tv')).slice(0, 100),
    },
    {
      title: 'الجريمة والغموض',
      icon: 'fingerprint',
      labelHref: '/genres/crime',
      moviesHref: '/movies/genres/crime',
      seriesHref: '/series/genres/crime',
      items: interleave(mapItems(extraRaw?.crime, 'movie')).slice(0, 100),
    },
    {
      title: 'عربي',
      icon: 'globe',
      labelHref: '/genres/arabic',
      moviesHref: '/movies/arabic',
      seriesHref: '/series/arabic',
      items: interleave([
        ...mapItems(extraRaw?.arabicMovies, 'movie').slice(0, 50),
        ...mapItems(extraRaw?.arabicSeries, 'tv').slice(0, 50),
      ].slice(0, 100)),
    },
  ]

  /* أسهم التنقل السينمائية (ديسكتوب) — نفس هوية الزر المنقسم */
  const trendingArrows = (
    <div className="hidden md:block">
      <SectionNavArrows scrollRef={trendingScrollRef} />
    </div>
  )

  return (
    <>
      {/* قسم الرائج الموحّد — عنوانه الزر المنقسم السينمائي (أفلام | الرائج | مسلسلات) */}
      {data && trendingItems.length > 0 && (
        <div className="space-y-6">
          <SectionSplitHeader
            label="الرائج"
            labelIcon={<Flame className="w-6 h-6 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]" />}
            moviesHref="/movies"
            seriesHref="/series"
            actions={trendingArrows}
          />

          <div
            ref={setTrendingRef}
            onMouseDown={trendingDrag.handleMouseDown}
            className="horizontal-scroll -mx-4 px-4 cursor-grab active:cursor-grabbing min-h-[318px] sm:min-h-[356px]"
            tabIndex={0}
            style={{ userSelect: 'none' }}
          >
            <div className="flex gap-4 pb-4" style={{ width: 'max-content' }}>
              {trendingItems.slice(0, trendingDisplayCount).map((item, idx) => (
                <Fragment key={`trending-${item.media_type}-${item.id}`}>
                  <TrendingCard
                    item={item}
                    eager={idx < 6}
                    isLoggedIn={isLoggedIn}
                    getCardState={getCardState}
                    isCardLoading={isCardLoading}
                    toggleCardState={toggleCardState}
                    onCardClick={(e) => { if (trendingDrag.consumeIfDragged()) e.preventDefault() }}
                  />
                  {(idx + 1) % AD_EVERY_N_CARDS === 0 && idx + 1 < trendingDisplayCount && (
                    <AdInRowCard pos={`t-${idx + 1}`} />
                  )}
                </Fragment>
              ))}

              {/* إعلان رقم 5 — في المكان الفاضي أسفل القائمة */}
              <AdInRowCard pos="t-end" />

              {/* Sentinel for lazy loading */}
              {trendingDisplayCount < trendingItems.length && (
                <div ref={trendingEndRef} className="flex-shrink-0 w-10" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* الأقسام الإضافية — نفس المفهوم بالضبط (زر منقسم + كروت مختلطة) */}
      <HomeExtraSections sections={extraSections} loading={extraLoading} />
    </>
  )
}
