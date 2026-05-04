/**
 * 🔔 Toast Manager - منع تكرار الإشعارات
 * 
 * @description نظام مركزي لإدارة الإشعارات ومنع التكرار
 * @author 4Cima Team
 */

import { toast as sonnerToast } from 'sonner'

// تتبع آخر إشعار تم عرضه
let lastToast: {
  message: string
  type: string
  time: number
} | null = null

// المدة الزمنية لمنع التكرار (بالميلي ثانية)
const DUPLICATE_THRESHOLD = 2000 // 2 ثانية

/**
 * التحقق من تكرار الإشعار
 */
function isDuplicate(message: string, type: string): boolean {
  if (!lastToast) return false
  
  const now = Date.now()
  const timeDiff = now - lastToast.time
  
  return (
    lastToast.message === message &&
    lastToast.type === type &&
    timeDiff < DUPLICATE_THRESHOLD
  )
}

/**
 * تحديث آخر إشعار
 */
function updateLastToast(message: string, type: string) {
  lastToast = {
    message,
    type,
    time: Date.now()
  }
}

/**
 * Toast Manager - يمنع تكرار الإشعارات
 */
export const toast = {
  /**
   * إشعار نجاح
   */
  success: (message: string, options?: any) => {
    if (isDuplicate(message, 'success')) return
    updateLastToast(message, 'success')
    sonnerToast.success(message, options)
  },

  /**
   * إشعار خطأ
   */
  error: (message: string, options?: any) => {
    if (isDuplicate(message, 'error')) return
    updateLastToast(message, 'error')
    sonnerToast.error(message, options)
  },

  /**
   * إشعار معلومات
   */
  info: (message: string, options?: any) => {
    if (isDuplicate(message, 'info')) return
    updateLastToast(message, 'info')
    sonnerToast.info(message, options)
  },

  /**
   * إشعار تحذير
   */
  warning: (message: string, options?: any) => {
    if (isDuplicate(message, 'warning')) return
    updateLastToast(message, 'warning')
    sonnerToast.warning(message, options)
  },

  /**
   * إشعار رسالة عادية
   */
  message: (message: string, options?: any) => {
    if (isDuplicate(message, 'message')) return
    updateLastToast(message, 'message')
    sonnerToast.message(message, options)
  },

  /**
   * إشعار مع Promise
   */
  promise: <T>(
    promise: Promise<T>,
    options: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    }
  ) => {
    // Promise toasts لا تحتاج فحص تكرار لأنها تتحدث تلقائياً
    return sonnerToast.promise(promise, options)
  },

  /**
   * إغلاق جميع الإشعارات
   */
  dismiss: (toastId?: string | number) => {
    sonnerToast.dismiss(toastId)
  }
}

/**
 * إعادة تعيين تتبع الإشعارات (للاختبار)
 */
export function resetToastTracking() {
  lastToast = null
}
