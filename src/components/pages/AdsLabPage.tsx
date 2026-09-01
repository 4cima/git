'use client'
import { useEffect, useRef, useState, useMemo } from 'react'
import GridLayout, { WidthProvider, Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { Play, Pause, Volume2, VolumeX, Maximize, SkipForward, RotateCcw, Download, ExternalLink } from 'lucide-react'
type AdsterraKey =
  | 'home-728-90' | 'home-300-250' | 'home-160-600' | 'home-468-60' | 'home-160-300' | 'home-320-50'
  | 'player-728-90' | 'player-300-250' | 'player-160-600' | 'player-468-60' | 'player-160-300' | 'player-320-50'
interface BannerDef { id: AdsterraKey; account: 'home'|'player'; zoneId: string; key: string; src: string; width: number; height: number; label: string }
interface CanvasItemBase {
  i: string
  x: number; y: number
  w: number; h: number
  minW?: number; minH?: number
  static?: boolean
}
interface BannerPlacement extends CanvasItemBase {
  kind: 'banner'
  bannerId: AdsterraKey
  label: string
}
interface PlayerPlacement extends CanvasItemBase {
  kind: 'player'
  label: string
  isPlayer: true
}
type CanvasItem = BannerPlacement | PlayerPlacement
const BANNERS: BannerDef[] = [
  { id: 'home-728-90',    account: 'home',   zoneId: '31008094', key: '0532fea1f51bb90a981bb89fb414869d', src: 'https://professionalsusceptible.com/0532fea1f51bb90a981bb89fb414869d/invoke.js',    width: 728, height: 90,  label: '728x90' },
  { id: 'home-300-250',   account: 'home',   zoneId: '31008095', key: '9a07073ebf48b3d7d98cf315a469e7c2', src: 'https://professionalsusceptible.com/9a07073ebf48b3d7d98cf315a469e7c2/invoke.js',   width: 300, height: 250, label: '300x250' },
  { id: 'home-160-600',   account: 'home',   zoneId: '31008096', key: '538636ef4b7a5d451e5c038b418c921e', src: 'https://professionalsusceptible.com/538636ef4b7a5d451e5c038b418c921e/invoke.js',   width: 160, height: 600, label: '160x600' },
  { id: 'home-468-60',    account: 'home',   zoneId: '31024533', key: '133edd7d82f4dab8a843a278994ce72d', src: 'https://professionalsusceptible.com/133edd7d82f4dab8a843a278994ce72d/invoke.js',    width: 468, height: 60,  label: '468x60' },
  { id: 'home-160-300',   account: 'home',   zoneId: '31024534', key: 'f72de37eaefbe39bbc12fcb14c7b6e73', src: 'https://professionalsusceptible.com/f72de37eaefbe39bbc12fcb14c7b6e73/invoke.js',   width: 160, height: 300, label: '160x300' },
  { id: 'home-320-50',    account: 'home',   zoneId: '31024535', key: '8096860698e0700c21bd43e4678196b0', src: 'https://professionalsusceptible.com/8096860698e0700c21bd43e4678196b0/invoke.js',    width: 320, height: 50,  label: '320x50' },
  { id: 'player-728-90',  account: 'player', zoneId: '31024511', key: 'bdb4e0892a506c5b4ffd50fb24dd1806', src: 'https://professionalsusceptible.com/bdb4e0892a506c5b4ffd50fb24dd1806/invoke.js',  width: 728, height: 90,  label: '728x90' },
  { id: 'player-300-250', account: 'player', zoneId: '31024507', key: '9762bec6c202e2299933d090ef970907', src: 'https://professionalsusceptible.com/9762bec6c202e2299933d090ef970907/invoke.js', width: 300, height: 250, label: '300x250' },
  { id: 'player-160-600', account: 'player', zoneId: '31024509', key: '08167b6512c4b7d71219cb965142440d', src: 'https://professionalsusceptible.com/08167b6512c4b7d71219cb965142440d/invoke.js', width: 160, height: 600, label: '160x600' },
  { id: 'player-468-60',  account: 'player', zoneId: '31024506', key: 'a473e3ba3aedd3ec83b608c4fa915f7d', src: 'https://professionalsusceptible.com/a473e3ba3aedd3ec83b608c4fa915f7d/invoke.js',  width: 468, height: 60,  label: '468x60' },
  { id: 'player-160-300', account: 'player', zoneId: '31024508', key: '89807f9f535c61e6f9af60f26437b842', src: 'https://professionalsusceptible.com/89807f9f535c61e6f9af60f26437b842/invoke.js', width: 160, height: 300, label: '160x300' },
  { id: 'player-320-50',  account: 'player', zoneId: '31024510', key: '57877d62319a7f78e0d12672140d9af3', src: 'https://professionalsusceptible.com/57877d62319a7f78e0d12672140d9af3/invoke.js',  width: 320, height: 50,  label: '320x50' },
]
// CANVAS: منطقة الرسم بالـ units (1 unit = 10px). rowHeight=10px, cols=100 → عرض 1000px
const CANVAS_COLS = 100
const ROW_HEIGHT = 10
const DEFAULT_CANVAS_HEIGHT = 1300 // px

function makeDefaultHome(): CanvasItem[] {
  return [
    { i: 'home-guide-hero',   kind: 'banner', bannerId: 'home-728-90',  label: '728x90',  x: 18, y: 0,  w: 64, h: 10, minW: 16, minH: 5 },
    { i: 'home-guide-side1',  kind: 'banner', bannerId: 'home-160-600', label: '160x600', x: 82, y: 0,  w: 16, h: 60, minW: 8,  minH: 20 },
    { i: 'home-guide-side2',  kind: 'banner', bannerId: 'home-160-300', label: '160x300', x: 0,  y: 0,  w: 16, h: 30, minW: 8,  minH: 15 },
    { i: 'home-guide-mid',    kind: 'banner', bannerId: 'home-300-250', label: '300x250', x: 18, y: 12, w: 30, h: 25, minW: 12, minH: 10 },
    { i: 'home-guide-row',    kind: 'banner', bannerId: 'home-468-60',  label: '468x60',  x: 50, y: 12, w: 47, h: 6,  minW: 16, minH: 4 },
    { i: 'home-guide-bottom', kind: 'banner', bannerId: 'home-320-50',  label: '320x50',  x: 18, y: 39, w: 32, h: 5,  minW: 16, minH: 4 },
  ]
}

function makeDefaultPlayer(): CanvasItem[] {
  return [
    { i: 'player-guide-top',   kind: 'banner', bannerId: 'player-728-90',  label: '728x90',  x: 18, y: 0,  w: 64, h: 10, minW: 16, minH: 5 },
    { i: 'player-guide-right', kind: 'banner', bannerId: 'player-160-600', label: '160x600', x: 82, y: 0,  w: 16, h: 60, minW: 8,  minH: 20 },
    { i: 'player-guide-left',  kind: 'banner', bannerId: 'player-160-300', label: '160x300', x: 0,  y: 0,  w: 16, h: 30, minW: 8,  minH: 15 },
    { i: 'player-guide-vid',   kind: 'player', isPlayer: true, label: 'المشغّل',  x: 18, y: 12, w: 60, h: 40, minW: 30, minH: 20, static: true },
    { i: 'player-guide-tr',    kind: 'banner', bannerId: 'player-300-250', label: '300x250', x: 82, y: 61, w: 16, h: 25, minW: 12, minH: 10 },
    { i: 'player-guide-bot',   kind: 'banner', bannerId: 'player-468-60',  label: '468x60',  x: 18, y: 54, w: 60, h: 6,  minW: 16, minH: 4 },
    { i: 'player-guide-foot',  kind: 'banner', bannerId: 'player-320-50',  label: '320x50',  x: 18, y: 62, w: 32, h: 5,  minW: 16, minH: 4 },
  ]
}
const STORAGE_KEY_HOME = 'ads-lab-home-v2'
const STORAGE_KEY_PLAYER = 'ads-lab-player-v2'
let adQueue: Promise<void> = Promise.resolve()
function queueBannerLoad(banner: BannerDef, container: HTMLElement) {
  adQueue = adQueue.then(() => new Promise<void>((resolve) => {
    ;(window as unknown as { atOptions: unknown }).atOptions = { key: banner.key, format: 'iframe', height: banner.height, width: banner.width, params: {} }
    const s = document.createElement('script')
    s.src = banner.src
    s.async = false
    s.onload = () => resolve()
    s.onerror = () => resolve()
    container.appendChild(s)
  }))
}
function BannerSlotContent({ banner }: { banner: BannerDef }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.replaceChildren()
    queueBannerLoad(banner, el)
    return () => { el.replaceChildren() }
  }, [banner.id])
  return <div ref={ref} className="w-full h-full" />
}

