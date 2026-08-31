import { useEffect, useRef, useState } from 'react'
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
 * Mount an ad snippet DIRECTLY into the page DOM — no iframe, no srcdoc.
 * Ad networks (Adsterra, PropellerAds…) validate the request origin/referer;
 * a sandboxed srcdoc iframe has a null origin and sends no referer, so the
 * network refuses to fill → blank box.
 * Uses <template>.innerHTML so top-level <script> tags (Adsterra snippets
 * start with one) are captured — DOMParser().body would drop them into <head>.
 * Scripts are re-created as live <script> elements so they execute.
 * Snippets come from the admin-configured mediation panel (trusted source).
 */
function mountAdInto(container: HTMLElement, html: string) {
  container.replaceChildren()
  const tpl = document.createElement('template')
  tpl.innerHTML = html.trim()
  tpl.content.querySelectorAll('script').forEach((old) => {
    const s = document.createElement('script')
    for (const a of Array.from(old.attributes)) s.setAttribute(a.name, a.value)
    s.textContent = old.textContent
    old.replaceWith(s)
  })
  container.appendChild(tpl.content)
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
  mobileClass,
}: {
  code: string
  isNetwork?: boolean
  minHeight?: number
  frameClass?: string
  /** e.g. 'hidden md:block' for 728×90, 'hidden lg:block' for 160×600 */
  mobileClass?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [empty, setEmpty] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    setEmpty(false)
    if (isNetwork) {
      mountAdInto(el, code)
    } else {
      el.innerHTML = sanitizeAdHtml(code)
    }
    // No creative within 4s → hide the slot entirely (no empty/white box)
    const t = setTimeout(() => {
      const filled =
        el.querySelector('iframe,ins,img,a,video,embed,object') ||
        (el.firstElementChild && el.firstElementChild.tagName !== 'SCRIPT')
      if (!filled) setEmpty(true)
    }, 4000)
    return () => {
      clearTimeout(t)
      el.replaceChildren()
    }
  }, [code, isNetwork])
  if (empty) return null
  return (
    <div className={`${frameClass || ''} ${mobileClass || ''}`.trim() || undefined}>
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
    // run their scripts IN THE PAGE (e.g. Adsterra banners) — the network
    // validates origin/referer, so iframe/srcdoc mounting gets rejected
    // (blank box). Mounted directly; house ads stay sanitized.
    const code = ad?.isNetwork ? raw : sanitizeAdHtml(raw)
    const h = ad?.height ? Math.max(60, Math.min(Number(ad.height), 600)) : 96
    // Desktop-only formats never show on mobile (no horizontal scroll / dead space)
    const w = Number(ad?.width) || 0
    const adH = Number(ad?.height) || 0
    const isWide = w >= 600
    const mobileClass = isWide ? 'hidden md:block' : w <= 300 && adH >= 400 ? 'hidden lg:block' : ''
    // Wide leaderboards (728×90) fill the row with TWO units side by side on
    // desktop — one centered unit leaves >50% of the screen empty.
    if (isWide) {
      return (
        <div
          data-ad-slot={position || 'banner'}
          className="hidden w-full flex-row items-stretch justify-center gap-2 md:flex"
        >
          <DirectAd
            code={code}
            isNetwork={ad?.isNetwork}
            minHeight={h}
            frameClass="min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-900 p-2 text-center overflow-hidden flex justify-center"
          />
          <DirectAd
            code={code}
            isNetwork={ad?.isNetwork}
            minHeight={h}
            frameClass="min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-900 p-2 text-center overflow-hidden flex justify-center"
          />
        </div>
      )
    }
    return (
      <div data-ad-slot={position || 'banner'}>
        <DirectAd
          code={code}
          isNetwork={ad?.isNetwork}
          minHeight={h}
          frameClass="rounded-md border border-zinc-800 bg-zinc-900 p-3 text-center overflow-hidden flex justify-center"
          mobileClass={mobileClass}
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
