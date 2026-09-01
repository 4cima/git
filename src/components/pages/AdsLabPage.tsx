'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, SkipForward, RotateCcw, GripVertical } from 'lucide-react'

// =============================================================
// أنواع
// =============================================================
type AdsterraKey =
  | 'home-728-90' | 'home-300-250' | 'home-160-600' | 'home-468-60' | 'home-160-300' | 'home-320-50'
  | 'player-728-90' | 'player-300-250' | 'player-160-600' | 'player-468-60' | 'player-160-300' | 'player-320-50'

interface BannerDef {
  id: AdsterraKey
  account: 'home' | 'player'
  zoneId: string
  key: string
  src: string
  width: number
  height: number
  label: string
}

interface SlotDef {
  id: string
  name: string
  rect: { x: number; y: number; w: number; h: number }
}

interface BannerPlacement {
  bannerId: AdsterraKey
  slotId: string
}

// =============================================================
// البنرات الـ12 (6 لكل دومين)
// =============================================================
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


// =============================================================
// سلوتات القسمين (الـ Home mock + Player mock)
// =============================================================
const HOME_SLOTS: SlotDef[] = [
  { id: 'home-under-hero', name: 'تحت الهيرو',   rect: { x: 0,   y: 0,    w: 1200, h: 100 } },
  { id: 'home-side-1',     name: 'جنب يمين',     rect: { x: 1030,y: 110,  w: 170,  h: 620 } },
  { id: 'home-side-2',     name: 'جنب يسار',     rect: { x: 0,   y: 110,  w: 170,  h: 340 } },
  { id: 'home-middle',     name: 'وسط الصفوف',   rect: { x: 190, y: 110,  w: 820,  h: 280 } },
  { id: 'home-row',        name: 'صف',           rect: { x: 190, y: 410,  w: 820,  h: 80  } },
  { id: 'home-bottom',     name: 'أسفل',         rect: { x: 0,   y: 1080, w: 1200, h: 70  } },
]

const PLAYER_SLOTS: SlotDef[] = [
  { id: 'player-top',      name: 'فوق المشغّل',  rect: { x: 0,   y: 0,    w: 1200, h: 100 } },
  { id: 'player-right',    name: 'يمين',          rect: { x: 1030,y: 110,  w: 170,  h: 320 } },
  { id: 'player-left',     name: 'شمال',         rect: { x: 0,   y: 110,  w: 170,  h: 320 } },
  { id: 'player-bottom',   name: 'تحت المشغّل',  rect: { x: 190, y: 770,  w: 820,  h: 80  } },
  { id: 'player-middle',   name: 'وسط (المشغّل)', rect: { x: 190, y: 200,  w: 820,  h: 540 } },
  { id: 'player-footer',   name: 'أسفل',         rect: { x: 0,   y: 870,  w: 1200, h: 70  } },
]

const DEFAULT_HOME_PLACEMENTS: BannerPlacement[] = [
  { bannerId: 'home-728-90',    slotId: 'home-under-hero' },
  { bannerId: 'home-160-600',   slotId: 'home-side-1' },
  { bannerId: 'home-160-300',   slotId: 'home-side-2' },
  { bannerId: 'home-300-250',   slotId: 'home-middle' },
  { bannerId: 'home-468-60',    slotId: 'home-row' },
  { bannerId: 'home-320-50',    slotId: 'home-bottom' },
]

const DEFAULT_PLAYER_PLACEMENTS: BannerPlacement[] = [
  { bannerId: 'player-728-90',  slotId: 'player-top' },
  { bannerId: 'player-160-600', slotId: 'player-right' },
  { bannerId: 'player-160-300', slotId: 'player-left' },
  { bannerId: 'player-468-60',  slotId: 'player-bottom' },
  { bannerId: 'player-300-250', slotId: 'player-middle' },
  { bannerId: 'player-320-50',  slotId: 'player-footer' },
]

const STORAGE_KEY_HOME = 'ads-lab-home'
const STORAGE_KEY_PLAYER = 'ads-lab-player'


// =============================================================
// الـ Adsterra queue: تحميل متسلسل للبنرات (الـ atOptions العالمي)
// =============================================================
let adQueue: Promise<void> = Promise.resolve()

function queueBannerLoad(banner: BannerDef, container: HTMLElement) {
  adQueue = adQueue.then(() => new Promise<void>((resolve) => {
    ;(window as unknown as { atOptions: unknown }).atOptions = {
      key: banner.key,
      format: 'iframe',
      height: banner.height,
      width: banner.width,
      params: {},
    }
    const s = document.createElement('script')
    s.src = banner.src
    s.async = false
    s.onload = () => resolve()
    s.onerror = () => resolve()
    container.appendChild(s)
  }))
}


