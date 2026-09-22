'use client'

/**
 * إعلانات الشاشات المتخصصة لصفحات الكتالوج (الأفلام/المسلسلات):
 *
 * 1) MobileStickyAd — الستيتشي السفلي للموبايل: أصبح سلوت ذكي (adsV2) —
 *    Vignette Banner (Monetag) لو مفعّل في src/config/adsV2.ts، وإلا بنر
 *    Adsterra 320×50 القديم. قابل للإغلاق، ويختفي كليًا عند فشل الإعلان.
 *
 * 2) DesktopOnly — بوابة عرض: لا تركّب الأبناء إطلاقًا على الشاشات الصغيرة
 *    (matchMedia) — يمنع تحميل سكربت الإعلان نفسه على الموبايل بدل إخفائه بـCSS.
 */
import { useEffect, useState, type ReactNode } from 'react'

export { StickyBottomAd as MobileStickyAd } from './adsV2'

/** يعرض الأبناء على الشاشات الكبيرة فقط (≥1024px) — لا يُحمَّل سكربت الإعلان على الموبايل */
export function DesktopOnly({ children }: { children: ReactNode }) {
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = () => setIsDesktop(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  if (!isDesktop) return null
  return <>{children}</>
}
