'use client'

/**
 * كارت الإعلان رقم 5 (160×300) جوه صفوف الرئيسية — نفس شكل ومقاس كارت الفيلم/المسلسل تمامًا:
 * كارت كل 20 كارت + كارت في المكان الفاضي أسفل القائمة.
 * (ملف مشترك بين HomeTrendingSections و HomeExtraSections لتجنّب الاستيراد الدائري)
 */
import { AdsterraBanner } from '@/components/features/system/AdsterraBanner'
import { getAdByNum } from '@/data/ads/4cima.com'

export const AD_IN_ROW = getAdByNum(5)!
export const AD_EVERY_N_CARDS = 20

/** كارت الإعلان رقم 5 — نفس شكل ومقاس كارت الفيلم/المسلسل تمامًا */
export function AdInRowCard({ pos }: { pos: string }) {
  return (
    <div className="flex-shrink-0 w-40 sm:w-48" data-ad-card-pos={pos}>
      <div className="bg-slate-900/20 border border-slate-800/60 rounded-2xl overflow-hidden flex flex-col relative">
        <div className="w-full relative overflow-hidden bg-slate-950 flex items-center justify-center">
          <AdsterraBanner ad={AD_IN_ROW} />
        </div>
      </div>
    </div>
  )
}
