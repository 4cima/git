'use client'

/**
 * مكونات adsV2 — وحدات الخطة الجديدة
 * ===================================
 * - AdSnippetSlot: صندوق CLS-آمن يحقن snippet أي شبكة (يُخفى كليًا عند فشله).
 * - MultiTagSlot / NativeCardSlot: سلوتات ذكية — الوحدة الجديدة لو مفعّلة،
 *   وإلا القديم (legacy) يكمل شغله حتى التحول — صفر خسارة عائد أثناء الانتقال.
 * - SocialBarAd / VideoSliderAd: حقن مؤجل بعد أول رسمة / بعد مهلة.
 * - GlobalAdsV2: يُركَّب مرة واحدة في layout الجذر.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ADS_V2, hasSnippet } from '@/config/adsV2'
import { FLAGS } from '@/lib/constants'
import { AdsterraBanner } from './AdsterraBanner'
import { getAdByNum } from '@/data/ads/4cima.com'

/** حقن HTML شبكة (يشمل وسوم script) داخل حاوية — innerHTML لا ينفذ السكربتات
 *  فنُعيد إنشاءها كعناصر حقيقية مع نسخ كل الخصائص. */
function injectHtml(container: HTMLElement, html: string): void {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  Array.from(doc.body.childNodes).forEach((node) => {
    if (node.nodeName === 'SCRIPT') {
      const old = node as HTMLScriptElement
      const s = document.createElement('script')
      Array.from(old.attributes).forEach((a) => s.setAttribute(a.name, a.value))
      s.text = old.textContent || ''
      container.appendChild(s)
    } else {
      container.appendChild(document.importNode(node, true))
    }
  })
}

/** هل الحاوية فيها محتوى إعلاني حقيقي (iframe/صورة/فيديو/نص)؟ */
function slotHasContent(container: HTMLElement | null): boolean {
  if (!container) return false
  if (container.querySelector('iframe, img, video')) return true
  return container.textContent !== null && container.textContent.trim().length > 0
}

type SnippetBoxProps = {
  snippet: string
  /** أبعاد محجوزة من أول رسمة (CLS صفر) */
  width?: number
  height?: number
  minHeight?: number
  className?: string
  onFailure?: () => void
  /** مفتاح فحص التكرار في الـDOM */
  guard: string
  /** hide: يُزال كليًا عند الفشل | ghost: يبقى بحجمه المحجوز visibility:hidden
   *  (للصفوف الأفقية — الانهيار بعد ثوانٍ يزق الصف ويسبب CLS) */
  failurePolicy?: 'hide' | 'ghost'
}

function SnippetBox({
  snippet,
  width,
  height,
  minHeight,
  className,
  onFailure,
  guard,
  failurePolicy = 'hide',
}: SnippetBoxProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || failed) return
    if (el.childElementCount === 0) injectHtml(el, snippet)
    // المزاد الإعلاني بياخد 8-15s أحيانًا قبل رسم الـiframe (مُثبت قياسًا) —
    // فأي مؤشر مبكر بيقفل خانة هتتملى. إعادة حقن احتياطية عند 12s لو الحقن
    // الأول فشل بصمت، والفصل النهائي الوحيد عند 25s.
    const reinject = window.setTimeout(() => {
      if (ref.current && ref.current.childElementCount === 0) injectHtml(ref.current, snippet)
    }, 12000)
    const finalProbe = window.setTimeout(() => {
      if (!slotHasContent(ref.current)) {
        setFailed(true)
        onFailure?.()
      }
    }, 25000)
    return () => {
      clearTimeout(reinject)
      clearTimeout(finalProbe)
    }
  }, [snippet])

  if (!snippet.trim()) return null
  if (failed && failurePolicy === 'hide') return null
  return (
    <div
      data-ads-v2={guard}
      className={className}
      style={{
        width: width ? `min(${width}px, 100%)` : undefined,
        height: height ? `${height}px` : undefined,
        minHeight: minHeight ? `${minHeight}px` : undefined,
        overflow: 'hidden',
        ...(failed && failurePolicy === 'ghost' ? { visibility: 'hidden' as const } : {}),
      }}
    >
      <div ref={ref} className="w-full h-full" />
    </div>
  )
}

/**
 * سلوت شبكة صافي (بلا أي تراكب): يُحقن السنيبت ويُخفى كليًا لو ملّش خلال 25s
 * — ممنوع مربعات فاضية. يُستخدم للفورمات ذات المقاس المطابق فقط.
 */
export function NetSlot({
  snippet,
  guard,
  minHeight = 250,
  className = 'w-full',
}: {
  snippet: string
  guard: string
  minHeight?: number
  className?: string
}) {
  if (!FLAGS.ADS_ENABLED) return null
  if (!hasSnippet({ snippet })) return null
  return (
    <SnippetBox
      snippet={snippet}
      minHeight={minHeight}
      guard={guard}
      className={className}
    />
  )
}

