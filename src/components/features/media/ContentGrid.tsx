'use client'

import React, { useMemo } from 'react'
import { MovieCard } from './MovieCard'
import { SkeletonGrid } from '@/components/common/Skeletons'

interface ContentGridProps {
  items: any[]
  contentType: string
  isLoading?: boolean
  lang?: 'ar' | 'en'
}

export const ContentGrid: React.FC<ContentGridProps> = React.memo(({
  items,
  contentType,
  isLoading,
  lang = 'ar'
}) => {
  const itemsWithMediaType = useMemo(() =>
    items.map((item: any) => ({
      ...item,
      media_type: contentType === 'series' || contentType === 'anime' ? 'tv' : contentType
    })),
    [items, contentType]
  )

  if (isLoading) {
    return <SkeletonGrid count={40} variant="poster" />
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-xl text-lumen-silver mb-4">
          {lang === 'ar' ? 'لا توجد نتائج' : 'No results found'}
        </p>
        <p className="text-sm text-lumen-silver/70">
          {lang === 'ar'
            ? 'جرب تغيير الفلاتر أو البحث عن شيء آخر'
            : 'Try changing filters or searching for something else'}
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-4 md:gap-6" data-content-grid>
      {itemsWithMediaType.map((item: any, index: number) => (
        <MovieCard
          key={item.id}
          movie={item}
          index={index}
        />
      ))}
    </div>
  )
})

ContentGrid.displayName = 'ContentGrid'
