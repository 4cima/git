'use client'

import { isHostAllowed } from '@/lib/adsAllowlist'

const SLOT = 'global-popunder'
const CACHE_KEY = `ads_serve_${SLOT}`
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes
const SCRIPT_INJECTED_KEY = 'ads_script_injected'
const ZONE_KEY = '11691417'

let cachedResponse: any = null
let scriptInjected = false
let lastPopupTime = 0
let lastClickTime = 0

export function preparePopunder() {
  if (typeof window === 'undefined') return

  try {
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp < CACHE_TTL) {
        cachedResponse = data
        return
      }
    }

    fetch(`/api/ads/serve?slot=${SLOT}`)
      .then(res => res.json())
      .then(data => {
        cachedResponse = data
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }))
      })
      .catch(() => {})
  } catch {
    // Silent fail
  }
}

export function firePopunderOnClick() {
  if (typeof window === 'undefined') return

  const now = Date.now()
  
  // Rate limiting: 20 seconds between popups
  if (now - lastPopupTime < 20000) return
  
  // Rate limiting: 2 clicks in 2 seconds = 1 popup
  if (now - lastClickTime < 2000) return
  lastClickTime = now

  if (!cachedResponse) return
  if (cachedResponse.type !== 'script') return
  if (!cachedResponse.script_url) return

  const scriptUrl = cachedResponse.script_url
  if (!isHostAllowed('custom', scriptUrl)) return

  // Inject script once per session
  if (scriptInjected) return
  scriptInjected = true
  sessionStorage.setItem(SCRIPT_INJECTED_KEY, '1')

  try {
    const script = document.createElement('script')
    script.src = scriptUrl
    script.setAttribute('data-zone', ZONE_KEY)
    script.async = true
    document.body.appendChild(script)
    lastPopupTime = now
  } catch {
    // Silent fail
  }
}
