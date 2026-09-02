'use client'
import { useEffect, useRef, useState } from 'react'
import { RotateCcw, Download, MonitorPlay, Globe } from 'lucide-react'

/* ============================================================
   مختبر الإعلانات — سحب حر بالبكسل (بدون شبكة وبدون محاذاة إجبارية)
   - كل كارت بيتحرك 1:1 مع الماوس (Pointer Events + تحديث DOM مباشر)
   - مفيش حدود: الكارت يتحرك في أي مكان حتى بره إطار المخطط
   - مكوّنات الصفحة الوهمية (هيدر/هيرو/صفوف/مشغّل) كمان تتحرك وتتكبّر
   ============================================================ */

type Account = 'home' | 'player'

interface Ad {
  num: number
  id: string
  account: Account
  zoneId: string
  key: string
  width: number
  height: number
  label: string
}

/* البيانات من ملفات المصدر الوحيد: src/data/ads */
import { ADS_4CIMA_COM } from '@/data/ads/4cima.com'
import { ADS_4CIMA_STREAM } from '@/data/ads/4cima.stream'

const ADS: Ad[] = [
  ...ADS_4CIMA_COM.map(
    (a): Ad => ({ num: a.num, id: a.id, account: 'home', zoneId: a.zoneId, key: a.key, width: a.width, height: a.height, label: a.size }),
  ),
  ...ADS_4CIMA_STREAM.map(
    (a): Ad => ({ num: a.num, id: a.id, account: 'player', zoneId: a.zoneId, key: a.key, width: a.width, height: a.height, label: a.size }),
  ),
]

/* عنصر واحد على المخطط: إما بنر إعلاني أو مكوّن وهمي من الصفحة — كلها بنفس النظام */
interface Item {
  id: string
  kind: 'ad' | 'mock'
  mockId?: string
  x: number
  y: number
  w: number
  h: number
}

const STORAGE_KEYS: Record<Account, string> = {
  home: 'ads-lab-home-v5',
  player: 'ads-lab-player-v5',
}

const CANVAS_H = 1300

/* الترتيب الافتراضي — بالبكسل على canvas عرضه 1200 */
function defaultItems(account: Account): Item[] {
  const ad = (id: string, x: number, y: number): Item => {
    const a = ADS.find((z) => z.id === id)!
    return { id, kind: 'ad', x, y, w: a.width, h: a.height + 24 }
  }
  if (account === 'home') {
    return [
      { id: 'home-mock-header', kind: 'mock', mockId: 'header', x: 0,   y: 0,    w: 1200, h: 56 },
      { id: 'home-mock-hero',   kind: 'mock', mockId: 'hero',   x: 32,  y: 84,   w: 1136, h: 256 },
      { id: 'home-mock-row1',   kind: 'mock', mockId: 'row',    x: 32,  y: 372,  w: 1136, h: 216 },
      { id: 'home-mock-row2',   kind: 'mock', mockId: 'row',    x: 32,  y: 612,  w: 1136, h: 216 },
      { id: 'home-mock-row3',   kind: 'mock', mockId: 'row',    x: 32,  y: 852,  w: 1136, h: 216 },
      { id: 'home-mock-row4',   kind: 'mock', mockId: 'row',    x: 32,  y: 1092, w: 1136, h: 216 },
      ad('home-728x90',  236,  120),
      ad('home-300x250', 236,  400),
      ad('home-468x60',  560,  420),
      ad('home-160x600', 1028, 100),
      ad('home-160x300', 1028, 724),
      ad('home-320x50',  236,  1176),
    ]
  }
  return [
    { id: 'player-mock-header',  kind: 'mock', mockId: 'header',  x: 0,   y: 0,   w: 1200, h: 56 },
    { id: 'player-mock-player',  kind: 'mock', mockId: 'player',  x: 32,  y: 84,  w: 1136, h: 480 },
    { id: 'player-mock-info',    kind: 'mock', mockId: 'info',    x: 32,  y: 590, w: 1136, h: 130 },
    { id: 'player-mock-similar', kind: 'mock', mockId: 'similar', x: 32,  y: 745, w: 1136, h: 210 },
    ad('player-728x90',  236,  120),
    ad('player-300x250', 236,  400),
    ad('player-468x60',  560,  430),
    ad('player-160x600', 1028, 100),
    ad('player-160x300', 12,   100),
    ad('player-320x50',  236,  1180),
  ]
}

