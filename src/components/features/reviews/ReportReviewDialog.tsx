/**
 * ReportReviewDialog Component
 * 
 * Dialog for reporting inappropriate reviews with bilingual support (Arabic/English).
 * Features: reason selection, custom reason input, validation, auto-close on success.
 * 
 * Task 12: Create Report Review Dialog component
 * Requirements: 7.1-7.11, 12.1-12.9
 */

import { useState } from 'react'
import { CheckCircle, Loader2 } from 'lucide-react'
import { Modal } from '../../ui/Modal'
import { useAuth } from '../../../hooks/useAuth'
import { useLang } from '../../../state/useLang'
import { toast } from 'react-hot-toast'

export interface ReportReviewDialogProps {
  reviewId: string | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ReportReason {
  value: string
  label: { ar: string; en: string }
}

export const ReportReviewDialog = ({
  reviewId,
  isOpen,
  onClose,
  onSuccess
}: ReportReviewDialogProps) => {
  const { user } = useAuth()
  const { lang } = useLang()
  const [reason, setReason] = useState<string>('')
  const [customReason, setCustomReason] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const reasons: ReportReason[] = [
    { value: 'spam', label: { ar: 'رسائل مزعجة', en: 'Spam' } },
    { value: 'offensive', label: { ar: 'لغة مسيئة', en: 'Offensive Language' } },
    { value: 'spoilers', label: { ar: 'حرق للأحداث', en: 'Spoilers' } },
    { value: 'harassment', label: { ar: 'تحرش', en: 'Harassment' } },
    { value: 'other', label: { ar: 'أخرى', en: 'Other' } }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!reason) {
      toast.error(lang === 'ar' ? 'يرجى اختيار سبب الإبلاغ' : 'Please select a reason')
      return
    }
    
    if (reason === 'other' && !customReason.trim()) {
      toast.error(lang === 'ar' ? 'يرجى كتابة السبب' : 'Please provide a reason')
      return
    }
    
    if (!reviewId) return
    
    setIsSubmitting(true)
    
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || ''
      const response = await fetch(`${apiBase}/api/reviews/${reviewId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id}`
        },
        body: JSON.stringify({
          reason: reason === 'other' ? customReason : reason
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit report')
      }
      
      setShowSuccess(true)
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        onSuccess()
        onClose()
        setShowSuccess(false)
        setReason('')
        setCustomReason('')
      }, 2000)
    } catch (error: any) {
      if (error.message.includes('duplicate')) {
        toast.error(lang === 'ar' ? 'لقد أبلغت عن هذه المراجعة مسبقاً' : 'You have already reported this review')
      } else {
        toast.error(error.message || (lang === 'ar' ? 'فشل في إرسال البلاغ' : 'Failed to submit report'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!reviewId) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lang === 'ar' ? 'الإبلاغ عن مراجعة' : 'Report Review'}
      size="md"
    >
      {showSuccess ? (
        <div className="py-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-lumen-cream">
            {lang === 'ar' ? 'تم إرسال البلاغ بنجاح' : 'Report submitted successfully'}
          </p>
          <p className="text-sm text-zinc-500 mt-2">
            {lang === 'ar' ? 'سيتم مراجعته من قبل الفريق' : 'It will be reviewed by our team'}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Reason dropdown */}
          <div>
            <label className="block text-sm font-medium mb-2 text-lumen-cream">
              {lang === 'ar' ? 'سبب الإبلاغ' : 'Reason for reporting'}
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-[#1C1B1F] border border-zinc-800 text-white focus:outline-none focus:border-lumen-gold transition-colors hover:bg-[#0F0F14]"
              required
            >
              <option value="" className="bg-[#1C1B1F] text-white">
                {lang === 'ar' ? 'اختر السبب' : 'Select reason'}
              </option>
              {reasons.map((r) => (
                <option key={r.value} value={r.value} className="bg-[#1C1B1F] text-white">
                  {lang === 'ar' ? r.label.ar : r.label.en}
                </option>
              ))}
            </select>
          </div>
          
          {/* Custom reason text input (shown when "Other" is selected) */}
          {reason === 'other' && (
            <div>
              <label className="block text-sm font-medium mb-2 text-lumen-cream">
                {lang === 'ar' ? 'اكتب السبب' : 'Describe the reason'}
              </label>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white min-h-[100px] focus:outline-none focus:border-lumen-gold transition-colors resize-none"
                placeholder={lang === 'ar' ? 'اكتب السبب هنا...' : 'Write your reason here...'}
                maxLength={500}
              />
              <p className="text-xs text-zinc-500 mt-1">
                {customReason.length} / 500
              </p>
            </div>
          )}
          
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
              className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-500 disabled:opacity-50 transition-colors"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {lang === 'ar' ? 'جاري الإرسال...' : 'Submitting...'}
                </span>
              ) : (
                lang === 'ar' ? 'إرسال البلاغ' : 'Submit Report'
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