function AdFrameCinematic({ banner, color = 'orange', onDragStart, isDragging, draggable = true }: { banner: BannerDef; color?: 'orange'|'blue'|'red'; onDragStart?: () => void; isDragging?: boolean; draggable?: boolean }) {
  const colorClass = color === 'blue' ? 'blue' : color === 'red' ? 'red' : ''
  const rootRef = useRef<HTMLDivElement>(null)
  const frame = (
    <div className={`ad-frame-cinematic ${colorClass} ${isDragging ? 'opacity-60' : ''}`} style={{ cursor: draggable ? 'grab' : 'default' }}>
      <div className="ad-spotlight" />
      <div className="ad-frame-label">SCREEN {banner.label}</div>
      <div className="ad-frame-id">{banner.zoneId}</div>
      <div className="ad-screen-wrap">
        <div className="ad-screen">
          <BannerSlotContent banner={banner} />
        </div>
      </div>
      <span className="ad-corner tl" />
      <span className="ad-corner tr" />
      <span className="ad-corner bl" />
      <span className="ad-corner br" />
      <div className="ad-frame-status">LIVE<span className="dot" /></div>
    </div>
  )
  if (!draggable) {
    return <div ref={rootRef}>{frame}</div>
  }
  return (
    <div
      ref={rootRef}
      draggable
      onDragStart={(e) => {
        if (!onDragStart) return
        e.dataTransfer.setData('text/plain', banner.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
        if (rootRef.current) e.dataTransfer.setDragImage(rootRef.current, 30, 20)
      }}
    >
      {frame}
    </div>
  )
}

function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onTime = () => { setCurrentTime(v.currentTime); setProgress((v.currentTime / v.duration) * 100) }
    const onDur = () => setDuration(v.duration)
    const onEnd = () => setPlaying(false)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('loadedmetadata', onDur)
    v.addEventListener('ended', onEnd)
    return () => { v.removeEventListener('timeupdate', onTime); v.removeEventListener('loadedmetadata', onDur); v.removeEventListener('ended', onEnd) }
  }, [])
  const togglePlay = () => { const v = videoRef.current; if (!v) return; if (v.paused) { v.play(); setPlaying(true) } else { v.pause(); setPlaying(false) } }
  const toggleMute = () => { const v = videoRef.current; if (!v) return; v.muted = !v.muted; setMuted(v.muted) }
  const seek = (e: React.MouseEvent<HTMLDivElement>) => { const v = videoRef.current; if (!v) return; const rect = e.currentTarget.getBoundingClientRect(); const pct = (e.clientX - rect.left) / rect.width; v.currentTime = pct * v.duration }
  const skip = () => { const v = videoRef.current; if (v) v.currentTime = Math.min(v.duration, v.currentTime + 10) }
  const fullscreen = () => { const v = videoRef.current; if (v?.requestFullscreen) v.requestFullscreen() }
  const fmt = (s: number) => { const m = Math.floor(s / 60); const sec = Math.floor(s % 60); return `${m}:${sec.toString().padStart(2, '0')}` }
  return (
    <div className="relative w-full h-full bg-black rounded-xl overflow-hidden">
      <video ref={videoRef} className="w-full h-full" src="https://www.w3schools.com/html/mov_bbb.mp4" muted playsInline />
      {!playing && (
        <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"><Play className="w-10 h-10 fill-white text-white ml-1" /></div>
        </button>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        <div className="h-1 bg-white/20 rounded-full mb-3 cursor-pointer" onClick={seek}><div className="h-full bg-red-500 rounded-full" style={{ width: `${progress}%` }} /></div>
        <div className="flex items-center gap-3 text-white">
          <button onClick={togglePlay}>{playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}</button>
          <button onClick={skip}><SkipForward className="w-5 h-5" /></button>
          <button onClick={toggleMute}>{muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}</button>
          <span className="text-xs">{fmt(currentTime)} / {fmt(duration)}</span>
          <div className="flex-1" />
          <button onClick={fullscreen}><Maximize className="w-5 h-5" /></button>
        </div>
      </div>
    </div>
  )
}
function BannerStripSelector({ account, accountBanners, draggingBanner, setDraggingBanner }: { account: 'home'|'player'; accountBanners: BannerDef[]; draggingBanner: AdsterraKey | null; setDraggingBanner: (k: AdsterraKey | null) => void }) {
  const color = account === 'home' ? 'orange' : 'blue'
  return (
    <div className="theatre-backdrop p-4 mb-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] ribbon-shimmer" />
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${account === 'home' ? 'bg-red-500' : 'bg-blue-500'} live-live-pulse`} />
          <h3 className="text-sm font-bold text-white tracking-wider">لوحة البنرات — اسحب لأي سلوت</h3>
        </div>
        <span className="text-[10px] text-zinc-400 font-mono">{accountBanners.length} بنر متاح</span>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {accountBanners.map((b) => (
          <div key={b.id} className="flex justify-center">
            <AdFrameCinematic
              banner={b}
              color={color}
              isDragging={draggingBanner === b.id}
              onDragStart={() => setDraggingBanner(b.id)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

const ResponsiveGridLayout = WidthProvider(GridLayout)

function itemsToLayout(items: CanvasItem[]): Layout[] {
  return items.map((it) => ({
    i: it.i, x: it.x, y: it.y, w: it.w, h: it.h,
    minW: it.minW, minH: it.minH, static: it.static,
  }))
}

function layoutToItem(base: CanvasItem, l: Layout): CanvasItem {
  if (base.kind === 'banner') return { ...base, x: l.x, y: l.y, w: l.w, h: l.h }
  return { ...base, x: l.x, y: l.y, w: l.w, h: l.h }
}

function FreeCanvas({ account, items, setItems, defaultItems, title, draggingBanner, setDraggingBanner, bannerById }: {
  account: 'home' | 'player'
  items: CanvasItem[]
  setItems: (it: CanvasItem[]) => void
  defaultItems: CanvasItem[]
  title: string
  draggingBanner: AdsterraKey | null
  setDraggingBanner: (k: AdsterraKey | null) => void
  bannerById: (k: AdsterraKey) => BannerDef | undefined
}) {
  const color = account === 'home' ? 'orange' : 'blue'

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const bannerId = e.dataTransfer.getData('text/plain') as AdsterraKey
    if (!bannerId || !bannerId.startsWith(account + '-')) return
    if (items.some((it) => it.kind === 'banner' && (it as BannerPlacement).bannerId === bannerId)) return
    const banner = bannerById(bannerId)
    if (!banner) return
    const maxY = items.reduce((m, it) => Math.max(m, it.y + it.h), 0)
    const newItem: BannerPlacement = {
      i: 'placed-' + bannerId + '-' + Date.now(),
      kind: 'banner', bannerId, label: banner.label, x: 20, y: maxY + 2,
      w: Math.max(8, Math.round(banner.width / 10)),
      h: Math.max(3, Math.round(banner.height / 10)),
      minW: 8, minH: 3,
    }
    setItems([...items, newItem])
  }

  const onLayoutChange = (newLayout: Layout[]) => {
    setItems(newLayout.map((l) => {
      const existing = items.find((it) => it.i === l.i)
      return existing ? layoutToItem(existing, l) : null
    }).filter((x): x is CanvasItem => x !== null))
  }

  const removeItem = (i: string) => setItems(items.filter((it) => it.i !== i))
  const resetLayout = () => setItems(defaultItems.map((it) => ({ ...it })))

  const maxY = items.reduce((m, it) => Math.max(m, it.y + it.h), 0)
  const canvasHeight = Math.max(DEFAULT_CANVAS_HEIGHT, (maxY + 10) * ROW_HEIGHT)

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
      onDrop={onDrop}
      className="rounded-2xl p-4 bg-zinc-900 border border-zinc-700 relative"
    >
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${account === 'home' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>{account === 'home' ? '4cima.com' : '4cima.stream'}</span>
          <span className="text-[10px] text-zinc-500 font-mono">canvas: {CANVAS_COLS * 10}px wide</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
          <span>عناصر: {items.length}</span>
          <button onClick={resetLayout} className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200" title="إعادة الافتراضي"><RotateCcw className="w-3 h-3" />إعادة الافتراضي</button>
        </div>
      </div>
      <div
        className="relative bg-zinc-950/60 rounded-xl border-2 border-dashed border-zinc-700 overflow-hidden"
        style={{ minHeight: canvasHeight, width: '100%', maxWidth: CANVAS_COLS * 10, margin: '0 auto', direction: 'ltr' }}
      >
        <ResponsiveGridLayout
          layout={itemsToLayout(items)}
          cols={CANVAS_COLS}
          rowHeight={ROW_HEIGHT}
          width={CANVAS_COLS * 10}
          onLayoutChange={onLayoutChange}
          isDraggable={true}
          isResizable={true}
          isBounded={false}
          allowOverlap={true}
          preventCollision={true}
          compactType={null}
          useCSSTransforms={true}
          margin={[0, 0]}
          containerPadding={[0, 0]}
          draggableHandle=".ad-frame-cinematic"
        >
          {items.map((it) => (
            <div key={it.i}>{renderCanvasChild(it, color, bannerById, draggingBanner, removeItem)}</div>
          ))}
        </ResponsiveGridLayout>
        {items.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-zinc-600 text-sm">
              <div className="text-2xl mb-2">⬇</div>
              <div>اسحب أي بنر من اللوحة في الأعلى وأفلته هنا</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function renderCanvasChild(it: CanvasItem, color: 'orange'|'blue', bannerById: (k: AdsterraKey) => BannerDef | undefined, draggingBanner: AdsterraKey | null, removeItem: (i: string) => void) {
  if (it.kind === 'player') {
    return (
      <div className="w-full h-full rounded-lg border-2 border-emerald-500/60 bg-zinc-900/90 overflow-hidden flex items-center justify-center relative shadow-[0_0_30px_rgba(16,185,129,0.25)]">
        <div className="absolute top-1 left-1 z-20 bg-emerald-600 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">مشغّل فيديو</div>
        <div className="w-full h-full p-1"><VideoPlayer /></div>
      </div>
    )
  }
  const banner = bannerById(it.bannerId)
  if (!banner) {
    return <div className="w-full h-full bg-zinc-800 rounded flex items-center justify-center text-zinc-500 text-xs">{it.bannerId}</div>
  }
  return (
    <div className="w-full h-full relative group">
      <AdFrameCinematic banner={banner} color={color} isDragging={draggingBanner === it.bannerId} draggable={false} />
      <button
        onClick={(e) => { e.stopPropagation(); removeItem(it.i) }}
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute top-1 right-1 z-30 w-6 h-6 rounded-full bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        title="احذف البنر"
      >×</button>
      <div className="absolute bottom-1 left-1 z-20 bg-zinc-900/80 text-zinc-200 text-[9px] font-mono px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {it.x * 10},{it.y * 10} • {it.w * 10}×{it.h * 10}px
      </div>
    </div>
  )
}

function downloadLayout(items: CanvasItem[], filename: string) {
  const layout = items.map((it) => {
    const x = it.x * 10
    const y = it.y * 10
    const w = it.w * 10
    const h = it.h * 10
    if (it.kind === 'banner') {
      const banner = BANNERS.find((b) => b.id === it.bannerId)
      return { type: 'banner', id: it.bannerId, zoneId: banner?.zoneId, key: banner?.key, src: banner?.src, originalSize: banner ? `${banner.width}x${banner.height}` : null, label: it.label, x, y, w, h }
    }
    return { type: 'player', label: it.label, x, y, w, h }
  })
  const blob = new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function loadLayout(defaults: CanvasItem[], saved: string | null): CanvasItem[] {
  if (!saved) return defaults
  try {
    const parsed = JSON.parse(saved) as CanvasItem[]
    if (!Array.isArray(parsed) || parsed.length === 0) return defaults
    return parsed.map((p, idx) => {
      if (p.kind === 'banner') {
        const banner = BANNERS.find((b) => b.id === p.bannerId)
        if (!banner) return defaults.find((d) => d.kind === 'banner')!
        return {
          i: p.i || (banner.id + '-' + idx),
          kind: 'banner',
          bannerId: banner.id,
          label: banner.label,
          x: p.x ?? 0, y: p.y ?? 0,
          w: p.w ?? Math.round(banner.width / 10),
          h: p.h ?? Math.round(banner.height / 10),
          minW: 8, minH: 3,
        }
      }
      return {
        kind: 'player', isPlayer: true,
        label: p.label || 'المشغّل',
        i: p.i || 'player',
        x: p.x ?? 18, y: p.y ?? 12,
        w: p.w ?? 60, h: p.h ?? 40,
        minW: 30, minH: 20, static: true,
      }
    })
  } catch {
    return defaults
  }
}

export default function AdsLabPage() {
  const [homeItems, setHomeItems] = useState<CanvasItem[]>(() => makeDefaultHome())
  const [playerItems, setPlayerItems] = useState<CanvasItem[]>(() => makeDefaultPlayer())
  const [draggingBanner, setDraggingBanner] = useState<AdsterraKey | null>(null)
  const [hydrated, setHydrated] = useState(false)

  const homeBanners = useMemo(() => BANNERS.filter((b) => b.account === 'home'), [])
  const playerBanners = useMemo(() => BANNERS.filter((b) => b.account === 'player'), [])

  const bannerById = (k: AdsterraKey) => BANNERS.find((b) => b.id === k)

  useEffect(() => {
    try {
      const h = localStorage.getItem(STORAGE_KEY_HOME)
      setHomeItems(loadLayout(makeDefaultHome(), h))
    } catch {}
    try {
      const p = localStorage.getItem(STORAGE_KEY_PLAYER)
      setPlayerItems(loadLayout(makeDefaultPlayer(), p))
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => { if (!hydrated) return; try { localStorage.setItem(STORAGE_KEY_HOME, JSON.stringify(homeItems)) } catch {} }, [homeItems, hydrated])
  useEffect(() => { if (!hydrated) return; try { localStorage.setItem(STORAGE_KEY_PLAYER, JSON.stringify(playerItems)) } catch {} }, [playerItems, hydrated])

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8" dir="rtl">
      <div className="max-w-[1280px] mx-auto">
        <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">مختبر ترتيب الإعلانات</h1>
            <p className="text-zinc-400 text-sm">اسحب البنر من <span className="text-amber-400 font-bold">اللوحة</span> في الأعلى وأفلته على الـ canvas. كل البنرات قابلة للسحب <span className="text-emerald-400 font-bold">بالكامش</span> والتكبير بحرية. الترتيب بيتحفظ تلقائياً.</p>
          </div>
        </div>
        <div className="space-y-6">
          <BannerStripSelector account="home" accountBanners={homeBanners} draggingBanner={draggingBanner} setDraggingBanner={setDraggingBanner} />
          <FreeCanvas
            account="home"
            title="الموقع الرئيسي (4cima.com)"
            items={homeItems}
            setItems={setHomeItems}
            defaultItems={makeDefaultHome()}
            draggingBanner={draggingBanner}
            setDraggingBanner={setDraggingBanner}
            bannerById={bannerById}
          />
          <BannerStripSelector account="player" accountBanners={playerBanners} draggingBanner={draggingBanner} setDraggingBanner={setDraggingBanner} />
          <FreeCanvas
            account="player"
            title="منصة المشاهدة (4cima.stream)"
            items={playerItems}
            setItems={setPlayerItems}
            defaultItems={makeDefaultPlayer()}
            draggingBanner={draggingBanner}
            setDraggingBanner={setDraggingBanner}
            bannerById={bannerById}
          />
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={() => downloadLayout(homeItems, 'ads-lab-home.json')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-bold"
            >
              <Download className="w-4 h-4" />تحميل layout الموقع (JSON)
            </button>
            <button
              onClick={() => downloadLayout(playerItems, 'ads-lab-player.json')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold"
            >
              <Download className="w-4 h-4" />تحميل layout المشغّل (JSON)
            </button>
            <a href="https://4cima.com/ads-lab" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm">
              <ExternalLink className="w-4 h-4" />افتح الموقع الرئيسي للمقارنة
            </a>
            <a href="https://4cima.stream" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm">
              <ExternalLink className="w-4 h-4" />افتح منصة المشاهدة للمقارنة
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
