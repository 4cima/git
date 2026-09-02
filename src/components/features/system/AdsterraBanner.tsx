'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
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
 */
export const AdsterraBanner = ({ ad, className }: { ad: AdRecord; className?: string }) => {
  const boxRef = useRef<HTMLDivElement>(null)   // reserved box (final displayed size)
  const stageRef = useRef<HTMLDivElement>(null) // ad mount point @ original px size, scaled

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

  if (!FLAGS.ADS_ENABLED) return null

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
      }}
    >
      <div ref={stageRef} style={{ width: ad.width, height: ad.height, flex: '0 0 auto' }} />
    </div>
  )
}
