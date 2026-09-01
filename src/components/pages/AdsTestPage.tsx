'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, SkipForward, Edit3, Eye, RotateCcw } from 'lucide-react'
import GridLayout, { WidthProvider, Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

const ResponsiveGrid = WidthProvider(GridLayout)

const ADSTERRA = {
  'a-728-90':  { key: '0532fea1f51bb90a981bb89fb414869d', w: 728, h: 90, label: 'Adsterra 728×90' },
  'a-300-250': { key: '9a07073ebf48b3d7d98cf315a469e7c2', w: 300, h: 250, label: 'Adsterra 300×250' },
  'a-160-600': { key: '538636ef4b7a5d451e5c038b418c921e', w: 160, h: 600, label: 'Adsterra 160×600' },
} as const
const MONETAG = {
  'm-728-90':  { w: 728, h: 90, label: 'Monetag 728×90' },
  'm-300-250': { w: 300, h: 250, label: 'Monetag 300×250' },
  'm-160-600': { w: 160, h: 600, label: 'Monetag 160×600' },
} as const
type AdsterraId = keyof typeof ADSTERRA
type MonetagId = keyof typeof MONETAG
type AdId = AdsterraId | MonetagId

function AdsterraBanner({ id }: { id: AdsterraId }) {
  const ref = useRef<HTMLDivElement>(null)
  const cfg = ADSTERRA[id]
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.replaceChildren()
    ;(window as any).atOptions = { key: cfg.key, format: 'iframe', height: cfg.h, width: cfg.w, params: {} }
    const s = document.createElement('script')
    s.src = `https://www.highrevenueformat.com/${cfg.key}/invoke.js`
    s.async = true
    el.appendChild(s)
    return () => { el.replaceChildren() }
  }, [id])
  return (
    <div className="flex flex-col items-center justify-center gap-1 h-full w-full p-1">
      <div ref={ref} style={{ width: cfg.w, height: cfg.h, maxWidth: '100%', maxHeight: '100%' }} className="rounded border border-red-500/30 bg-red-950/10 overflow-hidden flex-shrink-0" />
      <span className="text-[10px] text-zinc-500">{cfg.label}</span>
    </div>
  )
}

function MonetagBanner({ id }: { id: MonetagId }) {
  const ref = useRef<HTMLDivElement>(null)
  const cfg = MONETAG[id]
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.replaceChildren()
    const s = document.createElement('script')
    s.dataset.zone = '11699161'
    s.src = 'https://nap5k.com/tag.min.js'
    s.async = true
    el.appendChild(s)
    return () => { el.replaceChildren() }
  }, [id])
  return (
    <div className="flex flex-col items-center justify-center gap-1 h-full w-full p-1">
      <div ref={ref} style={{ width: cfg.w, height: cfg.h, maxWidth: '100%', maxHeight: '100%' }} className="rounded border border-blue-500/30 bg-blue-950/10 overflow-hidden flex-shrink-0" />
      <span className="text-[10px] text-zinc-500">{cfg.label}</span>
    </div>
  )
}

