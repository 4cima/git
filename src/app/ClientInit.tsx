/**
 * ClientInit - Client component that initializes auth on app load
 * Calls useInitAuth() hook to restore session and listen for auth changes
 */

'use client'

import { useEffect } from 'react'
import { useInitAuth } from '@/hooks/useInitAuth'

export function ClientInit() {
  useInitAuth()

  /* تأكيد اللمس — كل ضغطة بتتلمس لحظة نزول الصباع (بلا أي انتظار):
     :active لوحدها بتتأخر جوه الصفوف القابلة للسكرول، فبنحط class فوري
     على أقرب عنصر تفاعلي ونشيله لو اللمسة اتحولت سكرول أو اترفعت. */
  useEffect(() => {
    const SEL = '.card-polished, a, button, [role="button"]'
    let pressed: Element | null = null
    let startY = 0
    const clear = () => {
      if (pressed) {
        pressed.classList.remove('touch-pressed')
        pressed = null
      }
    }
    const onStart = (e: TouchEvent) => {
      clear()
      const target = e.target as Element | null
      pressed = target?.closest?.(SEL) ?? null
      startY = e.touches[0]?.clientY ?? 0
      pressed?.classList.add('touch-pressed')
    }
    const onMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? 0
      if (pressed && Math.abs(y - startY) > 10) clear()
    }
    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: true })
    document.addEventListener('touchend', clear, { passive: true })
    document.addEventListener('touchcancel', clear, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', clear)
      document.removeEventListener('touchcancel', clear)
    }
  }, [])

  /* Monetag verification meta — متأجَّلة (تأجيل مش حذف):
     كانت في أول الـ <head> من السيرفر (تؤثر على أول رسمة) — الآن تُحقن
     في الـDOM بعد window load + idle، فتبقى متاحة لأي فحص تحقّق لاحق. */
  useEffect(() => {
    const inject = () => {
      if (document.querySelector('meta[name="monetag"]')) return
      const meta = document.createElement('meta')
      meta.name = 'monetag'
      meta.content = '3e29c37aa4e9905e68def8c15741a614'
      document.head.appendChild(meta)
    }
    const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }
    const onLoaded = () => {
      if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(inject, { timeout: 4000 })
      else setTimeout(inject, 2000)
    }
    if (document.readyState === 'complete') onLoaded()
    else window.addEventListener('load', onLoaded, { once: true })
  }, [])

  return null
}
