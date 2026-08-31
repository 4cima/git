import { useEffect, useState } from 'react'
import { FLAGS } from '../../../lib/constants'

type AdRow = {
  id: number
  title: string
  type: 'popunder' | 'banner' | 'preroll' | 'midroll'
  content: string
  position?: 'top' | 'bottom' | 'sidebar' | 'player' | 'global' | string | null
  /** network-sourced snippets are admin-configured and may contain scripts */
  isNetwork?: boolean
  integration?: 'script' | 'html' | 'click_url' | 'vast_url' | null
  scriptUrl?: string | null
  zoneKey?: string | null
  width?: number | null
  height?: number | null
}

type ServeResponse = {
  source?: 'network' | 'house' | null
  slot?: string
  integration?: 'script' | 'html' | 'click_url' | 'vast_url' | null
  script_url?: string | null
  html?: string | null
  click_url?: string | null
  vast_url?: string | null
  ad_id?: number | null
  provider_slug?: string | null
  zone_key?: string | null
  width?: number | null
  height?: number | null
}

type Props = {
  type: 'popunder' | 'banner' | 'preroll'
  position?: 'top' | 'bottom' | 'sidebar' | 'player' | 'global' | string
  onDone?: () => void
  durationSeconds?: number
}

function sanitizeAdHtml(input: string) {
  if (!input?.trim()) return ''
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(input, 'text/html')
    doc.querySelectorAll('script,iframe,object,embed,meta,base').forEach((node) => node.remove())
    doc.querySelectorAll('*').forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase()
        const value = (attr.value || '').trim().toLowerCase()
        if (name.startsWith('on')) {
          el.removeAttribute(attr.name)
          return
        }
        if ((name === 'href' || name === 'src' || name === 'xlink:href') && (value.startsWith('javascript:') || value.startsWith('data:text/html'))) {
          el.removeAttribute(attr.name)
        }
      })
    })
    return doc.body.innerHTML
  } catch {
    return ''
  }
}

/**
 * Wrap ad snippet in a complete HTML document so the sandboxed iframe has a
 * proper document — prevents the blank/white box (browsers render srcDoc
 * fragments with default white background and no centering).
 */
function wrapAdDoc(code: string) {
  return `<!DOCTYPE html><html dir="auto"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;width:100%;height:100%;background:transparent;overflow:hidden;display:flex;align-items:center;justify-content:center}iframe,ins,img{max-width:100%}</style></head><body>${code}</body></html>`
}

/**
 * Ad fetch — mediation first, legacy fallback, never throws:
 *  1) GET /api/ads/serve?slot=<position> (waterfall: network → house → null)
 *  2) legacy GET /api/ads (house table, banner compatibility)
 *  3) null → nothing rendered, page stays normal
 * NOTE: no impression/click calls anywhere — visitors never write to the DB.
 * script/click_url/vast_url integrations are NOT mounted in this task — only html.
 */
async function fetchAd(type: AdRow['type'], position?: string): Promise<AdRow | null> {
  // 1) mediation serve
  if (position) {
    try {
      const res = await fetch(`/api/ads/serve?slot=${encodeURIComponent(position)}`)
      if (res.ok) {
        const data: ServeResponse = await res.json()
        if (data?.source === 'network') {
          if (data.integration === 'html' && data.html) {
            return {
              id: 0,
              title: `network:${data.provider_slug || 'zone'}`,
              type,
              content: data.html,
              position,
              isNetwork: true,
              width: data.width ?? null,
              height: data.height ?? null,
            }
          }
          // script / click_url / vast_url are not mounted in this task
          return null
        }
        if (data?.source === 'house' && data.html) {
          return { id: data.ad_id ?? 0, title: 'house', type, content: data.html, position }
        }
        // source null → fall through to legacy endpoint quietly
      }
    } catch {
      // serve failed → legacy fallback
    }
  }

  // 2) legacy house endpoint (current home banner compatibility)
  try {
    const params = new URLSearchParams({ type })
    if (position) params.append('position', position)
    const response = await fetch(`/api/ads?${params.toString()}`)
    if (!response.ok) return null
    const data = await response.json()
    const ads = data.data || data
    return Array.isArray(ads) ? ads[0] || null : null
  } catch {
    return null
  }
}

