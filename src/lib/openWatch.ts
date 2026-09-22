'use client'

import { CONFIG } from './constants'
import { watchFlowStart } from '@/lib/ads/waterfall'

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

// طابور ضغطات المشاهدة (adsV2): ضغطة 1 بوباندَر (A/B بين Monetag وHilltopAds)،
// ضغطة 2 سمارتلينك، ضغطة 3 بوباندَر الشبكة الأخرى، ثم هدوء 30 دقيقة.
// راجع src/lib/ads/waterfall.ts — التفعيل متزامن داخل الـgesture ولا يعلّق المشاهدة أبدًا.

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
 * Watch flow (adsV2):
 *  1) خطوة الطابور تُحسم متزامنة أول الضغطة: بوباندَر (A/B) أو سمارتلينك —
 *     راجع src/lib/ads/waterfall.ts. فشل الإعلان لا يعلّق المشاهدة أبدًا.
 *  2) ثم الانتقال لصفحة المشغّل على 4cima.stream بمعرّف الفيلم/المسلسل.
 *
 * When the visitor has a session, a short-lived signed player bridge token
 * (HMAC, no secrets in it) is fetched same-origin and appended as ?pt= so the
 * player can sync the favorite heart. On failure the player still opens —
 * just without the bridge.
 */
export async function openWatchWithPlayer(target: WatchTarget): Promise<void> {
  // خطوة الطابور تُحسم متزامنة أول الضغطة (بوباندَر/سمارتلينك) — داخل نفس
  // الـgesture الحقيقي، وفشلها لا يمنع المشاهدة أبدًا.
  const flow = watchFlowStart()
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
  if (flow.waitForMs > 0) {
    // أعطِ سكربت الشبكة (المحقون داخل الضغطة) فرصة قصيرة لتشغيل البوبندر
    // قبل التنقل في نفس التاب — التنقل الفوري في نفس اللحظة قد يقتل الـ
    // window.open المعلّق. ~1s كحد أقصى، والتالي الحالي يكمل للمشغّل.
    await new Promise((r) => setTimeout(r, flow.waitForMs))
  }
  if (flow.fired) {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setTimeout(() => {
          window.location.href = url
        }, 400)
      })
    )
    return
  }
  // لا إعلان في هذه الضغطة (أو الإعلانات معطّلة) → للمشغّل مباشرة
  window.location.href = url
}