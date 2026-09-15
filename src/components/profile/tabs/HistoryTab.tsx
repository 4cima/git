'use client'

/**
 * src/components/profile/tabs/HistoryTab.tsx
 * سجل المشاهدة — من /api/continue-watching (قيد المشاهدة) و /api/user/completed (مكتملة) فقط.
 */
import { useState } from 'react'
import { CheckCircle2, History, X } from 'lucide-react'
import { fetchCompleted, fetchContinueWatching, removeContinueItem } from '../api'
import { useApi } from '../hooks'
import { MediaCard } from '../MediaCard'
import type { MediaItem } from '../types'
import { EmptyState, ErrorState, LoadingGrid, SectionHeader } from '../ui'

function ContinueGrid({ items, onRemove }: { items: MediaItem[]; onRemove: (item: MediaItem) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((item) => (
        <MediaCard
          key={`${item.tmdb_id}-${item.season ?? 0}-${item.episode ?? 0}`}
          item={item}
          subtitle={
            item.season != null && item.episode != null ? (
              <span dir="ltr" className="text-[11px] text-amber-400/80">
                S{item.season}·E{item.episode}
              </span>
            ) : undefined
          }
          overlay={
            <button
              type="button"
              onClick={() => onRemove(item)}
              aria-label="إزالة من أكمل المشاهدة"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-zinc-300 backdrop-blur transition hover:bg-red-500/80 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          }
        />
      ))}
    </div>
  )
}

export function HistoryTab() {
  const resume = useApi(fetchContinueWatching)
  const completed = useApi(fetchCompleted)
  const [busyId, setBusyId] = useState<number | null>(null)

  const resumeItems = resume.data?.items ?? []
  const completedItems = completed.data?.items ?? []

  const handleRemove = async (item: MediaItem) => {
    if (busyId !== null) return
    setBusyId(item.tmdb_id)
    try {
      await removeContinueItem(item.tmdb_id, item.season ?? null, item.episode ?? null)
      resume.reload()
    } catch {
      resume.reload()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <SectionHeader icon={History} title="قيد المشاهدة" />
        {resume.loading ? (
          <LoadingGrid />
        ) : resume.error ? (
          <ErrorState message={resume.error} onRetry={resume.reload} />
        ) : resumeItems.length === 0 ? (
          <EmptyState icon={History} title="لا توجد عناصر قيد المشاهدة" hint="ما تشاهده الآن ولم تُكمله يظهر هنا." />
        ) : (
          <ContinueGrid items={resumeItems} onRemove={handleRemove} />
        )}
      </section>

      <section>
        <SectionHeader icon={CheckCircle2} title="اكتملت مشاهدتها" />
        {completed.loading ? (
          <LoadingGrid />
        ) : completed.error ? (
          <ErrorState message={completed.error} onRetry={completed.reload} />
        ) : completedItems.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="لا توجد عناصر مكتملة بعد" hint="أكمل مشاهدة أي عمل ليُسجَّل هنا." />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {completedItems.map((item) => (
              <MediaCard key={item.tmdb_id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
