/**
 * 🎯 App Promo Types
 * أنواع البيانات لمكون App Promo Toast
 * 
 * @description تعريفات TypeScript لمكون التوست الترويجي
 * @author 4Cima Team
 * @version 1.0.0
 */

/**
 * حالة App Promo Toast Hook
 */
export interface AppPromoToastState {
  /** هل التوست مرئي؟ */
  isVisible: boolean;
  /** هل التوست في حالة الاختفاء؟ */
  isFadingOut: boolean;
  /** نسبة التقدم (0-100) */
  progress: number;
  /** دالة إغلاق التوست */
  handleDismiss: () => void;
  /** دالة فتح التطبيق */
  handleOpenApp: () => void;
}

/**
 * خصائص مكون App Promo Toast
 */
export interface AppPromoToastProps {
  /** رابط تحميل التطبيق (اختياري) */
  downloadUrl?: string;
}
