import { useRef, memo } from 'react'
import { ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { VideoCard, VideoItem } from './VideoCard'
import { SectionHeader } from '../../common/SectionHeader'

type Props = {
  title: string
  videos: VideoItem[]
  icon?: React.ReactNode
  link?: string
}

export const VideoRow = memo(({ title, videos, icon, link }: Props) => {
  const ref = useRef<HTMLDivElement>(null)
  
  const onLeft = () => ref.current?.scrollBy({ left: -window.innerWidth * 0.8, behavior: 'smooth' })
  const onRight = () => ref.current?.scrollBy({ left: window.innerWidth * 0.8, behavior: 'smooth' })

  if (!videos.length) return null

  return (
    <section className="group relative py-8">
      <div className="px-4 lg:px-12">
        <SectionHeader 
          title={title} 
          icon={icon || <Play />} 
          link={link} 
        />
      </div>

      <div className="relative">
        <div
          ref={ref}
          className="scrollbar-hide no-scrollbar flex snap-x snap-mandatory flex-row flex-nowrap gap-2 overflow-x-auto overflow-y-hidden scroll-smooth px-4 lg:px-12 pb-2"
        >
          {videos.filter(v => v.id).map((v, idx) => (
            <div key={v.id || idx} className="snap-start w-[200px] xs:w-[220px] sm:w-[240px] md:w-[260px] xl:w-[280px] 2xl:w-[300px] 3xl:w-[320px] shrink-0">
              <VideoCard video={v} index={idx} />
            </div>
          ))}
        </div>

        {/* Navigation Buttons */}
        <button
          aria-label="prev"
          onClick={onLeft}
          className="absolute top-1/2 -translate-y-1/2 left-0 z-40 hidden h-[calc(100%-1.5rem)] w-16 items-center justify-center bg-gradient-to-r from-luxury-obsidian via-luxury-obsidian/80 to-transparent text-white opacity-0 transition-all duration-300 hover:opacity-100 group-hover:flex lg:w-24"
        >
          <div className="rounded-full bg-white/5 p-3 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors">
            <ChevronLeft size={32} />
          </div>
        </button>
        
        <button
          aria-label="next"
          onClick={onRight}
          className="absolute top-1/2 -translate-y-1/2 right-0 z-40 hidden h-[calc(100%-1.5rem)] w-16 items-center justify-center bg-gradient-to-l from-luxury-obsidian via-luxury-obsidian/80 to-transparent text-white opacity-0 transition-all duration-300 hover:opacity-100 group-hover:flex lg:w-24"
        >
          <div className="rounded-full bg-white/5 p-3 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors">
            <ChevronRight size={32} />
          </div>
        </button>
      </div>
    </section>
  )
}, (prev, next) => {
  if (prev.videos.length !== next.videos.length) return false
  if (prev.title !== next.title) return false
  if (prev.videos.length > 0 && next.videos.length > 0) {
    if (prev.videos[0].id !== next.videos[0].id) return false
  }
  return true
})
