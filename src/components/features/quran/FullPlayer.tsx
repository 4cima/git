import { useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, SkipBack, SkipForward, X, Minimize2, BookOpen, Mic, Repeat, Repeat1, ListMusic, Clock } from 'lucide-react'
import { useLang } from '../../../state/useLang'
import { useQuranPlayerStore } from '../../../state/useQuranPlayerStore'
import { NATURE_IMAGES, SURAHS } from '../../../data/quran'
import { logger } from '../../../lib/logger'
import { ProgressBar } from './ProgressBar'
import { VolumeControl } from './VolumeControl'
import { SpeedControl } from './SpeedControl'
import { QueueView } from './QueueView'
import { SleepTimerMenu } from './SleepTimer'
import { RepeatMode } from '../../../types/quran-player'
import { useAutoHide } from '../../../hooks/useAutoHide'
import '../../../styles/quran-player-accessibility.css'

interface FullPlayerProps {
  onMinimize: () => void
  onClose: () => void
}

export const FullPlayer = ({ onMinimize, onClose }: FullPlayerProps) => {
  const { lang } = useLang()
  const { 
    currentTrack, 
    isPlaying, 
    toggle, 
    volume, 
    setVolume, 
    currentTime, 
    duration, 
    seek,
    repeatMode,
    setRepeatMode,
    playbackSpeed,
    setPlaybackSpeed,
    opacity,
    showQueue,
    toggleQueue
  } = useQuranPlayerStore()

  const [imgError, setImgError] = useState(false)
  const [showSleepTimer, setShowSleepTimer] = useState(false)
  
  // Initialize auto-hide logic
  useAutoHide()

  if (!currentTrack) return null

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getFallbackImage = () => {
    if (!currentTrack) return NATURE_IMAGES[0]
    const idNum = typeof currentTrack.id === 'string' 
      ? parseInt(currentTrack.id.split('-')[0]) || 0 
      : 0
    return NATURE_IMAGES[idNum % NATURE_IMAGES.length]
  }

  const handleSkipNext = () => {
    if (!currentTrack) return
    try {
      const parts = currentTrack.id.toString().split('-')
      if (parts.length === 2) {
        const reciterId = parts[0]
        const surahId = parseInt(parts[1])
        if (surahId < 114) {
          const nextSurahId = surahId + 1
          const paddedId = nextSurahId.toString().padStart(3, '0')
          const nextUrl = currentTrack.url.replace(/\/\d{3}\.mp3$/, `/${paddedId}.mp3`)
          
          const nextSurah = SURAHS.find((s) => s.id === nextSurahId)
          const nextTitle = nextSurah 
            ? (lang === 'ar' ? nextSurah.name : nextSurah.englishName)
            : `Surah ${nextSurahId}`
          
          useQuranPlayerStore.getState().playTrack({
            ...currentTrack,
            id: `${reciterId}-${nextSurahId}`,
            title: nextTitle,
            url: nextUrl
          })
        }
      }
    } catch (e: any) { 
      logger.error(e) 
    }
  }

  const handleSkipPrev = () => {
    if (!currentTrack) return
    try {
      const parts = currentTrack.id.toString().split('-')
      if (parts.length === 2) {
        const reciterId = parts[0]
        const surahId = parseInt(parts[1])
        if (surahId > 1) {
          const prevSurahId = surahId - 1
          const paddedId = prevSurahId.toString().padStart(3, '0')
          const prevUrl = currentTrack.url.replace(/\/\d{3}\.mp3$/, `/${paddedId}.mp3`)
          
          const prevSurah = SURAHS.find((s) => s.id === prevSurahId)
          const prevTitle = prevSurah 
            ? (lang === 'ar' ? prevSurah.name : prevSurah.englishName)
            : `Surah ${prevSurahId}`

          useQuranPlayerStore.getState().playTrack({
            ...currentTrack,
            id: `${reciterId}-${prevSurahId}`,
            title: prevTitle,
            url: prevUrl
          })
        }
      }
    } catch (e: any) { 
      logger.error(e) 
    }
  }

  const handleRepeatToggle = () => {
    if (repeatMode === RepeatMode.OFF) {
      setRepeatMode(RepeatMode.REPEAT_ALL)
    } else if (repeatMode === RepeatMode.REPEAT_ALL) {
      setRepeatMode(RepeatMode.REPEAT_ONE)
    } else {
      setRepeatMode(RepeatMode.OFF)
    }
  }

  const getRepeatIcon = () => {
    if (repeatMode === RepeatMode.REPEAT_ONE) {
      return <Repeat1 size={20} className="text-amber-500" />
    } else if (repeatMode === RepeatMode.REPEAT_ALL) {
      return <Repeat size={20} className="text-amber-500" />
    }
    return <Repeat size={20} className="text-white/40" />
  }

  // Get Surah info for display
  const getSurahInfo = () => {
    if (!currentTrack || currentTrack.type === 'sermon' || currentTrack.type === 'story') {
      return null
    }
    
    const parts = currentTrack.id.toString().split('-')
    if (parts.length === 2) {
      const surahId = parseInt(parts[1])
      const surah = SURAHS.find(s => s.id === surahId)
      if (surah) {
        return {
          arabicName: surah.name,
          englishName: surah.englishName,
          surahNumber: surah.id,
          surahType: surah.type,
          ayahCount: surah.ayahs
        }
      }
    }
    return null
  }

  const surahInfo = getSurahInfo()

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="fixed bottom-0 left-0 right-0 z-[100] p-4 pointer-events-none"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      style={{ opacity }}
    >
      <div className="max-w-4xl mx-auto bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl pointer-events-auto relative overflow-hidden">
        
        {/* Background Glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5 opacity-50" />
        
        {/* Progress Bar (Top) - Using new component */}
        <ProgressBar 
          currentTime={currentTime}
          duration={duration}
          onSeek={seek}
          variant="full"
        />

        {/* Action Buttons (Top Right) */}
        <div className="absolute top-2 right-2 flex items-center gap-1 z-20">
          <button 
            onClick={(e) => {
              e.stopPropagation()
              onMinimize()
            }}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all active:scale-95"
            aria-label={lang === 'ar' ? 'تصغير المشغل' : 'Minimize player'}
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <Minimize2 size={16} />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-lg transition-all active:scale-95"
            aria-label={lang === 'ar' ? 'إغلاق المشغل' : 'Close player'}
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-4 relative">
          {/* Reciter Image */}
          <div className="relative w-14 h-14 rounded-full overflow-hidden border border-white/10 shrink-0">
            {currentTrack.image && !imgError ? (
              <img 
                src={currentTrack.image} 
                alt={currentTrack.reciter}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <img 
                src={getFallbackImage()}
                alt="Nature"
                className="w-full h-full object-cover opacity-80"
              />
            )}
            {/* Spinning Vinyl Effect */}
            <div className={`absolute inset-0 border-2 border-white/20 rounded-full ${isPlaying ? 'animate-spin-slow' : ''}`} 
                 style={{ animationDuration: '10s' }} 
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="w-2 h-2 bg-black rounded-full border border-white/30" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {currentTrack.type === 'sermon' ? (
                <Mic size={16} className="text-amber-500 shrink-0" />
              ) : currentTrack.type === 'story' ? (
                <BookOpen size={16} className="text-amber-500 shrink-0" />
              ) : (
                <svg 
                  className="w-4 h-4 text-amber-500 shrink-0" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              )}
              <h3 className="text-white font-medium truncate">{currentTrack.title}</h3>
            </div>
            <p className="text-white/60 text-sm truncate">
              {currentTrack.type === 'sermon' 
                ? (lang === 'ar' ? 'الشيخ: ' : 'Scholar: ') + currentTrack.reciter
                : currentTrack.type === 'story'
                ? (lang === 'ar' ? 'الراوي: ' : 'Narrator: ') + currentTrack.reciter
                : currentTrack.reciter}
            </p>
            
            {/* Surah Info (for recitations only) */}
            {surahInfo && (
              <div className="flex items-center gap-2 text-xs text-white/50 mt-1">
                <span>{lang === 'ar' ? surahInfo.arabicName : surahInfo.englishName}</span>
                <span>•</span>
                <span>{lang === 'ar' ? `${surahInfo.surahType === 'Meccan' ? 'مكية' : 'مدنية'}` : surahInfo.surahType}</span>
                <span>•</span>
                <span>{lang === 'ar' ? `${surahInfo.ayahCount} آية` : `${surahInfo.ayahCount} verses`}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-xs text-white/40 mt-1 font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={(e) => {
                e.stopPropagation()
                handleSkipPrev()
              }}
              className="p-2 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/5 active:scale-95"
              aria-label={lang === 'ar' ? 'السورة السابقة' : 'Previous surah'}
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <SkipForward size={20} className={lang === 'ar' ? '' : 'rotate-180'} />
            </button>
            
            <button 
              onClick={(e) => {
                e.stopPropagation()
                toggle()
              }}
              className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-white/10"
              aria-label={isPlaying ? (lang === 'ar' ? 'إيقاف مؤقت' : 'Pause') : (lang === 'ar' ? 'تشغيل' : 'Play')}
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              {isPlaying ? (
                <Pause size={22} fill="currentColor" />
              ) : (
                <Play size={22} fill="currentColor" className={lang === 'ar' ? 'mr-0.5' : 'ml-0.5'} />
              )}
            </button>

            <button 
              onClick={(e) => {
                e.stopPropagation()
                handleSkipNext()
              }}
              className="p-2 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/5 active:scale-95"
              aria-label={lang === 'ar' ? 'السورة التالية' : 'Next surah'}
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <SkipBack size={20} className={lang === 'ar' ? '' : 'rotate-180'} />
            </button>

            {/* Repeat Button */}
            <button 
              onClick={(e) => {
                e.stopPropagation()
                handleRepeatToggle()
              }}
              className="p-2 transition-colors rounded-lg hover:bg-white/5 active:scale-95"
              aria-label={
                repeatMode === RepeatMode.OFF 
                  ? (lang === 'ar' ? 'تكرار' : 'Repeat') 
                  : repeatMode === RepeatMode.REPEAT_ONE
                  ? (lang === 'ar' ? 'تكرار واحد' : 'Repeat one')
                  : (lang === 'ar' ? 'تكرار الكل' : 'Repeat all')
              }
              title={
                repeatMode === RepeatMode.OFF 
                  ? (lang === 'ar' ? 'تكرار' : 'Repeat') 
                  : repeatMode === RepeatMode.REPEAT_ONE
                  ? (lang === 'ar' ? 'تكرار واحد' : 'Repeat one')
                  : (lang === 'ar' ? 'تكرار الكل' : 'Repeat all')
              }
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              {getRepeatIcon()}
            </button>
          </div>

          {/* Volume & Speed Controls (Hidden on mobile) */}
          <div className="hidden sm:flex items-center gap-3">
            <VolumeControl volume={volume} onVolumeChange={setVolume} />
            <SpeedControl speed={playbackSpeed} onSpeedChange={setPlaybackSpeed} />
          </div>

          {/* Queue & Sleep Timer Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleQueue()
              }}
              className={`p-2 transition-colors rounded-lg hover:bg-white/5 active:scale-95 ${
                showQueue ? 'text-amber-500' : 'text-white/40 hover:text-white/60'
              }`}
              aria-label={lang === 'ar' ? 'قائمة الانتظار' : 'Queue'}
              title={lang === 'ar' ? 'قائمة الانتظار' : 'Queue'}
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <ListMusic size={18} />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowSleepTimer(!showSleepTimer)
              }}
              className={`p-2 transition-colors rounded-lg hover:bg-white/5 active:scale-95 ${
                showSleepTimer ? 'text-amber-500' : 'text-white/40 hover:text-white/60'
              }`}
              aria-label={lang === 'ar' ? 'مؤقت النوم' : 'Sleep timer'}
              title={lang === 'ar' ? 'مؤقت النوم' : 'Sleep timer'}
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <Clock size={18} />
            </button>
          </div>

        </div>

        {/* Queue & Sleep Timer Panels - Queue always visible */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex gap-2 justify-center">
            {/* Queue - Always visible */}
            <div className="w-32 max-w-32 min-w-32 flex-shrink-0">
              <QueueView />
            </div>
            
            {/* Sleep Timer - Only when open */}
            {showSleepTimer && (
              <div className="w-28 max-w-28 min-w-28 flex-shrink-0">
                <SleepTimerMenu onClose={() => setShowSleepTimer(false)} />
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
