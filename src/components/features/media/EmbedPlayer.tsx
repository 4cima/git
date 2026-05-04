import { WifiOff, AlertTriangle, Loader2, PictureInPicture, Play } from 'lucide-react'
import { Server } from '../../../hooks/useServers'
import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { clsx } from 'clsx'

type Props = {
  server: Server | undefined
  serverIndex?: number
  cinemaMode: boolean
  toggleCinemaMode: () => void
  loading: boolean
  onNextServer: () => void
  onReport: () => void
  reporting: boolean
  title?: string
  poster?: string
  onProgress?: (seconds: number) => void
  onPlay?: () => void
  onPause?: () => void
  playing?: boolean
  seekTo?: number
  lang?: 'ar' | 'en'
  servers: Server[]
  activeServerIndex: number
  onServerSelect: (index: number) => void
  onPiPToggle?: () => void
  isPiPActive?: boolean
  isPiPSupported?: boolean
}

export const EmbedPlayer = ({ server, serverIndex = 0, cinemaMode, toggleCinemaMode, loading, onNextServer, onReport, reporting, lang = 'ar', servers, activeServerIndex, onServerSelect, onPiPToggle, isPiPActive = false, isPiPSupported = false, poster, ..._unusedProps }: Props) => {
  void serverIndex

  const [isIframeLoading, setIsIframeLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [iframeKey, setIframeKey] = useState(0)
  const [showPosterOverlay, setShowPosterOverlay] = useState(true)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Track error count to prevent infinite loops
  const errorCountRef = useRef(0)
  const lastErrorTimeRef = useRef(0)

  // Sync state when server URL changes
  useEffect(() => {
    // Clear any existing timeout
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current)
      loadTimeoutRef.current = null
    }

    // Reset error tracking when server changes
    errorCountRef.current = 0
    lastErrorTimeRef.current = 0

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsIframeLoading(true); setHasError(false); setIframeKey(prev => prev + 1); setShowPosterOverlay(true)

    // Set timeout to detect stuck/infinite loop iframes (15 seconds)
    loadTimeoutRef.current = setTimeout(() => {
      setIsIframeLoading(false)
      // Don't set error - just stop loading indicator
      // User can manually switch servers if needed
    }, 15000)

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current)
        loadTimeoutRef.current = null
      }
    }
  }, [server?.url])

  const iframeUrl = (() => {
    if (!server?.url) return ''

    // 🛡️ VidSrc.cc only goes through protected proxy
    // Other servers load directly (faster, no protection overhead)
    const needsProtection = server.url.includes('vidsrc.cc')

    // 🌐 Add Arabic subtitle parameters
    const addSubtitleParams = (url: string) => {
      const urlObj = new URL(url)
      // Add Arabic subtitle preference parameters
      urlObj.searchParams.set('cc_lang_pref', 'ar') // Closed captions language preference
      urlObj.searchParams.set('hl', 'ar') // Host language
      urlObj.searchParams.set('cc_load_policy', '1') // Auto-load captions
      // Add cache buster to force fresh load
      urlObj.searchParams.set('_t', Date.now().toString())
      return urlObj.toString()
    }

    if (needsProtection) {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''
      const urlWithSubtitles = addSubtitleParams(server.url)
      return `${API_BASE}/api/embed-proxy?url=${encodeURIComponent(urlWithSubtitles)}`
    }

    // Direct URL for other servers (no proxy = faster) with subtitle params
    return addSubtitleParams(server.url)
  })()

  // 🛡️ Sandbox attributes for VidSrc.cc (additional protection layer)
  // Block pop-ups, top navigation, and other malicious behaviors
  const iframeSandbox = server?.url?.includes('vidsrc.cc')
    ? "allow-scripts allow-same-origin allow-forms allow-presentation"
    : undefined

  if (loading) {
    return (
      <div className="aspect-video w-full max-h-[65vh] rounded-[2rem] border border-white/5 bg-luxury-charcoal animate-pulse flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <Loader2 className="animate-spin text-primary" size={56} />
          <div className="absolute inset-0 blur-3xl bg-primary/20 animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <span className="block text-sm font-bold text-primary animate-pulse">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</span>
          <span className="block text-xs text-zinc-500 font-medium">{lang === 'ar' ? 'البحث عن أفضل سيرفر...' : 'Finding best server...'}</span>
        </div>
      </div>
    )
  }

  const isOffline = server?.status === 'offline'
  const isDegraded = server?.status === 'degraded'

  const handleIframeLoad = () => {
    setIsIframeLoading(false)
    setHasError(false)
    // Clear timeout on successful load
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current)
      loadTimeoutRef.current = null
    }
    // Reset error count on successful load
    errorCountRef.current = 0
  }

  const handleIframeError = () => {
    const now = Date.now()
    const timeSinceLastError = now - lastErrorTimeRef.current

    // If errors are happening rapidly (within 2 seconds), increment counter
    if (timeSinceLastError < 2000) {
      errorCountRef.current++
    } else {
      // Reset counter if enough time has passed
      errorCountRef.current = 1
    }

    lastErrorTimeRef.current = now

    // If more than 3 consecutive errors, stop trying
    if (errorCountRef.current > 3) {
      setHasError(true)
      setIsIframeLoading(false)
      // Don't reload - let user choose another server manually
      return
    }

    setIsIframeLoading(false)
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowPosterOverlay(false)
  }

  const handleMouseMove = () => {
    if (showPosterOverlay) {
      setShowPosterOverlay(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 p-2 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
          {servers.map((s, idx) => {
            const isActive = idx === activeServerIndex
            const isServerOffline = s.status === 'offline'

            return (
              <button
                key={`${s.name}-${idx}`}
                onClick={() => !isServerOffline && onServerSelect(idx)}
                title={`${s.name} - ${isServerOffline ? 'Offline' : isActive ? 'Active' : 'Available'}`}
                disabled={isServerOffline}
                className={clsx(
                  "flex items-center justify-center p-3 rounded-xl border transition-all duration-300 font-black text-xs",
                  isActive
                    ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                    : isServerOffline
                      ? "bg-rose-500/5 border-rose-500/20 text-rose-500/50 cursor-not-allowed opacity-50"
                      : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10 hover:border-white/10 hover:text-white"
                )}
              >
                V{idx + 1}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2 p-2 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
          {isPiPSupported && onPiPToggle && (
            <button
              onClick={onPiPToggle}
              title={isPiPActive ? (lang === 'ar' ? 'إيقاف صورة داخل صورة' : 'Exit PiP') : (lang === 'ar' ? 'صورة داخل صورة' : 'Picture in Picture')}
              className={clsx(
                "group relative flex items-center justify-center p-3 rounded-xl transition-all duration-500 border overflow-hidden",
                isPiPActive
                  ? "bg-primary border-primary text-black shadow-[0_0_20px_rgba(245,197,24,0.3)]"
                  : "bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:border-white/10"
              )}
            >
              <PictureInPicture size={18} className={clsx("transition-transform duration-500", isPiPActive ? "scale-110" : "group-hover:scale-110")} />
            </button>
          )}

          <button
            onClick={onReport}
            disabled={reporting}
            title={reporting ? (lang === 'ar' ? 'جاري الإبلاغ...' : 'Reporting...') : (lang === 'ar' ? 'إبلاغ عن مشكلة' : 'Report Issue')}
            className={clsx(
              "flex items-center justify-center p-3 rounded-xl border transition-all duration-300",
              reporting
                ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 cursor-not-allowed"
                : "bg-white/5 border-white/5 text-yellow-400 hover:bg-yellow-500/10 hover:border-yellow-500/30 hover:text-yellow-300"
            )}
          >
            <AlertTriangle size={18} />
          </button>
        </div>
      </div>

      <div
        className={clsx(
          "relative aspect-video w-full overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group",
          cinemaMode
            ? 'fixed inset-0 z-[60] h-screen w-screen rounded-none border-none bg-black'
            : 'rounded-[2rem] border border-white/10 bg-black shadow-2xl ring-1 ring-white/5 max-h-[65vh]'
        )}
        onMouseMove={handleMouseMove}
      >
        {/* الـ iframe - دايماً موجود */}
        <div className="h-full w-full relative z-10">
          {server && !hasError ? (
            <iframe
              ref={iframeRef}
              key={iframeKey}
              src={iframeUrl}
              sandbox={iframeSandbox}
              className="h-full w-full"
              scrolling="no"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              referrerPolicy="origin"
              style={{ border: 'none', overflow: 'hidden', width: '100%', height: '100%', background: 'transparent' }}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture; web-share; accelerometer; gyroscope"
              title={`Stream ${server.name}`}
              // CRITICAL: Add importance="low" to deprioritize iframe loading
              // This helps reduce console spam from failed external resources
              // @ts-expect-error - importance is not in React types yet
              importance="low"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-zinc-500 gap-6 bg-black/80 backdrop-blur-sm relative z-10">
              <div className="p-8 rounded-full bg-white/5 border border-white/5">
                <WifiOff size={64} className="opacity-20" />
              </div>
              <div className="text-center space-y-3 max-w-xs">
                <span className="block text-xl font-bold text-zinc-200">{lang === 'ar' ? 'لا يوجد اتصال' : 'No Connection'}</span>
                <span className="block text-sm text-zinc-500 font-medium leading-relaxed">{lang === 'ar' ? 'جميع السيرفرات غير متاحة حالياً' : 'All servers unavailable'}</span>
                <button
                  onClick={onNextServer}
                  className="mt-4 px-6 py-3 rounded-2xl bg-primary text-black text-sm font-bold hover:scale-105 transition-transform"
                >
                  {lang === 'ar' ? 'تجربة سيرفر آخر' : 'Try Another Server'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Poster Overlay - يظهر قبل التشغيل */}
        {showPosterOverlay && poster && server && !hasError && (
          <div
            onClick={handleOverlayClick}
            className="absolute inset-0 z-20 cursor-pointer"
            style={{
              backgroundImage: `url(${poster})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            {/* طبقة تعتيم خفيفة */}
            <div className="absolute inset-0 bg-black/40 transition-colors" />

            {/* أيقونة Play */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative group/play">
                <div className="absolute inset-0 bg-zinc-400/20 blur-2xl animate-pulse" />
                <div className="relative w-14 h-14 rounded-full bg-zinc-200/95 backdrop-blur-sm flex items-center justify-center border-2 border-white/30 group-hover/play:scale-110 group-hover/play:bg-white transition-all shadow-2xl">
                  <Play size={24} className="fill-zinc-800 text-zinc-800 translate-x-0.5" />
                </div>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  )
}
