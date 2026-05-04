import { memo } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { useLang } from '../../../state/useLang'

interface VolumeControlProps {
  volume: number
  onVolumeChange: (volume: number) => void
  className?: string
}

export const VolumeControl = memo(({ volume, onVolumeChange, className = '' }: VolumeControlProps) => {
  const { lang } = useLang()
  const isMuted = volume === 0
  const isRTL = lang === 'ar'

  const handleToggleMute = () => {
    onVolumeChange(isMuted ? 0.8 : 0)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onVolumeChange(parseFloat(e.target.value))
  }

  // Calculate fill percentage for visual feedback
  const fillPercentage = volume * 100
  
  // Create gradient based on RTL direction
  const gradientDirection = isRTL ? 'to left' : 'to right'
  const backgroundGradient = `linear-gradient(${gradientDirection}, rgb(245 158 11) 0%, rgb(245 158 11) ${fillPercentage}%, rgba(255, 255, 255, 0.1) ${fillPercentage}%, rgba(255, 255, 255, 0.1) 100%)`

  return (
    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''} ${className}`}>
      <button
        onClick={handleToggleMute}
        className="p-2 hover:bg-white/10 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label={isMuted ? (lang === 'ar' ? 'إلغاء الكتم' : 'Unmute') : (lang === 'ar' ? 'كتم الصوت' : 'Mute')}
      >
        {isMuted ? (
          <VolumeX size={20} className="text-white/60" />
        ) : (
          <Volume2 size={20} className="text-amber-500" />
        )}
      </button>
      
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={volume}
        onChange={handleVolumeChange}
        style={{
          background: backgroundGradient
        }}
        className="w-24 h-1 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-amber-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
        aria-label={lang === 'ar' ? 'مستوى الصوت' : 'Volume level'}
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={volume}
      />
      
      <span className="text-xs text-white/60 w-8 text-center">
        {Math.round(volume * 100)}%
      </span>
    </div>
  )
}
)

VolumeControl.displayName = 'VolumeControl'
