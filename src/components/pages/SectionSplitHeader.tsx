'use client'

/**
 * SectionSplitHeader — العنوان السينمائي المنقسم لأقسام الصفحة الرئيسية.
 *
 * زر واحد منقسم لنصفين قابلين للضغط:
 *   - النصف الأيمن «أفلام»  → صفحة أفلام القسم (أحمر / أيقونة فيلم)
 *   - النصف الأيسر «مسلسلات» → صفحة مسلسلات القسم (أزرق / أيقونة تلفاز)
 * وبينهما كلمة القسم (مثل «عربي») — غير قابلة للضغط — بتدرج لوني سينمائي.
 *
 * تفاصيل التصميم: إطار متدرج (أحمر ← عنبري ← أزرق)، توهج خلفي عند الـhover،
 * ولمعة ضوئية تمسح الزر — بنفس هوية الموقع (slate-950 + أحمر/أزرق).
 */
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Film, Tv } from 'lucide-react'

interface SectionSplitHeaderProps {
  /** كلمة القسم الثابتة في الوسط */
  label: string
  /** أيقونة اختيارية تظهر بجانب كلمة القسم */
  labelIcon?: React.ReactNode
  /** رابط صفحة أفلام القسم */
  moviesHref: string
  /** رابط صفحة مسلسلات القسم */
  seriesHref: string
  /** رابط صفحة القسم المختلط — عند توفره تصبح كلمة القسم heading (h2) قابلًا للضغط */
  labelHref?: string
  /** عناصر إضافية تُعرض في الطرف الآخر من الصف (مثل أسهم التنقل) */
  actions?: React.ReactNode
}

