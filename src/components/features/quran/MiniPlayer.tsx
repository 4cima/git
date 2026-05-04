import { motion } from 'framer-motion'
import { Play, Pause, SkipBack, SkipForward, X, BookOpen, Mic, Repeat, Repeat1, List } from 'lucide-react'
import { useRef, useState } from 'react'
import { useLang } from '../../../state/useLang'
import { useQuranPlayerStore } from '../../../state/useQuranPlayerStore'
import { RepeatMode } from '../../../types/quran-player'
import { NATURE_IMAGES, SURAHS } from '../../../data/quran'
import { logger } from '../../../lib/logger'
import { VolumeControl } from './VolumeControl'
import { SleepTimerButton, SleepTimerMenu } from './SleepTimer'
import { QueueView } from './QueueView'

interface MiniPlayerProps {
  onClose: () => void
}

export const MiniPlayer = ({ onClose }: MiniPlayerProps) => {
  const { lang } = useLang()
  const queueButtonRef = useRef<HTMLButtonElement>(null)
  const sleepTimerButtonRef = useRef<HTMLButtonElement>(null)
  const [showSleepTimerMenu, setShowSleepTimerMenu] = useState(false)
  const { 
    currentTrack, 
    isPlaying, 
    toggle, 
    currentTime, 
    duration, 
    seek,
    volume,
    setVolume,
    repeatMode,
    setRepeatMode,
    showQueue,
    toggleQueue
  } = useQuranPlayerStore()

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

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = lang === 'ar' 
      ? (rect.right - e.clientX) / rect.width
      : (e.clientX - rect.left) / rect.width
    seek(percent * duration)
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
    const modes = [RepeatMode.OFF, RepeatMode.REPEAT_ALL, RepeatMode.REPEAT_ONE]
    const currentIndex = modes.indexOf(repeatMode)
    const nextMode = modes[(currentIndex + 1) % modes.length]
    setRepeatMode(nextMode)
  }

  return (
    <>
      {/* Menus Section - Above Player */}
      {(showQueue || showSleepTimerMenu) && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed left-0 right-0 z-[101] pointer-events-none"
          style={{ bottom: '100px' }}
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
        >
          <div className="max-w-7xl mx-auto px-4 pointer-events-auto">
            <div 
              className="bg-gray-800/95 backdrop-blur-xl border border-white/10 rounded-t-xl overflow-hidden" 
              style={{ 
                width: '200px', 
                marginLeft: lang === 'ar' ? '0' : 'auto', 
                marginRight: lang === 'ar' ? 'auto' : '0' 
              }}
            >
              {showSleepTimerMenu && (
                <SleepTimerMenu 
                  buttonRef={sleepTimerButtonRef}
                  onClose={() => setShowSleepTimerMenu(false)}
                />
              )}
              {showQueue && <QueueView buttonRef={queueButtonRef} />}
            </div>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[100] pointer-events-none"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        <div className="max-w-7xl mx-auto px-4 pb-4 pointer-events-auto">
          <div className="bg-gray-800/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          
          {/* Progress Bar (Top Edge) */}
          <div 
            className="h-1 bg-white/10 cursor-pointer relative group/progress"
            onClick={handleSeek}
            role="slider"
            aria-label={lang === 'ar' ? 'شريط التقدم' : 'Progress bar'}
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={currentTime}
            tabIndex={0}
          >
            <div 
              className="h-full bg-amber-500 relative transition-all"
              style={{ 
                width: `${(currentTime / duration) * 100}%`,
                marginLeft: lang === 'ar' ? 'auto' : undefined,
                marginRight: lang === 'ar' ? undefined : 'auto'
              }}
            >
              <div 
                className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity`} 
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex items-center gap-3 p-3">
            
            {/* Artwork */}
            <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/10 shrink-0">
              <img 
                src={currentTrack.image || getFallbackImage()}
                alt={currentTrack.reciter}
                className="w-full h-full object-cover"
              />
              {isPlaying && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="w-1 h-1 bg-amber-500 rounded-full animate-pulse" />
                </div>
              )}
            </div>

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {currentTrack.type === 'sermon' ? (
                  <Mic size={14} className="text-amber-500 shrink-0" />
                ) : currentTrack.type === 'story' ? (
                  <BookOpen size={14} className="text-amber-500 shrink-0" />
                ) : (
                  <svg 
                    className="w-3.5 h-3.5 text-amber-500 shrink-0" 
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
                <h3 className="text-white text-sm font-medium truncate">
                  {currentTrack.title}
                </h3>
              </div>
              <p className="text-white/60 text-xs truncate">
                {currentTrack.type === 'sermon' 
                  ? (lang === 'ar' ? 'الشيخ: ' : 'Scholar: ') + currentTrack.reciter
                  : currentTrack.type === 'story'
                  ? (lang === 'ar' ? 'الراوي: ' : 'Narrator: ') + currentTrack.reciter
                  : currentTrack.reciter}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-white/40 font-mono mt-0.5">
                <span>{formatTime(currentTime)}</span>
                <span>/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSkipPrev()
                }}
                className="p-2 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/5 active:scale-95"
                aria-label={lang === 'ar' ? 'السورة السابقة' : 'Previous surah'}
                style={{ minWidth: '44px', minHeight: '44px' }}
              >
                <SkipForward size={18} className={lang === 'ar' ? '' : 'rotate-180'} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggle()
                }}
                className="w-10 h-10 rounded-full bg-amber-500 text-black flex items-center justify-center hover:bg-amber-400 active:scale-95 transition-all shadow-lg"
                aria-label={isPlaying ? (lang === 'ar' ? 'إيقاف مؤقت' : 'Pause') : (lang === 'ar' ? 'تشغيل' : 'Play')}
                style={{ minWidth: '44px', minHeight: '44px' }}
              >
                {isPlaying ? (
                  <Pause size={18} fill="currentColor" />
                ) : (
                  <Play size={18} fill="currentColor" className={lang === 'ar' ? 'mr-0.5' : 'ml-0.5'} />
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
                <SkipBack size={18} className={lang === 'ar' ? '' : 'rotate-180'} />
              </button>
            </div>

            {/* Advanced Controls */}
            <div className="flex items-center gap-1">
              {/* Repeat Mode */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleRepeatToggle()
                }}
                className={`p-2 transition-colors rounded-lg hover:bg-white/5 active:scale-95 ${
                  repeatMode !== RepeatMode.OFF ? 'text-amber-500' : 'text-white/60 hover:text-white'
                }`}
                aria-label={lang === 'ar' ? 'وضع التكرار' : 'Repeat mode'}
                style={{ minWidth: '44px', minHeight: '44px' }}
              >
                {repeatMode === RepeatMode.REPEAT_ONE ? (
                  <Repeat1 size={18} />
                ) : (
                  <Repeat size={18} />
                )}
              </button>

              {/* Volume Control */}
              <VolumeControl volume={volume} onVolumeChange={setVolume} />

              {/* Sleep Timer */}
              <SleepTimerButton 
                showMenu={showSleepTimerMenu}
                onToggleMenu={() => setShowSleepTimerMenu(!showSleepTimerMenu)}
                buttonRef={sleepTimerButtonRef}
              />

              {/* Queue Toggle */}
              <button
                ref={queueButtonRef}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleQueue()
                }}
                className={`p-2 transition-colors rounded-lg hover:bg-white/5 active:scale-95 ${
                  showQueue ? 'text-amber-500' : 'text-white/60 hover:text-white'
                }`}
                aria-label={lang === 'ar' ? 'قائمة الانتظار' : 'Queue'}
                style={{ minWidth: '44px', minHeight: '44px' }}
              >
                <List size={18} />
              </button>

              {/* Close Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onClose()
                }}
                className="p-2 text-red-400 hover:text-red-300 transition-colors rounded-lg hover:bg-red-500/10 active:scale-95"
                aria-label={lang === 'ar' ? 'إغلاق المشغل' : 'Close player'}
                style={{ minWidth: '44px', minHeight: '44px' }}
              >
                <X size={20} />
              </button>
            </div>

          </div>
        </div>
      </div>
    </motion.div>
  </>
  )
}
