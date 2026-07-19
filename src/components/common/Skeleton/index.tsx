'use client'

import { motion } from 'framer-motion'

interface SkeletonProps {
  className?: string
  count?: number
}

export const SkeletonCard = ({ className = '' }: SkeletonProps) => (
  <div className={`relative overflow-hidden bg-zinc-900 rounded-lg ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 animate-shimmer" />
  </div>
)

export const SkeletonTrain = ({ count = 5 }: SkeletonProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-zinc-800 rounded animate-pulse" />
        <div className="w-32 h-6 bg-zinc-800 rounded animate-pulse" />
      </div>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[160px]">
            <SkeletonCard className="w-full h-[240px]" />
            <div className="mt-2 space-y-2">
              <div className="w-full h-4 bg-zinc-800 rounded animate-pulse" />
              <div className="w-2/3 h-3 bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export const SkeletonHero = () => (
  <div className="h-[70vh] w-full bg-zinc-900 animate-pulse rounded-lg" />
)
