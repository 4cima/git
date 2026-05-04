/**
 * ReviewCard Component
 * 
 * Displays a single review with user info, rating, text, and interaction buttons.
 * Supports RTL/LTR, spoiler warnings, verified badges, and edit indicators.
 * 
 * Task 13.1: Create ReviewCard component
 * Requirements: 4.2, 4.3, 4.4, 5.1, 26.4, 37.3, 37.4, 37.5, 40.3
 */

import { useState } from 'react'
import Link from 'next/link'
import { ThumbsUp, Flag, Edit2, Trash2, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { RatingInput } from './RatingInput'
import { Profile } from '../../../lib/supabase'

interface ReviewCardProps {
  review: {
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
  currentUserId?: string
  onEdit?: () => void
  onDelete?: () => void
  onLike?: () => void
  onReport?: () => void
}

export const ReviewCard = ({
  review,
  currentUserId,
  onEdit,
  onDelete,
  onLike,
  onReport
}: ReviewCardProps) => {
  const [showSpoiler, setShowSpoiler] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const isOwner = currentUserId === review.user_id
  const isRTL = review.language === 'ar'
  const maxPreviewLength = 300

  const needsExpansion = review.review_text.length > maxPreviewLength
  const displayText = expanded || !needsExpansion
    ? review.review_text
    : review.review_text.substring(0, maxPreviewLength) + '...'

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'اليوم'
    if (diffDays === 1) return 'أمس'
    if (diffDays < 7) return `منذ ${diffDays} أيام`
    if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسابيع`
    if (diffDays < 365) return `منذ ${Math.floor(diffDays / 30)} أشهر`
    return `منذ ${Math.floor(diffDays / 365)} سنة`
  }

  return (
    <div className="p-4 bg-zinc-800/30 rounded-xl border border-zinc-700/50 hover:border-zinc-600/50 transition-all">
      {/* Header: User Info */}
      <div className="flex items-start gap-3 mb-3">
        <Link href={`/profile/${review.user?.username}`} className="flex-shrink-0">
          <img
            src={review.user?.avatar_url || '/default-avatar.png'}
            alt={review.user?.username}
            className="w-10 h-10 rounded-full border border-zinc-700 hover:border-lumen-gold transition-colors"
          />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/profile/${review.user?.username}`}
              className="font-bold text-white hover:text-lumen-gold transition-colors"
            >
              {review.user?.username || 'مستخدم'}
            </Link>

            {review.is_verified && (
              <div
                className="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-400"
                title="تم التحقق من المشاهدة"
              >
                <CheckCircle size={12} />
                <span>Verified Watch</span>
              </div>
            )}

            {review.edit_count > 0 && (
              <span className="text-xs text-zinc-500" title="تم التعديل">
                (معدّلة)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
            <span>{formatDate(review.created_at)}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              {review.language === 'ar' ? '🇸🇦 عربي' : '🇬🇧 English'}
            </span>
          </div>
        </div>

        {/* Owner Actions */}
        {isOwner && (
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 rounded-lg bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-all"
                title="تعديل"
              >
                <Edit2 size={14} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all"
                title="حذف"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Rating */}
      {review.rating && (
        <div className="mb-3">
          <RatingInput value={review.rating} readonly size="sm" showValue />
        </div>
      )}

      {/* Title */}
      {review.title && (
        <h3
          className="text-lg font-bold text-white mb-2"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {review.title}
        </h3>
      )}

      {/* Spoiler Warning */}
      {review.contains_spoilers && !showSpoiler && (
        <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-yellow-400">
              <Eye size={16} />
              <span className="text-sm font-bold">
                تحذير: تحتوي على حرق للأحداث
              </span>
            </div>
            <button
              onClick={() => setShowSpoiler(true)}
              className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded hover:bg-yellow-500/30 transition-all"
            >
              عرض المراجعة
            </button>
          </div>
        </div>
      )}

      {/* Review Text */}
      {(!review.contains_spoilers || showSpoiler) && (
        <div className="mb-3">
          <p
            className="text-zinc-300 leading-relaxed whitespace-pre-wrap"
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            {displayText}
          </p>
          {needsExpansion && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 text-sm text-lumen-gold hover:text-lumen-gold/80 font-bold transition-colors"
            >
              {expanded ? 'عرض أقل' : 'قراءة المزيد'}
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-3 border-t border-zinc-700/50">
        {/* Like Button */}
        {onLike && !isOwner && (
          <button
            onClick={onLike}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
              review.is_liked
                ? 'bg-lumen-gold/20 text-lumen-gold'
                : 'bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700 hover:text-white'
            }`}
          >
            <ThumbsUp size={14} fill={review.is_liked ? 'currentColor' : 'none'} />
            <span>مفيدة</span>
            {review.helpful_count !== undefined && review.helpful_count > 0 && (
              <span className="text-xs">({review.helpful_count})</span>
            )}
          </button>
        )}

        {/* Helpful Count (for owner) */}
        {isOwner && review.helpful_count !== undefined && review.helpful_count > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-400">
            <ThumbsUp size={14} />
            <span>{review.helpful_count} وجدوها مفيدة</span>
          </div>
        )}

        {/* Report Button */}
        {onReport && !isOwner && (
          <button
            onClick={onReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-700/50 text-zinc-400 hover:bg-red-500/10 hover:text-red-400 text-sm font-bold transition-all"
          >
            <Flag size={14} />
            <span>إبلاغ</span>
          </button>
        )}

        {/* Hide Spoiler Button */}
        {review.contains_spoilers && showSpoiler && (
          <button
            onClick={() => setShowSpoiler(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700 hover:text-white text-sm font-bold transition-all ml-auto"
          >
            <EyeOff size={14} />
            <span>إخفاء</span>
          </button>
        )}
      </div>
    </div>
  )
}
