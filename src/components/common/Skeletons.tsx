'use client'

import { memo } from 'react'

export const SkeletonVideoCard = memo(() => {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-white/5 bg-luxury-charcoal"
      role="status"
      aria-label="جاري التحميل"
      aria-busy="true"
    >
      <div className="aspect-video w-full overflow-hidden rounded-b-xl bg-zinc-900 relative">
        <div className="h-full w-full bg-gradient-to-r from-zinc-800 via-zinc-700/60 to-zinc-800" />
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
      <div className="p-3 min-h-[64px]">
        <div className="h-4 w-2/3 rounded bg-zinc-800 mb-2 relative overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
        <div className="h-3 w-1/2 rounded bg-zinc-800 mb-2 relative overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
        <div className="h-2 w-1/4 rounded bg-zinc-800 relative overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
      </div>
      <span className="sr-only">جاري تحميل المحتوى...</span>
    </div>
  )
})

export const SkeletonPosterCard = memo(() => {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-white/5 bg-luxury-charcoal"
      role="status"
      aria-label="جاري التحميل"
      aria-busy="true"
    >
      <div className="aspect-[2/3] w-full overflow-hidden bg-zinc-900 relative">
        <div className="h-full w-full bg-gradient-to-r from-zinc-800 via-zinc-700/60 to-zinc-800" />
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
      <div className="p-3 min-h-[80px]">
        <div className="h-4 w-3/4 rounded bg-zinc-800 mb-2 relative overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
        <div className="h-3 w-1/2 rounded bg-zinc-800 relative overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
      </div>
      <span className="sr-only">جاري تحميل المحتوى...</span>
    </div>
  )
})

export const SkeletonGrid = memo(({ count = 12, variant = 'poster' }: { count?: number; variant?: 'poster' | 'video' }) => {
  const Card = variant === 'video' ? SkeletonVideoCard : SkeletonPosterCard
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} />
      ))}
    </div>
  )
})

export const SkeletonHero = memo(() => {
  return (
    <div className="relative h-[85vh] w-full bg-black overflow-hidden rounded-3xl mb-8">
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 animate-pulse" />
      <div className="absolute inset-0 flex items-end p-12">
        <div className="space-y-4 max-w-2xl">
          <div className="h-12 w-3/4 bg-zinc-800 rounded-lg relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
          <div className="h-6 w-1/2 bg-zinc-800 rounded-lg relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
          <div className="h-4 w-2/3 bg-zinc-800 rounded-lg relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
        </div>
      </div>
    </div>
  )
})

export const SkeletonDetails = memo(() => {
  return (
    <div className="min-h-screen bg-black text-white relative w-full overflow-hidden">
      <div className="absolute inset-0 h-[70vh] bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 animate-pulse" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 pt-[20vh] pb-20">
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
          {/* Poster Skeleton */}
          <div className="aspect-[2/3] rounded-xl bg-zinc-800 relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          {/* Info Skeleton */}
          <div className="space-y-6">
            <div className="h-12 w-3/4 bg-zinc-800 rounded-lg relative overflow-hidden">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
            <div className="h-6 w-1/2 bg-zinc-800 rounded-lg relative overflow-hidden">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-zinc-800 rounded relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
              <div className="h-4 w-full bg-zinc-800 rounded relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
              <div className="h-4 w-2/3 bg-zinc-800 rounded relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