/** Monetag Vignette Banner — بعرض الشاشة/الحاوية (أعلى الصفحات + تحت هيرو الرئيسية) */
export function VignetteSlot({
  guard = 'vignette',
  className = 'w-full max-w-[1100px] mx-auto',
}: {
  guard?: string
  className?: string
}) {
  return <NetSlot snippet={ADS_V2.vignette.snippet} guard={guard} minHeight={120} className={className} />
}

/** Monetag In-Page Push — محلّ 160×600 سايدبار التفاصيل (عمودي) */
export function InPagePushSlot() {
  return <NetSlot snippet={ADS_V2.inPagePush.snippet} guard="inpage-push" minHeight={400} className="w-full" />
}

/** سلوت Native Banner — fit=row: كارت بنهاية الصفوف الأفقية، fit=block: شريط بعرض الكتلة */
export function NativeCardSlot({
  legacy,
  fit = 'block',
}: {
  legacy?: ReactNode
  fit?: 'row' | 'block'
}) {
  if (!FLAGS.ADS_ENABLED) return null
  if (!hasSnippet(ADS_V2.native)) return <>{legacy}</>
  return (
    <SnippetBox
      snippet={ADS_V2.native.snippet}
      minHeight={fit === 'row' ? 240 : 260}
      guard={fit === 'row' ? 'native-row' : 'native-block'}
      failurePolicy={fit === 'row' ? 'ghost' : 'hide'}
      className={
        fit === 'row'
          ? 'flex-shrink-0 w-40 sm:w-48 rounded-2xl overflow-hidden'
          : 'w-full rounded-xl overflow-hidden'
      }
    />
  )
}

/** Social Bar (Adsterra) — تاج عالمي يُحقن بعد أول رسمة + idle */
function SocialBarAd() {
  useEffect(() => {
    const snippet = ADS_V2.socialBar.snippet
    if (!FLAGS.ADS_ENABLED || !snippet.trim()) return
    let cancelled = false
    const inject = () => {
      if (cancelled || document.querySelector('[data-ads-v2="social-bar"]')) return
      const wrap = document.createElement('div')
      wrap.setAttribute('data-ads-v2', 'social-bar')
      wrap.style.display = 'none'
      injectHtml(wrap, snippet)
      document.body.appendChild(wrap)
    }
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
    }
    const onLoaded = () => {
      if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(inject, { timeout: 4000 })
      else setTimeout(inject, 2000)
    }
    if (document.readyState === 'complete') onLoaded()
    else window.addEventListener('load', onLoaded, { once: true })
    return () => {
      cancelled = true
    }
  }, [])
  return null
}

/** Video Slider (HilltopAds) — يُحقن بعد مهلة (45 ثانية افتراضيًا) */
function VideoSliderAd() {
  useEffect(() => {
    const snippet = ADS_V2.videoSlider.snippet
    if (!FLAGS.ADS_ENABLED || !snippet.trim()) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      if (cancelled || document.querySelector('[data-ads-v2="video-slider"]')) return
      const wrap = document.createElement('div')
      wrap.setAttribute('data-ads-v2', 'video-slider')
      injectHtml(wrap, snippet)
      document.body.appendChild(wrap)
    }, ADS_V2.videoSlider.delayMs)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])
  return null
}

/** الوحدات العالمية — تُركَّب مرة واحدة في layout الجذر */
export function GlobalAdsV2() {
  return (
    <>
      <SocialBarAd />
      <VideoSliderAd />
    </>
  )
}

/**
 * الستيتشي السفلي للموبايل — كان Adsterra 320×50 (إيراد ميت، حُذف نهائيًا).
 * يتفعل تلقائيًا عند لصق كود هيلتوب MultiTag 300×100 (موبايل) في stickyMobile.
 */
export function StickyBottomAd() {
  const [closed, setClosed] = useState(false)
  const [failed, setFailed] = useState(false)
  const onFailure = useCallback(() => setFailed(true), [])

  if (closed || failed || !FLAGS.ADS_ENABLED) return null
  if (!hasSnippet(ADS_V2.stickyMobile)) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden" role="complementary" aria-label="إعلان">
      <div className="relative mx-auto w-fit max-w-full rounded-t-xl border-x border-t border-slate-700/60 bg-slate-950/95 px-1 pt-1 shadow-[0_-8px_30px_rgba(0,0,0,0.55)] backdrop-blur">
        <button
          onClick={() => setClosed(true)}
          aria-label="إغلاق الإعلان"
          className="absolute -top-8 right-1 flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-900/90 text-xs text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-100"
        >
          ✕
        </button>
        <SnippetBox
          snippet={ADS_V2.stickyMobile.snippet}
          minHeight={100}
          guard="sticky-mobile"
          className="w-[300px] max-w-[calc(100vw-16px)]"
          onFailure={onFailure}
        />
      </div>
    </div>
  )
}
