import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen } from 'lucide-react'
import { useLang } from '../../../state/useLang'
import { StoryCard } from './StoryCard'
import type { Story } from '../../../types/quran-stories'
import type { Narrator } from '../../../types/quran-stories'
import type { QuranTrack } from '../../../types/quran-player'

interface StoryGridProps {
  stories: Story[]
  selectedNarrator: Narrator | null
  viewMode: 'grid' | 'list'
  isPlaying: boolean
  currentTrack: QuranTrack | null
  onPlayStory: (story: Story) => void
}

export const StoryGrid = ({
  stories,
  selectedNarrator,
  viewMode,
  isPlaying,
  currentTrack,
  onPlayStory
}: StoryGridProps) => {
  const { lang } = useLang()

  const isCurrentStory = (storyId: number) => {
    if (!currentTrack) return false
    return currentTrack.id === `story-${storyId}`
  }

  if (!selectedNarrator) {
    return (
      <div className="hidden lg:flex flex-col items-center justify-center h-full text-center text-zinc-500 p-8 border border-white/5 rounded-2xl bg-[#0a0a0a]/30">
        <div className="w-20 h-20 rounded-full bg-amber-900/10 flex items-center justify-center mb-4 animate-pulse">
          <BookOpen size={40} className="text-amber-500/50" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">
          {lang === 'ar' ? 'اختر راوياً للبدء' : 'Select a Narrator to Start'}
        </h3>
        <p className="max-w-md mx-auto text-sm">
          {lang === 'ar' 
            ? 'استمع إلى القصص الإسلامية من رواة مميزين. اختر راوياً من القائمة الجانبية لعرض القصص.' 
            : 'Listen to Islamic stories from distinguished narrators. Select a narrator from the sidebar to view stories.'}
        </p>
      </div>
    )
  }

  if (stories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500 p-8">
        <div className="w-16 h-16 rounded-full bg-amber-900/10 flex items-center justify-center mb-4">
          <BookOpen size={32} className="text-amber-500/50" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">
          {lang === 'ar' ? 'لا توجد قصص' : 'No Stories Found'}
        </h3>
        <p className="max-w-md mx-auto text-sm">
          {lang === 'ar' 
            ? 'لم يتم العثور على قصص تطابق معايير البحث.' 
            : 'No stories found matching your search criteria.'}
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
          {stories.map((story, idx) => {
            const active = isCurrentStory(story.id)
            return (
              <StoryCard
                key={story.id}
                story={story}
                active={active}
                isPlaying={isPlaying}
                onClick={() => onPlayStory(story)}
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
