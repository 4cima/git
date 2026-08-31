'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, SkipForward } from 'lucide-react'

// ============================================================
// مكونات الإعلانات الفارغة (Placeholders)
// ============================================================

/** مربع الهيرو - إعلان مربع كبير */
function HeroAdSquare() {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="relative aspect-square max-h-[500px] w-full rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 flex flex-col items-center justify-center gap-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
        <div className="relative z-10 text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>إعلان الهيرو</span>
          </div>
          <h3 className="text-xl font-bold text-zinc-300">مربع الهيرو الإعلاني</h3>
          <p className="text-sm text-zinc-500">الأبعاد: 1:1 (مربع)</p>
          <p className="text-xs text-zinc-600">يُستخدم للإعلانات البارزة في أعلى الصفحة</p>
        </div>
        <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-cyan-500/30 rounded-tr-lg" />
        <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-cyan-500/30 rounded-tl-lg" />
        <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-cyan-500/30 rounded-br-lg" />
        <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-cyan-500/30 rounded-bl-lg" />
      </div>
    </div>
  )
}

/** المستطيل الإعلاني - إعلان أفقي رئيسي */
function BannerAdRectangle() {
  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="relative w-full h-32 sm:h-40 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 flex flex-col items-center justify-center gap-3 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
        <div className="relative z-10 text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>إعلان رئيسي</span>
          </div>
          <h3 className="text-lg font-bold text-zinc-300">المستطيل الإعلاني الرئيسي</h3>
          <p className="text-xs text-zinc-500">الأبعاد: أفقي عريض (Leaderboard 728x90 أو 970x90)</p>
        </div>
      </div>
    </div>
  )
}

/** 
 * كومبوننت عام لعرض كود إعلان سكريبت (atOptions/invoke.js وغيره) جوه iframe معزول
 * السكريبتات اللي بتستخدم document.write بتتشغل هنا بأمان
 */
