'use client'

import { isHostAllowed } from '@/lib/adsAllowlist'
import { FLAGS } from '@/lib/constants'

const SLOT = 'global-popunder'
const CACHE_KEY = `ads_serve_${SLOT}`
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes
const ZONE_KEY = '11691417'
const FALLBACK_SCRIPT = 'https://al5sm.com/tag.min.js'
const POPUP_COOLDOWN = 20000 // 20 seconds between popups
const CLICK_COOLDOWN = 2000 // 2 clicks in 2 seconds = 1 popup

let scriptInjected = false

function injectScript(config: any) {
  if (typeof window === 'undefined') return
  if (scriptInjected) return
  if (sessionStorage.getItem('ads_script_injected')) {
    scriptInjected = true
    return
  }

  if (!config || config.integration !== 'script') return

  const zoneKey = config.zone_key || ZONE_KEY
  let scriptUrl = config.script_url

  if (!scriptUrl || !isHostAllowed('propellerads', scriptUrl)) {
    scriptUrl = FALLBACK_SCRIPT
  }

  try {
    const url = new URL(scriptUrl)
    if (url.protocol !== 'https:') return
  } catch {
    return
  }

  scriptInjected = true
  sessionStorage.setItem('ads_script_injected', '1')

  try {
    const script = document.createElement('script')
    script.src = scriptUrl
    script.setAttribute('data-zone', zoneKey)
    script.async = true
    document.body.appendChild(script)
  } catch {
    // Silent fail - fail-open
  }
}

export function preparePopunder() {
  if (typeof window === 'undefined') return

  if (!FLAGS.ADS_ENABLED) return

  if (scriptInjected) return
  if (sessionStorage.getItem('ads_script_injected')) {
    scriptInjected = true
    return
  }

  try {
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp < CACHE_TTL) {
        injectScript(data)
        return
      }
    }

    fetch(`/api/ads/serve?slot=${SLOT}`)
      .then(res => res.json())
      .then(data => {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }))
        injectScript(data)
      })
      .catch(() => {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: null, timestamp: Date.now() }))
        injectScript({ integration: 'script', zone_key: ZONE_KEY, script_url: FALLBACK_SCRIPT })
      })
  } catch {
    injectScript({ integration: 'script', zone_key: ZONE_KEY, script_url: FALLBACK_SCRIPT })
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

  // Update last popup time - script is already loaded and handles the actual popup
  localStorage.setItem('ads_last_popup', now.toString())
}
