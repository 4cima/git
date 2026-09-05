'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { FLAGS } from '../../../lib/constants'
import { buildAdsterraSnippet, mountAdInto, unmountAd } from './adsterraQueue'
import type { AdRecord } from '@/data/ads/4cima.com'

/**
 * Renders a specific code-level Adsterra zone (from src/data/ads/*) directly
 * in the page DOM. Bypasses DB mediation so an exact ad ("رقم 2") can be bound
 * to an exact slot. Uses the shared sequential queue so multiple zones on the
 * same page never fight over the global `atOptions` variable.
 *
 * Layout guarantee (no CLS, no side crop):
 *  - The outer box reserves its FINAL width & height from the very first paint:
 *      width  = min(ad.width, 100% of parent)
 *      height = width × ad.height ÷ ad.width  (aspect-ratio)
 *    So a 728×90 banner in a ~360px viewport is a 360×(≈44px) box from the
 *    start — it never starts at 0 and never grows when the iframe loads.
 *  - The inner "stage" keeps the ORIGINAL ad size and is scaled down with
 *    `transform: scale(containerWidth / ad.width)` centered horizontally only
 *    when the container is narrower than the ad. The ad is therefore always
 *    fully visible (never cropped by overflow:hidden).
 *
 * Failure policy (زون ميتة / دومين توصيل لا يُحلّ):
 *  - لا نُظهر أي بديل مرئي — عند الفشل يختفي البانر بالكامل (null) ويُبلَّغ
 *    الأب عبر onFailure ليعطل أي إطار زخرفي حوله. لا مربع أبيض ولا مكان محجوز.
 *  - كشف الفشل ذكي: لا يكتفي بوجود الـiframe (invoke.js يحقنها دائمًا)، بل يفحص
 *    محتواها (نفس الأصل — about:blank يرث أصل الصفحة): صورة إعلانية مكسورة أو
 *    جسم فارغ = فشل. ولو ظهر إعلان حقيقي يبقى ظاهرًا طبيعيًا.
 */
