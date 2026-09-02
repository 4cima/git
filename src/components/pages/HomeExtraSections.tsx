'use client'

/**
 * HomePageClient — أقسام إضافية للصفحة الرئيسية (8 أقسام ثابتة من كاشات السيرفر)
 * بنفس هوية كروت الرائج تمامًا وبالآلية نفسها: سحب/لمس، أسهم، وعجلة،
 * عرض أول 25 ثم تحميل كسول حتى 100، وإعلان كل 20 كارت.
 */
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Drama, Film, Fingerprint, Flame, Globe, Play, Rocket, Sparkles, Star, Tv } from 'lucide-react'
import { StarIcon } from '../common/StarIcon'
import { getGenreColor, getMediaTypeColor } from '@/utils/genreColors'
import { sanitizeTitle } from '@/utils/textSanitizer'
import { useDragScroll } from '@/hooks/useDragScroll'
import type { MediaItem } from './HomeTrendingSections'
import { AdInRowCard, AD_EVERY_N_CARDS } from './HomeAdCard'

/** عدد الكروت المعروضة أول مرة — نفس رقم الرائج بالظبط */
const EXTRA_PAGE_SIZE = 25

export interface ExtraSectionDef {
  title: string
  icon: 'star' | 'flame' | 'drama' | 'rocket' | 'sparkles' | 'fingerprint' | 'globe'
  browseHref: string
  items: MediaItem[]
}

function SectionIcon({ name }: { name: ExtraSectionDef['icon'] }) {
  switch (name) {
    case 'star':
      return <Star className="w-7 h-7 text-yellow-400" />
    case 'flame':
      return <Flame className="w-7 h-7 text-red-500" />
    case 'drama':
      return <Drama className="w-7 h-7 text-pink-400" />
    case 'rocket':
      return <Rocket className="w-7 h-7 text-violet-400" />
    case 'sparkles':
      return <Sparkles className="w-7 h-7 text-amber-300" />
    case 'fingerprint':
      return <Fingerprint className="w-7 h-7 text-emerald-400" />
    case 'globe':
      return <Globe className="w-7 h-7 text-sky-400" />
  }
}