// =============================================================
// مكوّن بنر واحد
// =============================================================
function BannerSlot({
  banner,
  onDragStart,
  isDragging,
}: {
  banner: BannerDef
  onDragStart: () => void
  isDragging: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.replaceChildren()
    queueBannerLoad(banner, el)
    return () => { el.replaceChildren() }
  }, [banner.id])

  return (
    <div
      ref={rootRef}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', banner.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
        if (rootRef.current) {
          e.dataTransfer.setDragImage(rootRef.current, 20, 14)
        }
      }}
      className={`group flex flex-col rounded-lg overflow-hidden border-2 transition-colors ${
        isDragging ? 'border-blue-400 opacity-50' : 'border-amber-500/60'
      }`}
      style={{ width: banner.width, height: banner.height + 28, maxWidth: '100%', cursor: 'grab' }}
    >
      <div
        className="flex items-center justify-between px-2 bg-amber-500/90 text-zinc-900 text-[11px] font-bold select-none flex-shrink-0"
        style={{ height: 28 }}
        title="اسحب من هنا"
      >
        <div className="flex items-center gap-1">
          <GripVertical className="w-3 h-3" />
          <span>اسحب من هنا</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono">{banner.zoneId}</span>
          <span className="px-1.5 py-0.5 rounded bg-zinc-900/20 font-mono">{banner.label}</span>
        </div>
      </div>
      <div
        className="flex-1 bg-transparent overflow-hidden"
        style={{
          width: banner.width,
          height: banner.height,
          pointerEvents: isDragging ? 'none' : 'auto',
        }}
      >
        <div ref={ref} className="w-full h-full" />
      </div>
    </div>
  )
}


// =============================================================
// مشغّل الفيديو التجريبي
// =============================================================
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
    const onTime = () => {
      setCurrentTime(v.currentTime)
      setProgress((v.currentTime / v.duration) * 100)
    }
    const onDur = () => setDuration(v.duration)
    const onEnd = () => setPlaying(false)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('loadedmetadata', onDur)
    v.addEventListener('ended', onEnd)
    return () => {
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('loadedmetadata', onDur)
      v.removeEventListener('ended', onEnd)
    }
  }, [])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setPlaying(true) } else { v.pause(); setPlaying(false) }
  }
  const toggleMute = () => {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current
    if (!v) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    v.currentTime = pct * v.duration
  }
  const skip = () => {
    const v = videoRef.current
    if (v) v.currentTime = Math.min(v.duration, v.currentTime + 10)
  }
  const fullscreen = () => {
    const v = videoRef.current
    if (v?.requestFullscreen) v.requestFullscreen()
  }
  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

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
          <div className="h-full bg-red-500 rounded-full" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center gap-3 text-white">
          <button onClick={togglePlay}>
            {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button onClick={skip}><SkipForward className="w-5 h-5" /></button>
          <button onClick={toggleMute}>
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <span className="text-xs">{fmt(currentTime)} / {fmt(duration)}</span>
          <div className="flex-1" />
          <button onClick={fullscreen}><Maximize className="w-5 h-5" /></button>
        </div>
      </div>
    </div>
  )
}


