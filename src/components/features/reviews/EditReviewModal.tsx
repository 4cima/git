/**
 * EditReviewModal Component
 * 
 * Modal for editing existing reviews with bilingual support (Arabic/English).
 * Features: form pre-population, validation, error handling, loading states.
 * 
 * Task 11: Create Edit Review Modal component
 * Requirements: 6.1-6.13, 11.1-11.9
 */

import { useState, useEffect } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Modal } from '../../ui/Modal'
import { RatingInput } from './RatingInput'
import { useAuth } from '../../../hooks/useAuth'
import { useLang } from '../../../state/useLang'
import { toast } from 'react-hot-toast'

export interface Review {
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
}

export interface EditReviewModalProps {
  review: Review | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const EditReviewModal = ({
  review,
  isOpen,
  onClose,
  onSuccess
}: EditReviewModalProps) => {
  const { user } = useAuth()
  const { lang } = useLang()
  
  const [formData, setFormData] = useState({
    title: '',
    review_text: '',
    rating: null as number | null,
    contains_spoilers: false
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Pre-populate form when review changes
  useEffect(() => {
    if (review) {
      setFormData({
        title: review.title || '',
        review_text: review.review_text,
        rating: review.rating || null,
        contains_spoilers: review.contains_spoilers
      })
      setErrors({})
    }
  }, [review])

  // Validation logic
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (formData.review_text.length < 10) {
      newErrors.review_text = lang === 'ar' 
        ? 'يجب أن تكون المراجعة 10 أحرف على الأقل'
        : 'Review must be at least 10 characters'
    }
    
    if (formData.review_text.length > 5000) {
      newErrors.review_text = lang === 'ar'
        ? 'يجب ألا تتجاوز المراجعة 5000 حرف'
        : 'Review must not exceed 5000 characters'
    }
    
    if (formData.title && formData.title.length > 200) {
      newErrors.title = lang === 'ar'
        ? 'يجب ألا يتجاوز العنوان 200 حرف'
        : 'Title must not exceed 200 characters'
    }
    
    if (formData.rating && (formData.rating < 1 || formData.rating > 10)) {
      newErrors.rating = lang === 'ar'
        ? 'يجب أن يكون التقييم بين 1 و 10'
        : 'Rating must be between 1 and 10'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate() || !review) return
    
    setIsSubmitting(true)
    
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || ''
      const response = await fetch(`${apiBase}/api/reviews/${review.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id}`
        },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update review')
      }
      
      toast.success(lang === 'ar' ? 'تم تحديث المراجعة' : 'Review updated')
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.message || (lang === 'ar' ? 'فشل في تحديث المراجعة' : 'Failed to update review'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!review) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lang === 'ar' ? 'تعديل المراجعة' : 'Edit Review'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title field (optional) */}
        <div>
          <label className="block text-sm font-medium mb-2 text-lumen-cream">
            {lang === 'ar' ? 'العنوان (اختياري)' : 'Title (optional)'}
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-lumen-gold transition-colors"
            maxLength={200}
          />
          {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
        </div>
        
        {/* Review text */}
        <div>
          <label className="block text-sm font-medium mb-2 text-lumen-cream">
            {lang === 'ar' ? 'المراجعة' : 'Review'}
          </label>
          <textarea
            value={formData.review_text}
            onChange={(e) => setFormData({ ...formData, review_text: e.target.value })}
            className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white min-h-[150px] focus:outline-none focus:border-lumen-gold transition-colors resize-none"
            maxLength={5000}
          />
          <p className="text-xs text-zinc-500 mt-1">
            {formData.review_text.length} / 5000
          </p>
          {errors.review_text && <p className="text-red-500 text-sm mt-1">{errors.review_text}</p>}
        </div>
        
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium mb-2 text-lumen-cream">
            {lang === 'ar' ? 'التقييم' : 'Rating'}
          </label>
          <RatingInput
            value={formData.rating}
            onChange={(rating) => setFormData({ ...formData, rating })}
            size="md"
            showValue
          />
          {errors.rating && <p className="text-red-500 text-sm mt-1">{errors.rating}</p>}
        </div>
        
        {/* Spoilers checkbox */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="spoilers"
            checked={formData.contains_spoilers}
            onChange={(e) => setFormData({ ...formData, contains_spoilers: e.target.checked })}
            className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-lumen-gold focus:ring-lumen-gold"
          />
          <label htmlFor="spoilers" className="text-sm text-lumen-cream">
            {lang === 'ar' ? 'تحتوي على حرق للأحداث' : 'Contains spoilers'}
          </label>
        </div>
        
        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
            disabled={isSubmitting}
          >
            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-lumen-gold text-black font-bold hover:bg-lumen-gold/90 disabled:opacity-50 transition-colors"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {lang === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
              </span>
            ) : (
              lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
