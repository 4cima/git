'use client'

import { CONFIG } from './constants'

export type WatchTarget = {
  type: 'movie' | 'tv'
  id: number
  season?: number
  episode?: number
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

export function toPlayerUrl(target: WatchTarget): string {
  const base = CONFIG.PLAYER_URL || 'https://4cima.stream'
  const u = new URL('/watch', base)
  u.searchParams.set('type', target.type)
  u.searchParams.set('id', String(target.id))
  if (target.season != null) u.searchParams.set('season', String(target.season))
  if (target.episode != null) u.searchParams.set('episode', String(target.episode))
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