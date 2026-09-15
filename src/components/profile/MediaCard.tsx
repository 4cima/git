'use client'

/**
 * src/components/profile/MediaCard.tsx
 * بطاقة عمل موحّدة للبروفايل.
 * - الرابط من mediaHref() المُطابِقة حرفياً لمساري /movies/[slug] و /series/[slug]
 * - slug فاضي → div غير قابل للنقر + شارة رمادية «غير متوفر مؤقتاً» (لا fallback رقمي)
 */
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { TmdbImage } from '@/components/common/TmdbImage'
import type { MediaItem } from './types'
import { displayTitle, mediaHref, safeRating, yearOf } from './utils'

interface MediaCardProps {
  item: MediaItem
  /** عناصر تُركَّب فوق البوستر (أزرار إزالة مثلاً) — خارج الـLink حتى لا تُبتلع النقرة */
  overlay?: React.ReactNode
  subtitle?: React.ReactNode
}

export function MediaCard({ item, overlay, subtitle }: MediaCardProps) {
  const href = mediaHref(item)
  const title = displayTitle(item)
  const year = yearOf(item)
  const rating = safeRating(item.vote_average)

  const poster = (
    <div className="relative overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-white/5">
      <TmdbImage
        path={item.poster_path || item.backdrop_path}
        size="w342"
        alt={title}
        className="aspect-[2/3] w-full"
        imgClassName="group-hover:scale-105"
      />
      {/* تعتيم سفلي سينمائي */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      {rating !== null && (
        <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-bold text-amber-400 backdrop-blur">
          <Star className="h-3 w-3 fill-amber-400" />
          {rating.toFixed(1)}
        </span>
      )}
      {overlay && <div className="absolute left-2 top-2 z-10">{overlay}</div>}
    </div>
  )

  const caption = (
    <>
      <h3 className="mt-2 truncate text-sm font-semibold text-white" title={title}>
        {title}
      </h3>
      <div className="mt-0.5 flex min-h-5 flex-wrap items-center gap-1.5 text-xs text-zinc-400">
        {year !== null && <span dir="ltr">{year}</span>}
        {href === null && (
          <span className="rounded bg-zinc-700/70 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300">
            غير متوفر مؤقتاً
          </span>
        )}
        {subtitle}
      </div>
    </>
  )

  const inner = href ? (
    <Link href={href} className="block focus:outline-none" aria-label={title}>
      {poster}
      {caption}
    </Link>
  ) : (
    <div aria-disabled="true">
      {poster}
      {caption}
    </div>
  )

  return (
    <motion.div
      whileHover={href ? { y: -4 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="group relative min-w-0"
    >
      {inner}
    </motion.div>
  )
}
