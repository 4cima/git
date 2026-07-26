'use client'

import { MovieCard } from './MovieCard'
import { MovieCardData } from '@/types/media'

interface MovieCardGridProps {
  items: MovieCardData[]
  title?: string
  columns?: 2 | 3 | 4 | 5 | 6
}

export function MovieCardGrid({ items, title, columns = 6 }: MovieCardGridProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6'
  }

  return (
    <div className="space-y-4">
      {title && (
        <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
      )}
      <div className={`grid ${gridCols[columns]} gap-4`}>
        {items.map((item) => (
          <MovieCard key={item.id} {...item} />
        ))}
      </div>
    </div>
  )
}