export function SectionSplitHeader({
  label,
  labelIcon,
  moviesHref,
  seriesHref,
  labelHref,
  actions,
}: SectionSplitHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* الزر المنقسم السينمائي */}
      <div className="group/split relative inline-flex rounded-2xl bg-gradient-to-l from-red-500 via-amber-400 to-blue-500 p-[2px] shadow-lg shadow-slate-950/70 transition-shadow duration-500 hover:shadow-amber-500/20">
        {/* توهج خلفي يظهر عند الـhover */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1.5 rounded-3xl bg-gradient-to-l from-red-600/25 via-amber-400/15 to-blue-600/25 opacity-0 blur-xl transition-opacity duration-500 group-hover/split:opacity-100"
        />

        <div className="relative flex items-stretch overflow-hidden rounded-[14px] bg-slate-950/95 backdrop-blur-sm">
          {/* لمعة سينمائية تمسح الزر عند الـhover */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-1/2 -translate-x-[150%] bg-gradient-to-l from-transparent via-white/[0.08] to-transparent transition-transform duration-1000 ease-out group-hover/split:translate-x-[220%]"
          />

          {/* النصف الأيمن — أفلام (زر) */}
          <Link
            href={moviesHref}
            aria-label={`تصفح أفلام ${label}`}
            className="group/movie relative z-10 flex items-center gap-2 rounded-r-[12px] py-2.5 pl-4 pr-5 transition-colors duration-300 hover:bg-red-600/15"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-red-500/30 bg-red-600/10 transition-all duration-300 group-hover/movie:scale-110 group-hover/movie:border-red-400/60 group-hover/movie:bg-red-600/25">
              <Film className="h-4 w-4 text-red-400" />
            </span>
            <span className="text-base font-black text-slate-100 transition-colors duration-300 group-hover/movie:text-red-300 md:text-lg">
              أفلام
            </span>
            <ArrowRight className="h-4 w-4 -translate-x-1.5 text-red-400 opacity-0 transition-all duration-300 group-hover/movie:translate-x-0 group-hover/movie:opacity-100" />
          </Link>

          {/* الوسط — كلمة القسم: عند توفر labelHref تصبح h2 قابلة للضغط لصفحة القسم المختلط */}
          {labelHref ? (
            <h2 className="relative z-10 flex items-center gap-2 border-x border-slate-700/50 bg-slate-900/50 px-4 py-2.5">
              {labelIcon}
              <Link
                href={labelHref}
                className="bg-gradient-to-l from-red-400 via-amber-300 to-blue-400 bg-clip-text text-base font-black text-transparent transition-opacity duration-300 hover:opacity-75 md:text-lg"
              >
                {label}
              </Link>
            </h2>
          ) : (
            <div
              aria-hidden="true"
              className="relative z-10 flex select-none items-center gap-2 border-x border-slate-700/50 bg-slate-900/50 px-4 py-2.5"
            >
              {labelIcon}
              <span className="bg-gradient-to-l from-red-400 via-amber-300 to-blue-400 bg-clip-text text-base font-black text-transparent md:text-lg">
                {label}
              </span>
            </div>
          )}

          {/* النصف الأيسر — مسلسلات (زر) */}
          <Link
            href={seriesHref}
            aria-label={`تصفح مسلسلات ${label}`}
            className="group/series relative z-10 flex items-center gap-2 rounded-l-[12px] py-2.5 pl-5 pr-4 transition-colors duration-300 hover:bg-blue-600/15"
          >
            <ArrowLeft className="h-4 w-4 translate-x-1.5 text-blue-400 opacity-0 transition-all duration-300 group-hover/series:translate-x-0 group-hover/series:opacity-100" />
            <span className="text-base font-black text-slate-100 transition-colors duration-300 group-hover/series:text-blue-300 md:text-lg">
              مسلسلات
            </span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-600/10 transition-all duration-300 group-hover/series:scale-110 group-hover/series:border-blue-400/60 group-hover/series:bg-blue-600/25">
              <Tv className="h-4 w-4 text-blue-400" />
            </span>
          </Link>
        </div>
      </div>

      {/* عناصر إضافية (أسهم التنقل السينمائية) */}
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}

/**
 * SectionNavArrows — أسهم التنقل السينمائية لأقسام الصفحة الرئيسية.
 *
 * حبّة واحدة (pill) بنفس هوية الزر المنقسم تماماً:
 *   - إطار متدرج (أحمر ← عنبري ← أزرق) + توهج خلفي عند الـhover
 *   - سهمان ملتحمان داخل كبسولة زجاجية داكنة + لمعة ضوئية تمسح الحبّة
 *   - السهم الأيمن (تقدّم) يتوهّج أحمر والسهم الأيسر (رجوع) يتوهّج أزرق
 *   - يتعطّل تلقائياً عند أطراف الصف (شفاف + بدون تفاعل)
 * العجلة واللمس لا يتأثران إطلاقاً — التأثير فقط عبر أزرار التنقل.
 */
export function SectionNavArrows({
  scrollRef,
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>
}) {
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  const update = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    // RTL: قد يكون scrollLeft بالسالب — نستخدم القيمة المطلقة للمقارنة
    const pos = Math.abs(el.scrollLeft)
    const max = el.scrollWidth - el.clientWidth
    setCanLeft(pos > 4)
    setCanRight(pos < max - 4)
  }, [scrollRef])

  /* انتظر ظهور عنصر الصف (يُرندر بعد هذا المكوّن في الشجرة) ثم اربط مستمع السكرول */
  useEffect(() => {
    let raf = 0
    let el: HTMLDivElement | null = null
    const tryAttach = () => {
      el = scrollRef.current
      if (el) {
        update()
        el.addEventListener('scroll', update, { passive: true })
        window.addEventListener('resize', update)
        return
      }
      raf = requestAnimationFrame(tryAttach)
    }
    raf = requestAnimationFrame(tryAttach)
    return () => {
      cancelAnimationFrame(raf)
      if (el) el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [scrollRef, update])

  const scroll = useCallback(
    (direction: 'left' | 'right') => {
      const el = scrollRef.current
      if (!el) return
      el.scrollBy({ left: direction === 'right' ? 800 : -800, behavior: 'smooth' })
    },
    [scrollRef]
  )

  const arrowBase =
    'relative z-10 flex h-9 w-11 items-center justify-center transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-35'

  return (
    <div className="group/nav relative inline-flex rounded-full bg-gradient-to-l from-red-500 via-amber-400 to-blue-500 p-[2px] shadow-lg shadow-slate-950/70 transition-shadow duration-500 hover:shadow-amber-500/20">
      {/* توهج خلفي يظهر عند الـhover */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-1.5 rounded-full bg-gradient-to-l from-red-600/25 via-amber-400/15 to-blue-600/25 opacity-0 blur-xl transition-opacity duration-500 group-hover/nav:opacity-100"
      />

      <div className="relative flex items-stretch overflow-hidden rounded-full bg-slate-950/95 backdrop-blur-sm">
        {/* لمعة سينمائية تمسح الحبّة عند الـhover */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-1/2 -translate-x-[150%] bg-gradient-to-l from-transparent via-white/[0.08] to-transparent transition-transform duration-1000 ease-out group-hover/nav:translate-x-[220%]"
        />

        {/* السهم الأيمن — تقدّم (يتوهّج أحمر) */}
        <button
          type="button"
          onClick={() => scroll('right')}
          disabled={!canRight}
          aria-label="تمرير للأمام"
          className={`${arrowBase} group/arrow-r rounded-r-full hover:bg-red-600/15`}
        >
          <ChevronRight className="h-5 w-5 text-slate-300 transition-all duration-300 group-hover/arrow-r:scale-125 group-hover/arrow-r:text-red-400" />
        </button>

        {/* فاصل متدرج بين السهمين */}
        <span
          aria-hidden="true"
          className="relative z-10 my-2 w-px bg-gradient-to-b from-transparent via-slate-600/60 to-transparent"
        />

        {/* السهم الأيسر — رجوع (يتوهّج أزرق) */}
        <button
          type="button"
          onClick={() => scroll('left')}
          disabled={!canLeft}
          aria-label="تمرير للخلف"
          className={`${arrowBase} group/arrow-l rounded-l-full hover:bg-blue-600/15`}
        >
          <ChevronLeft className="h-5 w-5 text-slate-300 transition-all duration-300 group-hover/arrow-l:scale-125 group-hover/arrow-l:text-blue-400" />
        </button>
      </div>
    </div>
  )
}
