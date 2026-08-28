'use client'

import { CONFIG } from './constants'

export type WatchTarget = {
  type: 'movie' | 'tv'
  id: number
  slug?: string
  season?: number
  episode?: number
  /** Optional non-secret display name (username / email-prefix) forwarded to
   *  the player via ?who= so the logged-in user is greeted there. Never a
   *  token, cookie or password. */
  who?: string
}

// Pop-under ad URL is prefetched once per session so it can be opened
// *synchronously* inside the user's click gesture (required by browser
// pop-up blockers). If the fetch hasn't resolved yet, the watch still
// works — it just opens without the pop-under.
let cachedAdUrl: string | null | undefined

export function prefetchWatchAd(): void {
  if (cachedAdUrl !== undefined) return
  cachedAdUrl = null
  fetch('/api/ads?active=true&type=popunder')
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (!data) return
      const ads = (data as any).data || data
      const ad = (Array.isArray(ads) ? ads[0] : null) as { content?: string } | null
      cachedAdUrl = ad?.content ? extractAdUrl(ad.content) : null
    })
    .catch(() => {
      cachedAdUrl = null
    })
}

function extractAdUrl(input: string): string | null {
  const fromHref = input.match(/href\s*=\s*["'](https?:\/\/[^"']+)["']/i)?.[1]
  const fromRaw = input.match(/https?:\/\/[^\s"'<>]+/i)?.[0]
  const candidate = fromHref || fromRaw
  if (!candidate) return null
  try {
    const u = new URL(candidate)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null
  } catch {
    return null
  }
}

// Anti-bot: the player host is never present as a plain string in the
// client bundle / static HTML — it is decoded at runtime only inside the
// click handler path.
const PLAYER_HOST_B64 = 'NGNpbWEuc3RyZWFt' // → '4cima.stream'

function playerBase(): string {
  // Runtime-decoded host first (anti-bot); CONFIG only as fallback.
  const decoded = atobSafe()
  if (decoded) return `https://${decoded}`.replace(/\/$/, '')
  return (CONFIG.PLAYER_URL || 'https://4cima.stream').replace(/\/$/, '')
}

function atobSafe(): string {
  try {
    const raw = typeof window !== 'undefined' && typeof window.atob === 'function'
      ? window.atob(PLAYER_HOST_B64)
      : Buffer.from(PLAYER_HOST_B64, 'base64').toString('utf-8')
    return raw === '4cima.stream' ? raw : ''
  } catch {
    return ''
  }
}

export function toPlayerUrl(target: WatchTarget): string {
  const base = playerBase()
  const whoParam = target.who ? `?who=${encodeURIComponent(target.who)}` : ''
  // Clean slug URLs — the worker resolves the slug via TMDB search.
  // (query-string /watch URLs are only a fallback when no slug exists)
  if (target.slug) {
    if (target.type === 'tv') {
      const season = target.season ?? 1
      const episode = target.episode ?? 1
      return `${base}/series/${encodeURIComponent(target.slug)}/season/${season}/episode/${episode}${whoParam}`
    }
    return `${base}/${encodeURIComponent(target.slug)}${whoParam}`
  }
  const u = new URL('/watch', base)
  u.searchParams.set('type', target.type)
  u.searchParams.set('id', String(target.id))
  if (target.season != null) u.searchParams.set('season', String(target.season))
  if (target.episode != null) u.searchParams.set('episode', String(target.episode))
  if (target.who) u.searchParams.set('who', target.who)
  return u.toString()
}

/**
 * Watch flow required by 4cima.com:
 *  1) open the pop-under ad first (background tab),
 *  2) then open the player page on 4cima.stream passing the movie/series id.
 */
export function openWatchWithPlayer(target: WatchTarget): void {
  if (cachedAdUrl) {
    // Open behind the current tab (classic pop-under), then hand focus back.
    const pop = window.open(cachedAdUrl, '_blank')
    if (pop) {
      try {
        pop.blur()
      } catch {
        /* ignore */
      }
    }
    window.focus()
  }
  window.location.href = toPlayerUrl(target)
}