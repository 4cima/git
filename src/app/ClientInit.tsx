/**
 * ClientInit - Client component that initializes auth on app load
 * Calls useInitAuth() hook to restore session and listen for auth changes
 */

'use client'

import { useEffect } from 'react'
import { useInitAuth } from '@/hooks/useInitAuth'

export function ClientInit() {
  useInitAuth()

  /* تأكيد اللمس — كل ضغطة بتتلمس لحظة نزول الصباع (بلا أي انتظار) + ضمانة الفتح:
     1) :active بتتأخر جوه الصفوف القابلة للسكرول فبنحط class فوري على أقرب عنصر تفاعلي
        — تأثير إضاءة بس (بلا scale) عشان حدود العنصر ماتتحركش والكليك ماتفشلش.
     2) لو المتصفح ألغى كليك نقرة نظيفة على لينك (انحراف بالبكسل) بنستدينه بعد 100ms.
     3) اهتزازة تأكيد خفيفة بس للنقرات الحقيقية على مكوّنات — لا للفاضي ولا للسكرول. */
  useEffect(() => {
    const SEL = '.card-polished, a, button, [role="button"]'
    let pressed: Element | null = null
    let linkEl: HTMLAnchorElement | null = null
    let startX = 0
    let startY = 0
    let startAt = 0
    let clickPassed = false

    const markClick = () => { clickPassed = true }
    document.addEventListener('click', markClick, { capture: true, passive: true })

    const clearPress = () => {
      if (pressed) {
        pressed.classList.remove('touch-pressed')
        pressed = null
      }
    }

    const onStart = (e: TouchEvent) => {
      clearPress()
      const target = e.target as Element | null
      pressed = target?.closest?.(SEL) ?? null
      linkEl = (target?.closest?.('a[href]') as HTMLAnchorElement) ?? null
      const t = e.touches[0]
      startX = t?.clientX ?? 0
      startY = t?.clientY ?? 0
      startAt = Date.now()
      pressed?.classList.add('touch-pressed')
    }

    const onMove = (e: TouchEvent) => {
      if (!pressed) return
      const t = e.touches[0]
      if (Math.hypot((t?.clientX ?? 0) - startX, (t?.clientY ?? 0) - startY) > 10) clearPress()
    }

    const onEnd = (e: TouchEvent) => {
      clearPress()
      const t = e.changedTouches[0]
      const link = linkEl
      linkEl = null
      if (!t || !link) return
      const dx = t.clientX - startX
      const dy = t.clientY - startY
      if (Math.hypot(dx, dy) > 10 || Date.now() - startAt > 400) return
      // الإصبع لسه فعلاً على اللينك؟ لو انزلق بره فدي مش نية فتح
      const endTarget = document.elementFromPoint(t.clientX, t.clientY)
      const stillOn = !!endTarget && (link === endTarget || link.contains(endTarget) || endTarget.contains(link))
      if (!stillOn) return
      // نقرة حقيقية على مكوّن — اهتزازة تأكيد خفيفة (بيحترم إعدادات النظام)
      navigator.vibrate?.(10)
      // ضمانة الفتح — للأنكورات بس عشان مفيش تفعيل مزدوج للأزرار
      clickPassed = false
      window.setTimeout(() => {
        if (!clickPassed) link.click()
      }, 100)
    }

    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: true })
    document.addEventListener('touchend', onEnd, { passive: true })
    document.addEventListener('touchcancel', clearPress, { passive: true })
    return () => {
      document.removeEventListener('click', markClick, true)
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', clearPress)
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