export const AdsterraBanner = ({
  ad,
  className,
  onFailure,
}: {
  ad: AdRecord
  className?: string
  onFailure?: () => void
}) => {
  const boxRef = useRef<HTMLDivElement>(null)   // reserved box (final displayed size)
  const stageRef = useRef<HTMLDivElement>(null) // ad mount point @ original px size, scaled
  const [failed, setFailed] = useState(false)
  const fail = useCallback(() => {
    setFailed(true)
    onFailure?.()
  }, [onFailure])

  useEffect(() => {
    const el = stageRef.current
    if (!el || !FLAGS.ADS_ENABLED) return
    mountAdInto(el, buildAdsterraSnippet(ad.key, ad.width, ad.height))
    return () => {
      // unmountAd يلغي أي تركيب قيد الانتظار في الطابور لهذه الحاوية
      // قبل تفريغها — يمنع تكرار الـ iframe مع StrictMode/إعادة التركيب
      unmountAd(el)
    }
  }, [ad.key, ad.width, ad.height])

  /* كشف فشل الإعلان — راجع التوثيق أعلاه */
  /* كشف فشل الإعلان — راجع التوثيق أعلاه */
  useEffect(() => {
    const stage = stageRef.current
    if (!stage || !FLAGS.ADS_ENABLED) return

    const timers: number[] = []
    const scheduled = new WeakSet<HTMLIFrameElement>()

    /** هل يبدو محتوى الـiframe إعلانًا حيًا؟ (نفس الأصل فالوصول متاح) */
    const iframeLooksAlive = (ifr: HTMLIFrameElement): boolean => {
      try {
        const doc = ifr.contentDocument
        if (!doc) return true // cross-origin غير قابل للفحص → نفترض أنه حي
        const imgs = Array.from(doc.images)
        if (imgs.length > 0) {
          // حي فقط لو صورة إعلانية واحدة على الأقل اكتمل تحميلها فعلًا
          return imgs.some((im) => im.complete && im.naturalWidth > 0)
        }
        const body = doc.body
        return !!body && (body.children.length > 0 || (body.textContent ?? '').trim().length > 0)
      } catch {
        return true // وصول مرفوع (بعض المتصفحات) → نفترض أنه حي
      }
    }

    const scheduleIframeCheck = (ifr: HTMLIFrameElement) => {
      if (scheduled.has(ifr)) return
      scheduled.add(ifr)
      // فحص أول بعد 6 ثوانٍ من حقن الـiframe (محتواها يتكتب تدريجيًا)
      timers.push(
        window.setTimeout(() => {
          if (!ifr.isConnected) return
          if (!iframeLooksAlive(ifr)) {
            fail()
            return
          }
          // فحص تأكيد ثانٍ (صورة كانت لا تزال قيد التحميل)
          timers.push(
            window.setTimeout(() => {
              if (ifr.isConnected && !iframeLooksAlive(ifr)) fail()
            }, 10000),
          )
        }, 6000),
      )
    }

    // راقب المحتوى المُضاف ديناميكيًا: كل iframe جديدة تُفحص محتواها
    const mo = new MutationObserver(() => {
      stage.querySelectorAll('iframe').forEach(scheduleIframeCheck)
    })
    mo.observe(stage, { childList: true, subtree: true })
    stage.querySelectorAll('iframe').forEach(scheduleIframeCheck)

    // لم يُحقن أي iframe إطلاقًا خلال 30 ثانية → فشل.
    // (التركيب متأجَّل الآن: window load + requestIdleCallback أو أول تفاعل —
    //  لذا المهلة أطول من قبل حتى لا يُحسب الإعلان فاشلاً وهو في انتظار فك القفل)
    timers.push(
      window.setTimeout(() => {
        if (!stage.querySelector('iframe')) fail()
      }, 30000),
    )

    return () => {
      timers.forEach((t) => window.clearTimeout(t))
      mo.disconnect()
    }
  }, [ad.key, ad.width, ad.height, fail])

  // Apply the scale BEFORE paint so the ad is never visible cropped, and keep
  // the box's height fixed (aspect-ratio already reserves it) — zero layout shift.
  useLayoutEffect(() => {
    const box = boxRef.current
    const stage = stageRef.current
    if (!box || !stage || typeof ResizeObserver === 'undefined') return

    const apply = () => {
      const scale = Math.min(1, box.clientWidth / ad.width)
      stage.style.transformOrigin = 'top center'
      stage.style.transform = scale < 1 ? `scale(${scale})` : 'none'
    }

    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(box)
    return () => ro.disconnect()
  }, [ad.width, ad.height])

  if (failed || !FLAGS.ADS_ENABLED) return null

  return (
    <div
      ref={boxRef}
      data-ad-slot={ad.id}
      data-ad-num={ad.num}
      className={className}
      style={{
        width: ad.width,
        maxWidth: '100%',
        aspectRatio: `${ad.width} / ${ad.height}`,
        marginInline: 'auto',
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        flexShrink: 1,
        position: 'relative',
      }}
    >
      <div ref={stageRef} style={{ width: ad.width, height: ad.height, flex: '0 0 auto' }} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* إطار زخرفي موحّد حول البانر — يختفي بالكامل عند فشل الإعلان          */
/* (بدل ترك إطار متدرج فاضيًا يعطي إيحاءً بمشكلة)                        */
/* ------------------------------------------------------------------ */

const FRAME_X = 'rounded-2xl bg-gradient-to-l from-red-500/60 via-slate-700/70 to-blue-500/60 p-[1.5px] shadow-lg shadow-slate-950/70'
const FRAME_Y = 'rounded-2xl bg-gradient-to-b from-blue-500/60 via-slate-700/70 to-red-500/60 p-[1.5px] shadow-lg shadow-slate-950/70'

export function AdFrame({ ad, variant }: { ad: AdRecord; variant: 'x' | 'y' }) {
  const [failed, setFailed] = useState(false)
  const onFailure = useCallback(() => setFailed(true), [])
  if (failed || !FLAGS.ADS_ENABLED) return null
  if (variant === 'y') {
    return (
      <div className={`${FRAME_Y} w-full`}>
        <div className="rounded-[14.5px] bg-slate-950 p-1 flex justify-center">
          <AdsterraBanner ad={ad} onFailure={onFailure} />
        </div>
      </div>
    )
  }
  return (
    <div className={`w-fit ${FRAME_X}`}>
      <div className="rounded-[14.5px] bg-slate-950 p-1">
        <AdsterraBanner ad={ad} onFailure={onFailure} />
      </div>
    </div>
  )
}