export const AdsManager = ({ type, position, onDone, durationSeconds = 8 }: Props) => {
  const [ad, setAd] = useState<AdRow | null>(null)
  const [countdown, setCountdown] = useState(durationSeconds)

  // Reset countdown when ad changes
  useEffect(() => {
    setCountdown(durationSeconds)
  }, [durationSeconds, ad])

  // 1. Fetch ad — skipped entirely when ads are disabled
  useEffect(() => {
    if (!FLAGS.ADS_ENABLED) return
    let cancelled = false
    ;(async () => {
      const a = await fetchAd(type, position)
      if (!cancelled) {
        setAd(a)
        if (!a && type === 'preroll') {
          onDone?.()
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [type, position])

  // 2. Popunder — NOT mounted in this task (no listener anywhere, no visitor writes)

  // 3. Preroll Logic (Timer)
  useEffect(() => {
    if (type !== 'preroll' || !ad) return

    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(t)
          onDone?.()
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [type, ad, durationSeconds])

  // Render Logic
  if (!FLAGS.ADS_ENABLED) return null
  if (!ad) {
    // Return empty marker for banner slots to show placement
    if (type === 'banner') {
      return <div data-ad-slot={position || 'banner'} data-ad-empty="1" hidden />
    }
    return null
  }

  if (type === 'banner') {
    const raw = ad?.content || ''
    // Network snippets come from the admin-configured mediation panel and must
    // run their scripts (e.g. Adsterra banners) — mounted inside an opaque-
    // origin sandboxed iframe: scripts + popups allowed, same-origin access and
    // top-navigation (page hijack) blocked. House ads stay sanitized.
    const code = ad?.isNetwork ? raw : sanitizeAdHtml(raw)
    const sandbox = ad?.isNetwork
      ? 'allow-scripts allow-popups allow-popups-to-escape-sandbox'
      : 'allow-popups'
    const h = ad?.height ? Math.max(60, Math.min(Number(ad.height), 600)) : 96
    return (
      <div className={`rounded-md border border-zinc-800 bg-zinc-900 p-3 text-center overflow-hidden`}>
        <iframe
            srcDoc={wrapAdDoc(code)}
            style={{ height: h, backgroundColor: 'transparent' }}
            className="w-full border-0"
            sandbox={sandbox}
            title={`ad-${ad.id}`}
        />
      </div>
    )
  }

  if (type === 'preroll') {
    const raw = ad?.content || '<div>إعلان</div>'
    const code = ad?.isNetwork ? raw : sanitizeAdHtml(raw)
    const sandbox = ad?.isNetwork
      ? 'allow-scripts allow-popups allow-popups-to-escape-sandbox'
      : 'allow-popups'
    return (
      <div className="relative z-10 flex h-full w-full items-center justify-center bg-black/90">
        <div className="absolute right-3 top-3 text-xs text-white/80">ينتهي خلال {countdown}s</div>
        <div className="absolute left-3 top-3">
          <button
            onClick={() => onDone?.()}
            className="rounded-md bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
          >
            تخطي
          </button>
        </div>
        <div className="max-w-3xl rounded-md border border-zinc-700 bg-zinc-900 p-4 w-full h-[60vh]">
          <iframe
            srcDoc={wrapAdDoc(code)}
            style={{ backgroundColor: 'transparent' }}
            className="w-full h-full border-0"
            sandbox={sandbox}
            title={`ad-preroll-${ad.id}`}
          />
        </div>
      </div>
    )
  }

  return null
}
