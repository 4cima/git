import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen } from 'lucide-react'
import { useLang } from '../../../state/useLang'
import { SermonCard } from './SermonCard'
import type { Sermon } from '../../../types/quran-sermons'
import type { Scholar } from '../../../types/quran-sermons'
import type { QuranTrack } from '../../../types/quran-player'

interface SermonGridProps {
  sermons: Sermon[]
  selectedScholar: Scholar | null
  viewMode: 'grid' | 'list'
  isPlaying: boolean
  currentTrack: QuranTrack | null
  onPlaySermon: (sermon: Sermon) => void
}

export const SermonGrid = ({
  sermons,
  selectedScholar,
  viewMode,
  isPlaying,
  currentTrack,
  onPlaySermon
}: SermonGridProps) => {
  const { lang } = useLang()

  const isCurrentSermon = (sermonId: number) => {
    if (!currentTrack) return false
    return currentTrack.id === `sermon-${sermonId}`
  }

  if (!selectedScholar) {
    return (
      <div className="hidden lg:flex flex-col items-center justify-center h-full text-center text-zinc-500 p-8 border border-white/5 rounded-2xl bg-[#0a0a0a]/30">
        <div className="w-20 h-20 rounded-full bg-amber-900/10 flex items-center justify-center mb-4 animate-pulse">
          <BookOpen size={40} className="text-amber-500/50" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">
          {lang === 'ar' ? 'اختر عالماً للبدء' : 'Select a Scholar to Start'}
        </h3>
        <p className="max-w-md mx-auto text-sm">
          {lang === 'ar' 
            ? 'استمع إلى الخطب الإسلامية من علماء مميزين. اختر عالماً من القائمة الجانبية لعرض الخطب.' 
            : 'Listen to Islamic sermons from distinguished scholars. Select a scholar from the sidebar to view sermons.'}
        </p>
      </div>
    )
  }

  if (sermons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500 p-8">
        <div className="w-16 h-16 rounded-full bg-amber-900/10 flex items-center justify-center mb-4">
          <BookOpen size={32} className="text-amber-500/50" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">
          {lang === 'ar' ? 'لا توجد خطب' : 'No Sermons Found'}
        </h3>
        <p className="max-w-md mx-auto text-sm">
          {lang === 'ar' 
            ? 'لم يتم العثور على خطب تطابق معايير البحث.' 
            : 'No sermons found matching your search criteria.'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
      <motion.div 
        layout
        className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3' : 'space-y-3'}
      >
        <AnimatePresence mode="popLayout">
          {sermons.map((sermon, idx) => {
            const active = isCurrentSermon(sermon.id)
            return (
              <SermonCard
                key={sermon.id}
                sermon={sermon}
                active={active}
                isPlaying={isPlaying}
                onClick={() => onPlaySermon(sermon)}
                idx={idx}
                viewMode={viewMode}
              />
            )
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
