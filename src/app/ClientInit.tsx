/**
 * ClientInit - Client component that initializes auth on app load
 * Calls useInitAuth() hook to restore session and listen for auth changes
 */

'use client'

import { useEffect } from 'react'
import { useInitAuth } from '@/hooks/useInitAuth'

export function ClientInit() {
  useInitAuth()

  /* تأكيد اللمس — الحكم بالسكرول الفعلي مش انحراف الصباع (يحل غموض صفوف الرئيسية
     بين نقرة/سكرول عمودي/سكرول أفقي): لو الصفحة والصف ماتحركوش = دي ضغطة مضمونة.
     + ضمانة الفتح (استرجاع كليك لينك ملغي بعد 100ms) + اهتزاز تأكيد يقرأ
     مفتاح fc_haptics من localStorage (بيتزامن من إعدادات التطبيق النايتيف). */
  useEffect(() => {
    const SEL = '.card-polished, a, button, [role="button"]'
    let pressed: Element | null = null
    let linkEl: HTMLAnchorElement | null = null
    let rowEl: HTMLElement | null = null
    let scrollX0 = 0
    let scrollY0 = 0
    let rowScroll0 = 0
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
      rowEl = (target?.closest?.('.horizontal-scroll') as HTMLElement | null) ?? null
      scrollX0 = window.scrollX
      scrollY0 = window.scrollY
      rowScroll0 = rowEl?.scrollLeft ?? 0
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
      // هل اتحركت حاجة فعلًا؟ (صفحة/صف) — ده الفيصل بين الضغطة والسحب
      const pageMoved = Math.abs(window.scrollX - scrollX0) > 8 || Math.abs(window.scrollY - scrollY0) > 8
      const rowMoved = rowEl ? Math.abs(rowEl.scrollLeft - rowScroll0) > 8 : false
      if (pageMoved || rowMoved) return
      if (Date.now() - startAt > 600) return
      // الإصبع لسه فعلاً على اللينك؟ لو انزلق بره فدي مش نية فتح
      const endTarget = document.elementFromPoint(t.clientX, t.clientY)
      const stillOn = !!endTarget && (link === endTarget || link.contains(endTarget) || endTarget.contains(link))
      if (!stillOn) return
      // نقرة حقيقية على مكوّن — اهتزازة تأكيد (لو مفعّلة من إعدادات التطبيق)
      let hapticsOff = false
      try { hapticsOff = localStorage.getItem('fc_haptics') === 'off' } catch { }
      if (!hapticsOff) navigator.vibrate?.(10)
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
