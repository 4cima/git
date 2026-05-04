import { memo } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, Clock, TrendingUp, Mic } from 'lucide-react'
import { useLang } from '../../../state/useLang'
import { formatDuration, formatPlayCount } from '../../../lib/sermon-utils'
import type { Sermon } from '../../../types/quran-sermons'

interface SermonCardProps {
  sermon: Sermon
  active: boolean
  isPlaying: boolean
  onClick: () => void
  idx: number
  viewMode: 'grid' | 'list'
}

const CATEGORY_COLORS: Record<string, string> = {
  'friday-khutbah': 'bg-amber-500/20 text-amber-400',
  'ramadan': 'bg-purple-500/20 text-purple-400',
  'hajj': 'bg-green-500/20 text-green-400',
  'eid': 'bg-pink-500/20 text-pink-400',
  'general-guidance': 'bg-blue-500/20 text-blue-400',
  'youth': 'bg-cyan-500/20 text-cyan-400',
  'family': 'bg-orange-500/20 text-orange-400',
  'tafsir': 'bg-yellow-500/20 text-yellow-400'
}

const CATEGORY_LABELS: Record<string, { ar: string; en: string }> = {
  'friday-khutbah': { ar: 'خطبة الجمعة', en: 'Friday Khutbah' },
  'ramadan': { ar: 'رمضان', en: 'Ramadan' },
  'hajj': { ar: 'الحج', en: 'Hajj' },
  'eid': { ar: 'العيد', en: 'Eid' },
  'general-guidance': { ar: 'إرشاد عام', en: 'General Guidance' },
  'youth': { ar: 'الشباب', en: 'Youth' },
  'family': { ar: 'الأسرة', en: 'Family' },
  'tafsir': { ar: 'تفسير', en: 'Tafsir' }
}

export const SermonCard = memo(({ sermon, active, isPlaying, onClick, idx, viewMode }: SermonCardProps) => {
  const { lang } = useLang()
  
  const categoryColor = CATEGORY_COLORS[sermon.category] || 'bg-gray-500/20 text-gray-400'
  const categoryLabel = CATEGORY_LABELS[sermon.category] || { ar: sermon.category, en: sermon.category }
  
  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: idx * 0.01 }}
      onClick={onClick}
      className={`relative flex ${viewMode === 'list' ? 'flex-row items-center' : 'flex-col items-start'} gap-3 p-2.5 rounded-2xl border transition-all duration-300 group overflow-hidden ${
        active 
          ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.05)]' 
          : 'hover:bg-amber-500/5 border border-transparent'
      } ${viewMode === 'list' ? 'w-full' : ''}`}
    >
      {active && (
        <motion.div 
          layoutId="active-sermon"
          className="absolute left-0 top-0 w-1 h-full bg-emerald-500"
        />
      )}
      
      {/* Icon Circle */}
      <div className={`relative w-10 h-10 rounded-xl overflow-hidden border-2 transition-all duration-500 shrink-0 ${
        active 
          ? 'border-emerald-500 rotate-3 scale-110 shadow-lg' 
          : 'border-amber-500/10 group-hover:border-amber-500/30'
      }`}>
        <div className="w-full h-full bg-amber-500/10 flex items-center justify-center">
          <Mic size={20} className="text-amber-500/50" />
        </div>
        <div className="absolute inset-0 bg-amber-900/10 group-hover:bg-transparent transition-colors" />
      </div>

      {/* Content */}
      <div className="flex-1 text-left min-w-0 overflow-hidden">
        {/* Title */}
        <h3 className={`font-bold font-amiri truncate text-sm ${
          active 
            ? 'text-emerald-400' 
            : 'text-amber-100/70 group-hover:text-white'
        }`}>
          {lang === 'ar' ? sermon.title_ar : sermon.title_en}
        </h3>
        
        {/* Metadata */}
        <p className={`text-[10px] font-sans truncate transition-colors ${
          active 
            ? 'text-emerald-500/60' 
            : 'text-amber-900'
        }`}>
          {formatDuration(sermon.duration_seconds)} • {formatPlayCount(sermon.play_count)}
        </p>
      </div>
    </motion.button>
  )
})

SermonCard.displayName = 'SermonCard'
