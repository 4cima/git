import { memo, useEffect, useState, useRef } from 'react'
import { Clock, Plus, X } from 'lucide-react'
import { useLang } from '../../../state/useLang'
import { useQuranPlayerStore } from '../../../state/useQuranPlayerStore'

const PRESET_DURATIONS = [15, 30, 45, 60, 90, 120] // minutes

interface SleepTimerProps {
  showMenu: boolean
  onToggleMenu: () => void
  buttonRef?: React.RefObject<HTMLButtonElement | null>
}

export const SleepTimerButton = memo(({ showMenu, onToggleMenu, buttonRef }: SleepTimerProps) => {
  const { lang } = useLang()
  const { sleepTimer } = useQuranPlayerStore()
  const [remainingTime, setRemainingTime] = useState<number>(0)

  // Calculate remaining time
  useEffect(() => {
    if (!sleepTimer) {
      setRemainingTime(0)
      return
    }

    const updateRemainingTime = () => {
      const now = Date.now()
      const remaining = Math.max(0, sleepTimer.endTime - now)
      setRemainingTime(remaining)

      if (remaining === 0) {
        setRemainingTime(0)
      }
    }

    updateRemainingTime()
    const interval = setInterval(updateRemainingTime, 1000)

    return () => clearInterval(interval)
  }, [sleepTimer])

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleMenu()
  }

  return (
    <button
      ref={buttonRef}
      onClick={handleToggleMenu}
      className={`p-2 transition-colors rounded-lg hover:bg-white/5 active:scale-95 relative ${
        sleepTimer ? 'text-amber-500' : 'text-white/60 hover:text-white'
      }`}
      aria-label={lang === 'ar' ? 'مؤقت النوم' : 'Sleep timer'}
      style={{ minWidth: '44px', minHeight: '44px' }}
    >
      <Clock size={18} />
      {sleepTimer && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
          <span className="text-[8px] text-black font-bold">
            {Math.ceil(remainingTime / 60000)}
          </span>
        </div>
      )}
    </button>
  )
})

SleepTimerButton.displayName = 'SleepTimerButton'

interface SleepTimerMenuProps {
  buttonRef?: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
}

export const SleepTimerMenu = memo(({ buttonRef, onClose }: SleepTimerMenuProps) => {
  const { lang } = useLang()
  const { sleepTimer, setSleepTimer, extendSleepTimer, cancelSleepTimer } = useQuranPlayerStore()
  const [remainingTime, setRemainingTime] = useState<number>(0)
  const menuRef = useRef<HTMLDivElement>(null)

  // Calculate remaining time
  useEffect(() => {
    if (!sleepTimer) {
      setRemainingTime(0)
      return
    }

    const updateRemainingTime = () => {
      const now = Date.now()
      const remaining = Math.max(0, sleepTimer.endTime - now)
      setRemainingTime(remaining)

      if (remaining === 0) {
        setRemainingTime(0)
      }
    }

    updateRemainingTime()
    const interval = setInterval(updateRemainingTime, 1000)

    return () => clearInterval(interval)
  }, [sleepTimer])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && 
          !menuRef.current.contains(event.target as Node) &&
          buttonRef?.current && 
          !buttonRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [buttonRef, onClose])

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleSetTimer = (minutes: number) => {
    setSleepTimer(minutes)
    onClose()
  }

  const handleExtend = () => {
    extendSleepTimer(15)
  }

  const handleCancel = () => {
    cancelSleepTimer()
    onClose()
  }

  return (
    <div 
      ref={menuRef}
      className="bg-gray-800/98 backdrop-blur-xl border-t border-white/10 p-2"
      style={{ height: '264px', width: '100%', maxWidth: '100%', minWidth: '0' }}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {sleepTimer ? (
        /* Active Timer Menu */
        <div className="space-y-2">
          {/* Countdown Display */}
          <div className="text-center py-2 bg-white/5 rounded-lg border border-white/10">
            <div className="text-lg font-mono text-amber-500 font-bold">
              {formatTime(remainingTime)}
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-1">
            <button
              onClick={handleExtend}
              className="flex items-center justify-center gap-1 px-2 py-1.5 bg-white/5 hover:bg-white/10 text-white/80 rounded-lg transition-colors text-xs"
            >
              <Plus size={12} />
              <span>{lang === 'ar' ? '+15د' : '+15m'}</span>
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center justify-center gap-1 px-2 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors text-xs"
            >
              <X size={12} />
              <span>{lang === 'ar' ? 'إلغاء' : 'Cancel'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Preset Durations Menu */
        <div>
          <div className="px-1 py-1 mb-2">
            <p className="text-[10px] text-white/60 font-medium">
              {lang === 'ar' ? 'المدة' : 'Duration'}
            </p>
          </div>
          <div className="space-y-1">
            {PRESET_DURATIONS.map((minutes) => (
              <button
                key={minutes}
                onClick={() => handleSetTimer(minutes)}
                className="w-full px-2 py-1.5 text-center bg-white/5 hover:bg-amber-500/20 text-white/80 hover:text-amber-500 rounded-lg transition-colors text-xs border border-white/5 hover:border-amber-500/30"
              >
                {minutes}{lang === 'ar' ? 'د' : 'm'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

SleepTimerMenu.displayName = 'SleepTimerMenu'
