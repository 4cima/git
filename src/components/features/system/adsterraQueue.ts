/**
 * Adsterra mounting queue — shared by AdsManager (DB-mediated snippets) and
 * AdsterraBanner (code-level zones from src/data/ads).
 *
 * CRITICAL — multiple Adsterra zones on the same page:
 * Every Adsterra inline snippet assigns the GLOBAL `atOptions` variable, so if
 * two snippets are mounted at the same time they overwrite each other and the
 * later invoke.js reads the wrong config → blank/white box.
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

// حيّد أي طلب لدومينات التوصيل الميتة قبل التركيب — راجع deadDeliveryGuard.ts
import './deadDeliveryGuard'

let adsterraQueue: Promise<void> = Promise.resolve()

/* ------------------------------------------------------------------
 * بوابة تأجيل الإعلانات (INP/LCP — موبايل-أولاً):
 * لا سكربت إعلان يُحمَّل قبل window load + requestIdleCallback،
 * أو قبل أول تفاعل (scroll/click/touch) — أيهما أسبق.
 * هذا يؤجل الشبكات الإعلانية (professionalsusceptible وغيرها) خارج
 * المسار الحرج لرسم الصفحة دون إزالتها.
 * ------------------------------------------------------------------ */
let adsUnlocked = false
let adsUnlockWaiters: Array<() => void> = []
let adsGateInstalled = false

function unlockAds() {
  if (adsUnlocked) return
  adsUnlocked = true
  const waiters = adsUnlockWaiters
  adsUnlockWaiters = []
  waiters.forEach((w) => w())
}

function installAdsGate() {
  if (adsGateInstalled || typeof window === 'undefined') return
  adsGateInstalled = true
  const idle = (cb: () => void) => {
    const ric = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
    }).requestIdleCallback
    if (typeof ric === 'function') ric(cb, { timeout: 4000 })
    else window.setTimeout(cb, 2000)
  }
  // المسار الطبيعي: اكتمال تحميل الصفحة ثم خمول الـCPU
  if (document.readyState === 'complete') idle(unlockAds)
  else window.addEventListener('load', () => idle(unlockAds), { once: true })
  // أو أول تفاعل من المستخدم — أيهما أسبق
  const events: Array<keyof WindowEventMap> = ['scroll', 'pointerdown', 'keydown', 'touchstart']
  events.forEach((ev) => window.addEventListener(ev, unlockAds, { once: true, passive: true }))
}

/** ينتظر فك قفل الإعلانات قبل التنفيذ (load+idle أو أول تفاعل) */
function whenAdsUnlocked(cb: () => void) {
  installAdsGate()
  if (adsUnlocked) {
    cb()
    return
  }
  adsUnlockWaiters.push(cb)
}

/**
 * Mount generation per container — كل حاوية لها رقم توليد يزداد مع كل تركيب/تنظيف.
 * لو بدأ تركيب جديد أو حصل تنظيف أثناء انتظار الطابور، التركيب القديم يكتشف أن
 * توليده لم يعد صالحًا ويتوقف فورًا قبل إضافة أي سكريبت → يمنع الإعلان المكرر
 * (خاصة مع React StrictMode: تركيب → تنظيف → تركيب بسرعة).
 */
const mountGeneration = new WeakMap<HTMLElement, number>()

/** إلغاء أي تركيب قيد الانتظار لهذه الحاوية وتفريغها */
export function unmountAd(container: HTMLElement) {
  mountGeneration.set(container, (mountGeneration.get(container) ?? 0) + 1)
  container.replaceChildren()
}

export function mountAdInto(container: HTMLElement, html: string) {
  const generation = (mountGeneration.get(container) ?? 0) + 1
  mountGeneration.set(container, generation)
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
      // توليد أحدث بدأ (إعادة تركيب/تنظيف) → هذا التركيب ملغى، لا تلمس الـ DOM
      if (mountGeneration.get(container) !== generation) return
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

  // Serialize across every ad slot on the page — بعد فك قفل التأجيل فقط
  // (window load + requestIdleCallback أو أول تفاعل): السكربت لا يُلمس قبل ذلك،
  // ولو حصل unmount أثناء الانتظار ففحص الـgeneration داخل engine يُلغيه بأمان.
  whenAdsUnlocked(() => {
    adsterraQueue = adsterraQueue.then(engine)
  })
}

/** Build the standard Adsterra banner snippet for a code-level zone. */
export function buildAdsterraSnippet(key: string, width: number, height: number): string {
  return `<script type="text/javascript">
  atOptions = {
    'key' : '${key}',
    'format' : 'iframe',
    'height' : ${height},
    'width' : ${width},
    'params' : {}
  };
</script>
<script type="text/javascript" src="https://professionalsusceptible.com/${key}/invoke.js"></script>`
}
