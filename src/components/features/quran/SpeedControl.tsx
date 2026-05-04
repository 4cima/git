import { useState, useRef, useEffect, memo } from 'react'
import { Gauge } from 'lucide-react'
import { useLang } from '../../../state/useLang'

interface SpeedControlProps {
  speed: number
  onSpeedChange: (speed: number) => void
  className?: string
}

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0]

export const SpeedControl = memo(({ speed, onSpeedChange, className = '' }: SpeedControlProps) => {
  const { lang } = useLang()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const isRTL = lang === 'ar'

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSpeedSelect = (newSpeed: number) => {
    onSpeedChange(newSpeed)
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const currentIndex = SPEED_OPTIONS.indexOf(speed)
      const direction = e.key === 'ArrowDown' ? 1 : -1
      const newIndex = Math.max(0, Math.min(SPEED_OPTIONS.length - 1, currentIndex + direction))
      onSpeedChange(SPEED_OPTIONS[newIndex])
    }
  }

  const displaySpeed = speed === 1.0 ? (lang === 'ar' ? 'عادي' : 'Normal') : `${speed}x`

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors min-h-[44px]"
        aria-label={lang === 'ar' ? 'سرعة التشغيل' : 'Playback speed'}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Gauge size={16} className="text-amber-500" />
        <span className="text-sm text-white">{displaySpeed}</span>
      </button>

      {isOpen && (
        <div 
          className={`absolute ${isRTL ? 'left-0' : 'right-0'} bottom-full mb-2 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl overflow-hidden z-50`}
          role="listbox"
          aria-label={lang === 'ar' ? 'خيارات السرعة' : 'Speed options'}
        >
          {SPEED_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => handleSpeedSelect(option)}
              className={`w-full px-4 py-2 text-sm text-left hover:bg-white/10 transition-colors ${
                option === speed ? 'bg-amber-500/20 text-amber-500' : 'text-white'
              } ${isRTL ? 'text-right' : 'text-left'}`}
              role="option"
              aria-selected={option === speed}
            >
              {option === 1.0 ? (lang === 'ar' ? 'عادي' : 'Normal') : `${option}x`}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
)

SpeedControl.displayName = 'SpeedControl'
