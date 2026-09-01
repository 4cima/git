'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, SkipForward } from 'lucide-react'

// =============================================================
// بانر Adsterra — 3 مقاسات مختلفة
// =============================================================
type AdsterraKey = 'a-728-90' | 'a-300-250' | 'a-160-600'

const ADSTERRA_BANNERS: Record<AdsterraKey, { key: string; w: number; h: number; label: string }> = {
  'a-728-90':    { key: '0532fea1f51bb90a981bb89fb414869d', w: 728,  h: 90,  label: 'Adsterra 728×90' },
  'a-300-250':   { key: '9a07073ebf48b3d7d98cf315a469e7c2', w: 300,  h: 250, label: 'Adsterra 300×250' },
  'a-160-600':   { key: '538636ef4b7a5d451e5c038b418c921e', w: 160,  h: 600, label: 'Adsterra 160×600' },
}

function AdsterraBanner({ id }: { id: AdsterraKey }) {
  const ref = useRef<HTMLDivElement>(null)
  const cfg = ADSTERRA_BANNERS[id]

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.replaceChildren()
    // الحقن المباشر في DOM — الطلب يطلع من نفس origin/referer الموقع
    ;(window as any).atOptions = {
      key: cfg.key,
      format: 'iframe',
      height: cfg.h,
      width: cfg.w,
      params: {},
    }
    const s = document.createElement('script')
    s.src = `https://www.highrevenueformat.com/${cfg.key}/invoke.js`
    s.async = true
    el.appendChild(s)
    return () => { el.replaceChildren() }
  }, [id])

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        ref={ref}
        style={{ width: cfg.w, height: cfg.h, maxWidth: '100%' }}
        className="rounded border border-red-500/30 bg-red-950/10 overflow-hidden"
      />
      <span className="text-[10px] text-zinc-500">{cfg.label}</span>
    </div>
  )
}

// =============================================================
// بانر Monetag (zone 11699161) — 3 مقاسات مختلفة
// =============================================================
const MONETAG_BANNERS = {
  'm-728-90':  { w: 728, h: 90,  label: 'Monetag 728×90' },
  'm-300-250': { w: 300, h: 250, label: 'Monetag 300×250' },
  'm-160-600': { w: 160, h: 600, label: 'Monetag 160×600' },
} as const

type MonetagId = keyof typeof MONETAG_BANNERS

function MonetagBanner({ id }: { id: MonetagId }) {
  const ref = useRef<HTMLDivElement>(null)
  const cfg = MONETAG_BANNERS[id]

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
    <div className="flex flex-col items-center gap-1">
      <div
        ref={ref}
        style={{ width: cfg.w, height: cfg.h, maxWidth: '100%' }}
        className="rounded border border-blue-500/30 bg-blue-950/10 overflow-hidden"
      />
      <span className="text-[10px] text-zinc-500">{cfg.label}</span>
    </div>
  )
}

// =============================================================
// زر المشاهدة (onclick popunder)
// =============================================================
function WatchButton() {
  const handleClick = () => {
    // السكريبت بيتجهز من الـ layout (preparePopunder) — الضغطة بتلتقطها الشبكة
    setTimeout(() => {
      window.location.href = '/'
    }, 400)
  }
  return (
    <button
      onClick={handleClick}
      className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl text-white font-bold text-lg transition-all hover:scale-105"
    >
      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
        <Play className="w-5 h-5 fill-white" />
      </div>
      <span>شاهد الآن</span>
    </button>
  )
}

// =============================================================
// مشغل الفيديو
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
    <div className="relative w-full max-w-3xl mx-auto aspect-video bg-black rounded-xl overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full"
        src="https://www.w3schools.com/html/mov_bbb.mp4"
        muted
        playsInline
      />
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
// الصفحة الرئيسية
// =============================================================
export default function AdsTestPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <header className="max-w-7xl mx-auto mb-10 text-center">
        <h1 className="text-3xl font-bold mb-2">صفحة تجربة الإعلانات</h1>
        <p className="text-zinc-500 text-sm">6 بانرات حقيقية — 3 من Adsterra + 3 من Monetag</p>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[200px_1fr_200px] gap-6 items-start">
        {/* العمود الأيسر: Adsterra — 300 فوق، 160 تحته */}
        <aside className="flex flex-col gap-6 items-center order-2 lg:order-1">
          <AdsterraBanner id="a-300-250" />
          <AdsterraBanner id="a-160-600" />
        </aside>

        {/* العمود الأوسط: المحتوى */}
        <main className="order-1 lg:order-2 space-y-8">
          {/* بانر تحت الهيرو — Adsterra + Monetag جنب بعض */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 justify-items-center">
            <AdsterraBanner id="a-728-90" />
            <MonetagBanner id="m-728-90" />
          </div>

          {/* المحتوى + زر المشاهدة + مشغل الفيديو */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-8 space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-zinc-300">المحتوى الرئيسي</h2>
              <p className="text-zinc-500 text-sm">إعلانان جانبيان + بانر أعلى المحتوى</p>
            </div>

            <div className="flex flex-col items-center gap-3 py-4">
              <span className="text-xs text-zinc-500">اختبر زر المشاهدة (البوبندر يتفتح قبل الانتقال بـ 400ms)</span>
              <WatchButton />
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <h3 className="text-sm text-zinc-500 mb-3 text-center">مشغل فيديو تجريبي</h3>
              <VideoPlayer />
            </div>
          </div>

          {/* بانر تحت المحتوى — 300×250 من كل شبكة */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 justify-items-center">
            <AdsterraBanner id="a-300-250" />
            <MonetagBanner id="m-300-250" />
          </div>
        </main>

        {/* العمود الأيمن: Monetag — 300 فوق، 160 تحته */}
        <aside className="flex flex-col gap-6 items-center order-3">
          <MonetagBanner id="m-300-250" />
          <MonetagBanner id="m-160-600" />
        </aside>
      </div>

      <footer className="max-w-7xl mx-auto mt-12 text-center text-zinc-600 text-xs">
        صفحة تجريبية — 4cima
      </footer>
    </div>
  )
}

