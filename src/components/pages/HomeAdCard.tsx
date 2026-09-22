'use client'

/**
 * كارت الإعلان في نهاية الصفوف الأفقية بالرئيسية (سلوت ذكي adsV2):
 *  - Native Banner (Adsterra) لو مفعّل في src/config/adsV2.ts (المستقبل).
 *  - وإلا الزون 5 القديمة (160×300) — وهي معطّلة حاليًا (دومين توصيل ميت)
 *    فلا يُحمَّل أي سكربت ولا يُحجز مكان.
 * (لا يوضع داخل جريد الكتالوج: كارت إعلان داخل شبكة متغيرة الأعمدة يكسر اكتمال الصفوف)
 */
import { useState } from 'react'
import { AdsterraBanner } from '@/components/features/system/AdsterraBanner'
import { NativeCardSlot } from '@/components/features/system/adsV2'
import { hasScriptSrc, ADS_V2 } from '@/config/adsV2'
import { getAdByNum } from '@/data/ads/4cima.com'

export const AD_IN_ROW = getAdByNum(5)!

/** الزون 5 معطّلة حاليًا (دومين التوصيل ميت) — لا يُحمَّل أي سكربت ولا يُحجز مكان */
export const AD_IN_ROW_ENABLED = AD_IN_ROW.enabled !== false

/**
 * نفس شكل ومقاس كارت الفيلم/المسلسل تمامًا.
 * سياسة الفشل (نفس سياسة AdsterraBanner): عند فشل الإعلان يبقى الكارت محجوزًا
 * بمقاسه النهائي لكن visibility:hidden — إخفاؤه كليًا (null) كان يزق بقية
 * الصف الأفقي بعد ثوانٍ من التحميل ويسبب CLS حقيقيًا عند الزوار.
 */
export function AdInRowCard({ pos }: { pos: string }) {
  const [failed, setFailed] = useState(false)
  const nativeActive = hasScriptSrc(ADS_V2.native)
  if (!nativeActive && !AD_IN_ROW_ENABLED) return null
  return (
    <div
      className="flex-shrink-0 w-40 sm:w-48"
      data-ad-card-pos={pos}
      style={failed ? { visibility: 'hidden' } : undefined}
    >
      <div className="bg-slate-900/20 border border-slate-800/60 rounded-2xl overflow-hidden flex flex-col relative">
        <div className="w-full relative overflow-hidden bg-slate-950 flex items-center justify-center">
          {nativeActive ? (
            <NativeCardSlot fit="row" />
          ) : (
            <AdsterraBanner ad={AD_IN_ROW} onFailure={() => setFailed(true)} />
          )}
        </div>
      </div>
    </div>
  )
}