/* ------------------------------------------------------------
   بنر Adsterra حقيقي (iframe)
   ملاحظة: المحتوى كله pointer-events:none عشان
   1) السحب يشتغل من أي نقطة في الكارت بدون ما الـ iframe يخطف الحدث
   2) ما يحصلش كليكات غير مقصودة على الإعلانات أثناء التجربة
   ------------------------------------------------------------ */
function AdBanner({ ad }: { ad: Ad }) {
  const ref = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || el.dataset.injected) return
    el.dataset.injected = '1'
    el.innerHTML = ''

    const cfg = document.createElement('script')
    cfg.textContent = `atOptions = { 'key': '${ad.key}', 'format': 'iframe', 'height': ${ad.height}, 'width': ${ad.width}, 'params': {} }`
    const invoke = document.createElement('script')
    invoke.src = `https://professionalsusceptible.com/${ad.key}/invoke.js`
    invoke.async = true
    invoke.onload = () => setLoaded(true)
    invoke.onerror = () => setLoaded(true)
    el.append(cfg, invoke)
  }, [ad.key, ad.height, ad.width])

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded bg-black/40">
      <div ref={ref} className="flex h-full w-full items-center justify-center" />
      {!loaded && (
        <div className="text-[10px] text-white/40">جارٍ تحميل الإعلان {ad.label}…</div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------
   محتوى المكوّنات الوهمية اللي شبه صفحات الموقع
   ------------------------------------------------------------ */
function MockContent({ mockId }: { mockId?: string }) {
  if (mockId === 'header') {
    return (
      <div className="flex h-full w-full items-center justify-between border-b border-white/10 bg-white/5 px-8">
        <div className="flex items-center gap-6">
          <div className="h-8 w-24 rounded bg-orange-500/60" />
          <div className="h-3 w-16 rounded bg-white/20" />
          <div className="h-3 w-16 rounded bg-white/20" />
          <div className="h-3 w-16 rounded bg-white/20" />
        </div>
        <div className="h-8 w-56 rounded-full bg-white/10" />
      </div>
    )
  }
  if (mockId === 'hero') {
    return (
      <div className="flex h-full w-full items-end rounded-2xl bg-gradient-to-l from-orange-600/50 via-red-900/40 to-purple-900/40 p-8">
        <div>
          <div className="mb-3 h-8 w-72 rounded bg-white/30" />
          <div className="mb-2 h-3 w-96 rounded bg-white/20" />
          <div className="h-3 w-64 rounded bg-white/20" />
        </div>
      </div>
    )
  }
  if (mockId === 'row') {
    return (
      <div className="h-full w-full">
        <div className="mb-3 h-4 w-40 rounded bg-white/25" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-40 w-32 shrink-0 rounded-xl bg-white/10" />
          ))}
        </div>
      </div>
    )
  }
  if (mockId === 'player') {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl bg-black/60 ring-1 ring-white/10">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-4xl">▶</div>
      </div>
    )
  }
  if (mockId === 'info') {
    return (
      <div className="h-full w-full space-y-3">
        <div className="h-7 w-80 rounded bg-white/25" />
        <div className="h-3 w-full rounded bg-white/15" />
        <div className="h-3 w-4/5 rounded bg-white/15" />
        <div className="h-3 w-3/5 rounded bg-white/15" />
      </div>
    )
  }
  if (mockId === 'similar') {
    return (
      <div className="h-full w-full">
        <div className="mb-3 h-4 w-48 rounded bg-white/25" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 w-28 shrink-0 rounded-xl bg-white/10" />
          ))}
        </div>
      </div>
    )
  }
  return <div className="h-full w-full rounded bg-white/10" />
}

/* ------------------------------------------------------------
   نظام السحب والتحجيم الحر — كل كارت absolute بالبكسل،
   أثناء السحب بنحدّث style الـ DOM مباشرة (بدون re-render)
   عشان الحركة تطلع 1:1 مع الماوس بالظبط، وبعدين نحفظ الحالة النهائية.
   ------------------------------------------------------------ */
