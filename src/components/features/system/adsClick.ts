'use client'

import { isHostAllowed } from '@/lib/adsAllowlist'

const SLOT = 'global-popunder'
const CACHE_KEY = `ads_serve_${SLOT}`
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes
const ZONE_KEY = '11691417'
const POPUP_COOLDOWN = 20000 // 20 seconds between popups
const CLICK_COOLDOWN = 2000 // 2 clicks in 2 seconds = 1 popup

export function preparePopunder() {
  if (typeof window === 'undefined') return

  try {
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp < CACHE_TTL) {
        return
      }
    }

    fetch(`/api/ads/serve?slot=${SLOT}`)
      .then(res => res.json())
      .then(data => {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }))
      })
      .catch(() => {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: null, timestamp: Date.now() }))
      })
  } catch {
    // Silent fail - fail-open
  }
}

export function firePopunderOnClick() {
  if (typeof window === 'undefined') return

  const now = Date.now()

  // Rate limiting: 20 seconds between popups
  const lastPopup = parseInt(localStorage.getItem('ads_last_popup') || '0', 10)
  if (now - lastPopup < POPUP_COOLDOWN) return

  // Rate limiting: 2 clicks in 2 seconds = 1 popup
  const lastClick = parseInt(localStorage.getItem('ads_last_click') || '0', 10)
  if (now - lastClick < CLICK_COOLDOWN) return
  localStorage.setItem('ads_last_click', now.toString())

  // Read cached ad config
  let cachedData: any = null
  try {
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached) {
      const { data } = JSON.parse(cached)
      cachedData = data
    }
  } catch {
    return
  }

  if (!cachedData) return
  if (cachedData.integration !== 'script') return

  const zoneKey = cachedData.zone_key || ZONE_KEY
  let scriptUrl = cachedData.script_url

  // Validate: use response URL only if https and allowed, otherwise fallback
  if (!scriptUrl || !isHostAllowed('propellerads', scriptUrl)) {
    scriptUrl = 'https://al5sm.com/tag.min.js'
  }

  // Final https check
  try {
    const url = new URL(scriptUrl)
    if (url.protocol !== 'https:') return
  } catch {
    return
  }

  // Inject script once per session
  if (sessionStorage.getItem('ads_script_injected')) return
  sessionStorage.setItem('ads_script_injected', '1')

  try {
    const script = document.createElement('script')
    script.src = scriptUrl
    script.setAttribute('data-zone', zoneKey)
    script.async = true
    document.body.appendChild(script)
    localStorage.setItem('ads_last_popup', now.toString())
  } catch {
    // Silent fail - fail-open
  }
}
