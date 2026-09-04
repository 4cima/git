'use client'

/**
 * إعلانات الشاشات المتخصصة لصفحات الكتالوج (الأفلام/المسلسلات):
 *
 * 1) MobileStickyAd — إعلان رقم 6 (320×50): شريط ثابت أسفل الشاشة للموبايل فقط
 *    (< lg)، قابل للإغلاق بزر ✕، ويختفي كليًا إذا فشل الإعلان (زون ميتة) —
 *    لا مربع فارغ أبدًا.
 *
 * 2) DesktopOnly — بوابة عرض: لا تركّب الأبناء إطلاقًا على الشاشات الصغيرة
 *    (matchMedia) — يمنع تحميل سكربت الإعلان نفسه على الموبايل بدل إخفائه بـCSS.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { FLAGS } from '../../../lib/constants'
import { AdsterraBanner } from './AdsterraBanner'
import { getAdByNum } from '@/data/ads/4cima.com'

const AD_MOBILE = getAdByNum(6)! // 320×50

export function MobileStickyAd() {
  const [closed, setClosed] = useState(false)
  const [failed, setFailed] = useState(false)
  const onFailure = useCallback(() => setFailed(true), [])

  if (!AD_MOBILE || AD_MOBILE.enabled === false || closed || failed || !FLAGS.ADS_ENABLED) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden" role="complementary" aria-label="إعلان">
      <div className="relative mx-auto w-fit max-w-full rounded-t-xl border-x border-t border-slate-700/60 bg-slate-950/95 px-1 pt-1 shadow-[0_-8px_30px_rgba(0,0,0,0.55)] backdrop-blur">
        <button
          onClick={() => setClosed(true)}
          aria-label="إغلاق الإعلان"
          className="absolute -top-8 right-1 flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-900/90 text-xs text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-100"
        >
          ✕
        </button>
        <AdsterraBanner ad={AD_MOBILE} onFailure={onFailure} />
      </div>
    </div>
  )
}

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