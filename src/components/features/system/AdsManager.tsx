'use client'

import { useEffect, useRef, useState } from 'react'
import { FLAGS } from '../../../lib/constants'
import { DIRECT_AD_FALLBACKS } from '../../../lib/directAds'

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
 * Mount an ad snippet DIRECTLY into the page DOM — no iframe, no srcdoc.
 *
 * CRITICAL — multiple Adsterra zones on the same page:
 * Every Adsterra inline snippet assigns the GLOBAL `atOptions` variable, so if
 * two snippets are mounted at the same time they overwrite each other and the
 * later invoke.js reads the wrong config → blank/white box. Only the first zone
 * (hero leaderboard) worked for this exact reason.
 *
 * Fix: run every snippet sequentially through a per-tab queue:
 *   1) set window.atOptions = this zone's config
 *   2) append THIS zone's invoke.js
 *   3) await its load (the async script reads atOptions right when it runs)
 *   4) move to the next snippet
 * Each invoke.js therefore still sees its own atOptions.
 *
 * Snippets without atOptions (simple HTML/scripts) are appended as plain nodes.
 */
let adsterraQueue: Promise<void> = Promise.resolve()

function mountAdInto(container: HTMLElement, html: string) {
  container.replaceChildren()

  // Parse the snippet into ordered { atOptions? | src? | raw? } segments.
  type Segment =
    | { atOptions: Record<string, unknown> }
    | { src: string; atOptions?: Record<string, unknown> }
    | { raw: string }
  const segments: Segment[] = []
  const tpl = document.createElement('template')
  tpl.innerHTML = html.trim()
  tpl.content.querySelectorAll('script').forEach((old) => {
    const src = old.getAttribute('src')
    const text = old.textContent || ''
    if (src) {
      segments.push({ src, atOptions: undefined })
      return
    }
    if (/atOptions\s*=/.test(text)) {
      const eq = text.match(/atOptions\s*=\s*/)
      if (eq) {
        // Balanced-brace scan: extract the object after `atOptions =` even when
        // it nests (e.g. `'params' : {}`) — the old non-greedy regex stopped at
        // the first `}` and produced invalid JS.
        let i = (eq.index ?? 0) + eq[0].length
        while (i < text.length && /\s/.test(text[i])) i++
        if (text[i] === '{') {
          let depth = 0
          let j = i
          for (; j < text.length; j++) {
            if (text[j] === '{') depth++
            else if (text[j] === '}') {
              depth--
              if (depth === 0) break
            }
          }
          if (depth === 0) {
            const rawObj = text.slice(i, j + 1)
            try {
              // eslint-disable-next-line no-new-func
              const parsed = new Function(`return (${rawObj});`)() as Record<string, unknown>
              segments.push({ atOptions: parsed })
              return
            } catch {
              // malformed — fall through and keep raw
            }
          }
        }
      }
    }
    segments.push({ raw: text })
  })
  if (segments.length === 0) {
    container.appendChild(tpl.content)
    return
  }

  const engine = async () => {
    for (const seg of segments) {
      if ('atOptions' in seg && seg.atOptions) {
        // Shield parallel invokes: each invoke.js sees its own zone config
        ;(window as unknown as { atOptions: Record<string, unknown> }).atOptions = seg.atOptions
        continue
      }
      if ('src' in seg) {
        await new Promise<void>((resolve) => {
          const s = document.createElement('script')
          s.src = seg.src!
          s.async = true
          s.onload = () => resolve()
          s.onerror = () => resolve()
          container.appendChild(s)
          // Failsafe: never block the queue forever
          window.setTimeout(resolve, 8000)
        })
        continue
      }
      if ('raw' in seg && seg.raw.trim()) {
        const s = document.createElement('script')
        s.textContent = seg.raw
        container.appendChild(s)
      }
    }
  }

  // Serialize across every AdsManager on the page (hero + side + footer…)
  adsterraQueue = adsterraQueue.then(engine)
}
/**
 * Renders an ad snippet directly in the page DOM. Network snippets (admin
 * configured) mount their live <script> tags so the ad network sees the real
 * page origin/referer; house ads stay sanitized HTML.
 */
function DirectAd({
  code,
  isNetwork,
  minHeight,
  frameClass,
}: {
  code: string
  isNetwork?: boolean
  minHeight?: number
  frameClass?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (isNetwork) {
      mountAdInto(el, code)
    } else {
      el.innerHTML = sanitizeAdHtml(code)
    }
    return () => {
      el.replaceChildren()
    }
  }, [code, isNetwork])
  return (
    <div className={frameClass?.trim() || undefined}>
      <div ref={ref} style={minHeight ? { minHeight } : undefined} />
    </div>
  )
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
  // 1) mediation serve — admin-configured network zone / house ad takes precedence
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
        // source: null → fall through to code-level direct snippets below
      }
    } catch {
      // serve failed → fall through to code-level direct snippets below
    }
  }

  // 2) code-level direct Adsterra snippets — last-resort fallback so the three
  //    banner zones (admin 728×90 / direct 300×250 / direct 160×600) always
  //    render on home even before admin mediation is configured.
  const fallback = position ? DIRECT_AD_FALLBACKS[position] : undefined
  if (fallback?.html) {
    return {
      id: 0,
      title: `direct:${position}`,
      type,
      content: fallback.html,
      position,
      isNetwork: true,
      width: fallback.width,
      height: fallback.height,
    }
  }

  // 3) legacy house endpoint (current home banner compatibility)
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
    // run their scripts IN THE PAGE (e.g. Adsterra banners) — the network
    // validates origin/referer, so iframe/srcdoc mounting gets rejected
    // (blank box). Mounted directly; house ads stay sanitized.
    const code = ad?.isNetwork ? raw : sanitizeAdHtml(raw)
    const h = ad?.height ? Math.max(60, Math.min(Number(ad.height), 600)) : 96
    // No device hiding — every format renders on every screen size.
    return (
      <div data-ad-slot={position || 'banner'}>
        <DirectAd
          code={code}
          isNetwork={ad?.isNetwork}
          minHeight={h}
          frameClass="overflow-hidden flex justify-center"
        />
      </div>
    )
  }

  if (type === 'preroll') {
    const raw = ad?.content || '<div>إعلان</div>'
    const code = ad?.isNetwork ? raw : sanitizeAdHtml(raw)
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
          <DirectAd code={code} isNetwork={ad?.isNetwork} />
        </div>
      </div>
    )
  }

  return null
}
