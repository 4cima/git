/**
 * AggregateRating Component
 * 
 * Displays aggregate rating (average + count) for content.
 * Fetches data from backend API with caching.
 * 
 * Task 11.2: Create AggregateRating component
 * Requirements: 11.1, 11.2, 11.3, 11.4, 3.1, 3.2, 3.3
 */

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { CONFIG } from '../../../lib/constants'

interface AggregateRatingProps {
  externalId: string
  contentType: 'movie' | 'tv' | 'game' | 'software'
  size?: 'sm' | 'md' | 'lg'
  showCount?: boolean
  onClick?: () => void
  className?: string
  initialData?: AggregateRatingData // Optional pre-fetched data
}

interface AggregateRatingData {
  average_rating: number | null
  rating_count: number
}

export const AggregateRating = ({
  externalId,
  contentType,
  size = 'md',
  showCount = true,
  onClick,
  className = '',
  initialData
}: AggregateRatingProps) => {
  const [data, setData] = useState<AggregateRatingData | null>(initialData || null)
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState(false)

  useEffect(() => {
    // Skip fetch if initialData was provided
    if (initialData) {
      setData(initialData)
      setLoading(false)
      return
    }

    const fetchRating = async () => {
      try {
        setLoading(true)
        setError(false)

        const apiBase = CONFIG.API_BASE || ''
        const url = `${apiBase}/api/ratings/aggregate?external_id=${encodeURIComponent(externalId)}&content_type=${contentType}`

        const response = await fetch(url)

        if (!response.ok) {
          throw new Error('Failed to fetch rating')
        }

        const result = await response.json()
        setData(result)
      } catch (err: any) {
        // Silently fail
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchRating()
  }, [externalId, contentType, initialData])

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <div className="flex items-center gap-0.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star
              key={i}
              className={`${sizeClasses[size]} text-zinc-700 animate-pulse`}
              fill="none"
            />
          ))}
        </div>
        <div className={`${textSizeClasses[size]} text-zinc-600 animate-pulse`}>
          ...
        </div>
      </div>
    )
  }

  // Error state
  if (error || !data) {
    return null
  }

  // No ratings yet
  if (data.rating_count === 0 || data.average_rating === null) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <div className="flex items-center gap-0.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star
              key={i}
              className={`${sizeClasses[size]} text-zinc-600`}
              fill="none"
            />
          ))}
        </div>
        <span className={`${textSizeClasses[size]} text-zinc-500`}>
          لا تقييمات
        </span>
      </div>
    )
  }

  // Display rating
  const averageRating = data.average_rating
  const filledStars = Math.floor(averageRating / 2)
  const hasHalfStar = averageRating % 2 >= 1

  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  }

  return (
    <div
      className={`flex items-center gap-1.5 ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-center gap-0.5">
        {[0, 1, 2, 3, 4].map((starIndex) => {
          const isFilled = starIndex < filledStars
          const isHalf = starIndex === filledStars && hasHalfStar

          return (
            <div key={starIndex} className="relative">
              {/* Background star */}
              <Star
                className={`${sizeClasses[size]} text-zinc-600`}
                fill="none"
                strokeWidth={2}
              />

              {/* Filled star overlay */}
              {(isFilled || isHalf) && (
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{
                    width: isFilled ? '100%' : '50%'
                  }}
                >
                  <Star
                    className={`${sizeClasses[size]} text-lumen-gold`}
                    fill="currentColor"
                    strokeWidth={2}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <span className={`${textSizeClasses[size]} font-bold text-white`}>
        {averageRating.toFixed(1)}/10
      </span>

      {showCount && (
        <span className={`${textSizeClasses[size]} text-zinc-500`}>
          ({formatCount(data.rating_count)})
        </span>
      )}
    </div>
  )
}
