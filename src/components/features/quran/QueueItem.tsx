import { memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X, Play, Pause } from 'lucide-react'
import { useLang } from '../../../state/useLang'
import type { QuranTrack } from '../../../types/quran-player'

interface QueueItemProps {
  track: QuranTrack
  index: number
  isPlaying: boolean
  isCurrent: boolean
  onRemove: () => void
  onPlay: () => void
}

export const QueueItem = memo(({ 
  track, 
  index, 
  isPlaying, 
  isCurrent,
  onRemove, 
  onPlay 
}: QueueItemProps) => {
  const { lang } = useLang()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: track.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-1 p-1 rounded transition-colors ${
        isCurrent 
          ? 'bg-amber-500/20 border border-amber-500/30' 
          : 'bg-white/5 hover:bg-white/10 border border-transparent'
      }`}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-white/40 hover:text-white/60 cursor-grab active:cursor-grabbing touch-none p-0.5"
        aria-label={lang === 'ar' ? 'سحب' : 'Drag'}
      >
        <GripVertical size={12} />
      </button>

      {/* Play/Pause Button */}
      <button
        onClick={onPlay}
        className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
          isCurrent && isPlaying
            ? 'bg-amber-500 text-black'
            : 'bg-white/10 text-amber-500 hover:bg-amber-500/20'
        }`}
        aria-label={isCurrent && isPlaying ? (lang === 'ar' ? 'إيقاف' : 'Pause') : (lang === 'ar' ? 'تشغيل' : 'Play')}
      >
        {isCurrent && isPlaying ? (
          <Pause size={10} fill="currentColor" />
        ) : (
          <Play size={10} fill="currentColor" className={lang === 'ar' ? 'mr-0.5' : 'ml-0.5'} />
        )}
      </button>

      {/* Track Info - Compact */}
      <div className="flex-1 min-w-0">
        <p className={`text-[10px] truncate ${
          isCurrent ? 'text-amber-500 font-medium' : 'text-white/80'
        }`}>
          {track.title}
        </p>
      </div>

      {/* Remove Button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="text-white/40 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-0.5"
        aria-label={lang === 'ar' ? 'إزالة' : 'Remove'}
      >
        <X size={12} />
      </button>
    </div>
  )
})

QueueItem.displayName = 'QueueItem'