/** كارت بنفس هوية كارت الرائج بالظبط (بوستر + شارات + عنوان) */
function ExtraCard({ item, eager, onCardClick }: { item: MediaItem; eager?: boolean; onCardClick?: (e: React.MouseEvent) => void }) {
  const mediaColorScheme = getMediaTypeColor(item.media_type)
  const genreColorScheme = item.primary_genre ? getGenreColor(item.primary_genre) : null
  const href = item.media_type === 'movie' ? `/movies/${item.slug}` : `/series/${item.slug}`

  return (
    <Link href={href} onClick={onCardClick} className="group flex-shrink-0 w-40 sm:w-48">
      <div className="bg-slate-900/20 border border-slate-800/60 hover:border-slate-700/80 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-slate-950/50 relative h-full">
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

          {/* Top Right - Media Type Badge */}
          <div className="absolute top-2 right-2 z-20">
            <span className={`${mediaColorScheme.bg} ${mediaColorScheme.text} border ${mediaColorScheme.border} px-2 py-1 rounded-lg text-[12px] font-bold backdrop-blur-md shadow-lg`}>
              {mediaColorScheme.label}
            </span>
          </div>

          {/* Bottom Right - Genre Badge */}
          {item.primary_genre && genreColorScheme && (
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
            {item.year ? (
              <span className="px-2 py-1 rounded-lg text-[12px] font-bold backdrop-blur-md shadow-lg bg-slate-700 text-slate-300 border border-slate-600">
                {item.year}
              </span>
            ) : null}
          </div>

          {/* Play Hover Button - Center */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30 pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300 pointer-events-auto">
              <Play className="w-5 h-5 text-white fill-white mr-0.5" />
            </div>
          </div>
        </div>

        {/* Title Section */}
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

type ScrollRef = React.RefObject<HTMLDivElement | null>

/** صف قسم واحد — نفس آلية صفوف الرائج (سحب + أسهم + عرض ثابت 25 + تحميل كسول + إعلان وسط الكروت) */
function ExtraRow({ section }: { section: ExtraSectionDef }) {
  const [displayCount, setDisplayCount] = useState(Math.min(EXTRA_PAGE_SIZE, section.items.length))
  const scrollRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const drag = useDragScroll<HTMLDivElement>()

  const setRef = (el: HTMLDivElement | null) => {
    scrollRef.current = el
    ;(drag.ref as React.MutableRefObject<HTMLDivElement | null>).current = el
  }

  // Intersection Observer → تحميل كسول زي الرائج (من نفس البيانات — بدون ريكوست)
  useEffect(() => {
    if (!endRef.current || displayCount >= section.items.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDisplayCount((prev) => Math.min(prev + EXTRA_PAGE_SIZE, section.items.length))
        }
      },
      { root: scrollRef.current, rootMargin: '400px', threshold: 0 }
    )
    observer.observe(endRef.current)
    return () => observer.disconnect()
  }, [displayCount, section.items])

  const scrollHorizontal = useCallback((ref: ScrollRef, direction: 'left' | 'right') => {
    if (!ref.current) return
    ref.current.scrollBy({ left: direction === 'right' ? 800 : -800, behavior: 'smooth' })
  }, [])

  // عجلة الفأرة → تمرير أفقي زي الرائج
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handleWheel = (e: WheelEvent) => {
      if (!el.contains(e.target as Node)) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  const isMovies = section.browseHref.startsWith('/movies')
  const ctaTitle = isMovies ? 'اذهب لقسم الأفلام' : 'اذهب لقسم المسلسلات'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl font-black text-slate-100 flex items-center gap-3">
          <SectionIcon name={section.icon} />
          <span>{section.title}</span>
        </h2>
        <div className="flex items-center gap-2">
          <Link
            href={section.browseHref}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/60 text-sm font-bold text-slate-300 hover:text-white transition-all"
          >
            عرض الكل
            <ArrowLeft className="w-4 h-4" />
          </Link>
          {/* Navigation Arrows — زي الرائج */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => scrollHorizontal(scrollRef, 'right')}
              className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/60 transition-all hover:scale-110"
              aria-label="Scroll right"
            >
              <ArrowLeft className="w-5 h-5 text-slate-300 rotate-180" />
            </button>
            <button
              onClick={() => scrollHorizontal(scrollRef, 'left')}
              className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/60 transition-all hover:scale-110"
              aria-label="Scroll left"
            >
              <ArrowLeft className="w-5 h-5 text-slate-300" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={setRef}
        onMouseDown={drag.handleMouseDown}
        className="horizontal-scroll -mx-4 px-4 cursor-grab active:cursor-grabbing min-h-[318px] sm:min-h-[356px]"
        tabIndex={0}
        style={{ userSelect: 'none' }}
      >
        <div className="flex gap-4 pb-4" style={{ width: 'max-content' }}>
              {section.items.slice(0, displayCount).map((item, idx) => (
                <Fragment key={`${section.title}-${item.id}`}>
                  <ExtraCard item={item} eager={idx < 6} onCardClick={(e) => { if (drag.consumeIfDragged()) e.preventDefault() }} />
                  {(idx + 1) % AD_EVERY_N_CARDS === 0 && idx + 1 < displayCount && (
                    <AdInRowCard pos={`x-${idx + 1}-${section.browseHref}`} />
                  )}
                </Fragment>
              ))}

              {/* إعلان رقم 5 — في المكان الفاضي أسفل القائمة (زي الرائج) */}
              <AdInRowCard pos={`x-end-${section.browseHref}`} />

              {/* Sentinel for lazy loading */}
              {displayCount < section.items.length && (
                <div ref={endRef} className="flex-shrink-0 w-10" />
              )}

              {/* CTA Card — اذهب للقسم (زي الرائج) */}
              <Link href={section.browseHref} className="group flex-shrink-0 w-40 sm:w-48">
                <div
                  className={`bg-gradient-to-br rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl relative h-full border-2 ${
                    isMovies
                      ? 'from-red-600/20 to-amber-600/20 border-red-500/40 hover:border-red-400 hover:shadow-red-950/50'
                      : 'from-blue-600/20 to-purple-600/20 border-blue-500/40 hover:border-blue-400 hover:shadow-blue-950/50'
                  }`}
                >
                  <div className="aspect-[2/3] w-full relative overflow-hidden flex items-center justify-center p-6">
                    <div className="text-center space-y-4">
                      {isMovies ? (
                        <Film className="w-16 h-16 text-red-400 mx-auto animate-pulse" />
                      ) : (
                        <Tv className="w-16 h-16 text-blue-400 mx-auto animate-pulse" />
                      )}
                      <div>
                        <h3 className={`text-lg font-black mb-2 ${isMovies ? 'text-red-400' : 'text-blue-400'}`}>
                          {ctaTitle}
                        </h3>
                        <p className="text-xs text-slate-300">اكتشف المزيد من الأعمال الرائعة</p>
                      </div>
                      <div
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                          isMovies
                            ? 'bg-red-600/30 border border-red-500/50 text-red-300 group-hover:bg-red-600/50'
                            : 'bg-blue-600/30 border border-blue-500/50 text-blue-300 group-hover:bg-blue-600/50'
                        }`}
                      >
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
      )
}

export function HomeExtraSections({ sections }: { sections: ExtraSectionDef[] }) {
  const visible = sections.filter((s) => s.items.length > 0)
  if (visible.length === 0) return null

  return (
    <>
      {visible.map((section) => (
        <ExtraRow key={section.title} section={section} />
      ))}
    </>
  )
}