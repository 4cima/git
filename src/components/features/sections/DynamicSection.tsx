'use client'

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

type SectionColor = 'cyan' | 'purple' | 'gold' | 'green'

interface DynamicSectionProps {
  items: MediaItem[]
  title: string
  subtitle: string
  color: SectionColor
  link: string
}

const POSTER_MEDIUM = 'https://image.tmdb.org/t/p/w185'
const BACKDROP_FALLBACK = 'https://image.tmdb.org/t/p/w300'

function getCardImageUrl(item: MediaItem): string {
  if (item.poster_path) return `${POSTER_MEDIUM}${item.poster_path}`
  if (item.backdrop_path) return `${BACKDROP_FALLBACK}${item.backdrop_path}`
  return ''
}

function itemHref(item: MediaItem): string {
  return item.media_type === 'tv' ? `/series/${item.slug}` : `/movies/${item.slug}`
}

const COLOR_MAP: Record<
  SectionColor,
  { text: string; underline: string; ring: string }
> = {
  cyan: {
    text: 'text-cyan-400',
    underline: 'from-cyan-400',
    ring: 'group-hover:ring-cyan-400/60',
  },
  purple: {
    text: 'text-purple-400',
    underline: 'from-purple-400',
    ring: 'group-hover:ring-purple-400/60',
  },
  gold: {
    text: 'text-yellow-400',
    underline: 'from-yellow-400',
    ring: 'group-hover:ring-yellow-400/60',
  },
  green: {
    text: 'text-green-400',
    underline: 'from-green-400',
    ring: 'group-hover:ring-green-400/60',
  },
}

export function DynamicSection({ items, title, subtitle, color, link }: DynamicSectionProps) {
  const { ref: scrollerRef, isDragging, handleMouseDown, consumeIfDragged } =
    useDragScroll<HTMLDivElement>()
  const palette = COLOR_MAP[color]

  const list = items ?? []
  if (list.length === 0) return null

  const handleCardClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (consumeIfDragged()) e.preventDefault()
  }

  return (
    <div dir="rtl" className="mx-auto max-w-[2400px] container-padding">
      <div className="mb-6 flex items-end justify-between">
        <div className="text-right">
          <h2 className={`text-xl font-extrabold sm:text-2xl ${palette.text}`}>{title}</h2>
          <div
            className={`mt-2 mb-1 h-1 w-16 rounded-full bg-gradient-to-l ${palette.underline} to-transparent`}
          />
          <p className="text-sm text-gray-400">{subtitle}</p>
        </div>

        <Link
          href={link}
          className="flex shrink-0 items-center gap-1 text-sm font-semibold text-gray-300 transition hover:text-white"
        >
          عرض الكل
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 7H4" />
          </svg>
        </Link>
      </div>

      <div className="group/scroller relative">
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-gray-950 to-transparent sm:w-16" />
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-gray-950 to-transparent sm:w-16" />

        <div
          ref={scrollerRef}
          onMouseDown={handleMouseDown}
          className={`flex touch-pan-x gap-4 overflow-x-auto scroll-smooth py-2 select-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        >
          {list.map((item) => (
            <Link
              key={item.id}
              href={itemHref(item)}
              onClick={handleCardClick}
              className="group w-40 shrink-0 md:w-48"
              draggable={false}
            >
              <div
                className={`relative aspect-[2/3] overflow-hidden rounded-lg ring-1 transition duration-300 group-hover:scale-[1.03] group-hover:shadow-xl group-hover:shadow-black/50 ${
                  item.media_type === 'tv'
                    ? 'ring-purple-400/30 group-hover:ring-purple-400/60'
                    : 'ring-cyan-400/30 group-hover:ring-cyan-400/60'
                }`}
              >
                <img
                  src={getCardImageUrl(item)}
                  alt={item.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />

                {/* justify-start = يمين في RTL */}
                <div className="absolute inset-x-1.5 top-1.5 flex items-start justify-start gap-1">
                  <span className={`rounded px-2 py-1 text-[10px] font-bold backdrop-blur-sm ${
                    item.media_type === 'tv'
                      ? 'bg-purple-500/30 text-purple-200'
                      : 'bg-cyan-500/30 text-cyan-200'
                  }`}>
                    {item.media_type === 'tv' ? 'مسلسل' : 'فيلم'}
                  </span>
                  {item.primary_genre && (
                    <span className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-gray-200 backdrop-blur-sm">
                      {item.primary_genre}
                    </span>
                  )}
                  <span className="flex items-center gap-0.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-yellow-400 backdrop-blur-sm">
                    <svg className="h-2.5 w-2.5 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15.27 16.18 19l-1.64-7.03L20 7.24l-7.19-.61L10 0 7.19 6.63 0 7.24l5.46 4.73L3.82 19z" />
                    </svg>
                    {item.vote_average.toFixed(1)}
                  </span>
                </div>

                <div className="absolute inset-x-1.5 bottom-1.5 text-right">
                  <span className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-gray-300 backdrop-blur-sm">
                    {item.year}
                  </span>
                </div>

                {item.overview_ar && (
                  <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-gray-950 via-gray-950/85 to-transparent p-2.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <p className="line-clamp-6 text-right text-[11px] leading-snug text-gray-200">
                      {item.overview_ar}
                    </p>
                  </div>
                )}
              </div>

              <p className="mt-2 truncate text-right text-sm font-bold text-white">{item.title}</p>
              <p className="truncate text-right text-xs text-gray-400">{item.title_en}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
