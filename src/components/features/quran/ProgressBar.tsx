import { useRef, useState, useEffect, memo } from 'react'
import { useLang } from '../../../state/useLang'

interface ProgressBarProps {
  currentTime: number
  duration: number
  onSeek: (time: number) => void
  variant?: 'full' | 'mini'
  className?: string
}

export const ProgressBar = memo(({ 
  currentTime, 
  duration, 
  onSeek, 
  variant = 'full',
  className = '' 
}: ProgressBarProps) => {
  const { lang } = useLang()
  const progressBarRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [hoverTime, setHoverTime] = useState<number | null>(null)

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const isRTL = lang === 'ar'

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSeek = (clientX: number) => {
    if (!progressBarRef.current) return
    
    const rect = progressBarRef.current.getBoundingClientRect()
    let clickPosition: number
    
    if (isRTL) {
      clickPosition = (rect.right - clientX) / rect.width
    } else {
      clickPosition = (clientX - rect.left) / rect.width
    }
    
    const newTime = Math.max(0, Math.min(duration, clickPosition * duration))
    onSeek(newTime)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    handleSeek(e.clientX)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!progressBarRef.current) return
    
    const rect = progressBarRef.current.getBoundingClientRect()
    let hoverPosition: number
    
    if (isRTL) {
      hoverPosition = (rect.right - e.clientX) / rect.width
    } else {
      hoverPosition = (e.clientX - rect.left) / rect.width
    }
    
    const time = Math.max(0, Math.min(duration, hoverPosition * duration))
    setHoverTime(time)

    if (isDragging) {
      handleSeek(e.clientX)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    setHoverTime(null)
    setIsDragging(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const direction = (e.key === 'ArrowRight' && !isRTL) || (e.key === 'ArrowLeft' && isRTL) ? 1 : -1
      const newTime = Math.max(0, Math.min(duration, currentTime + direction * 5))
      onSeek(newTime)
    }
  }

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        handleSeek(e.clientX)
      }
      const handleGlobalMouseUp = () => {
        setIsDragging(false)
      }

      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove)
        document.removeEventListener('mouseup', handleGlobalMouseUp)
      }
    }
  }, [isDragging, duration])

  if (variant === 'mini') {
    return (
      <div 
        ref={progressBarRef}
        className={`relative h-1 bg-white/10 cursor-pointer group ${className}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        role="slider"
        aria-label={lang === 'ar' ? 'شريط التقدم' : 'Progress bar'}
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <div 
          className="absolute top-0 h-full bg-amber-500 transition-all duration-100"
          style={{ 
            width: `${progress}%`,
            [isRTL ? 'right' : 'left']: 0
          }}
        />
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div 
        ref={progressBarRef}
        className="relative h-2 bg-white/10 rounded-full cursor-pointer group"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        role="slider"
        aria-label={lang === 'ar' ? 'شريط التقدم' : 'Progress bar'}
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* Progress fill */}
        <div 
          className="absolute top-0 h-full bg-amber-500 rounded-full transition-all duration-100"
          style={{ 
            width: `${progress}%`,
            [isRTL ? 'right' : 'left']: 0
          }}
        />
        
        {/* Hover indicator */}
        {hoverTime !== null && (
          <div 
            className="absolute top-0 h-full w-0.5 bg-white/50"
            style={{ 
              [isRTL ? 'right' : 'left']: `${(hoverTime / duration) * 100}%`
            }}
          />
        )}
        
        {/* Draggable handle */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-amber-500 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ 
            [isRTL ? 'right' : 'left']: `${progress}%`,
            transform: `translate${isRTL ? 'X' : 'X'}(${isRTL ? '50%' : '-50%'}) translateY(-50%)`
          }}
        />
      </div>
      
      {/* Time display */}
      <div className={`flex justify-between text-xs text-white/60 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  )
}
)

ProgressBar.displayName = 'ProgressBar'
