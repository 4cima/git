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
import { usePathname } from 'next/navigation'
import { ADS_V2, hasScriptSrc } from '@/config/adsV2'
import { FLAGS } from '@/lib/constants'
import { isHostAllowed } from '@/lib/adsAllowlist'
import { AdsterraBanner } from './AdsterraBanner'
import { getAdByNum } from '@/data/ads/4cima.com'

/** حقن HTML شبكة (يشمل وسوم script) داخل حاوية — innerHTML لا ينفذ السكربتات
 *  فنُعيد إنشاءها كعناصر حقيقية مع نسخ كل الخصائص. */
/** حقن سكربت شبكة مباشرة (بلا DOMParser — كان بيفشل بصمت في المتصفح).
 *  containerId: أدستيرا Native بيرسم جوه div بمعرّف حرفي container-<hash> —
 *  كود GET CODE الرسمي بيرتبهم السكربت الأول ثم الحاوية بعده مباشرة،
 *  فبنلتزم بترتيبه الحرفي فأي نمط بحث جوه السكربت (بالمعرّف أو كجار) هيلاقيها. */
function injectScriptTo(container: HTMLElement, src: string, zoneId?: string, containerId?: string): void {
  const s = document.createElement('script')
  s.src = src
  s.async = true
  if (zoneId) s.dataset.zone = zoneId
  container.appendChild(s)
  if (containerId && !container.querySelector('[id="' + containerId + '"]')) {
    const box = document.createElement('div')
    box.id = containerId
    container.appendChild(box)
  }
}

/** حقن تاج مونتاج في الـbody — نفس نمط مونتاج حرفيًا (مونتاج بيقرر مكان الرسم بنفسه) */
function injectMonetagToBody(zoneId: string, src: string): void {
  const s = document.createElement('script')
  s.dataset.zone = zoneId
  s.src = src
  ;([document.documentElement, document.body].filter(Boolean).pop() as HTMLElement).appendChild(s)
}

/** هل الحاوية فيها محتوى إعلاني حقيقي (iframe/صورة/فيديو)؟ */
function slotHasIframe(container: HTMLElement | null): boolean {
  if (!container) return false
  return !!container.querySelector('iframe, img, video')
}

type SnippetBoxProps = {
  scriptSrc: string
  zoneId?: string
  /** حاوية بمعرّف حرفي تتولَّد قبل السكربت (أدستيرا Native) */
  containerId?: string
  /** أبعاد محجوزة من أول رسمة (CLS صفر) */
  width?: number
  height?: number
  minHeight?: number
  className?: string
  onFailure?: () => void
  /** مفتاح فحص التكرار في الـDOM */
  guard: string
  /** hide: يُزال كليًا عند الفشل | ghost: يبقى بحجمه المحجوز visibility:hidden */
  failurePolicy?: 'hide' | 'ghost'
}

function SnippetBox({
  scriptSrc,
  zoneId,
  containerId,
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
    if (el.childElementCount === 0) injectScriptTo(el, scriptSrc, zoneId, containerId)
    // المزاد الإعلاني بياخد 8-15s أحيانًا قبل رسم الـiframe (مُثبت قياسًا) —
    // فأي مؤشر مبكر بيقفل خانة هتتملى. إعادة حقن احتياطية عند 12s لو الحقن
    // الأول فشل بصمت، والفصل النهائي الوحيد عند 25s.
    const reinject = window.setTimeout(() => {
      if (ref.current && ref.current.childElementCount === 0) injectScriptTo(ref.current, scriptSrc, zoneId, containerId)
    }, 12000)
    const finalProbe = window.setTimeout(() => {
      if (!slotHasIframe(ref.current)) {
        setFailed(true)
        onFailure?.()
      }
    }, 25000)
    return () => {
      clearTimeout(reinject)
      clearTimeout(finalProbe)
    }
  }, [scriptSrc, containerId])

  if (!scriptSrc.trim()) return null
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
  scriptSrc,
  zoneId,
  guard,
  minHeight = 250,
  className = 'w-full',
}: {
  scriptSrc: string
  zoneId?: string
  guard: string
  minHeight?: number
  className?: string
}) {
  if (!FLAGS.ADS_ENABLED) return null
  if (!scriptSrc.trim()) return null
  return (
    <SnippetBox
      scriptSrc={scriptSrc}
      zoneId={zoneId}
      minHeight={minHeight}
      guard={guard}
      className={className}
    />
  )
}

