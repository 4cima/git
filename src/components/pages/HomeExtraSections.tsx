'use client'

/**
 * HomePageClient — أقسام إضافية للصفحة الرئيسية (8 أقسام ثابتة من كاشات السيرفر)
 * بنفس هوية كروت الرائج تمامًا وبالآلية نفسها: سحب/لمس، أسهم، وعجلة،
 * عرض أول 25 ثم تحميل كسول حتى 100، وإعلان كل 20 كارت.
 */
import { Fragment, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Drama, Film, Fingerprint, Flame, Globe, Play, Rocket, Sparkles, Star } from 'lucide-react'
import { StarIcon } from '../common/StarIcon'
import { getGenreColor, getMediaTypeColor } from '@/utils/genreColors'
import { sanitizeTitle } from '@/utils/textSanitizer'
import { useDragScroll } from '@/hooks/useDragScroll'
import type { MediaItem } from './HomeTrendingSections'
import { AdInRowCard, AD_EVERY_N_CARDS } from './HomeAdCard'
import { SectionSplitHeader, SectionNavArrows } from './SectionSplitHeader'

/** عدد الكروت المعروضة أول مرة — نفس رقم الرائج بالظبط */
const EXTRA_PAGE_SIZE = 25

export interface ExtraSectionDef {
  title: string
  icon: 'star' | 'flame' | 'drama' | 'rocket' | 'sparkles' | 'fingerprint' | 'globe'
  /** رابط صفحة القسم المختلط (عنوان القسم + كارت CTA الأخير) */
  labelHref?: string
  /** رابط صفحة أفلام القسم (زر «أفلام» في الزر المنقسم) */
  moviesHref: string
  /** رابط صفحة مسلسلات القسم (زر «مسلسلات» في الزر المنقسم) */
  seriesHref: string
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
function ExtraCard({ item, onCardClick }: { item: MediaItem; onCardClick?: (e: React.MouseEvent) => void }) {
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
              {/* باقة B: w92 افتراضي + srcset w92/w154 — ممنوع w185/w300 على كروت الرئيسية */}
              <img
                src={`/tmdb/w92${item.poster_path}`}
                srcSet={`/tmdb/w92${item.poster_path} 92w, /tmdb/w154${item.poster_path} 154w`}
                sizes="(max-width: 640px) 160px, 192px"
                alt={item.title_ar}
                width={92}
                height={138}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 relative z-10"
                loading="lazy"
                decoding="async"
                fetchPriority="low"
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

  return (
    /* content-visibility: auto — الصف تحت الfold: المتصفح يتخطى رسمه لو مش ظاهر،
       والـcontain-intrinsic-size يحجز ارتفاع الصف النهائي تقريباً (لا قفز عند الظهور) */
    <div
      className="space-y-6"
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 460px' } as React.CSSProperties}
    >
      <SectionSplitHeader
        label={section.title}
        labelIcon={<SectionIcon name={section.icon} />}
        moviesHref={section.moviesHref}
        seriesHref={section.seriesHref}
        actions={
          <div className="hidden md:block">
            <SectionNavArrows scrollRef={scrollRef} />
          </div>
        }
      />

      <div
        ref={setRef}
        onMouseDown={drag.handleMouseDown}
        className="horizontal-scroll -mx-4 px-4 cursor-grab active:cursor-grabbing min-h-[318px] sm:min-h-[356px]"
        tabIndex={0}
        style={{ userSelect: 'none' }}
      >
        <div className="flex gap-4 pb-4" style={{ width: 'max-content' }}>
              {section.items.slice(0, displayCount).map((item, idx) => (
                <Fragment key={`${section.title}-${item.media_type}-${item.tmdb_id || item.id}`}>
                  <ExtraCard item={item} onCardClick={(e) => { if (drag.consumeIfDragged()) e.preventDefault() }} />
                  {(idx + 1) % AD_EVERY_N_CARDS === 0 && idx + 1 < displayCount && (
                    <AdInRowCard pos={`x-${idx + 1}-${section.title}`} />
                  )}
                </Fragment>
              ))}

              {/* إعلان رقم 5 — في المكان الفاضي أسفل القائمة (كل الأقسام — التوزيع متباعد كل 25 كارت) */}
              <AdInRowCard pos={`x-end-${section.title}`} />

              {/* كارت CTA الأخير — نفس href صفحة القسم المختلط (نفس مقاس كارت البوستر — لا قفز) */}
              {section.labelHref && (
                <Link href={section.labelHref} className="group flex-shrink-0 w-40 sm:w-48">
                  <div className="flex aspect-[2/3] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-slate-800/60 bg-slate-900/20 text-center transition-all duration-300 hover:-translate-y-1.5 hover:border-slate-700/80 hover:shadow-xl hover:shadow-slate-950/50">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 transition-transform duration-300 group-hover:scale-110">
                      <ArrowLeft className="h-5 w-5 text-amber-300" />
                    </span>
                    <span className="px-3 text-sm font-black text-slate-100">اكتشف المزيد</span>
                  </div>
                </Link>
              )}

              {/* Sentinel for lazy loading */}
              {displayCount < section.items.length && (
                <div ref={endRef} className="flex-shrink-0 w-10" />
              )}
            </div>
          </div>
        </div>
      )
}

/** التوزيع الإعلاني: كل قسم يعرض إعلانًا في نهاية صفه + إعلان كل AD_EVERY_N_CARDS كارت — تباعد واسع يحافظ على قيمة الظهور */

/** هيكل عظمي مطابق هيكليًا لصف القسم الحقيقي (نفس الارتفاعات الدقيقة):
    رأس بحجم SectionSplitHeader + شريط بنفس min-h للحاويات الأفقية —
    أي استبداله بالمحتوى لا يغيّر ارتفاع الصفحة (لا قفز للفوتر). */
function ExtraSkeletonRow() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="h-14 w-72 max-w-full rounded-2xl bg-slate-800/60 animate-pulse" />
      <div className="min-h-[318px] sm:min-h-[356px] flex gap-4 overflow-hidden pb-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-40 sm:w-48">
            <div className="aspect-[2/3] w-full rounded-2xl bg-slate-800/50 animate-pulse" />
            <div className="h-3 w-3/4 mt-3 rounded bg-slate-800/40 animate-pulse" />
            <div className="h-3 w-1/2 mt-2 rounded bg-slate-800/30 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function HomeExtraSections({ sections, loading }: { sections: ExtraSectionDef[]; loading?: boolean }) {
  const visible = sections.filter((s) => s.items.length > 0)
  if (visible.length === 0) {
    // أثناء التحميل: هيكل عظمي بدل فراغ — وبعد فشل الجلب: لا شيء (صامت)
    if (loading) {
      return (
        <>
          <ExtraSkeletonRow />
          <ExtraSkeletonRow />
          <ExtraSkeletonRow />
          <ExtraSkeletonRow />
        </>
      )
    }
    return null
  }

  return (
    <>
      {visible.map((section) => (
        <ExtraRow key={section.title} section={section} />
      ))}
    </>
  )
}