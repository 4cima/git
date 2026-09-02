'use client'

import { useEffect, useRef } from 'react'
import { FLAGS } from '../../../lib/constants'
import { buildAdsterraSnippet, mountAdInto, unmountAd } from './adsterraQueue'
import type { AdRecord } from '@/data/ads/4cima.com'

/**
 * Renders a specific code-level Adsterra zone (from src/data/ads/*) directly
 * in the page DOM. Bypasses DB mediation so an exact ad ("رقم 2") can be bound
 * to an exact slot. Uses the shared sequential queue so multiple zones on the
 * same page never fight over the global `atOptions` variable.
 */
export const AdsterraBanner = ({ ad, className }: { ad: AdRecord; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !FLAGS.ADS_ENABLED) return
    mountAdInto(el, buildAdsterraSnippet(ad.key, ad.width, ad.height))
    return () => {
      // unmountAd يلغي أي تركيب قيد الانتظار في الطابور لهذه الحاوية
      // قبل تفريغها — يمنع تكرار الـ iframe مع StrictMode/إعادة التركيب
      unmountAd(el)
    }
  }, [ad.key, ad.width, ad.height])

  if (!FLAGS.ADS_ENABLED) return null

  return (
    <div
      ref={ref}
      data-ad-slot={ad.id}
      data-ad-num={ad.num}
      className={className}
      style={{ minHeight: ad.height, width: '100%', maxWidth: ad.width, marginInline: 'auto' }}
    />
  )
}