function AdScriptIframe({ 
  scriptHtml, 
  width, 
  height, 
  label,
  adNumber 
}: { 
  scriptHtml: string
  width: number
  height: number
  label: string
  adNumber: number
}) {
  const srcDoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>body{margin:0;padding:0;display:flex;justify-content:center;align-items:center;overflow:hidden;background:transparent}</style>
</head>
<body>
${scriptHtml.replace(/https:\/\/(www\.)?highrevenueformat\.com\//g, '/api/ads-proxy?url=https://www.highrevenueformat.com/')}
</body>
</html>`

  return (
    <div className="w-full flex flex-col items-center gap-2">
      <div 
        className="relative rounded-xl border border-zinc-700 bg-zinc-900/30 overflow-hidden"
        style={{ width: '100%', maxWidth: width, height }}
      >
        {/* رقم الإعلان — للمرجعية عند التجربة */}
        <div className="absolute top-2 right-2 z-10 px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded shadow-lg pointer-events-none">
          إعلان #{adNumber}
        </div>
        <iframe
          srcDoc={srcDoc}
          width={width}
          height={height}
          className="border-0"
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-same-origin"
          title={`ad-${label}`}
          loading="lazy"
        />
      </div>
      <span className="text-[10px] text-zinc-600">#{adNumber} {label} — {width}x{height}</span>
    </div>
  )
}

/** الإعلان رقم 1 — Adsterra 728x90 Banner */
function LiveAdBanner728x90() {
  const scriptHtml = `<script>
  atOptions = {
    'key' : '0532fea1f51bb90a981bb89fb414869d',
    'format' : 'iframe',
    'height' : 90,
    'width' : 728,
    'params' : {}
  };
</script>
<script src="https://www.highrevenueformat.com/0532fea1f51bb90a981bb89fb414869d/invoke.js"></script>`

  return (
    <AdScriptIframe 
      scriptHtml={scriptHtml} 
      width={728} 
      height={90} 
      label="Adsterra Banner" 
      adNumber={1}
    />
  )
}

/** الإعلان رقم 2 — Adsterra 300x250 Medium Rectangle */
function LiveAd300x250() {
  const scriptHtml = `<script>
  atOptions = {
    'key' : '9a07073ebf48b3d7d98cf315a469e7c2',
    'format' : 'iframe',
    'height' : 250,
    'width' : 300,
    'params' : {}
  };
</script>
<script src="https://www.highrevenueformat.com/9a07073ebf48b3d7d98cf315a469e7c2/invoke.js"></script>`

  return (
    <AdScriptIframe 
      scriptHtml={scriptHtml} 
      width={300} 
      height={250} 
      label="Adsterra Medium Rectangle" 
      adNumber={2}
    />
  )
}

/** الإعلان رقم 3 — Adsterra 160x600 Skyscraper */
function LiveAd160x600() {
  const scriptHtml = `<script>
  atOptions = {
    'key' : '538636ef4b7a5d451e5c038b418c921e',
    'format' : 'iframe',
    'height' : 600,
    'width' : 160,
    'params' : {}
  };
</script>
<script src="https://www.highrevenueformat.com/538636ef4b7a5d451e5c038b418c921e/invoke.js"></script>`

  return (
    <AdScriptIframe 
      scriptHtml={scriptHtml} 
      width={160} 
      height={600} 
      label="Adsterra Skyscraper" 
      adNumber={3}
    />
  )
}

/** إعلان طولي (سكاي سكرابر) */
function SkyscraperAd({ side }: { side: 'right' | 'left' }) {
  return (
    <div className="w-full max-w-[160px] mx-auto">
      <div className="relative w-full h-[600px] rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 flex flex-col items-center justify-center gap-3 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-purple-500/5" />
        <div className="relative z-10 text-center space-y-2 px-2">
          <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            <span>إعلان طولي</span>
          </div>
          <h3 className="text-sm font-bold text-zinc-300">
            {side === 'right' ? 'عمود يمين' : 'عمود يسار'}
          </h3>
          <p className="text-[10px] text-zinc-500">160x600</p>
          <p className="text-[10px] text-zinc-600">Skyscraper</p>
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
            <span className="text-purple-400 text-lg">{side === 'right' ? '←' : '→'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/** إعلان زر المشاهدة */
function WatchButtonAd() {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 p-6 flex flex-col items-center justify-center gap-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5" />
        <div className="relative z-10 text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span>إعلان زر المشاهدة</span>
          </div>
          <button className="group relative flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl text-white font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-500/25">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Play className="w-5 h-5 fill-white" />
            </div>
            <span>شاهد الآن</span>
            <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-red-500 rounded-full text-[10px] font-bold">
              AD
            </div>
          </button>
          <p className="text-xs text-zinc-500">إعلان تفاعلي مع زر مشاهدة</p>
        </div>
      </div>
    </div>
  )
}

/** إعلان داخل المحتوى (In-Content) */
function InContentAd() {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative w-full h-24 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 flex flex-col items-center justify-center gap-2 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 via-transparent to-rose-500/5" />
        <div className="relative z-10 text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            <span>إعلان داخل المحتوى</span>
          </div>
          <p className="text-xs text-zinc-500">300x250 أو 336x280 (Medium Rectangle)</p>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// مشغل الفيديو
// ============================================================

function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="relative rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 overflow-hidden">
        {/* عنوان القسم */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <span>مشغل الفيديو</span>
            </div>
            <span className="text-xs text-zinc-500">للتجربة والاختبار</span>
          </div>
        </div>

        {/* منطقة الفيديو */}
        <div
          className="relative aspect-video bg-black flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            muted={isMuted}
            playsInline
          >
            <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
          </video>

          {/* زر التشغيل المركزي */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
                <Play className="w-10 h-10 text-white fill-white ml-1" />
              </div>
            </div>
          )}

          {/* شريط التحكم */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4"
          >
            {/* شريط التقدم */}
            <div className="mb-3">
              <input
                type="range"
                min={0}
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500"
              />
            </div>

            {/* أزرار التحكم */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    togglePlay()
                  }}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (videoRef.current) {
                      videoRef.current.currentTime += 10
                    }
                  }}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <SkipForward className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleMute()
                  }}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5 text-white" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-white" />
                  )}
                </button>
                <span className="text-sm text-white/80">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (videoRef.current?.requestFullscreen) {
                    videoRef.current.requestFullscreen()
                  }
                }}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <Maximize className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ============================================================ */
/* #4 — إعلان زر المشاهدة (PropellerAds OnClick — نفس سكريبت الإنتاج) */
/* السكريبت بيتجهز مع فتح الصفحة، والضغطة الأولى بتشغّل الإعلان. */
/* هنا بنحط السكريبت جوه iframe شفاف فوق الزر بالظبط — فالضغطة */
/* على الزر بس هي اللي بتخطف الإعلان (مش أي ضغطة في الصفحة). */
/* ============================================================ */

/** iframe إعلاني عام — بيستقبل مفتاح أي zone ومقاسها */
function AdScriptIframeDirect({ apiKey, width, height }: { apiKey: string; width: number; height: number }) {
  const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body><script>
    atOptions = { 'key' : '${apiKey}', 'format' : 'iframe', 'height' : ${height}, 'width' : ${width}, 'params' : {} };
  </script><script src="/api/ads-proxy?url=https://www.highrevenueformat.com/${apiKey}/invoke.js"></script></body></html>`
  return (
    <iframe
      title={`ad-${width}x${height}`}
      width={width}
      height={height}
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-forms allow-top-navigation-by-user-activation"
      loading="lazy"
      className="block max-w-full"
      srcDoc={doc}
    />
  )
}

/** إعلان #4 — PropellerAds OnClick (سكريبت الإنتاج الفعلي: al5sm.com/tag.min.js + zone 11691417) — مركب فوق زر المشاهدة */
function ProductionOnClickAd() {
  const ref = useRef<HTMLDivElement>(null)
  const firedRef = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handle = () => {
      if (firedRef.current) return
      firedRef.current = true
      // تسجيل الـ cooldowns نفس ما production بيعمل (20 ثانية بين الإعلانات)
      try {
        const now = Date.now()
        localStorage.setItem('ads_last_popup', now.toString())
        localStorage.setItem('ads_last_click', now.toString())
      } catch { /* ignore */ }
    }
    el.addEventListener('click', handle)
    return () => el.removeEventListener('click', handle)
  }, [])

  return (
    <div
      ref={ref}
      className="relative inline-block cursor-pointer select-none"
      style={{ minWidth: 260 }}
    >
      {/* طبقة السكريبت الشفافة — بتغطي الزر بالظبط فأي ضغطة على الزر بتشغّل الإعلان */}
      <iframe
        title="production-onclick-ad"
        aria-hidden="true"
        className="absolute inset-0 w-full h-full border-0 opacity-[0.01]"
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-forms allow-top-navigation-by-user-activation"
        srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body><script src="/api/ads-proxy?url=https://al5sm.com/tag.min.js" data-zone="11691417" async></script></body></html>`}
      />
      {/* زر المشاهدة الظاهر للمستخدم */}
      <button className="relative z-0 px-10 py-4 rounded-xl bg-gradient-to-l from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-lg font-bold shadow-lg shadow-blue-900/40 transition-all flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        شاهد الآن
      </button>
      <div className="mt-2 text-[10px] text-red-400 font-bold">#4 — PropellerAds OnClick فوق الزر (سكريبت الإنتاج الفعلي)</div>
    </div>
  )
}

// ============================================================
// الصفحة الرئيسية للتجربة
// ============================================================
// ============================================================
// الصفحة الرئيسية للتجربة
// ============================================================

export function AdsTestPage() {
  return (
    <div className="min-h-screen bg-black text-white py-12 px-4">
      {/* عنوان الصفحة */}
      <div className="text-center mb-12 space-y-4">
        <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          صفحة تجربة الإعلانات
        </h1>
        <p className="text-zinc-400 max-w-2xl mx-auto">
          هذه الصفحة لاختبار جميع مخططات الإعلانات المختلفة قبل تفعيلها على الموقع
        </p>
      </div>

      {/* القسم 1: مربع الهيرو */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-8 bg-cyan-500 rounded-full" />
          <h2 className="text-2xl font-bold text-zinc-200">1. مربع الهيرو الإعلاني</h2>
        </div>
        <HeroAdSquare />
      </section>

      {/* القسم 2: المستطيل الإعلاني الرئيسي */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-8 bg-amber-500 rounded-full" />
          <h2 className="text-2xl font-bold text-zinc-200">2. المستطيل الإعلاني الرئيسي</h2>
        </div>
        <BannerAdRectangle />
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">LIVE</div>
            <span className="text-sm text-zinc-400">إعلان حقيقي شغال — Adsterra</span>
          </div>
          <LiveAdBanner728x90 />
        </div>
      </section>

      {/* القسم 3: العمودين الإعلانيين (يمين وشمال) */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-8 bg-purple-500 rounded-full" />
          <h2 className="text-2xl font-bold text-zinc-200">3. الإعلانات الطولية (Skyscrapers)</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[160px_1fr_160px] gap-6 items-start">
          {/* العمود الأيمن */}
          <div className="order-2 lg:order-1 space-y-6">
            <SkyscraperAd side="right" />
            <div className="flex flex-col items-center gap-2">
              <div className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">LIVE</div>
              <LiveAd160x600 />
            </div>
          </div>

          {/* المحتوى المركزي */}
          <div className="order-1 lg:order-2 space-y-8">
            <div className="text-center p-8 rounded-xl bg-zinc-900/30 border border-zinc-800">
              <p className="text-zinc-400 text-sm">المحتوى الرئيسي للصفحة</p>
              <p className="text-zinc-600 text-xs mt-2">يظهر هنا المحتوى الفعلي بين العمودين الإعلانيين</p>
            </div>
            <InContentAd />
            <div className="flex items-center gap-3">
              <div className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">LIVE</div>
              <span className="text-sm text-zinc-400">إعلان حقيقي شغال — داخل المحتوى</span>
            </div>
            <LiveAd300x250 />
          </div>

          {/* العمود الأيسر */}
          <div className="order-3">
            <SkyscraperAd side="left" />
          </div>
        </div>
      </section>

      {/* القسم 4: إعلان زر المشاهدة */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-8 bg-green-500 rounded-full" />
          <h2 className="text-2xl font-bold text-zinc-200">4. إعلان زر المشاهدة</h2>
        </div>
        <WatchButtonAd />
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">LIVE</div>
            <span className="text-sm text-zinc-400">إعلان #4 — سكريبت الإنتاج الفعلي فوق زر المشاهدة (بيتجهز مع فتح الصفحة، والضغطة على الزر بتشغّله)</span>
          </div>
          <ProductionOnClickAd />
        </div>
      </section>

      {/* القسم 5: مشغل الفيديو */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-8 bg-red-500 rounded-full" />
          <h2 className="text-2xl font-bold text-zinc-200">5. مشغل الفيديو</h2>
        </div>
        <VideoPlayer />
      </section>

      {/* الفوتر */}
      <footer className="text-center py-8 border-t border-zinc-800">
        <p className="text-zinc-600 text-sm">
          صفحة تجريبية لاختبار الإعلانات • فور سيما
        </p>
      </footer>
    </div>
  )
}