// =============================================================
// مكوّن القسم الواحد (Home mock / Player mock)
// =============================================================
function AdSection({
  title,
  account,
  slots,
  placements,
  defaultPlacements,
  storageKey,
  hasPlayer,
  bgClass,
  setPlacements,
}: {
  title: string
  account: 'home' | 'player'
  slots: SlotDef[]
  placements: BannerPlacement[]
  defaultPlacements: BannerPlacement[]
  storageKey: string
  hasPlayer?: boolean
  bgClass: string
  setPlacements?: (p: BannerPlacement[]) => void
}) {
  const [current, setCurrent] = useState<BannerPlacement[]>(placements)
  const [draggingBanner, setDraggingBanner] = useState<AdsterraKey | null>(null)
  const [hoverSlot, setHoverSlot] = useState<string | null>(null)

  const accountBanners = BANNERS.filter((b) => b.account === account)
  const bannerById = (id: AdsterraKey) => BANNERS.find((b) => b.id === id)!
  const placementBySlot = (slotId: string) => current.find((p) => p.slotId === slotId)
  const bannerInSlot = (slotId: string) => {
    const p = placementBySlot(slotId)
    return p ? bannerById(p.bannerId) : null
  }

  const onDrop = (slotId: string) => (e: React.DragEvent) => {
    e.preventDefault()
    setHoverSlot(null)
    const bannerId = e.dataTransfer.getData('text/plain') as AdsterraKey
    if (!bannerId) return
    // تخطّي لو البنر ليس من هذا الحساب
    if (!bannerId.startsWith(account + '-')) return

    setCurrent((prev) => {
      // إزالة البنر من مكانه الحالي (تبديل)
      const without = prev.filter((p) => p.bannerId !== bannerId)
      const target = slots.find((s) => s.id === slotId)
      if (!target) return without
      // تكبير: لو البنر أكبر من السلوت، نخلي السلوت قابل للتمرير
      const next = [...without, { bannerId, slotId }]
      setPlacements?.(next)
      return next
    })
  }

  const reset = () => {
    try { localStorage.removeItem(storageKey) } catch {}
    setCurrent(defaultPlacements)
    setPlacements?.(defaultPlacements)
  }

  const totalAds = current.length
  const totalSlots = slots.length

  return (
    <div className={`rounded-2xl p-4 ${bgClass} border border-zinc-700`}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${account === 'home' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
            {account === 'home' ? '4cima.com' : '4cima.stream'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
          <span>البنرات: {totalAds}/{accountBanners.length}</span>
          <span>السلوتات: {totalSlots}</span>
          <button
            onClick={reset}
            className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
            title="إعادة للترتيب الافتراضي"
          >
            <RotateCcw className="w-3 h-3" />
            رجوع للافتراضي
          </button>
        </div>
      </div>

      <div
        className="relative bg-zinc-900/40 rounded-xl border border-dashed border-zinc-700"
        style={{ minHeight: 940, width: '100%', maxWidth: 1200, margin: '0 auto' }}
      >
        {/* slots */}
        {slots.map((slot) => {
          const banner = bannerInSlot(slot.id)
          const isHover = hoverSlot === slot.id
          return (
            <div
              key={slot.id}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setHoverSlot(slot.id) }}
              onDragLeave={() => setHoverSlot(null)}
              onDrop={onDrop(slot.id)}
              className={`absolute rounded-lg border-2 transition-colors flex items-center justify-center overflow-hidden ${
                isHover ? 'border-emerald-400 bg-emerald-500/10' : 'border-zinc-700 bg-zinc-900/60'
              }`}
              style={{
                left: slot.rect.x,
                top: slot.rect.y,
                width: slot.rect.w,
                height: slot.rect.h,
              }}
            >
              {hasPlayer && slot.id === 'player-middle' ? (
                <div className="w-full h-full p-2 pointer-events-auto">
                  <VideoPlayer />
                </div>
              ) : banner ? (
                <BannerSlot
                  banner={banner}
                  isDragging={draggingBanner === banner.id}
                  onDragStart={() => setDraggingBanner(banner.id)}
                />
              ) : (
                <div className="text-zinc-500 text-xs text-center px-2 pointer-events-none">
                  <div className="font-bold mb-1">{slot.name}</div>
                  <div>اسحب بنر هنا</div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}


// =============================================================
// الصفحة الرئيسية
// =============================================================
export default function AdsLabPage() {
  const [homePlacements, setHomePlacements] = useState<BannerPlacement[]>(DEFAULT_HOME_PLACEMENTS)
  const [playerPlacements, setPlayerPlacements] = useState<BannerPlacement[]>(DEFAULT_PLAYER_PLACEMENTS)
  const [hydrated, setHydrated] = useState(false)

  // تحميل من localStorage
  useEffect(() => {
    try {
      const h = localStorage.getItem(STORAGE_KEY_HOME)
      if (h) setHomePlacements(JSON.parse(h))
    } catch {}
    try {
      const p = localStorage.getItem(STORAGE_KEY_PLAYER)
      if (p) setPlayerPlacements(JSON.parse(p))
    } catch {}
    setHydrated(true)
  }, [])

  // حفظ عند التغيير
  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(STORAGE_KEY_HOME, JSON.stringify(homePlacements)) } catch {}
  }, [homePlacements, hydrated])
  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(STORAGE_KEY_PLAYER, JSON.stringify(playerPlacements)) } catch {}
  }, [playerPlacements, hydrated])

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8" dir="rtl">
      <div className="max-w-[1280px] mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">مختبر ترتيب الإعلانات</h1>
          <p className="text-zinc-400 text-sm">
            اسحب البنر من <span className="text-amber-400 font-bold">الشريط البرتقالي</span> في الأعلى إلى أي سلوت.
            الترتيب بيتحفظ في المتصفح.
          </p>
        </div>

        <div className="space-y-6">
          <AdSection
            title="الموقع الرئيسي (4cima.com)"
            account="home"
            slots={HOME_SLOTS}
            placements={homePlacements}
            defaultPlacements={DEFAULT_HOME_PLACEMENTS}
            storageKey={STORAGE_KEY_HOME}
            bgClass="bg-zinc-900"
            setPlacements={setHomePlacements}
          />
          <AdSection
            title="منصة المشاهدة (4cima.stream)"
            account="player"
            slots={PLAYER_SLOTS}
            placements={playerPlacements}
            defaultPlacements={DEFAULT_PLAYER_PLACEMENTS}
            storageKey={STORAGE_KEY_PLAYER}
            hasPlayer
            bgClass="bg-zinc-900"
            setPlacements={setPlayerPlacements}
          />
        </div>
      </div>
    </main>
  )
}