/** تاج مونتاج في الـbody — مونتاج بيدير مكان الرسم بنفسه (صفر بصمة تخطيط) */
function MonetagTag({ zoneId, scriptSrc, guard }: { zoneId: string; scriptSrc: string; guard: string }) {
  useEffect(() => {
    if (!scriptSrc.trim() || document.querySelector('[data-ads-v2="' + guard + '"]')) return
    const wrap = document.createElement('div')
    wrap.setAttribute('data-ads-v2', guard)
    wrap.style.display = 'none'
    document.body.appendChild(wrap)
    injectMonetagToBody(zoneId, scriptSrc)
  }, [zoneId, scriptSrc, guard])
  return null
}

/** Monetag Vignette Banner — بعرض الشاشة (أعلى الصفحات + تحت هيرو الرئيسية) */
export function VignetteSlot({ guard = 'vignette' }: { guard?: string }) {
  if (!FLAGS.ADS_ENABLED) return null
  return <MonetagTag zoneId={ADS_V2.vignette.zoneId} scriptSrc={ADS_V2.vignette.scriptSrc} guard={guard} />
}

/** Monetag In-Page Push — محل 160×600 سايدبار التفاصيل (عمودي) */
export function InPagePushSlot() {
  if (!FLAGS.ADS_ENABLED) return null
  return <MonetagTag zoneId={ADS_V2.inPagePush.zoneId} scriptSrc={ADS_V2.inPagePush.scriptSrc} guard="inpage-push" />
}

