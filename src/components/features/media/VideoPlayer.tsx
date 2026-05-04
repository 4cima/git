'use client'

import { lazy, Suspense, useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  AlertTriangle,
  SkipForward,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Subtitles,
  RotateCcw,
  RotateCw,
  FastForward,
  Rewind,
  Loader2,
  Check,
  ExternalLink,
  PictureInPicture
} from 'lucide-react'
import { Button } from '../../common/Button'
import { useLang } from '../../../state/useLang'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx } from 'clsx'
import { logger } from '../../../lib/logger'
import { toast } from '../../../lib/toast-manager'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReactPlayer = require('react-player').default as any

interface VideoPlayerProps {
  url: string
  subtitles?: { label: string, src: string, srcLang: string, kind?: string, default?: boolean }[]
  introStart?: number
  introEnd?: number
  title?: string
  poster?: string
  onProgress?: (state: { played: number, playedSeconds: number, loaded: number, loadedSeconds: number }) => void
  onPlay?: () => void
  onPause?: () => void
  onDuration?: (duration: number) => void
  ref?: React.RefObject<any>
  playing?: boolean
  seekTo?: number
  onPiPEnter?: () => void
  onPiPExit?: () => void
}

export const VideoPlayer = ({ url, subtitles = [], introStart, introEnd, title, poster, onProgress, onPlay, onPause, onDuration, playing: externalPlaying, seekTo, onPiPEnter, onPiPExit }: VideoPlayerProps) => {
  // Check if this is YouTube and force iframe mode
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be')
  const forceIframe = isYouTube

  // PiP Detection and State
  const [isPiPSupported, setIsPiPSupported] = useState(false)
  const [isPiPActive, setIsPiPActive] = useState(false)

  // State
  const [playing, setPlaying] = useState(externalPlaying ?? false)

  // Sync with external playing state
  useEffect(() => {
    if (externalPlaying !== undefined) {
      setPlaying(externalPlaying)
    }
  }, [externalPlaying]) // Fixed: removed 'playing' from dependencies

  // Sync with external seek
  const prevSeekTo = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (seekTo !== undefined && seekTo !== prevSeekTo.current && playerRef.current) {
      prevSeekTo.current = seekTo
      playerRef.current.seekTo(seekTo)
    }
  }, [seekTo])
  const [volume, setVolume] = useState(0.8)
  const [muted, setMuted] = useState(false)
  const [played, setPlayed] = useState(0)
  const [loaded, setLoaded] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1.0)
  const [seeking, setSeeking] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(forceIframe ? false : true) // Don't show loading for iframe mode
  const [showSkip, setShowSkip] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showSubtitlesMenu, setShowSubtitlesMenu] = useState(false)
  const [activeSubtitle, setActiveSubtitle] = useState<number>(-1) // -1 for none
  const [fallbackToIframe, setFallbackToIframe] = useState(forceIframe) // Force iframe for YouTube

  // Refs
  const playerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<any>(null)

  const CONTROLS_HIDE_DELAY_MS = 5000
  const CONTROLS_HOTZONE_PX = 140

  const { lang } = useLang()

  // PiP Support Detection
  useEffect(() => {
    const checkPiPSupport = () => {
      if (!document.pictureInPictureEnabled) {
        logger.warn('Picture-in-Picture is not supported in this browser')
        setIsPiPSupported(false)
        return
      }
      setIsPiPSupported(true)
    }

    checkPiPSupport()
  }, [])

  // Check if PiP is available for current video source
  const isPiPAvailable = useMemo(() => {
    if (!isPiPSupported) return false
    if (fallbackToIframe && isYouTube) return false // YouTube iframe doesn't support our PiP
    return true
  }, [isPiPSupported, fallbackToIframe, isYouTube])

  // Handlers
  const getVideoElement = (): HTMLVideoElement | null => {
    if (!playerRef.current) return null

    // ReactPlayer exposes internal player via getInternalPlayer()
    const internalPlayer = playerRef.current.getInternalPlayer()

    // For native videos, this returns the video element directly
    if (internalPlayer instanceof HTMLVideoElement) {
      return internalPlayer
    }

    // For YouTube, iframe doesn't support PiP via our API
    return null
  }

  const handleTogglePiP = async () => {
    try {
      const videoElement = getVideoElement()

      if (!videoElement) {
        toast.error(lang === 'ar' ? 'فشل تفعيل PiP للفيديو' : 'Failed to activate PiP for video')
        return
      }

      if (document.pictureInPictureElement) {
        // Exit PiP
        await document.exitPictureInPicture()
      } else {
        // Enter PiP
        await videoElement.requestPictureInPicture()
        toast.success(lang === 'ar' ? 'تم تفعيل PiP' : 'PiP activated', { duration: 2000 })
      }
    } catch (error: any) {
      logger.error('PiP error:', error)

      if (error.name === 'NotSupportedError') {
        toast.error(lang === 'ar' ? 'المتصفح لا يدعم PiP' : 'Browser does not support PiP')
      } else if (error.name === 'NotAllowedError') {
        toast.error(lang === 'ar' ? 'يرجى السماح بـ PiP في إعدادات المتصفح' : 'Please allow PiP in browser settings')
      } else {
        toast.error(lang === 'ar' ? 'فشل تفعيل PiP' : 'Failed to activate PiP')
      }
    }
  }

  const handlePlayPause = () => {
    const nextState = !playing
    setPlaying(nextState)
    if (nextState) onPlay?.()
    else onPause?.()
  }

  const handleToggleMuted = () => setMuted(!muted)

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    setVolume(val)
    if (val > 0) setMuted(false)
  }

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }

  const handleSeekMouseDown = () => setSeeking(true)

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayed(parseFloat(e.target.value))
  }

  const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    setSeeking(false)
    const target = e.target as HTMLInputElement
    const seconds = parseFloat(target.value) * duration
    playerRef.current?.seekTo(seconds)
  }

  const handleProgress = (state: { played: number, playedSeconds: number, loaded: number, loadedSeconds: number }) => {
    if (!seeking) {
      setPlayed(state.played)
    }
    setLoaded(state.loaded)

    // Intro Skip Logic
    if (introStart !== undefined && introEnd !== undefined) {
      if (state.playedSeconds >= introStart && state.playedSeconds < introEnd) {
        setShowSkip(true)
      } else {
        setShowSkip(false)
      }
    }
    onProgress?.(state)
  }

  const skipIntro = () => {
    if (playerRef.current && introEnd !== undefined) {
      playerRef.current.seekTo(introEnd, 'seconds')
      setShowSkip(false)
    }
  }

  const formatTime = (seconds: number) => {
    const date = new Date(seconds * 1000)
    const hh = date.getUTCHours()
    const mm = date.getUTCMinutes()
    const ss = date.getUTCSeconds().toString().padStart(2, '0')
    if (hh) {
      return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`
    }
    return `${mm}:${ss}`
  }

  const clearControlsTimeout = useCallback(() => {
    if (!controlsTimeoutRef.current) return
    clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = null
  }, [])

  const scheduleHideControls = useCallback(() => {
    clearControlsTimeout()
    controlsTimeoutRef.current = setTimeout(() => {
      if (playing) setShowControls(false)
    }, CONTROLS_HIDE_DELAY_MS)
  }, [clearControlsTimeout, playing])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const isNearBottom = e.clientY >= rect.bottom - CONTROLS_HOTZONE_PX

    if (isNearBottom) {
      setShowControls(true)
      scheduleHideControls()
      return
    }

    if (showControls) scheduleHideControls()
  }

  const handleMouseLeave = () => {
    scheduleHideControls()
  }

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['input', 'textarea'].includes((e.target as HTMLElement).tagName.toLowerCase())) return

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault()
          setPlaying(p => {
            const next = !p
            if (next) onPlay?.()
            else onPause?.()
            return next
          })
          break
        case 'KeyF':
          e.preventDefault()
          handleToggleFullscreen()
          break
        case 'KeyM':
          e.preventDefault()
          setMuted(m => !m)
          break
        case 'KeyP':
          e.preventDefault()
          if (isPiPAvailable) {
            handleTogglePiP()
          }
          break
        case 'ArrowRight':
          e.preventDefault()
          if (playerRef.current) {
            const currentTime = playerRef.current.getCurrentTime?.() || 0
            playerRef.current.seekTo(currentTime + 10)
          }
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (playerRef.current) {
            const currentTime = playerRef.current.getCurrentTime?.() || 0
            playerRef.current.seekTo(currentTime - 10)
          }
          break
        case 'ArrowUp':
          e.preventDefault()
          setVolume(prev => Math.min(prev + 0.1, 1))
          break
        case 'ArrowDown':
          e.preventDefault()
          setVolume(prev => Math.max(prev - 0.1, 0))
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPiPAvailable])

  useEffect(() => {
    return () => {
      clearControlsTimeout()
    }
  }, [clearControlsTimeout])

  // Fullscreen Listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  // PiP Event Listeners
  useEffect(() => {
    const videoElement = getVideoElement()
    if (!videoElement) return

    const handleEnterPiP = () => {
      setIsPiPActive(true)
      onPiPEnter?.()
    }

    const handleLeavePiP = () => {
      setIsPiPActive(false)
      onPiPExit?.()
    }

    videoElement.addEventListener('enterpictureinpicture', handleEnterPiP)
    videoElement.addEventListener('leavepictureinpicture', handleLeavePiP)

    return () => {
      videoElement.removeEventListener('enterpictureinpicture', handleEnterPiP)
      videoElement.removeEventListener('leavepictureinpicture', handleLeavePiP)
    }
  }, [onPiPEnter, onPiPExit]) // Fixed: removed playerRef.current

  // Cleanup PiP on unmount
  useEffect(() => {
    return () => {
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(err => {
          logger.warn('Failed to exit PiP on unmount:', err)
        })
      }
    }
  }, [])

  if (error) {
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be')
    const watchUrl = (() => {
      if (!isYouTube) return url
      if (url.includes('/embed/')) {
        const parts = url.split('/embed/')
        const idAndQuery = parts[1]
        const [id, query] = idAndQuery.split('?')
        return `https://www.youtube.com/watch?v=${id}${query ? '&' + query : ''}`
      }
      return url
    })()

    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-950 text-zinc-500 rounded-3xl border border-white/5">
        <AlertTriangle size={48} className="mb-4 text-red-500 opacity-50" />
        <p className="font-bold">{lang === 'ar' ? 'خطأ في التشغيل' : 'Playback Error'}</p>
        <p className="text-xs">{lang === 'ar' ? 'قد يكون المصدر غير متاح حالياً.' : 'The source might be unavailable.'}</p>

        <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
          <Button
            variant="secondary"
            onClick={() => window.location.reload()}
          >
            {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </Button>

          {isYouTube && (
            <Button
              variant="primary"
              onClick={() => window.open(watchUrl, '_blank')}
            >
              {lang === 'ar' ? 'المشاهدة على يوتيوب' : 'Watch on YouTube'}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={clsx(
        "relative h-full w-full group bg-black overflow-hidden transition-all duration-500",
        isFullscreen ? "rounded-0" : "rounded-3xl border border-white/10"
      )}
    >
      {/* Loading Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <Loader2 className="animate-spin text-primary" size={48} />
          </motion.div>
        )}
      </AnimatePresence>

      {fallbackToIframe ? (
        <iframe
          src={(() => {
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
              // Extract ID
              let id = ''
              if (url.includes('/embed/')) id = url.split('/embed/')[1].split('?')[0]
              else if (url.includes('v=')) id = url.split('v=')[1].split('&')[0]
              else if (url.includes('youtu.be/')) id = url.split('youtu.be/')[1].split('?')[0]

              return `https://www.youtube.com/embed/${id}?autoplay=1&origin=${window.location.origin}`
            }
            return url
          })()}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          title={title || "Video"}
        />
      ) : (
        <Suspense fallback={<div className="h-full w-full bg-black/80" />}>
          <ReactPlayer
            key={url}
            ref={playerRef}
            url={url}
            width="100%"
            height="100%"
            playing={playing}
            volume={volume}
            muted={muted}
            playbackRate={playbackRate}
            onReady={() => setLoading(false)}
            onBuffer={() => setLoading(true)}
            onBufferEnd={() => setLoading(false)}
            onError={(e: any) => {
              const isYouTube = url.includes('youtube.com') || url.includes('youtu.be')

              if (isYouTube && !fallbackToIframe) {
                logger.warn('ReactPlayer failed for YouTube, falling back to raw iframe')
                setFallbackToIframe(true)
                setLoading(false)
                return
              }
              logger.error('Playback error:', e)
              setError(true)
            }}
            onProgress={handleProgress}
            onDuration={(d: number) => setDuration(d)}
            onClick={() => handlePlayPause()}
            config={{
              youtube: {
                playerVars: {
                  origin: window.location.origin,
                  modestbranding: 1,
                  rel: 0
                }
              },
              file: {
                attributes: {
                  crossOrigin: 'anonymous',
                  poster: poster
                },
                forceHLS: url.includes('.m3u8'),
                tracks: subtitles.map((sub, idx) => ({
                  kind: 'subtitles',
                  src: sub.src,
                  srcLang: sub.srcLang,
                  label: sub.label,
                  default: activeSubtitle === idx
                }))
              }
            }}
          />
        </Suspense>
      )}

      {/* Custom Controls Overlay */}
      <AnimatePresence>
        {showControls && !fallbackToIframe && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col justify-between bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none"
          >
            {/* Top Bar: Title */}
            <div className="p-6 flex justify-between items-start pointer-events-auto">
              <h3 className="text-white font-bold text-lg drop-shadow-lg opacity-80">
                {title || (lang === 'ar' ? 'مشغل فور سيما' : '4Cima Player')}
              </h3>
            </div>

            {/* Bottom Controls */}
            <div className="p-4 md:p-6 space-y-4 pointer-events-auto">
              {/* Progress Bar */}
              <div className="relative group/progress">
                {/* Buffering bar */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 left-0 h-1.5 bg-white/20 rounded-full overflow-hidden w-full"
                >
                  <div
                    className="h-full bg-white/30 transition-all duration-300"
                    style={{ width: `${loaded * 100}%` }}
                  />
                </div>
                {/* Active progress */}
                <input
                  type="range"
                  min={0}
                  max={0.999999}
                  step="any"
                  value={played}
                  onMouseDown={handleSeekMouseDown}
                  onChange={handleSeekChange}
                  onMouseUp={handleSeekMouseUp}
                  className="relative z-10 w-full h-1.5 bg-transparent appearance-none cursor-pointer accent-primary group-hover/progress:h-2 transition-all"
                  style={{
                    background: `linear-gradient(to right, #f5c518 ${played * 100}%, transparent ${played * 100}%)`
                  }}
                />
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 md:gap-6">
                  <button onClick={handlePlayPause} className="text-white hover:text-primary transition-colors">
                    {playing ? <Pause size={24} /> : <Play size={24} fill="currentColor" />}
                  </button>

                  <div className="flex items-center gap-2 group/volume">
                    <button onClick={handleToggleMuted} className="text-white hover:text-primary transition-colors">
                      {muted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step="any"
                      value={muted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-0 group-hover/volume:w-20 transition-all duration-300 h-1 accent-primary appearance-none bg-white/20 rounded-full cursor-pointer"
                    />
                  </div>

                  <div className="text-white text-sm font-medium tabular-nums opacity-80">
                    {formatTime(duration * played)} / {formatTime(duration)}
                  </div>
                </div>

                <div className="flex items-center gap-4 md:gap-6">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={clsx("text-white hover:text-primary transition-colors", showSettings && "text-primary")}
                  >
                    <Settings size={22} />
                  </button>

                  <button
                    onClick={() => {
                      setShowSubtitlesMenu(!showSubtitlesMenu)
                      setShowSettings(false)
                    }}
                    className={clsx("text-white hover:text-primary transition-colors", showSubtitlesMenu && "text-primary")}
                  >
                    <Subtitles size={22} />
                  </button>

                  {isPiPAvailable && (
                    <button
                      onClick={handleTogglePiP}
                      className={clsx("text-white hover:text-primary transition-colors", isPiPActive && "text-primary")}
                      aria-label={isPiPActive ? (lang === 'ar' ? 'إيقاف صورة داخل صورة' : 'Exit Picture in Picture') : (lang === 'ar' ? 'تفعيل صورة داخل صورة' : 'Activate Picture in Picture')}
                      title={isPiPActive ? (lang === 'ar' ? 'إيقاف صورة داخل صورة' : 'Exit Picture in Picture') : (lang === 'ar' ? 'صورة داخل صورة' : 'Picture in Picture')}
                    >
                      <PictureInPicture size={22} />
                    </button>
                  )}

                  <button onClick={handleToggleFullscreen} className="text-white hover:text-primary transition-colors">
                    {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip Intro Button */}
      <AnimatePresence>
        {showSkip && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute bottom-28 right-8 z-50 pointer-events-auto"
          >
            <Button
              onClick={skipIntro}
              variant="secondary"
              className="bg-black/80 backdrop-blur-md border border-white/20 hover:bg-white/20 text-white gap-2 h-12 px-6 rounded-2xl shadow-2xl"
            >
              <SkipForward size={20} />
              <span className="font-bold">
                {lang === 'ar' ? 'تخطي المقدمة' : 'Skip Intro'}
              </span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Menu (Simplified) */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute bottom-24 right-6 z-50 w-48 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-2xl pointer-events-auto"
          >
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-3 py-2 border-b border-white/5 mb-1">
              {lang === 'ar' ? 'الإعدادات' : 'Settings'}
            </div>

            <button
              onClick={() => {
                setPlaybackRate(prev => prev === 2 ? 0.5 : prev + 0.25)
              }}
              className="w-full flex justify-between items-center px-3 py-2 rounded-xl hover:bg-white/5 text-sm text-white transition-colors"
            >
              <span>{lang === 'ar' ? 'السرعة' : 'Speed'}</span>
              <span className="text-primary font-bold">{playbackRate}x</span>
            </button>

            <button
              className="w-full flex justify-between items-center px-3 py-2 rounded-xl hover:bg-white/5 text-sm text-white transition-colors"
            >
              <span>{lang === 'ar' ? 'الجودة' : 'Quality'}</span>
              <span className="text-zinc-500 font-bold">Auto</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtitles Menu */}
      <AnimatePresence>
        {showSubtitlesMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute bottom-24 right-16 z-50 w-48 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-2xl pointer-events-auto"
          >
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-3 py-2 border-b border-white/5 mb-1">
              {lang === 'ar' ? 'الترجمة' : 'Subtitles'}
            </div>

            <button
              onClick={() => {
                setActiveSubtitle(-1)
                setShowSubtitlesMenu(false)
              }}
              className={clsx(
                "w-full flex justify-between items-center px-3 py-2 rounded-xl hover:bg-white/5 text-sm transition-colors",
                activeSubtitle === -1 ? "text-primary bg-primary/5" : "text-white"
              )}
            >
              <span>{lang === 'ar' ? 'إيقاف' : 'Off'}</span>
              {activeSubtitle === -1 && <Check size={14} />}
            </button>

            {subtitles.map((sub, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setActiveSubtitle(idx)
                  setShowSubtitlesMenu(false)
                }}
                className={clsx(
                  "w-full flex justify-between items-center px-3 py-2 rounded-xl hover:bg-white/5 text-sm transition-colors",
                  activeSubtitle === idx ? "text-primary bg-primary/5" : "text-white"
                )}
              >
                <span>{sub.label}</span>
                {activeSubtitle === idx && <Check size={14} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
