'use client'

/**
 * src/components/profile/tabs/FavoritesTab.tsx
 * المفضلة — البيانات من /api/user/favorites فقط، مع إزالة عبر DELETE /api/user/favorites.
 */
import { useState } from 'react'
import { Heart, X } from 'lucide-react'
import { fetchFavorites, removeFavorite } from '../api'
import { useApi } from '../hooks'
import { MediaCard } from '../MediaCard'
import { EmptyState, ErrorState, LoadingGrid, SectionHeader } from '../ui'

export function FavoritesTab() {
  const { data, loading, error, reload } = useApi(fetchFavorites)
  const [removing, setRemoving] = useState<number | null>(null)

  const items = data?.items ?? []

  const handleRemove = async (tmdbId: number) => {
    if (removing !== null) return
    setRemoving(tmdbId)
    try {
      await removeFavorite(tmdbId)
      reload()
    } catch {
      reload()
    } finally {
      setRemoving(null)
    }
  }

  return (
    <section>
      <SectionHeader
        icon={Heart}
        title="المفضلة"
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
          icon={Heart}
          title="لا توجد عناصر في المفضلة"
          hint="اضغط على أيقونة القلب في أي فيلم أو مسلسل ليظهر هنا."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => (
            <MediaCard
              key={`${item.tmdb_id}`}
              item={item}
              overlay={
                <button
                  type="button"
                  onClick={() => handleRemove(item.tmdb_id)}
                  disabled={removing === item.tmdb_id}
                  aria-label={`إزالة ${item.title_ar || item.title || 'العنصر'} من المفضلة`}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-zinc-300 backdrop-blur transition hover:bg-red-500/80 hover:text-white disabled:opacity-40"
                >
                  <X className="h-4 w-4" />
                </button>
              }
            />
          ))}
        </div>
      )}
    </section>
  )
}
