import { memo, useRef } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Play } from 'lucide-react'
import { useLang } from '../../../state/useLang'
import { useQuranPlayerStore } from '../../../state/useQuranPlayerStore'
import { QueueItem } from './QueueItem'

interface QueueViewProps {
  className?: string
  buttonRef?: React.RefObject<HTMLButtonElement | null>
}

export const QueueView = memo(({ className = '' }: QueueViewProps) => {
  const { lang } = useLang()
  const {
    queue,
    currentQueueIndex,
    reorderQueue,
    removeFromQueue,
    playTrack,
    currentTrack
  } = useQuranPlayerStore()

  const menuRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = queue.findIndex((item) => item.id === active.id)
      const newIndex = queue.findIndex((item) => item.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        reorderQueue(oldIndex, newIndex)
      }
    }
  }

  const handleRemove = (index: number) => {
    removeFromQueue(index)
  }

  const handlePlay = (index: number) => {
    const track = queue[index]
    if (track) {
      playTrack(track)
    }
  }

  const content = queue.length === 0 ? (
    <div className="flex flex-col items-center justify-center h-full">
      <svg
        className="w-12 h-12 text-white/20 mb-3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
      <p className="text-white/40 text-xs">
        {lang === 'ar' ? 'قائمة الانتظار فارغة' : 'Queue is empty'}
      </p>
    </div>
  ) : (
    <div className="flex flex-col h-full">
      {/* Queue Header with Play All Button */}
      <div className="flex items-center justify-between mb-2 px-3">
        <div className="flex items-center gap-2">
          <h3 className="text-white/80 text-xs font-medium">
            {lang === 'ar' ? 'قائمة الانتظار' : 'Queue'}
          </h3>
          <button
            onClick={() => {
              if (queue.length > 0) {
                playTrack(queue[0])
              }
            }}
            className="p-1 rounded-full bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 transition-colors"
            aria-label={lang === 'ar' ? 'تشغيل القائمة' : 'Play queue'}
            title={lang === 'ar' ? 'تشغيل القائمة' : 'Play queue'}
          >
            <Play size={10} fill="currentColor" className={lang === 'ar' ? 'mr-0.5' : 'ml-0.5'} />
          </button>
        </div>
        <span className="text-white/40 text-[10px]">
          {lang === 'ar'
            ? `${currentQueueIndex + 1} من ${queue.length}`
            : `${currentQueueIndex + 1} of ${queue.length}`
          }
        </span>
      </div>

      {/* Queue List */}
      <div className="quran-player-scrollable overflow-y-auto flex-1" style={{ maxHeight: 'calc(100% - 32px)' }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={queue.map(item => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1">
              {queue.map((track, index) => (
                <QueueItem
                  key={`${track.id}-${index}`}
                  track={track}
                  index={index}
                  isPlaying={currentTrack?.id === track.id}
                  isCurrent={index === currentQueueIndex}
                  onRemove={() => handleRemove(index)}
                  onPlay={() => handlePlay(index)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )

  return (
    <div
      ref={menuRef}
      className={`bg-gray-800/98 backdrop-blur-xl border-t border-white/10 py-2 px-1 ${className}`}
      style={{ height: '264px', width: '100%', maxWidth: '100%', minWidth: '0' }}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {content}
    </div>
  )
})

QueueView.displayName = 'QueueView'
