'use client'

/**
 * src/components/profile/tabs/ReviewsTab.tsx
 * التقييمات — البيانات من /api/user/reviews فقط، مع حذف عبر DELETE /api/user/reviews.
 */
import Link from 'next/link'
import { useState } from 'react'
import { Star, Trash2 } from 'lucide-react'
import { fetchReviews, removeReview } from '../api'
import { useApi } from '../hooks'
import type { ReviewItem } from '../types'
import { displayTitle, formatDateAr, mediaHref, safeRating } from '../utils'
import { EmptyState, ErrorState, LoadingGrid, PosterThumb, SectionHeader } from '../ui'

function Stars({ rating }: { rating: number }) {
  // التقييم من 10 → نجوم من 5
  const full = Math.round(rating / 2)
  return (
    <span className="flex items-center gap-0.5" aria-label={`التقييم ${rating} من 10`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < full ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'}`}
        />
      ))}
    </span>
  )
}

function ReviewRow({ item, onRemove, busy }: { item: ReviewItem; onRemove: (id: number) => void; busy: boolean }) {
  const href = mediaHref(item)
  const title = displayTitle(item)
  const rating = safeRating(item.rating) ?? 0

  return (
    <li className="flex gap-3 rounded-2xl border border-white/5 bg-zinc-900/60 p-3">
      {href ? (
        <Link href={href} aria-label={title}>
          <PosterThumb path={item.poster_path} alt={title} />
        </Link>
      ) : (
        <PosterThumb path={item.poster_path} alt={title} />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {href ? (
            <Link href={href} className="truncate font-bold text-white hover:text-amber-400">
              {title}
            </Link>
          ) : (
            <span className="truncate font-bold text-zinc-300">{title}</span>
          )}
          <Stars rating={rating} />
          <span className="text-xs font-bold text-amber-400" dir="ltr">
            {rating}/10
          </span>
        </div>
        {item.review_text && (
          <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-zinc-400">
            {item.review_text}
          </p>
        )}
        <p className="mt-1.5 text-xs text-zinc-500">{formatDateAr(item.created_at)}</p>
      </div>

      <button
        type="button"
        onClick={() => onRemove(item.tmdb_id)}
        disabled={busy}
        aria-label={`حذف تقييم ${title}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-lg border border-white/10 text-zinc-400 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  )
}

export function ReviewsTab() {
  const { data, loading, error, reload } = useApi(fetchReviews)
  const [busyId, setBusyId] = useState<number | null>(null)

  const items = data?.items ?? []

  const handleRemove = async (tmdbId: number) => {
    if (busyId !== null) return
    setBusyId(tmdbId)
    try {
      await removeReview(tmdbId)
      reload()
    } catch {
      reload()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section>
      <SectionHeader
        icon={Star}
        title="التقييمات"
        action={
          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400" dir="ltr">
            {items.length}
          </span>
        }
      />

      {loading ? (
        <LoadingGrid />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Star}
          title="لم تُضف أي تقييم بعد"
          hint="قيّم أي فيلم أو مسلسل من صفحته وسيظهر تقييمك هنا."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <ReviewRow key={`${item.tmdb_id}-${item.content_id}`} item={item} onRemove={handleRemove} busy={busyId === item.tmdb_id} />
          ))}
        </ul>
      )}
    </section>
  )
}
