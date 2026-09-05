'use client'

import { CONFIG } from './constants'
import { requestPopunderFromUserGesture } from '@/components/features/system/adsClick'

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

// البوبندر — تفعيل واحد لكل جلسة، داخل ضغطة زرار مشاهدة فقط:
// راجع requestPopunderFromUserGesture() في src/components/features/system/adsClick.ts
// (لا prefetch ولا window.open عند onload — قُصّ من الإقلاع نهائيًا)

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
 * Watch flow:
 *  1) تفعيل البوبندر مرة واحدة لكل جلسة — فقط من داخل ضغطة زرار مشاهدة
 *     حقيقية (requestPopunderFromUserGesture تُحقن السكربت داخل نفس الـ
 *     click gesture وتنتظر حتى ~1s كحد أقصى، وتفشل بصمت بدون تعطيل المشاهدة).
 *  2) ثم الانتقال لصفحة المشغّل على 4cima.stream بمعرّف الفيلم/المسلسل.
 *
 * When the visitor has a session, a short-lived signed player bridge token
 * (HMAC, no secrets in it) is fetched same-origin and appended as ?pt= so the
 * player can sync the favorite heart. On failure the player still opens —
 * just without the bridge.
 */
export async function openWatchWithPlayer(target: WatchTarget): Promise<void> {
  // البوّابة الوحيدة للإعلان العدواني — داخل نفس الضغطة، مرة واحدة لكل جلسة.
  // firedNow = true فقط لو هي أول ضغطة مشاهدة في الجلسة.
  const firedNow = await requestPopunderFromUserGesture()
  let url = toPlayerUrl(target)
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 1500)
    const res = await fetch('/api/player/token', { signal: ctrl.signal })
    clearTimeout(timer)
    if (res.ok) {
      const data = await res.json()
      if (data?.token) {
        url += (url.includes('?') ? '&' : '?') + `pt=${encodeURIComponent(data.token)}`
      }
    }
  } catch {
    /* bridge unavailable — watch without it */
  }
  if (firedNow) {
    // أعطِ سكربت الشبكة (المحقون داخل الضغطة) فرصة قصيرة لتشغيل البوبندر
    // قبل التنقل في نفس التاب — التنقل الفوري في نفس اللحظة قد يقتل الـ
    // window.open المعلّق. 2 rAF + 400ms تكفي، والتالي الحالي يكمل للمشغّل.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setTimeout(() => {
          window.location.href = url
        }, 400)
      })
    )
    return
  }
  // الجلسة شغّلت الإعلان قبل كده (أو الإعلان معطّل) → للمشغّل مباشرة
  window.location.href = url
}