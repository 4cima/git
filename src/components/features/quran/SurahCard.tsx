import { memo } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, ListPlus } from 'lucide-react'
import { useLang } from '../../../state/useLang'

interface SurahCardProps {
  surah: any // Should type this properly
  active: boolean
  isPlaying: boolean
  onClick: () => void
  onAddToQueue?: () => void
  idx: number
  viewMode: 'grid' | 'list'
}

export const SurahCard = memo(({ surah, active, isPlaying, onClick, onAddToQueue, idx, viewMode }: SurahCardProps) => {
  const { lang } = useLang()
  
  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAddToQueue?.()
  }
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: idx * 0.01 }}
      className={`relative flex items-start gap-1 px-2 py-1.5 rounded-3xl border transition-all duration-500 group overflow-hidden ${
        active 
          ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.1)] scale-[1.02]' 
          : 'border-amber-500/5 hover:scale-[1.02]'
      } ${viewMode === 'list' ? 'w-full' : ''}`}
      style={!active ? { backgroundColor: 'rgba(175, 188, 255, 0.1)' } : undefined}
      onMouseEnter={(e) => !active && (e.currentTarget.style.backgroundColor = 'rgba(175, 188, 255, 0.3)')}
      onMouseLeave={(e) => !active && (e.currentTarget.style.backgroundColor = 'rgba(175, 188, 255, 0.1)')}
    >
      {/* Islamic Geometric Pattern Background for each card */}
      <div className="absolute inset-0 opacity-[0.01] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0l10 10v10l-10 10-10-10V10z' fill='%23f59e0b'/%3E%3C/svg%3E")` }} />
      
      {/* Number Badge (Modern Islamic Style) */}
      <div 
        className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] border-2 transition-all duration-500 shrink-0 relative self-center ${
          active 
            ? 'bg-amber-500 text-black border-amber-400 rotate-[360deg]' 
            : 'border-amber-500/20 group-hover:bg-amber-500/20 group-hover:border-amber-500/40 group-hover:rotate-12'
        }`}
        style={!active ? { backgroundColor: 'rgba(0, 180, 145, 0.05)', color: '#00b491' } : undefined}
      >
        <span className="relative z-10">{surah.id}</span>
      </div>

      {/* Info */}
      <div className="flex-1 text-right min-w-0 relative z-10 flex flex-col">
        <h4
          className={`text-[11px] md:text-[12px] font-bold font-amiri transition-all duration-300 whitespace-nowrap break-normal leading-none ${
            active ? 'text-amber-400' : 'text-amber-50/90 group-hover:text-white'
          }`}
        >
          {surah.name.replace(/^سورة\s+/, '')}
        </h4>
        <span 
          className={`text-[8px] font-sans transition-colors mt-0.5 ${active ? 'text-amber-500/60' : ''}`}
          style={!active ? { color: '#ffeb41' } : undefined}
          onMouseEnter={(e) => !active && (e.currentTarget.style.color = '#ffe073')}
          onMouseLeave={(e) => !active && (e.currentTarget.style.color = '#ffeb41')}
        >
          {surah.ayahs} {lang === 'ar' ? 'آية' : 'Ayahs'}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 shrink-0 relative z-10 self-center">
        {/* Add to Queue Button */}
        <button
          onClick={handleAddToQueue}
          className="w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100 hover:scale-110"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#ffffff' }}
          title={lang === 'ar' ? 'إضافة لقائمة الانتظار' : 'Add to Queue'}
          aria-label={lang === 'ar' ? 'إضافة لقائمة الانتظار' : 'Add to Queue'}
        >
          <ListPlus size={13} />
        </button>
        
        {/* Play/Pause Button */}
        <button
          onClick={onClick}
          className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-500 ${
            active ? 'bg-amber-500 text-black scale-110 shadow-[0_0_20px_rgba(245,158,11,0.5)]' : 'scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100'
          }`}
          style={!active ? { backgroundColor: 'rgba(255, 235, 65, 0.1)', color: '#ffeb41' } : undefined}
        >
          {active && isPlaying ? (
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
              <Pause size={13} fill="currentColor" />
            </motion.div>
          ) : (
            <Play size={13} fill="currentColor" className="ml-0.5" />
          )}
        </button>
      </div>
      
      {/* Type Indicator (Meccan/Medinan) Dot */}
      <div className={`absolute top-2 right-2 w-1 h-1 rounded-full ${surah.type === 'Meccan' ? 'bg-amber-500/40' : 'bg-yellow-500/40'}`} title={surah.type} />
    </motion.div>
  )
})

SurahCard.displayName = 'SurahCard'
