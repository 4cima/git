import { motion, AnimatePresence } from 'framer-motion'
import { Volume2 } from 'lucide-react'
import { useLang } from '../../../state/useLang'
import { SurahCard } from './SurahCard'
import type { QuranReciter } from './ReciterList'

interface SurahGridProps {
  filteredSurahs: any[]
  selectedReciter: QuranReciter | null
  viewMode: 'grid' | 'list'
  isPlaying: boolean
  currentTrack: any
  onPlaySurah: (id: number, name: string) => void
  onAddToQueue?: (surah: any) => void
}

export const SurahGrid = ({
  filteredSurahs,
  selectedReciter,
  viewMode,
  isPlaying,
  currentTrack,
  onPlaySurah,
  onAddToQueue
}: SurahGridProps) => {
  const { lang } = useLang()

  const isCurrentTrack = (reciterId: number, surahId: number) => {
    if (!currentTrack) return false
    return currentTrack.id === `${reciterId}-${surahId}`
  }

  if (!selectedReciter) {
    return (
      <div className="hidden lg:flex flex-col items-center justify-center h-full text-center text-zinc-500 p-8 border border-white/5 rounded-2xl bg-[#0a0a0a]/30">
        <div className="w-20 h-20 rounded-full bg-amber-900/10 flex items-center justify-center mb-4 animate-pulse">
          <Volume2 size={40} className="text-amber-500/50" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">
          {lang === 'ar' ? 'اختر قارئاً للبدء' : 'Select a Reciter to Start'}
        </h3>
        <p className="max-w-md mx-auto text-sm">
          {lang === 'ar' 
            ? 'استمع إلى القرآن الكريم بأصوات نخبة من القراء. اختر قارئاً من القائمة الجانبية لعرض السور.' 
            : 'Listen to the Holy Quran recited by elite reciters. Select a reciter from the sidebar to view Surahs.'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
      <motion.div 
        layout
        className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-2' : 'space-y-2'}
      >
        <AnimatePresence mode="popLayout">
          {filteredSurahs.map((surah, idx) => {
            const active = isCurrentTrack(selectedReciter.id, surah.id)
            return (
              <SurahCard
                key={surah.id}
                surah={surah}
                active={active}
                isPlaying={isPlaying}
                onClick={() => onPlaySurah(surah.id, surah.name)}
                onAddToQueue={() => onAddToQueue?.(surah)}
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