type Mode = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const HANDLES: { mode: Mode; cls: string }[] = [
  { mode: 'n',  cls: '-top-1 left-4 right-4 h-2 cursor-ns-resize' },
  { mode: 's',  cls: '-bottom-1 left-4 right-4 h-2 cursor-ns-resize' },
  { mode: 'e',  cls: '-right-1 top-4 bottom-4 w-2 cursor-ew-resize' },
  { mode: 'w',  cls: '-left-1 top-4 bottom-4 w-2 cursor-ew-resize' },
  { mode: 'ne', cls: '-top-1.5 -right-1.5 h-3.5 w-3.5 cursor-nesw-resize' },
  { mode: 'nw', cls: '-top-1.5 -left-1.5 h-3.5 w-3.5 cursor-nwse-resize' },
  { mode: 'se', cls: '-bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-nwse-resize' },
  { mode: 'sw', cls: '-bottom-1.5 -left-1.5 h-3.5 w-3.5 cursor-nesw-resize' },
]

function Card({
  item,
  ad,
  onStart,
  register,
}: {
  item: Item
  ad?: Ad
  onStart: (e: React.PointerEvent, item: Item, mode: Mode) => void
  register: (id: string, el: HTMLDivElement | null) => void
}) {
  return (
    <div
      ref={(el) => register(item.id, el)}
      onPointerDown={(e) => onStart(e, item, 'move')}
      className="group absolute cursor-grab touch-none select-none rounded-lg border border-orange-500/40 bg-[#0d1119] shadow-lg ring-orange-400/60 hover:border-orange-400/70 active:cursor-grabbing"
      style={{ left: item.x, top: item.y, width: item.w, height: item.h, zIndex: item.kind === 'ad' ? 20 : 10 }}
    >
      {ad ? (
        <>
          <div className="flex h-7 items-center justify-between rounded-t-lg bg-orange-600/25 px-2 text-[11px] font-bold text-orange-300">
            <span className="flex items-center gap-1.5">
              <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-orange-500 px-1.5 text-xs font-extrabold text-white shadow">
                {ad.num}
              </span>
              <span className="text-white/50">#{ad.zoneId}</span>
            </span>
            <span>{ad.label}</span>
          </div>
          <div className="pointer-events-none flex h-[calc(100%-24px)] w-full items-center justify-center overflow-hidden rounded-b-lg">
            <AdBanner ad={ad} />
          </div>
        </>
      ) : (
        <div className="pointer-events-none h-full w-full overflow-hidden rounded-lg opacity-50">
          <MockContent mockId={item.mockId} />
        </div>
      )}

      {/* مقابض التحجيم — 8 اتجاهات */}
      {HANDLES.map((h) => (
        <div
          key={h.mode}
          onPointerDown={(e) => onStart(e, item, h.mode)}
          className={`absolute z-30 rounded-sm bg-orange-400 opacity-0 shadow ring-1 ring-black/40 transition-opacity group-hover:opacity-90 ${h.cls}`}
        />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------
   قسم تجربة كامل — canvas حر بكل عناصره قابلة للسحب والتحجيم
   ------------------------------------------------------------ */
function LabSection({ account }: { account: Account }) {
  const ads = ADS.filter((a) => a.account === account)
  const [items, setItems] = useState<Item[]>(() => defaultItems(account))
  const [mounted, setMounted] = useState(false)
  const nodes = useRef(new Map<string, HTMLDivElement>())
  const zRef = useRef(10)

  /* تحميل الحفظ بعد الـ mount (عشان الـ hydration) */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS[account])
      if (raw) {
        const saved = JSON.parse(raw) as Item[]
        const expected = defaultItems(account).map((d) => d.id).sort().join(',')
        const ok = Array.isArray(saved) && saved.map((s) => s.id).sort().join(',') === expected
        if (ok) setItems(saved)
      }
    } catch { /* تجاهل */ }
    setMounted(true)
  }, [account])

  /* حفظ تلقائي */
  useEffect(() => {
    if (!mounted) return
    localStorage.setItem(STORAGE_KEYS[account], JSON.stringify(items))
  }, [items, mounted, account])

  const register = (id: string, el: HTMLDivElement | null) => {
    if (el) nodes.current.set(id, el)
    else nodes.current.delete(id)
  }

  const startDrag = (e: React.PointerEvent, item: Item, mode: Mode) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    const node = nodes.current.get(item.id)
    if (!node) return

    /* يطلع لقدام دايماً */
    zRef.current += 1
    node.style.zIndex = String(zRef.current)
    node.style.boxShadow = '0 0 0 2px #f97316, 0 12px 40px rgba(249,115,22,.35)'

    const st = {
      sx: e.clientX, sy: e.clientY,
      ox: item.x, oy: item.y, ow: item.w, oh: item.h,
      cx: item.x, cy: item.y, cw: item.w, ch: item.h,
    }
    const MIN = 60

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - st.sx
      const dy = ev.clientY - st.sy
      let x = st.ox
      let y = st.oy
      let w = st.ow
      let h = st.oh
      if (mode === 'move') {
        x = st.ox + dx
        y = st.oy + dy
      } else {
        if (mode.includes('e')) w = Math.max(MIN, st.ow + dx)
        if (mode.includes('s')) h = Math.max(MIN, st.oh + dy)
        if (mode.includes('w')) { w = Math.max(MIN, st.ow - dx); x = st.ox + st.ow - w }
        if (mode.includes('n')) { h = Math.max(MIN, st.oh - dy); y = st.oy + st.oh - h }
      }
      st.cx = x; st.cy = y; st.cw = w; st.ch = h
      node.style.left = x + 'px'
      node.style.top = y + 'px'
      node.style.width = w + 'px'
      node.style.height = h + 'px'
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      node.style.boxShadow = ''
      setItems((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, x: st.cx, y: st.cy, w: st.cw, h: st.ch } : p)),
      )
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  const reset = () => setItems(defaultItems(account))

  /* تصدير JSON — أماكن حقيقية بالبكسل لكل عنصر */
  const exportJson = () => {
    const data = items.map((it) => {
      const ad = ads.find((a) => a.id === it.id)
      return {
        id: it.id,
        kind: it.kind,
        component: it.mockId ?? null,
        zoneId: ad?.zoneId ?? null,
        size: ad?.label ?? null,
        key: ad?.key ?? null,
        invokeJs: ad ? `https://professionalsusceptible.com/${ad.key}/invoke.js` : null,
        px: { x: it.x, y: it.y, w: it.w, h: it.h },
      }
    })
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `adslab-${account}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <section className="mx-auto mb-16 max-w-[1300px]">
      {/* شريط القسم */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-3 text-xl font-bold text-white">
          {account === 'home' ? <Globe className="h-5 w-5 text-orange-400" /> : <MonitorPlay className="h-5 w-5 text-orange-400" />}
          {account === 'home' ? 'مخطط الصفحة الرئيسية — 4cima.com' : 'مخطط صفحة المشاهدة — 4cima.stream'}
        </h2>
        <div className="flex gap-2">
          <button onClick={exportJson} className="rounded-lg bg-blue-600/80 px-4 py-2 text-sm text-white hover:bg-blue-600">
            <Download className="ml-1 inline h-4 w-4" /> تحميل layout (JSON)
          </button>
          <button onClick={reset} className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20">
            <RotateCcw className="ml-1 inline h-4 w-4" /> رجوع للافتراضي
          </button>
        </div>
      </div>

      {/* إطار المخطط — بدون overflow hidden عشان الكروت تقدر تتحرك بره الإطار برضه */}
      <div className="overflow-x-auto pb-2">
        <div
          className="relative rounded-2xl border border-white/15 bg-[#0b0e17]"
          style={{
            width: 1200,
            height: CANVAS_H,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        >
          {mounted &&
            items.map((it) => (
              <Card
                key={it.id}
                item={it}
                ad={ads.find((a) => a.id === it.id)}
                onStart={startDrag}
                register={register}
              />
            ))}
        </div>
      </div>

      <p className="mt-2 text-xs text-white/40">
        اسحب أي كارت من أي مكان جوّه — حتى أجزاء الصفحة نفسها (الهيدر، الهيرو، صفوف الأفلام، المشغّل) تتحرك وتتكبّر من الحواف.
        مفيش أي محاذاة إجبارية ولا حدود — الحركة 1:1 مع الماوس ويمكن تحرّك الكارت بره الإطار.
      </p>
    </section>
  )
}

/* ------------------------------------------------------------
   الصفحة — قسمين تحت بعض
   ------------------------------------------------------------ */
export default function AdsLabPage() {
  return (
    <main className="min-h-screen bg-[#05070d] py-10">
      <div className="mx-auto mb-10 max-w-[1300px]">
        <h1 className="text-3xl font-extrabold text-white">مختبر الإعلانات</h1>
        <p className="mt-2 text-sm text-white/50">
          قسمين تحت بعض — كل قسم محاكاة كاملة لصفحة من الموقع بداخلها الـ 6 بنرات Adsterra.
          كل حاجة قابلة للسحب والتحجيم بحرية تامة، ولتطبيق الترتيب على الموقع الحقيقي اضغط «تحميل layout (JSON)».
        </p>
      </div>

      <LabSection account="home" />
      <LabSection account="player" />
    </main>
  )
}



