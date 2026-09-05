'use client'

/**
 * بوّابة البوبندر — Popunder Gate (المسار الوحيد للإعلان العدواني)
 * ================================================================
 * السياسة الصارمة:
 *  - ممنوع تحميل أي سكربت بوبندر عند الإقلاع، ولا عند أول scroll/لمسة،
 *    ولا بعد idle. القديم (preparePopunder في useEffect + firePopunderOnClick
 *    بمعدلات localStorage) قُصّ نهائيًا.
 *  - التفعيل الوحيد: requestPopunderFromUserGesture() — تُستدعى فقط من داخل
 *    click handler لزرار مشاهدة فعلي («مشاهدة الآن» / زرار سيرفر / حلقة)،
 *    i.e. ضغطة gesture حقيقية من المستخدم — لا scroll ولا mousedown عام.
 *  - مرة واحدة لكل جلسة (sessionStorage). الضغطة التالية تذهب للمشغّل مباشرة.
 *  - fail-open دائمًا: لو السكربت فشل أو اتحظر، المشاهدة تكمل عادي ولا
 *    تُعلَّق على نجاح الإعلان أبدًا.
 *  - لا cloaking: نفس الكود لكل زائر (بما فيهم Googlebot) — لا فحص User-Agent.
 */

import { isHostAllowed } from '@/lib/adsAllowlist'
import { FLAGS } from '@/lib/constants'

const SLOT = 'global-popunder'
const CACHE_KEY = `ads_serve_${SLOT}`
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes
const ZONE_KEY = '11691417'
const FALLBACK_SCRIPT = 'https://al5sm.com/tag.min.js'
/** أقصى انتظار لجاهزية سكربت البوبندر داخل نفس الضغطة (~1s) */
const GESTURE_READY_TIMEOUT = 1000

/** مفتاح جلسة الإعلان — يُكتب فقط بعد أول ضغطة مشاهدة */
export const POPUNDER_SESSION_KEY = 'popunder_fired_session'

let injectedThisSession = false

/** هل اتشغّل الإعلان بالجلسة دي؟ (in-memory + sessionStorage + مفتاح قديم) */
function sessionAlreadyFired(): boolean {
  if (injectedThisSession) return true
  try {
    if (sessionStorage.getItem(POPUNDER_SESSION_KEY) === '1') return true
    // مفتاح الجلسة القديم — نحترمه حتى لا يُفتح تاب ثانية في نفس الجلسة
    if (sessionStorage.getItem('ads_script_injected') === '1') return true
    return false
  } catch {
    return false
  }
}

/** علّم الجلسة إن الإعلان اتشغّل — بعد أول ضغطة مشاهدة فقط */
function markSessionFired(): void {
  injectedThisSession = true
  try {
    sessionStorage.setItem(POPUNDER_SESSION_KEY, '1')
    if (!sessionStorage.getItem('ads_script_injected')) {
      sessionStorage.setItem('ads_script_injected', '1')
    }
  } catch {
    /* private mode / storage blocked — in-memory flag still holds */
  }
}

/**
 * حدد رابط سكربت البوبندر — إجمالًا من كاش إعدادات السيرفر (لو صالح)،
 * وإلا الفولباك. أي رابط مش https أو مش من شبكة مسموحة → فولباك.
 */
function resolvePopunderScriptUrl(): string {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached) as {
        data?: { integration?: string; script_url?: string }
        timestamp?: number
      }
      if (data && timestamp && Date.now() - timestamp < CACHE_TTL) {
        const url =
          data.integration === 'script' && typeof data.script_url === 'string'
            ? data.script_url
            : undefined
        if (url) {
          const parsed = new URL(url)
          if (
            parsed.protocol === 'https:' &&
            isHostAllowed('propellerads', url)
          ) {
            return url
          }
        }
      }
    }
  } catch {
    /* fall through to fallback */
  }
  return FALLBACK_SCRIPT
}

/**
 * تفعيل البوبندر من داخل ضغطة زرار مشاهدة — الدالة الوحيدة المسموحة.
 *
 * - تُحقن السكربت *مزامنة* داخل نفس الضغطة (gesture حقيقي).
 * - تنتظر جاهزيته حتى ~1s كحد أقصى ثم تعود فورًا.
 * - تعيد true فقط لو هي اللي شغّلت الإعلان في هذه الجلسة (أول ضغطة)،
 *   وfalse في أي حالة أخرى (الجلسة اتشغّلت قبل كده / الإعلانات مقفولة / SSR).
 * - لا ترمي أبدًا — fail-open.
 */
export async function requestPopunderFromUserGesture(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (!FLAGS.ADS_ENABLED) return false
  if (sessionAlreadyFired()) return false

  // علّم الجلسة أولًا — حتى لو السكربت فشل، الضغطة التالية مفيهاش تاب تانية
  markSessionFired()

  const url = resolvePopunderScriptUrl()

  try {
    await new Promise<void>((resolve) => {
      const script = document.createElement('script')
      script.src = url
      script.setAttribute('data-zone', ZONE_KEY)
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => resolve()
      document.body.appendChild(script)
      // Failsafe: لا ننتظر أطول من ~1s — المشاهدة أهم من الإعلان
      window.setTimeout(resolve, GESTURE_READY_TIMEOUT)
    })
  } catch {
    /* silent — fail-open */
  }

  return true
}

