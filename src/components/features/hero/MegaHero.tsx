'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { useDragScroll } from '@/hooks/useDragScroll'

interface MediaItem {
  id: number
  slug: string
  title: string
  title_en: string
  poster_path: string
  backdrop_path: string
  vote_average: number
  overview_ar: string
  year: number
  media_type: 'movie' | 'tv'
  primary_genre: string | null
}

interface MegaHeroProps {
  items: MediaItem[]
}

const AUTOPLAY_MS = 6000
const BACKDROP_LARGE = 'https://image.tmdb.org/t/p/w780'
const POSTER_MEDIUM = 'https://image.tmdb.org/t/p/w185'

function getBackdropUrl(item: MediaItem): string {
  if (item.backdrop_path) return `${BACKDROP_LARGE}${item.backdrop_path}`
  if (item.poster_path) return `${POSTER_MEDIUM}${item.poster_path}`
  return ''
}

function getThumbUrl(item: MediaItem): string {
  if (item.poster_path) return `${POSTER_MEDIUM}${item.poster_path}`
  if (item.backdrop_path) return `${BACKDROP_LARGE}${item.backdrop_path}`
  return ''
}

function mediaTypeLabel(item: MediaItem): string {
  return item.media_type === 'tv' ? 'مسلسل' : 'فيلم'
}

function itemHref(item: MediaItem): string {
  return item.media_type === 'tv' ? `/series/${item.slug}` : `/movies/${item.slug}`
}

export function MegaHero({ items }: MegaHeroProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { ref: stripRef, isDragging, handleMouseDown, consumeIfDragged } =
    useDragScroll<HTMLDivElement>()

  const slides = items?.slice(0, 10) ?? []
  const current = slides[activeIndex]

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (slides.length <= 1) return
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length)
    }, AUTOPLAY_MS)
  }, [slides.length])

  useEffect(() => {
    resetTimer()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [resetTimer])

  const goToSlide = (index: number) => {
    setActiveIndex(index)
    resetTimer()
  }

  const handleThumbClick = (index: number) => {
    if (consumeIfDragged()) return
    goToSlide(index)
  }

  if (!current) return null

  return (
    <section className="relative w-full bg-gray-950 pt-16">
      <div className="mx-auto max-w-[2400px]">
        <div
          dir="rtl"
          className="relative h-[60vh] min-h-[440px] sm:h-[65vh] sm:min-h-[480px] overflow-hidden rounded-2xl border border-white/10 mx-4 sm:mx-6"
        >
          {/* Desktop Backdrop */}
          <AnimatePresence mode="sync">
            <motion.img
              key={current.id}
              src={getBackdropUrl(current)}
              alt={current.title}
              initial={{ opacity: 0, scale: 1.06 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
              className="hidden md:block absolute inset-0 h-full w-full object-cover"
            />
            {/* Mobile Poster */}
            <motion.img
              key={`mobile-${current.id}`}
              src={getThumbUrl(current)}
              alt={current.title}
              initial={{ opacity: 0, scale: 1.06 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
              className="md:hidden absolute inset-0 h-full w-full object-cover"
            />
          </AnimatePresence>

          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-l from-gray-950/90 via-gray-950/20 to-transparent" />
            <div className="absolute inset-0 bg-gray-950/10" />
          </div>

          <div className="relative z-10 flex h-full flex-col justify-end p-6 sm:p-10">
            <div className="max-w-2xl text-right">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                  <div className="mb-3 flex items-center justify-start gap-2">
                    <span className={`rounded-md px-2.5 py-1 text-xs font-bold ring-1 ${
                      current.media_type === 'tv' 
                        ? 'bg-purple-500/20 text-purple-300 ring-purple-400/30' 
                        : 'bg-cyan-500/20 text-cyan-300 ring-cyan-400/30'
                    }`}>
                      {mediaTypeLabel(current)}
                    </span>
                    {current.primary_genre && (
                      <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ${
                        current.media_type === 'tv' 
                          ? 'bg-purple-500/20 text-purple-300 ring-purple-400/30' 
                          : 'bg-cyan-500/20 text-cyan-300 ring-cyan-400/30'
                      }`}>
                        {current.primary_genre}
                      </span>
                    )}
                  </div>

                  <div className="mb-3 flex items-center justify-start gap-3 text-sm font-semibold text-gray-200">
                    <span className="flex items-center gap-1 text-yellow-400">
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                        <path d="M10 15.27 16.18 19l-1.64-7.03L20 7.24l-7.19-.61L10 0 7.19 6.63 0 7.24l5.46 4.73L3.82 19z" />
                      </svg>
                      {current.vote_average.toFixed(1)}
                    </span>
                    <span>{current.year}</span>
                  </div>

                  <h1 className="mb-1 text-right text-2xl font-black leading-tight text-white drop-shadow-lg sm:text-3xl lg:text-4xl">
                    {current.title}
                  </h1>

                  <p className="mb-4 text-right text-sm font-medium text-gray-400 sm:text-base">
                    {current.title_en}
                  </p>

                  <p className="mb-6 line-clamp-2 text-right text-base leading-relaxed text-gray-200 sm:text-lg">
                    {current.overview_ar}
                  </p>

                  <div className="flex justify-start">
                    <Link
                      href={itemHref(current)}
                      className="group flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-bold text-gray-950 shadow-lg shadow-black/30 transition hover:bg-cyan-400 hover:shadow-cyan-500/30"
                    >
                      <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      مشاهدة الآن
                    </Link>
                  </div>
                </motion.div>
              </AnimatePresence>

              {slides.length > 1 && (
                <div
                  ref={stripRef}
                  onMouseDown={handleMouseDown}
                  className={`mt-6 flex touch-pan-x gap-3 overflow-x-auto scroll-smooth py-3 select-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
                    isDragging ? 'cursor-grabbing' : 'cursor-grab'
                  }`}
                >
                  {slides.map((slide, index) => {
                    const isActive = index === activeIndex
                    return (
                      <button
                        key={slide.id}
                        type="button"
                        aria-label={`الانتقال إلى ${slide.title}`}
                        onClick={() => handleThumbClick(index)}
                        draggable={false}
                        className={
                          isActive
                            ? `relative h-20 w-14 shrink-0 overflow-hidden rounded-lg ring-2 transition-all duration-300 ${
                                slide.media_type === 'tv'
                                  ? 'ring-purple-400'
                                  : 'ring-cyan-400'
                              }`
                            : 'relative h-20 w-14 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/15 opacity-55 transition-all duration-300 hover:opacity-90'
                        }
                      >
                        <img
                          src={getThumbUrl(slide)}
                          alt={slide.title}
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                          className="h-full w-full object-cover"
                        />
                        {isActive && (
                          <div className={`absolute inset-0 bg-gradient-to-t ${slide.media_type === 'tv' ? 'from-purple-500/20' : 'from-cyan-500/20'} to-transparent`} />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
