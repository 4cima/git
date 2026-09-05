/**
 * ClientInit - Client component that initializes auth on app load
 * Calls useInitAuth() hook to restore session and listen for auth changes
 */

'use client'

import { useEffect } from 'react'
import { useInitAuth } from '@/hooks/useInitAuth'

export function ClientInit() {
  useInitAuth()

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