function WatchButton() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 h-full w-full">
      <button
        onClick={() => setTimeout(() => { window.location.href = '/' }, 400)}
        className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl text-white font-bold text-lg"
      >
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <Play className="w-5 h-5 fill-white" />
        </div>
        <span>شاهد الآن</span>
      </button>
      <span className="text-[10px] text-zinc-500">زر المشاهدة</span>
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
  const seek = (e: React.MouseEvent<HTMLDivElement>) => { const v = videoRef.current; if (!v) return; const r = e.currentTarget.getBoundingClientRect(); v.currentTime = ((e.clientX - r.left) / r.width) * v.duration }
  const skip = () => { const v = videoRef.current; if (v) v.currentTime = Math.min(v.duration, v.currentTime + 10) }
  const fullscreen = () => { const v = videoRef.current; if (v?.requestFullscreen) v.requestFullscreen() }
  const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
  return (
    <div className="relative w-full h-full bg-black rounded-xl overflow-hidden">
      <video ref={videoRef} className="w-full h-full" src="https://www.w3schools.com/html/mov_bbb.mp4" muted playsInline />
      {!playing && (
        <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
            <Play className="w-10 h-10 fill-white text-white ml-1" />
          </div>
        </button>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        <div className="h-1 bg-white/20 rounded-full mb-3 cursor-pointer" onClick={seek}>
          <div className="h-full bg-red-500 rounded-full" style={{ width: progress + '%' }} />
        </div>
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

// =============================================================
// الترتيب الافتراضي - 12 وحدة
// =============================================================
type Item =
  | { id: 'adsterra-728-90';  type: 'adsterra'; ad: AdsterraId }
  | { id: 'adsterra-300-250'; type: 'adsterra'; ad: AdsterraId }
  | { id: 'adsterra-160-600'; type: 'adsterra'; ad: AdsterraId }
  | { id: 'monetag-728-90';   type: 'monetag';  ad: MonetagId }
  | { id: 'monetag-300-250';  type: 'monetag';  ad: MonetagId }
  | { id: 'monetag-160-600';  type: 'monetag';  ad: MonetagId }
  | { id: 'watch';            type: 'watch' }
  | { id: 'video';            type: 'video' }
  | { id: 'hero';             type: 'hero' }
  | { id: 'placeholder-1';    type: 'ph'; label: string }

const DEFAULT_ITEMS: Item[] = [
  { id: 'hero',             type: 'hero' },
  { id: 'adsterra-728-90',  type: 'adsterra', ad: 'a-728-90' },
  { id: 'monetag-728-90',   type: 'monetag',  ad: 'm-728-90' },
  { id: 'adsterra-300-250', type: 'adsterra', ad: 'a-300-250' },
  { id: 'adsterra-160-600', type: 'adsterra', ad: 'a-160-600' },
  { id: 'monetag-300-250',  type: 'monetag',  ad: 'm-300-250' },
  { id: 'monetag-160-600',  type: 'monetag',  ad: 'm-160-600' },
  { id: 'watch',            type: 'watch' },
  { id: 'video',            type: 'video' },
  { id: 'placeholder-1',    type: 'ph', label: 'محتوى تجريبي' },
]

const DEFAULT_LAYOUT: Layout[] = [
  { i: 'hero',             x: 0, y: 0,  w: 12, h: 2,  static: false },
  { i: 'adsterra-728-90',  x: 0, y: 2,  w: 6,  h: 3,  static: false },
  { i: 'monetag-728-90',   x: 6, y: 2,  w: 6,  h: 3,  static: false },
  { i: 'adsterra-300-250', x: 0, y: 5,  w: 3,  h: 6,  static: false },
  { i: 'adsterra-160-600', x: 3, y: 5,  w: 2,  h: 9,  static: false },
  { i: 'placeholder-1',    x: 5, y: 5,  w: 4,  h: 6,  static: false },
  { i: 'monetag-300-250',  x: 9, y: 5,  w: 3,  h: 6,  static: false },
  { i: 'monetag-160-600',  x: 0, y: 11, w: 2,  h: 9,  static: false },
  { i: 'watch',            x: 2, y: 11, w: 4,  h: 4,  static: false },
  { i: 'video',            x: 6, y: 11, w: 6,  h: 8,  static: false },
]

const STORAGE_KEY = 'ads-test-layout-v2'

function renderItemContent(item: Item) {
  switch (item.type) {
    case 'hero':     return <HeroBlock />
    case 'adsterra': return <AdsterraBanner id={item.ad} />
    case 'monetag':  return <MonetagBanner id={item.ad} />
    case 'watch':    return <WatchButton />
    case 'video':    return <VideoPlayer />
    case 'ph':       return <PlaceholderBlock label={item.label} />
  }
}

function HeroBlock() {
  return (
    <div className="h-full w-full rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900 flex items-center justify-center">
      <div className="text-center">
        <div className="text-zinc-500 text-sm mb-1">الهيرو (مكانه الطبيعي)</div>
        <div className="text-zinc-600 text-xs">Hero / Banner Placeholder</div>
      </div>
    </div>
  )
}

function PlaceholderBlock({ label }: { label: string }) {
  return (
    <div className="h-full w-full rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 flex items-center justify-center">
      <div className="text-zinc-500 text-sm">{label}</div>
    </div>
  )
}

export default function AdsTestPage() {
  const [editing, setEditing] = useState(false)
  const [layout, setLayout] = useState<Layout[]>(DEFAULT_LAYOUT)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as Layout[]
        const defaultIds = new Set(DEFAULT_LAYOUT.map(l => l.i))
        if (Array.isArray(saved) && saved.every(l => defaultIds.has(l.i))) {
          setLayout(saved)
        }
      }
    } catch {}
  }, [])

  const handleLayoutChange = (newLayout: Layout[]) => {
    setLayout(newLayout)
    if (editing) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newLayout)) } catch {}
    }
  }

  const reset = () => {
    setLayout(DEFAULT_LAYOUT)
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-50 bg-zinc-900/95 backdrop-blur border-b border-zinc-800">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">🧪 صفحة تجربة الإعلانات</h1>
            <p className="text-xs text-zinc-500">6 بانرات: 3 Adsterra + 3 Monetag — مع drag &amp; drop</p>
          </div>
          <div className="flex items-center gap-2">
            {editing && (
              <button
                onClick={reset}
                className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"
              >
                <RotateCcw className="w-4 h-4" />
                إعادة الضبط
              </button>
            )}
            <button
              onClick={() => setEditing(!editing)}
              className={'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg ' + (editing ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-amber-600 hover:bg-amber-500 text-white')}
            >
              {editing ? <><Eye className="w-4 h-4" /> وضع العرض</> : <><Edit3 className="w-4 h-4" /> وضع التعديل</>}
            </button>
          </div>
        </div>
        {editing && (
          <div className="bg-amber-950/30 border-t border-amber-800/40">
            <div className="max-w-[1400px] mx-auto px-4 py-2 text-xs text-amber-200 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              اسحب أي مكون لتغيير مكانه — أو اسحب الزاوية لتغيير حجمه. الترتيب يتحفظ تلقائيًا في المتصفح.
            </div>
          </div>
        )}
      </header>

      <main className="max-w-[1400px] mx-auto p-4">
        <ResponsiveGrid
          className="layout"
          layout={layout}
          cols={12}
          rowHeight={40}
          isDraggable={editing}
          isResizable={editing}
          draggableHandle=".drag-handle"
          onLayoutChange={handleLayoutChange}
          margin={[10, 10]}
        >
          {DEFAULT_ITEMS.map(item => (
            <div
              key={item.id}
              className={'relative rounded-xl overflow-hidden ' + (editing ? 'ring-2 ring-amber-500/60 ring-offset-2 ring-offset-zinc-950' : '')}
            >
              {editing && (
                <div className="drag-handle absolute inset-0 z-10 cursor-move bg-amber-500/5 hover:bg-amber-500/15 transition-colors flex items-center justify-center">
                  <div className="bg-zinc-900/90 backdrop-blur px-3 py-1.5 rounded-md text-xs text-amber-300 border border-amber-500/30 flex items-center gap-2 shadow-lg">
                    <Edit3 className="w-3 h-3" />
                    اسحبني — أو اسحب الزاوية للتكبير
                  </div>
                </div>
              )}
              {renderItemContent(item)}
            </div>
          ))}
        </ResponsiveGrid>

        {editing && (
          <div className="mt-6 p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-400">
            💡 <strong>نصيحة:</strong> الترتيب محفوظ في <code className="text-amber-300">localStorage</code> تحت المفتاح <code className="text-amber-300">{STORAGE_KEY}</code>. لو عايز تشيل الحفظ دايمًا، استخدم زر "إعادة الضبط".
          </div>
        )}
      </main>
    </div>
  )
}
