'use client'

/**
 * طابور ضغطات المشاهدة — Click Waterfall (adsV2)
 * ==============================================
 * خريطة الجلسة (كل ضغطة مشاهدة):
 *   1 → بوباندَر الشبكة المخصصة لهذه الجلسة (A/B: Monetag ↔ HilltopAds)
 *   2 → SmartLink (تاب عرض أوفر عالي التحويل)
 *   3 → بوباندَر الشبكة الأخرى
 *   4+ → هدوء؛ أول ضغطة بعد مرور cooldownMs تفتح بوباندَر الشبكة الأساسية
 *        (لو لم تكن قد اشتغلت)، وإلا لا شيء.
 *
 * القواعد الموروثة من البوابة القديمة (adsClick) — لا تتغير:
 *  - التفعيل فقط من داخل ضغطة زر مشاهدة حقيقية (لا scroll ولا idle).
 *  - fail-open دائمًا: أي فشل لا يعلّق المشاهدة أبدًا.
 *  - لا cloaking: نفس الكود لكل الزوار بلا فحص User-Agent.
 *  - مفاتيح الجلسة القديمة تُحترم حتى لا يُفتح تاب مكرر في جلسة عابرة للنشر.
 */

import { isHostAllowed } from '@/lib/adsAllowlist'
import { FLAGS } from '@/lib/constants'
import { ADS_V2 } from '@/config/adsV2'

const WF_KEY = 'ads_wf_v2'
const GESTURE_READY_TIMEOUT = 1000

type NetworkId = 'monetag' | 'hilltop'

type WfState = {
  clicks: number
  group: NetworkId
  lastPopAt: number
  fired: { monetag: boolean; hilltop: boolean }
}

function readState(): WfState {
  const fresh: WfState = {
    clicks: 0,
    group: Math.random() < 0.5 ? 'monetag' : 'hilltop',
    lastPopAt: 0,
    fired: { monetag: false, hilltop: false },
  }
  try {
    const raw = sessionStorage.getItem(WF_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<WfState>
      if (parsed && typeof parsed.clicks === 'number' && parsed.group) {
        return {
          clicks: parsed.clicks,
          group: parsed.group,
          lastPopAt: parsed.lastPopAt ?? 0,
          fired: {
            monetag: Boolean(parsed.fired?.monetag),
            hilltop: Boolean(parsed.fired?.hilltop),
          },
        }
      }
    }
    // جلسة قديمة (ما قبل adsV2) شغّلت بوباندَر Monetag — نحترمها
    if (
      sessionStorage.getItem('popunder_fired_session') === '1' ||
      sessionStorage.getItem('ads_script_injected') === '1'
    ) {
      fresh.fired.monetag = true
    }
  } catch {
    /* storage blocked — in-memory فقط لهذه الصفحة */
  }
  return fresh
}

function writeState(s: WfState): void {
  try {
    sessionStorage.setItem(WF_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

function popunderConfig(net: NetworkId): { scriptUrl: string; zoneId: string } | null {
  const c = ADS_V2.popunder[net]
  if (!c.scriptUrl || !c.zoneId) return null
  if (!isHostAllowed(net === 'monetag' ? 'propellerads' : 'hilltopads', c.scriptUrl)) return null
  return c
}

/** حقن سكربت بوباندَر شبكة معينة — متزامن داخل الضغطة، لا يرمي أبدًا */
function injectPopunder(net: NetworkId, cfg: { scriptUrl: string; zoneId: string }): void {
  try {
    const script = document.createElement('script')
    script.src = cfg.scriptUrl
    script.setAttribute('data-zone', cfg.zoneId)
    script.async = true
    document.body.appendChild(script)
  } catch {
    /* ignore */
  }
}

/**
 * خطوة الطابور لضغطة مشاهدة — تُستدعى *مزامنة* كأول سطر في click handler
 * (قبل أي await) حتى تبقى window.open للسمارتلينك داخل الـgesture الحقيقي.
 *
 * تعيد: fired (هل فُتح إعلان تاب) و waitForMs (كم ننتظر قبل التنقل).
 */
export function watchFlowStart(): { fired: boolean; waitForMs: number } {
  if (typeof window === 'undefined') return { fired: false, waitForMs: 0 }
  if (!FLAGS.ADS_ENABLED) return { fired: false, waitForMs: 0 }

  const state = readState()
  state.clicks += 1
  const n = state.clicks

  const tryPopunder = (net: NetworkId): boolean => {
    if (state.fired[net]) return false
    const cfg = popunderConfig(net)
    if (!cfg) return false
    injectPopunder(net, cfg)
    state.fired[net] = true
    state.lastPopAt = Date.now()
    return true
  }

  let fired = false
  let waitForMs = 0

  if (n === 1) {
    // أول ضغطة: بوباندَر الشبكة المخصصة، ولو معطّلة/مشتغلةش → الأخرى
    fired = tryPopunder(state.group) || tryPopunder(state.group === 'monetag' ? 'hilltop' : 'monetag')
    if (fired) waitForMs = GESTURE_READY_TIMEOUT
  } else if (n === 2) {
    // ثاني ضغطة: سمارتلينك — window.open متزامن داخل الـgesture
    const url = ADS_V2.smartlink.url
    if (url && url.startsWith('https://')) {
      try {
        window.open(url, '_blank', 'noopener')
        fired = true
      } catch {
        /* blocker — المشاهدة تكمل عادي */
      }
    }
  } else if (n === 3) {
    // ثالث ضغطة: بوباندَر الشبكة الأخرى
    const other = state.group === 'monetag' ? 'hilltop' : 'monetag'
    fired = tryPopunder(other)
    if (fired) waitForMs = GESTURE_READY_TIMEOUT
  } else if (Date.now() - state.lastPopAt >= ADS_V2.cooldownMs) {
    // بعد الهدوء: بوباندَر جديد من أول شبكة متاحة
    fired = tryPopunder(state.group) || tryPopunder(state.group === 'monetag' ? 'hilltop' : 'monetag')
    if (fired) waitForMs = GESTURE_READY_TIMEOUT
  }

  writeState(state)
  return { fired, waitForMs }
}
