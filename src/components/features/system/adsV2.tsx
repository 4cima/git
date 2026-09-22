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
    // فحص الفشل: سكربتات الشبكات بتاخد وقت في المزاد قبل ما ترسم iframe —
    // فحص أولي عند 10s وتأكيد عند 25s → إخفاء كامل (سياسة الفشل)
    const probes = [10000, 25000].map((ms) =>
      window.setTimeout(() => {
        if (!slotHasContent(ref.current)) {
          setFailed(true)
          onFailure?.()
        }
      }, ms),
    )
    return () => probes.forEach(clearTimeout)
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

/** سلوت MultiTag In-Page 300×250 — الجديد لو مفعّل وإلا بنر Adsterra القديم */
export function MultiTagSlot({ legacy }: { legacy: ReactNode }) {
  if (!FLAGS.ADS_ENABLED) return null
  if (!hasSnippet(ADS_V2.multiTag)) return <>{legacy}</>
  return (
    <SnippetBox
      snippet={ADS_V2.multiTag.snippet}
      width={300}
      height={250}
      guard="multitag"
      className="mx-auto rounded-xl border border-slate-700/60 bg-slate-950/60"
    />
  )
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

/** زون الستيتشي القديم 320×50 — يبقى فولباك حتى تفعيل Vignette */
const AD_MOBILE_LEGACY = getAdByNum(6)! // 320×50

/**
 * الستيتشي السفلي للموبايل: Vignette Banner (Monetag) لو مفعّل،
 * وإلا بنر Adsterra 320×50 القديم — نفس الصدفة (قابل للإغلاق، يختفي عند الفشل).
 */
export function StickyBottomAd() {
  const [closed, setClosed] = useState(false)
  const [failed, setFailed] = useState(false)
  const onFailure = useCallback(() => setFailed(true), [])

  if (closed || failed || !FLAGS.ADS_ENABLED) return null

  const v2Active = hasSnippet(ADS_V2.vignette)
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
        {v2Active ? (
          <SnippetBox
            snippet={ADS_V2.vignette.snippet}
            minHeight={50}
            guard="vignette"
            className="w-[320px] max-w-[calc(100vw-16px)]"
            onFailure={onFailure}
          />
        ) : (
          AD_MOBILE_LEGACY && <AdsterraBanner ad={AD_MOBILE_LEGACY} onFailure={onFailure} />
        )}
      </div>
    </div>
  )
}