/** سلوت Native Banner — fit=row: كارت بنهاية الصفوف الأفقية، fit=block: شريط بعرض الكتلة */
export function NativeCardSlot({
  legacy,
  fit = 'block',
  minHeight,
}: {
  legacy?: ReactNode
  fit?: 'row' | 'block'
  /** تجاوز الارتفاع المحجوز الافتراضي (240/260) — للمواضع الصغيرة */
  minHeight?: number
}) {
  if (!FLAGS.ADS_ENABLED) return null
  if (!ADS_V2.native.scriptSrc.trim()) return <>{legacy}</>
  const hash = ADS_V2.native.scriptSrc.match(/\/([0-9a-f]{16,64})\/invoke\.js/)?.[1]
  return (
    <SnippetBox
      scriptSrc={ADS_V2.native.scriptSrc}
      zoneId={ADS_V2.native.zoneId}
      containerId={hash ? 'container-' + hash : undefined}
      minHeight={minHeight ?? (fit === 'row' ? 240 : 260)}
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

/**
 * سلوت هيلتوب MultiTag In-Page 300×250 — سلوت ذكي: الوحدة الجديدة لو مفعّلة،
 * وإلا القديم (legacy) يكمل شغله حتى التحول — صفر خسارة عائد أثناء الانتقال.
 * الموضع المعتمد: تحت بوستر صفحات التفاصيل (ويدجت In-Page + Popup مدمجين).
 */
export function MultiTagSlot({
  legacy,
  className = 'w-full',
  minHeight = 250,
}: {
  legacy?: ReactNode
  className?: string
  minHeight?: number
}) {
  if (!FLAGS.ADS_ENABLED) return legacy ?? null
  if (!hasScriptSrc(ADS_V2.multiTag)) return <>{legacy}</>
  return (
    <SnippetBox
      scriptSrc={ADS_V2.multiTag.scriptSrc}
      zoneId={ADS_V2.multiTag.zoneId}
      minHeight={minHeight}
      guard="multi-tag"
      /* ghost لا hide: لو الإعلان فشل يفضل المكان محجوز مخفي — إخفاؤه الكلي
         بعد 25s كان بيزق المحتوى اللي تحت البوستر ويسجل CLS (درس c292c32) */
      failurePolicy="ghost"
      className={className}
    />
  )
}

/** Social Bar (Adsterra) — تاج عالمي يُحقن بعد أول رسمة + idle */
function SocialBarAd() {
  useEffect(() => {
    const scriptSrc = ADS_V2.socialBar.scriptSrc
    if (!FLAGS.ADS_ENABLED || !scriptSrc.trim()) return
    if (document.querySelector('script[src*="professionalsusceptible.com/6b/2d"]')) return
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
    }
    const onLoaded = () => {
      const inject = () => injectScriptTo(document.body, scriptSrc)
      if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(inject, { timeout: 4000 })
      else setTimeout(inject, 2000)
    }
    if (document.readyState === 'complete') onLoaded()
    else window.addEventListener('load', onLoaded, { once: true })
  }, [])
  return null
}

/** Video Slider (HilltopAds) — يُحقن بعد مهلة (45 ثانية افتراضيًا) */
function VideoSliderAd() {
  useEffect(() => {
    const { scriptSrc, zoneId } = ADS_V2.videoSlider
    if (!FLAGS.ADS_ENABLED || !scriptSrc.trim()) return
    if (document.querySelector('script[data-zone="' + zoneId + '"]')) return
    const timer = window.setTimeout(() => {
      injectScriptTo(document.body, scriptSrc, zoneId)
    }, ADS_V2.videoSlider.delayMs)
    return () => clearTimeout(timer)
  }, [])
  return null
}

/** بوباندَر مونتاج الشامل — دائمًا متفعل على كل الصفحات ما عدا تفاصيل
 * الأفلام/المسلسلات (هناك طابور المشاهدة هيلتوب يملك الضغطات — بدون تصادم).
 * يُسلَّح مرة واحدة (فحص الـDOM — السكربت يعيش في الـbody عبر التنقل الداخلي)
 * والسكربت نفسه بيفتح داخل ضغطة حقيقية بتردد داشبورد مونتاج. */
function MonetagPopunderSiteWide() {
  const pathname = usePathname()
  useEffect(() => {
    if (!FLAGS.ADS_ENABLED) return
    const cfg = ADS_V2.popunderWide
    if (!cfg.scriptUrl.trim() || !cfg.zoneId) return
    // تفاصيل الأفلام/المسلسلات = ملك طابور المشاهدة (هيلتوب) — مونتاج يستثنيها
    if (/^\/(movies|series)\/(?!genres\b|lang\b)[^/]+\/?$/.test(pathname)) return
    if (document.querySelector('script[data-zone="' + cfg.zoneId + '"]')) return
    if (!isHostAllowed('propellerads', cfg.scriptUrl)) return
    const s = document.createElement('script')
    s.async = true
    s.dataset.zone = cfg.zoneId
    s.src = cfg.scriptUrl
    document.body.appendChild(s)
  }, [pathname])
  return null
}

/** الوحدات العالمية — تُركَّب مرة واحدة في layout الجذر */
export function GlobalAdsV2() {
  return (
    <>
      <SocialBarAd />
      <VideoSliderAd />
      <MonetagPopunderSiteWide />
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
  const [filled, setFilled] = useState(false)
  const fillProbeRef = useRef<HTMLDivElement>(null)
  const onFailure = useCallback(() => setFailed(true), [])

  /* الشريط ما يبانش غير لما الإعلان يرسم فعليًا — الانتظار 4-8 ثواني (مزاد
     الشبكة) بكارت فاضي كان بيبدو معطّلًا؛ والموضع fixed فالإخفاء بلا CLS */
  useEffect(() => {
    if (closed || failed || filled) return
    const el = fillProbeRef.current
    if (!el) return
    const check = () => {
      if (el.querySelector('iframe, img, video')) setFilled(true)
    }
    check()
    const id = window.setInterval(check, 400)
    return () => window.clearInterval(id)
  }, [closed, failed, filled])

  if (closed || failed || !FLAGS.ADS_ENABLED) return null
  if (!hasScriptSrc(ADS_V2.stickyMobile)) return null

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden"
      role="complementary"
      aria-label="إعلان"
      style={filled ? undefined : { visibility: 'hidden' }}
    >
      <div className="relative mx-auto w-fit max-w-full rounded-t-xl border-x border-t border-slate-700/60 bg-slate-950/95 px-1 pt-1 shadow-[0_-8px_30px_rgba(0,0,0,0.55)] backdrop-blur">
        <button
          onClick={() => setClosed(true)}
          aria-label="إغلاق الإعلان"
          className="absolute -top-8 right-1 flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-900/90 text-xs text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-100"
        >
          ✕
        </button>
        <div ref={fillProbeRef}>
          <SnippetBox
            scriptSrc={ADS_V2.stickyMobile.scriptSrc}
            zoneId={ADS_V2.stickyMobile.zoneId}
            minHeight={100}
            guard="sticky-mobile"
            className="w-[300px] max-w-[calc(100vw-16px)]"
            onFailure={onFailure}
          />
        </div>
      </div>
    </div>
  )
}
