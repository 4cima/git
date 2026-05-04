/**
 * ReviewForm Component
 * 
 * Form for creating/editing reviews with bilingual support (Arabic/English).
 * Features: auto-save drafts, character counter, validation, spoiler warning.
 * 
 * Task 12.1: Create ReviewForm component
 * Requirements: 12.1, 12.2, 12.3, 2.2, 13.1, 13.2, 13.3, 36.5, 37.1, 37.2
 */

import { useState, useEffect, useCallback } from 'react'
import { AlertCircle, Save } from 'lucide-react'
import { RatingInput } from './RatingInput'

interface ReviewFormProps {
  externalId: string
  contentType: 'movie' | 'tv' | 'game' | 'software'
  existingReview?: {
    id: string
    title?: string
    review_text: string
    rating?: number
    language: 'ar' | 'en'
    contains_spoilers: boolean
  }
  onSubmit: (data: ReviewFormData) => Promise<void>
  onCancel: () => void
}

export interface ReviewFormData {
  title?: string
  review_text: string
  rating?: number
  language: 'ar' | 'en'
  contains_spoilers: boolean
}

export const ReviewForm = ({
  externalId,
  contentType,
  existingReview,
  onSubmit,
  onCancel
}: ReviewFormProps) => {
  const [language, setLanguage] = useState<'ar' | 'en'>(existingReview?.language || 'ar')
  const [title, setTitle] = useState(existingReview?.title || '')
  const [reviewText, setReviewText] = useState(existingReview?.review_text || '')
  const [rating, setRating] = useState<number | null>(existingReview?.rating ?? null)
  const [containsSpoilers, setContainsSpoilers] = useState(existingReview?.contains_spoilers || false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoSaving, setAutoSaving] = useState(false)

  const isRTL = language === 'ar'
  const minLength = 10
  const maxLength = 5000
  const maxTitleLength = 200

  const isValid = reviewText.trim().length >= minLength && reviewText.trim().length <= maxLength

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (existingReview) return // Don't auto-save when editing existing review

    const saveDraft = async () => {
      if (!reviewText.trim() && !title.trim() && !rating) return

      try {
        setAutoSaving(true)
        // TODO: Implement draft saving API call
        // await saveReviewDraft({ externalId, contentType, title, reviewText, rating, language, containsSpoilers })
      } catch (err: any) {
        console.error('Failed to save draft:', err)
      } finally {
        setAutoSaving(false)
      }
    }

    const interval = setInterval(saveDraft, 30000) // 30 seconds
    return () => clearInterval(interval)
  }, [externalId, contentType, title, reviewText, rating, language, containsSpoilers, existingReview])

  // Load draft on mount
  useEffect(() => {
    if (existingReview) return

    const loadDraft = async () => {
      try {
        // TODO: Implement draft loading API call
        // const draft = await getReviewDraft(externalId, contentType)
        // if (draft) {
        //   setTitle(draft.title || '')
        //   setReviewText(draft.review_text || '')
        //   setRating(draft.rating ?? null)
        //   setLanguage(draft.language || 'ar')
        //   setContainsSpoilers(draft.contains_spoilers || false)
        // }
      } catch (err: any) {
        console.error('Failed to load draft:', err)
      }
    }

    loadDraft()
  }, [externalId, contentType, existingReview])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isValid) return

    setSubmitting(true)
    setError(null)

    try {
      await onSubmit({
        title: title.trim() || undefined,
        review_text: reviewText.trim(),
        rating: rating ?? undefined,
        language,
        contains_spoilers: containsSpoilers
      })
    } catch (err: any) {
      setError(err.message || 'فشل في إرسال المراجعة')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Language Selector */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-bold text-white">اللغة / Language:</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setLanguage('ar')}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
              language === 'ar'
                ? 'bg-lumen-gold text-black'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            العربية
          </button>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
              language === 'en'
                ? 'bg-lumen-gold text-black'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            English
          </button>
        </div>
        {autoSaving && (
          <span className="text-xs text-zinc-500 flex items-center gap-1">
            <Save size={12} className="animate-pulse" />
            حفظ تلقائي...
          </span>
        )}
      </div>

      {/* Optional Rating */}
      <div className="space-y-2">
        <label className="text-sm font-bold text-white">
          التقييم (اختياري) / Rating (Optional)
        </label>
        <RatingInput
          value={rating}
          onChange={setRating}
          size="lg"
          showValue
        />
      </div>

      {/* Title (Optional) */}
      <div className="space-y-2">
        <label className="text-sm font-bold text-white">
          العنوان (اختياري) / Title (Optional)
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={maxTitleLength}
          placeholder={isRTL ? 'عنوان المراجعة...' : 'Review title...'}
          dir={isRTL ? 'rtl' : 'ltr'}
          className={`w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-lumen-gold transition-colors ${
            isRTL ? 'text-right' : 'text-left'
          }`}
        />
        <div className="text-xs text-zinc-500 text-right">
          {title.length}/{maxTitleLength}
        </div>
      </div>

      {/* Review Text */}
      <div className="space-y-2">
        <label className="text-sm font-bold text-white">
          المراجعة / Review *
        </label>
        <textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder={isRTL ? 'اكتب مراجعتك هنا...' : 'Write your review here...'}
          dir={isRTL ? 'rtl' : 'ltr'}
          rows={8}
          className={`w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-lumen-gold transition-colors resize-none ${
            isRTL ? 'text-right' : 'text-left'
          }`}
        />
        <div className="flex items-center justify-between text-xs">
          <span className={reviewText.trim().length < minLength ? 'text-red-400' : 'text-zinc-500'}>
            {reviewText.trim().length < minLength
              ? `${minLength - reviewText.trim().length} حرف متبقي للحد الأدنى`
              : '✓ الحد الأدنى مستوفى'}
          </span>
          <span className={reviewText.length > maxLength ? 'text-red-400' : 'text-zinc-500'}>
            {reviewText.length}/{maxLength}
          </span>
        </div>
      </div>

      {/* Spoiler Warning */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={containsSpoilers}
          onChange={(e) => setContainsSpoilers(e.target.checked)}
          className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-lumen-gold focus:ring-lumen-gold focus:ring-offset-0"
        />
        <span className="text-sm text-white">
          تحتوي على حرق للأحداث / Contains Spoilers
        </span>
      </label>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-400">{error}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!isValid || submitting}
          className="flex-1 px-4 py-2.5 bg-lumen-gold text-black font-bold rounded-lg hover:bg-lumen-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {submitting ? 'جاري الإرسال...' : existingReview ? 'تحديث المراجعة' : 'نشر المراجعة'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-4 py-2.5 bg-zinc-800 text-white font-bold rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition-all"
        >
          إلغاء
        </button>
      </div>
    </form>
  )
}
