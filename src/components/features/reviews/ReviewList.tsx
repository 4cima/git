/**
 * ReviewList Component
 * 
 * Displays a list of reviews with filtering, sorting, and pagination.
 * Highlights user's own review at the top.
 * 
 * Task 13.2: Create ReviewList component
 * Requirements: 4.1, 7.1, 7.2, 7.3, 7.4, 7.5, 18.1, 18.5, 32.1, 32.3, 33.5
 */

import { useState, useEffect } from 'react'
import { MessageSquare, Loader2 } from 'lucide-react'
import { ReviewCard } from './ReviewCard'
import { ReviewFilters } from './ReviewFilters'
import { CONFIG } from '../../../lib/constants'
import { Profile } from '../../../lib/supabase'

interface Review {
  id: string
  user_id: string
  title?: string
  review_text: string
  rating?: number
  language: 'ar' | 'en'
  contains_spoilers: boolean
  is_verified: boolean
  edit_count: number
  created_at: string
  updated_at: string
  user?: Profile
  helpful_count?: number
  is_liked?: boolean
}

interface ReviewListProps {
  externalId: string
  contentType: 'movie' | 'tv' | 'game' | 'software'
  currentUserId?: string
  onEditReview?: (review: Review) => void
  onDeleteReview?: (reviewId: string) => void
  onLikeReview?: (reviewId: string) => void
  onReportReview?: (reviewId: string) => void
}

export const ReviewList = ({
  externalId,
  contentType,
  currentUserId,
  onEditReview,
  onDeleteReview,
  onLikeReview,
  onReportReview
}: ReviewListProps) => {
  const [reviews, setReviews] = useState<Review[]>([])
  const [userReview, setUserReview] = useState<Review | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  // Filters
  const [sort, setSort] = useState<'most_helpful' | 'newest' | 'highest_rating' | 'lowest_rating'>('most_helpful')
  const [language, setLanguage] = useState<'all' | 'ar' | 'en'>('all')
  const [ratingFilter, setRatingFilter] = useState<'all' | 'positive' | 'mixed' | 'negative'>('all')
  const [limit] = useState(20)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    fetchReviews()
  }, [externalId, contentType, sort, language, ratingFilter, offset])

  const fetchReviews = async () => {
    try {
      setLoading(true)
      setError(null)

      const apiBase = CONFIG.API_BASE || ''
      const params = new URLSearchParams({
        external_id: externalId,
        content_type: contentType,
        sort,
        language,
        rating_filter: ratingFilter,
        limit: limit.toString(),
        offset: offset.toString()
      })

      const response = await fetch(`${apiBase}/api/reviews?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch reviews')
      }

      const data = await response.json()

      // Separate user's review if exists
      if (currentUserId) {
        const userReviewItem = data.reviews.find((r: Review) => r.user_id === currentUserId)
        const otherReviews = data.reviews.filter((r: Review) => r.user_id !== currentUserId)

        setUserReview(userReviewItem || null)
        setReviews(otherReviews)
      } else {
        setUserReview(null)
        setReviews(data.reviews)
      }

      setTotalCount(data.pagination?.total || 0)
      setHasMore(data.pagination?.hasMore || false)
    } catch (err: any) {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }

  const handleLoadMore = () => {
    setOffset(offset + limit)
  }

  // Loading state
  if (loading && offset === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={32} className="text-lumen-gold animate-spin" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
        <p className="text-red-400">{error}</p>
        <button
          onClick={fetchReviews}
          className="mt-3 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
        >
          إعادة المحاولة
        </button>
      </div>
    )
  }

  // Empty state
  if (!userReview && reviews.length === 0 && offset === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare size={48} className="mx-auto text-zinc-600 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">لا توجد مراجعات بعد</h3>
        <p className="text-zinc-400">كن أول من يكتب مراجعة لهذا المحتوى</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Review Count */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">
          المراجعات ({totalCount})
        </h3>
      </div>

      {/* Filters */}
      <ReviewFilters
        sort={sort}
        onSortChange={setSort}
        language={language}
        onLanguageChange={setLanguage}
        ratingFilter={ratingFilter}
        onRatingFilterChange={setRatingFilter}
      />

      {/* User's Review (Highlighted) */}
      {userReview && (
        <div className="border-2 border-lumen-gold/30 rounded-xl p-1">
          <div className="mb-2 px-3 py-1 bg-lumen-gold/10 rounded-t-lg">
            <span className="text-xs font-bold text-lumen-gold">مراجعتك / Your Review</span>
          </div>
          <ReviewCard
            review={userReview}
            currentUserId={currentUserId}
            onEdit={() => onEditReview?.(userReview)}
            onDelete={() => onDeleteReview?.(userReview.id)}
          />
        </div>
      )}

      {/* Other Reviews */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            currentUserId={currentUserId}
            onEdit={() => onEditReview?.(review)}
            onDelete={() => onDeleteReview?.(review.id)}
            onLike={() => onLikeReview?.(review.id)}
            onReport={() => onReportReview?.(review.id)}
          />
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="text-center">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="px-6 py-2.5 bg-zinc-800 text-white font-bold rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition-all"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                جاري التحميل...
              </span>
            ) : (
              'تحميل المزيد'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
