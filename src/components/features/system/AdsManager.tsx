import { useEffect, useRef, useState } from 'react'
import { FLAGS } from '../../../lib/constants'
import { errorLogger } from '../../../services/errorLogging'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

type AdRow = {
  id: number
  title: string
  type: 'popunder' | 'banner' | 'preroll' | 'midroll'
  content: string
  position?: 'top' | 'bottom' | 'sidebar' | 'player' | 'global' | string | null
  active?: boolean | null
  impressions?: number | null
  clicks?: number | null
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

function extractSafeAdUrl(input: string) {
  const fromHref = input.match(/href\s*=\s*["'](https?:\/\/[^"']+)["']/i)?.[1]
  const fromRaw = input.match(/https?:\/\/[^\s"'<>]+/i)?.[0]
  const candidate = fromHref || fromRaw
  if (!candidate) return null
  try {
    const url = new URL(candidate)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
}

async function fetchAd(type: AdRow['type'], position?: string) {
  try {
    const params = new URLSearchParams({ active: 'true', type })
    if (position) params.append('position', position)
    
    const response = await fetch(`${API_BASE}/api/ads?${params.toString()}`)
    if (!response.ok) return null
    
    const ads = await response.json() as AdRow[]
    return ads[0] || null
  } catch {
    return null
  }
}

async function incImpression(ad: AdRow) {
  try {
    await fetch(`${API_BASE}/api/ads/${ad.id}/impression`, { method: 'POST' })
  } catch (err: any) {
    errorLogger.logError({
      message: 'Failed to increment ad impression',
      severity: 'low',
      category: 'ads',
      context: { adId: ad.id, error: err }
    })
  }
}

async function incClick(ad: AdRow) {
  try {
    await fetch(`${API_BASE}/api/ads/${ad.id}/click`, { method: 'POST' })
  } catch (err: any) {
    errorLogger.logError({
      message: 'Failed to increment ad click',
      severity: 'low',
      category: 'ads',
      context: { adId: ad.id, error: err }
    })
  }
}

export const AdsManager = ({ type, position, onDone, durationSeconds = 8 }: Props) => {
  const [ad, setAd] = useState<AdRow | null>(null)
  const [countdown, setCountdown] = useState(durationSeconds)
  const onceRef = useRef(false)

  // Reset countdown when ad changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCountdown(durationSeconds)
  }, [ad?.id, durationSeconds])

  // 1. Fetch Ad
  useEffect(() => {
    if (!FLAGS.ADS_ENABLED) {
      if (type === 'preroll') onDone?.()
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const a = await fetchAd(type, position)
        if (!cancelled) {
          setAd(a)
          if (!a && type === 'preroll') {
            onDone?.()
          }
        }
      } catch {
        if (!cancelled) {
          setAd(null)
          if (type === 'preroll') {
            onDone?.()
          }
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [type, position])

  // 2. Impressions
  useEffect(() => {
    if (!ad) return
    incImpression(ad).catch(() => {})
  }, [ad])

  // 3. Popunder Logic
  useEffect(() => {
    if (type !== 'popunder' || !ad) return
    const key = 'cinma_popunder_once'
    if (sessionStorage.getItem(key) === '1') return
    const handler = () => {
      if (onceRef.current) return
      onceRef.current = true
      sessionStorage.setItem(key, '1')
      const safeUrl = extractSafeAdUrl(ad.content || '')
      if (!safeUrl) return
      const w = window.open(safeUrl, '_blank', 'noopener,noreferrer')
      if (w) incImpression(ad).catch(() => {})
    }
    document.addEventListener('click', handler, { once: true })
    return () => document.removeEventListener('click', handler)
  }, [type, ad])

  // 4. Preroll Logic (Timer)
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
  if (!ad) return null

  if (type === 'banner') {
    const sanitizedCode = sanitizeAdHtml(ad?.content || '')
    return (
      <div
        className={`rounded-md border border-zinc-800 bg-zinc-900 p-3 text-center overflow-hidden`}
        onClick={() => ad && incClick(ad)}
      >
        <iframe 
            srcDoc={sanitizedCode} 
            className="w-full h-24 border-0" 
            sandbox="allow-popups"
            title={`ad-${ad.id}`}
        />
      </div>
    )
  }

  if (type === 'preroll') {
    const sanitizedCode = sanitizeAdHtml(ad?.content || '<div>إعلان</div>')
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
            srcDoc={sanitizedCode} 
            className="w-full h-full border-0"
            sandbox="allow-popups"
            title={`ad-preroll-${ad.id}`}
          />
        </div>
      </div>
    )
  }

  return null
}
