/**
 * 🎯 useAppPromoToast Hook
 * Hook لإدارة حالة Toast الترويج لتطبيق الأندرويد
 * 
 * @description يتحكم في إظهار/إخفاء التوست مع جميع الوظائف المطلوبة
 * @author Online Cinema Team
 * @version 1.0.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { AppPromoToastState } from '../types/appPromo';

// مفاتيح LocalStorage
const STORAGE_KEY_DISMISSED = 'app-promo-dismissed';
const STORAGE_KEY_SHOW_COUNT = 'app-promo-show-count';

// إعدادات التوقيت
const SHOW_DELAY = 2000; // 2 ثانية
const AUTO_DISMISS_DELAY = 8000; // 8 ثوانٍ
const FADE_OUT_DELAY = 7500; // 7.5 ثانية (قبل الإخفاء بـ 0.5 ثانية)
const PROGRESS_INTERVAL = 100; // تحديث التقدم كل 100ms

// الحد الأقصى لعدد مرات الظهور
const MAX_SHOW_COUNT = 3;

/**
 * التحقق من WebView (إخفاء التوست في التطبيق)
 * يدعم Android WebView و iOS WKWebView
 */
const isWebView = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  const isAndroidWebView = userAgent.includes('wv') || userAgent.includes('webview');
  const isIOSWebView = /(iphone|ipod|ipad).*applewebkit(?!.*safari)/i.test(userAgent);
  const hasReactNativeWebView = (window as any).ReactNativeWebView !== undefined;
  
  return isAndroidWebView || isIOSWebView || hasReactNativeWebView;
};

/**
 * الحصول على حالة الإغلاق من LocalStorage
 */
const getDismissState = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY_DISMISSED) === 'true';
  } catch {
    return false;
  }
};

/**
 * حفظ حالة الإغلاق في LocalStorage
 */
const setDismissState = (dismissed: boolean): void => {
  try {
    localStorage.setItem(STORAGE_KEY_DISMISSED, dismissed.toString());
  } catch {
    // تجاهل الأخطاء
  }
};

/**
 * الحصول على عدد مرات الظهور من LocalStorage
 */
const getShowCount = (): number => {
  try {
    const count = localStorage.getItem(STORAGE_KEY_SHOW_COUNT);
    return count ? parseInt(count, 10) : 0;
  } catch {
    return 0;
  }
};

/**
 * زيادة عدد مرات الظهور في LocalStorage
 */
const incrementShowCount = (): void => {
  try {
    const currentCount = getShowCount();
    localStorage.setItem(STORAGE_KEY_SHOW_COUNT, (currentCount + 1).toString());
  } catch {
    // تجاهل الأخطاء
  }
};

/**
 * Hook لإدارة Toast الترويج
 */
export const useAppPromoToast = (): AppPromoToastState => {
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [progress, setProgress] = useState(100);
  
  // مراجع للـ Timers
  const showTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fadeOutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  /**
   * تنظيف جميع Timers
   */
  const clearAllTimers = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (fadeOutTimerRef.current) {
      clearTimeout(fadeOutTimerRef.current);
      fadeOutTimerRef.current = null;
    }
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);
  
  /**
   * بدء شريط التقدم
   */
  const startProgress = useCallback(() => {
    setProgress(100);
    const startTime = Date.now();
    
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / AUTO_DISMISS_DELAY) * 100);
      setProgress(remaining);
      
      if (remaining === 0 && progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }, PROGRESS_INTERVAL);
  }, []);
  
  /**
   * معالج الإغلاق
   */
  const handleDismiss = useCallback(() => {
    setIsFadingOut(true);
    clearAllTimers();
    
    setTimeout(() => {
      setIsVisible(false);
      setIsFadingOut(false);
      setDismissState(true);
    }, 500); // مدة animation الاختفاء
  }, [clearAllTimers]);
  
  /**
   * معالج فتح التطبيق
   */
  const handleOpenApp = useCallback(() => {
    const downloadUrl = process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL || '/downloads/online-cinema.apk';
    window.open(downloadUrl, '_blank');
    handleDismiss();
  }, [handleDismiss]);
  
  /**
   * تهيئة التوست عند التحميل
   */
  useEffect(() => {
    // التحقق من الشروط
    const dismissed = getDismissState();
    const showCount = getShowCount();
    const inWebView = isWebView();
    
    // إظهار التوست فقط إذا:
    // 1. لم يتم إغلاقه من قبل
    // 2. عدد مرات الظهور أقل من الحد الأقصى
    // 3. ليس في WebView
    if (!dismissed && showCount < MAX_SHOW_COUNT && !inWebView) {
      // تأخير الظهور
      showTimerRef.current = setTimeout(() => {
        setIsVisible(true);
        incrementShowCount();
        startProgress();
        
        // بدء timer الاختفاء التدريجي
        fadeOutTimerRef.current = setTimeout(() => {
          setIsFadingOut(true);
        }, FADE_OUT_DELAY);
        
        // بدء timer الإخفاء النهائي
        dismissTimerRef.current = setTimeout(() => {
          setIsVisible(false);
          setIsFadingOut(false);
        }, AUTO_DISMISS_DELAY);
      }, SHOW_DELAY);
    }
    
    // تنظيف عند unmount
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers, startProgress]);
  
  return {
    isVisible,
    isFadingOut,
    progress,
    handleDismiss,
    handleOpenApp,
  };
};
