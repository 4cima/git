/**
 * adsClick.ts — fire-and-forget popunder trigger for USER CLICKS only.
 * Used on movie/series cards and the watch buttons. NEVER a document-wide listener.
 *
 * Flow: FLAGS check → frequency (localStorage) → GET /api/ads/serve?slot=global-popunder
 *   → source null / error / inactive = no-op (fail-open — navigation never blocked)
 *   → click_url  : window.open (http/https only)
 *   → script     : inject https script once, host must be in the network allowlist
 * No visitor DB writes. No VAST. No preloading of all networks.
 */
import { FLAGS } from '@/lib/constants'
import { isHostAllowed } from '@/lib/adsAllowlist'

const SLOT = 'global-popunder'
// localStorage keys:
//   cinma_ad_pop_<zoneId>    — per-zone frequency (ms timestamp when last fired)
//   cinma_ad_script_<zoneId> — script already injected (element id)
//   cinma_ad_block_until     — global no-request cooldown after a null/error response
const FREQ_KEY_PREFIX = 'cinma_ad_pop_'
const SCRIPT_KEY_PREFIX = 'cinma_ad_script_'
const BLOCK_KEY = 'cinma_ad_block_until'
const BLOCK_MS = 60 * 60 * 1000 // at least 1 hour

const POPUNDER_TYPES = new Set(['popunder', 'interstitial'])

type ServeResp = {
  source?: 'network' | 'house' | null
  type?: string | null
  integration?: 'script' | 'html' | 'click_url' | 'vast_url' | null
  script_url?: string | null
  click_url?: string | null
  provider_slug?: string | null
  zone_id?: number | null
  zone_key?: string | null
  frequency_hours?: number | null
}

function getSuffix(zoneId: number | null | undefined, zoneKey: string | null | undefined): string {
  return zoneId && zoneId > 0 ? String(zoneId) : (zoneKey || 'x')
}

function underFrequencyCap(key: string, hours: number): boolean {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return true
    const last = parseInt(raw, 10)
    if (!Number.isFinite(last)) return true
    const windowMs = (Number.isFinite(hours) && hours > 0 ? hours : 24) * 3600 * 1000
    return Date.now() - last >= windowMs
  } catch {
    return true // storage unavailable → allow
  }
}

/** No serve request while a block is active (set after null/error responses). */
function isBlocked(): boolean {
  try {
    const raw = localStorage.getItem(BLOCK_KEY)
    if (!raw) return false
    const ts = parseInt(raw, 10)
    return Number.isFinite(ts) && Date.now() - ts < BLOCK_MS
  } catch {
    return false
  }
}

function startBlock() {
  try {
    localStorage.setItem(BLOCK_KEY, String(Date.now()))
  } catch {
    /* ignore */
  }
}

function recordFired(key: string) {
  try {
    localStorage.setItem(key, String(Date.now()))
  } catch {
    /* ignore */
  }
}

function isSafeUrl(value: string | null | undefined): value is string {
  if (!value) return false
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Call from a click handler (card / watch button). Returns immediately;
 * everything else is async + fail-open. The ad NEVER blocks navigation.
 *
 * Zero database weight from visitors:
 *  - ADS_ENABLED=false → no request at all
 *  - active block in localStorage (from a previous null/error response) → no request
 *  - only one zone script ever injected (https + allowlist, once per session)
 *  - no impression/click writes anywhere
 */
export function firePopunderOnClick(): void {
  if (typeof window === 'undefined') return
  if (!FLAGS.ADS_ENABLED) return
  if (isBlocked()) return

  void (async () => {
    try {
      const res = await fetch(`/api/ads/serve?slot=${SLOT}`, { cache: 'no-store' })
      if (!res.ok) {
        startBlock()
        return
      }

      const data: ServeResp = await res.json()
      if (!data || data.source !== 'network') {
        // no ad available right now → don't hammer the DB on every card click
        startBlock()
        return
      }
      if (!POPUNDER_TYPES.has(data.type || '')) {
        startBlock()
        return
      }

      const freqHours = Number(data.frequency_hours) || 24
      const suffix = getSuffix(data.zone_id, data.zone_key)
      const freqKey = `${FREQ_KEY_PREFIX}${suffix}`
      if (!underFrequencyCap(freqKey, freqHours)) return

      const integration = data.integration

      if (integration === 'click_url') {
        // popup must come from a real user gesture — this is inside the click handler chain
        const url = isSafeUrl(data.click_url) ? data.click_url : null
        if (!url) return
        window.open(url, '_blank', 'noopener,noreferrer')
        recordFired(freqKey)
        return
      }

      if (integration === 'script') {
        const url = data.script_url
        if (!isSafeUrl(url)) return
        if (!/^https:/.test(url)) return // https-only
        if (!isHostAllowed(data.provider_slug || 'custom', url)) return

        const scriptKey = `${SCRIPT_KEY_PREFIX}${suffix}`
        // load once per page session
        if (document.getElementById(scriptKey)) return
        const s = document.createElement('script')
        s.id = scriptKey
        s.src = url
        s.async = true
        s.onload = () => recordFired(freqKey)
        s.onerror = () => recordFired(freqKey) // fail-open: never break the app
        document.head.appendChild(s)
        return
      }

      // html / vast_url / house → never opened from a click here
    } catch {
      startBlock() // fail-open — and back off for an hour
    }
  })()
}