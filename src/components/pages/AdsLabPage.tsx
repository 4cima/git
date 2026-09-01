'use client'
import { useEffect, useRef, useState } from 'react'
import GridLayout, { Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { RotateCcw, Download, MonitorPlay, Globe } from 'lucide-react'

/* ============================================================
   مختبر الإعلانات — صفحة واحدة بسيطة
   قسمين تحت بعض: الرئيسية (4cima.com) + المشاهدة (4cima.stream)
   كل قسم: مخطط شبيه بالصفحة الحقيقية + 6 بنرات Adsterra قابلة للسحب بحرية
   ============================================================ */

type Account = 'home' | 'player'

interface Ad {
  id: string
  account: Account
  zoneId: string
  key: string
  width: number
  height: number
  label: string
}

const ADS: Ad[] = [
  // ==== 4cima.com ====
  { id: 'home-728x90',  account: 'home', zoneId: '31008094', key: '0532fea1f51bb90a981bb89fb414869d', width: 728, height: 90,  label: '728x90' },
  { id: 'home-300x250', account: 'home', zoneId: '31008095', key: '9a07073ebf48b3d7d98cf315a469e7c2', width: 300, height: 250, label: '300x250' },
  { id: 'home-160x600', account: 'home', zoneId: '31008096', key: '538636ef4b7a5d451e5c038b418c921e', width: 160, height: 600, label: '160x600' },
  { id: 'home-468x60',  account: 'home', zoneId: '31024533', key: '133edd7d82f4dab8a843a278994ce72d', width: 468, height: 60,  label: '468x60' },
  { id: 'home-160x300', account: 'home', zoneId: '31024534', key: 'f72de37eaefbe39bbc12fcb14c7b6e73', width: 160, height: 300, label: '160x300' },
  { id: 'home-320x50',  account: 'home', zoneId: '31024535', key: '8096860698e0700c21bd43e4678196b0', width: 320, height: 50,  label: '320x50' },
  // ==== 4cima.stream ====
  { id: 'player-728x90',  account: 'player', zoneId: '31024511', key: 'bdb4e0892a506c5b4ffd50fb24dd1806', width: 728, height: 90,  label: '728x90' },
  { id: 'player-300x250', account: 'player', zoneId: '31024507', key: '9762bec6c202e2299933d090ef970907', width: 300, height: 250, label: '300x250' },
  { id: 'player-160x600', account: 'player', zoneId: '31024509', key: '08167b6512c4b7d71219cb965142440d', width: 160, height: 600, label: '160x600' },
  { id: 'player-468x60',  account: 'player', zoneId: '31024506', key: 'a473e3ba3aedd3ec83b608c4fa915f7d', width: 468, height: 60,  label: '468x60' },
  { id: 'player-160x300', account: 'player', zoneId: '31024508', key: '89807f9f535c61e6f9af60f26437b842', width: 160, height: 300, label: '160x300' },
  { id: 'player-320x50',  account: 'player', zoneId: '31024510', key: '57877d62319a7f78e0d12672140d9af3', width: 320, height: 50,  label: '320x50' },
]

/* هندسة الـ canvas: 1 وحدة = 10px — 120 وحدة عرض = 1200px — 120 صف ارتفاع = 1200px */
const COLS = 120
const ROW_H = 10
const ROWS = 130

interface Item {
  i: string
  adId?: string      // لو بنر
  x: number; y: number; w: number; h: number
}

/* الترتيب الافتراضي — تقريب لحجم البنر الحقيقي على مخطط الصفحة */
function defaultItems(account: Account): Item[] {
  if (account === 'home') {
    return [
      { i: 'home-160x600', adId: 'home-160x600', x: 104, y: 10,  w: 16, h: 60 },
      { i: 'home-160x300', adId: 'home-160x300', x: 104, y: 72,  w: 16, h: 30 },
      { i: 'home-728x90',  adId: 'home-728x90',  x: 26,  y: 12,  w: 73, h: 9 },
      { i: 'home-300x250', adId: 'home-300x250', x: 26,  y: 40,  w: 30, h: 25 },
      { i: 'home-468x60',  adId: 'home-468x60',  x: 58,  y: 42,  w: 47, h: 6 },
      { i: 'home-320x50',  adId: 'home-320x50',  x: 26,  y: 118, w: 32, h: 5 },
    ]
  }
  return [
    { i: 'player-728x90',  adId: 'player-728x90',  x: 26,  y: 12, w: 73, h: 9 },
    { i: 'player-160x600', adId: 'player-160x600', x: 104, y: 10, w: 16, h: 60 },
    { i: 'player-160x300', adId: 'player-160x300', x: 0,   y: 10, w: 16, h: 30 },
    { i: 'player-300x250', adId: 'player-300x250', x: 0,   y: 42, w: 30, h: 25 },
    { i: 'player-468x60',  adId: 'player-468x60',  x: 26,  y: 76, w: 73, h: 6 },
    { i: 'player-320x50',  adId: 'player-320x50',  x: 26,  y: 120, w: 32, h: 5 },
  ]
}

const STORAGE_KEYS: Record<Account, string> = {
  home: 'ads-lab-home-v4',
  player: 'ads-lab-player-v4',
}

/* ------------------------------------------------------------
   مكوّن البنر — iframe Adsterra حقيقي
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
   إطار البنر داخل الـ canvas — عنوان صغير + البنر
   ------------------------------------------------------------ */
function BannerItem({ ad }: { ad: Ad }) {
  return (
    <div className="adframe group h-full w-full">
      <div className="adframe-bar">
        <span className="adframe-num">#{ad.zoneId}</span>
        <span className="adframe-size">{ad.label}</span>
      </div>
      <div className="adframe-body">
        <AdBanner ad={ad} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------
   مخطط صفحة الرئيسية (خلفية ثابتة — غير قابلة للسحب)
   ------------------------------------------------------------ */
function HomeMock() {
  return (
    <div className="pointer-events-none absolute inset-0 select-none opacity-40">
      {/* هيدر */}
      <div className="flex h-14 items-center justify-between border-b border-white/10 bg-white/5 px-8">
        <div className="flex items-center gap-6">
          <div className="h-8 w-24 rounded bg-orange-500/60" />
          <div className="h-3 w-16 rounded bg-white/20" />
          <div className="h-3 w-16 rounded bg-white/20" />
          <div className="h-3 w-16 rounded bg-white/20" />
        </div>
        <div className="h-8 w-56 rounded-full bg-white/10" />
      </div>
      {/* هيرو */}
      <div className="mx-8 mt-6 flex h-64 items-end rounded-2xl bg-gradient-to-l from-orange-600/50 via-red-900/40 to-purple-900/40 p-8">
        <div>
          <div className="mb-3 h-8 w-72 rounded bg-white/30" />
          <div className="mb-2 h-3 w-96 rounded bg-white/20" />
          <div className="h-3 w-64 rounded bg-white/20" />
        </div>
      </div>
      {/* صفوف أفلام */}
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="mx-8 mt-8">
          <div className="mb-3 h-4 w-40 rounded bg-white/25" />
          <div className="flex gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-44 w-32 shrink-0 rounded-xl bg-white/10" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------
   مخطط صفحة المشاهدة (خلفية ثابتة — غير قابلة للسحب)
   ------------------------------------------------------------ */
function WatchMock() {
  return (
    <div className="pointer-events-none absolute inset-0 select-none opacity-40">
      {/* هيدر */}
      <div className="flex h-14 items-center justify-between border-b border-white/10 bg-white/5 px-8">
        <div className="flex items-center gap-6">
          <div className="h-8 w-24 rounded bg-orange-500/60" />
          <div className="h-3 w-16 rounded bg-white/20" />
          <div className="h-3 w-16 rounded bg-white/20" />
        </div>
        <div className="h-8 w-56 rounded-full bg-white/10" />
      </div>
      {/* المشغّل */}
      <div className="mx-8 mt-6 flex h-[480px] items-center justify-center rounded-2xl bg-black/60 ring-1 ring-white/10">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-4xl">▶</div>
      </div>
      {/* معلومات الفيلم */}
      <div className="mx-8 mt-6 space-y-3">
        <div className="h-7 w-80 rounded bg-white/25" />
        <div className="h-3 w-full rounded bg-white/15" />
        <div className="h-3 w-4/5 rounded bg-white/15" />
        <div className="h-3 w-3/5 rounded bg-white/15" />
      </div>
      {/* أفلام مشابهة */}
      <div className="mx-8 mt-8">
        <div className="mb-3 h-4 w-48 rounded bg-white/25" />
        <div className="flex gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 w-28 shrink-0 rounded-xl bg-white/10" />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------
   قسم تجربة كامل — canvas واحد حر داخل مخطط صفحة
   ------------------------------------------------------------ */
function LabSection({ account }: { account: Account }) {
  const ads = ADS.filter((a) => a.account === account)
  const [items, setItems] = useState<Item[]>(() => {
    if (typeof window === 'undefined') return defaultItems(account)
    try {
      const raw = localStorage.getItem(STORAGE_KEYS[account])
      if (raw) {
        const saved = JSON.parse(raw) as Item[]
        /* كل البنرات موجودة؟ */
        const missing = ads.some((a) => !saved.some((s) => s.i === a.id))
        if (!missing && Array.isArray(saved) && saved.length === ads.length) return saved
      }
    } catch { /* تجاهل */ }
    return defaultItems(account)
  })
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const onLayoutChange = (layout: Layout[]) => {
    setItems((prev) =>
      prev.map((p) => {
        const l = layout.find((x) => x.i === p.i)
        return l ? { ...p, x: l.x, y: l.y, w: l.w, h: l.h } : p
      }),
    )
  }

  /* حفظ تلقائي */
  useEffect(() => {
    if (!mounted) return
    localStorage.setItem(STORAGE_KEYS[account], JSON.stringify(items))
  }, [items, mounted, account])

  const reset = () => setItems(defaultItems(account))

  /* تصدير JSON — px حقيقية عشان أطبقها على الموقع لاحقاً */
  const exportJson = () => {
    const data = items.map((it) => {
      const ad = ads.find((a) => a.id === it.adId)
      return {
        id: it.i,
        zoneId: ad?.zoneId ?? null,
        size: ad?.label ?? null,
        key: ad?.key ?? null,
        invokeJs: ad ? `https://professionalsusceptible.com/${ad.key}/invoke.js` : null,
        px: { x: it.x * 10, y: it.y * 10, w: it.w * 10, h: it.h * 10 },
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

      {/* إطار الشاشة */}
      <div className="screen-frame relative overflow-hidden rounded-2xl bg-[#0b0e17]" style={{ height: ROWS * ROW_H }}>
        {account === 'home' ? <HomeMock /> : <WatchMock />}

        {/* شبكة خلفية خفيفة */}
        <div className="canvas-grid pointer-events-none absolute inset-0" />

        {mounted && (
          <GridLayout
            className="layout relative"
            layout={items.map(({ i, x, y, w, h }) => ({ i, x, y, w, h }))}
            cols={COLS}
            rowHeight={ROW_H}
            width={1200}
            margin={[0, 0]}
            containerPadding={[0, 0]}
            allowOverlap={true}
            preventCollision={false}
            compactType={null}
            isBounded={false}
            draggableHandle=".adframe-bar"
            resizeHandles={['se', 'sw', 'ne', 'nw', 'e', 'w', 's']}
            onLayoutChange={onLayoutChange}
          >
            {items.map((it) => {
              const ad = ads.find((a) => a.id === it.adId)
              return (
                <div key={it.i}>
                  {ad ? (
                    <BannerItem ad={ad} />
                  ) : (
                    <div className="h-full w-full rounded bg-white/10" />
                  )}
                </div>
              )
            })}
          </GridLayout>
        )}
      </div>

      <p className="mt-2 text-xs text-white/40">
        اسحب من الشريط العلوي لأي بنر لتحريكه — واسحب من الحواف/الزوايا للتحجيم. كل شيء حر تماماً ويمكن التداخل.
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
      {/* العنوان */}
      <div className="mx-auto mb-10 max-w-[1300px]">
        <h1 className="text-3xl font-extrabold text-white">مختبر الإعلانات</h1>
        <p className="mt-2 text-sm text-white/50">
          قسمين تحت بعض — كل قسم محاكاة كاملة لصفحة من الموقع بداخلها الـ 6 بنرات Adsterra.
          اسحب وارتب بحرية تامة، ولتطبيق الترتيب على الموقع الحقيقي اضغط «تحميل layout (JSON)».
        </p>
      </div>

      <LabSection account="home" />
      <LabSection account="player" />
    </main>
  )
}