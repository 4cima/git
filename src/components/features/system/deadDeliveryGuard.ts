/**
 * حارس دومينات التوصيل الميتة — Adsterra Dead Delivery Domain Guard
 * -----------------------------------------------------------------
 * المشكلة: دومين التوصيل بتاع حساب Adsterra (kettledroopingcontinuation.com)
 * ميت تمامًا (لا يوجد A record)، لكن سيرفر invoke.js الرئيسي
 * (professionalsusceptible.com) حي — فكل زون تُحمَّل بنجاح ثم يفشل تحميل
 * watch.js/pixel داخليًا بأخطاء ERR_NAME_NOT_RESOLVD في الـconsole.
 *
 * الحل: نحيّد أي طلب (سكريبت/صورة/XHR/fetch/sendBeacon) موجَّه للدومين الميت
 * قبل أن يصل للشبكة — بدل تعطيل الزونات نفسها. بهذا:
 *   - الـconsole يفضل نظيف تمامًا
 *   - الزونات تفضل مركّبة، ولما Adsterra يبدّل دومين التوصيل لدومين حي
 *     (بيحصل تلقائيًا من عندهم) الإعلانات ترجع تشتغل فورًا بدون أي تعديل كود
 *     (الدومين الجديد مش في قائمة الحظر).
 *
 * إضافة دومين ميت جديد: أضفه لـ DEAD_DELIVERY_DOMAINS فقط.
 */

const DEAD_DELIVERY_DOMAINS: readonly string[] = ['kettledroopingcontinuation.com']

const EMPTY_SCRIPT = 'data:text/javascript,'
const EMPTY_PING = 'data:text/plain,'
const PIXEL_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

function isDeadUrl(raw: unknown): boolean {
  if (typeof raw !== 'string' || !raw) return false
  try {
    const host = new URL(raw, window.location.href).hostname.toLowerCase()
    return DEAD_DELIVERY_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))
  } catch {
    return false
  }
}

function install() {
  if (typeof window === 'undefined') return
  const w = window as unknown as { __deadDeliveryGuardInstalled?: boolean }
  if (w.__deadDeliveryGuardInstalled) return
  w.__deadDeliveryGuardInstalled = true

  // 1) سكريبتات: watch.*.js من الدومين الميت → سكريبت فارغ يُحمَّل فورًا بلا شبكة
  const scriptDesc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src')
  if (scriptDesc?.get && scriptDesc.set) {
    Object.defineProperty(HTMLScriptElement.prototype, 'src', {
      get: scriptDesc.get,
      set(this: HTMLScriptElement, value: string) {
        scriptDesc.set!.call(this, isDeadUrl(value) ? EMPTY_SCRIPT : value)
      },
      configurable: true,
    })
  }

  // 2) صور (بكسلات التتبع) → جيف 1×1 شفاف
  const imgDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src')
  if (imgDesc?.get && imgDesc.set) {
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      get: imgDesc.get,
      set(this: HTMLImageElement, value: string) {
        imgDesc.set!.call(this, isDeadUrl(value) ? PIXEL_GIF : value)
      },
      configurable: true,
    })
  }

  // 3) XHR (pixel/ase وغيره) → GET لبيانات فارغة، بلا شبكة وبلا خطأ
  type XhrOpenFn = (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ) => void
  const xhrOpen = XMLHttpRequest.prototype.open as XhrOpenFn
  XMLHttpRequest.prototype.open = function (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ) {
    if (isDeadUrl(typeof url === 'string' ? url : String(url))) {
      return xhrOpen.call(this, 'GET', EMPTY_PING, true)
    }
    return xhrOpen.call(this, method, url, async, username, password)
  } as unknown as typeof XMLHttpRequest.prototype.open

  // 4) fetch → استجابة فارغة 204 محليًا
  const origFetch = window.fetch.bind(window)
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (isDeadUrl(url)) return Promise.resolve(new Response('', { status: 204 }))
    return origFetch(input, init)
  }

  // 5) sendBeacon → تجاهل صامت
  if (navigator.sendBeacon) {
    const origBeacon = navigator.sendBeacon.bind(navigator)
    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) =>
      isDeadUrl(typeof url === 'string' ? url : String(url)) ? true : origBeacon(url, data)
  }
}

install()

export { DEAD_DELIVERY_DOMAINS }
