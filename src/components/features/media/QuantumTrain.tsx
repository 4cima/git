'use client'

import { useState, memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Film, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Swiper, SwiperSlide } from 'swiper/react'
import { FreeMode, Navigation } from 'swiper/modules'
import { VideoCard } from './VideoCard'
import { MovieCard } from './MovieCard'
import { SectionHeader } from '../../common/SectionHeader'

import 'swiper/css'
import 'swiper/css/free-mode'
import 'swiper/css/navigation'

export const QuantumTrain = memo(({
  items,
  title,
  link,
  type,
  icon,
  badge,
  className,
  color = 'cyan'
}: {
  items: any[],
  title?: string,
  link?: string,
  type?: string,
  icon?: React.ReactNode,
  badge?: string,
  className?: string,
  color?: 'cyan' | 'purple' | 'gold' | 'red' | 'pink' | 'blue' | 'green' | 'indigo' | 'orange'
}) => {
  const [prevEl, setPrevEl] = useState<HTMLElement | null>(null)
  const [nextEl, setNextEl] = useState<HTMLElement | null>(null)
  const isVideo = type === 'video'
  
  const railItems = useMemo(() => isVideo
    ? items
    : items.filter((item) => {
      const title = item?.title || item?.name || item?.original_title || item?.original_name
      const poster = item?.poster_path || item?.backdrop_path
      const hasValidSlug = item?.slug && item.slug.trim() !== '' && item.slug !== 'content'
      
      return Boolean(item?.id) && Boolean(title) && Boolean(poster) && hasValidSlug
    }), [items, isVideo])

  if (!railItems.length) return null

  const displayTitle = title || 'Top Rated'
  const displayIcon = icon || <Film />

  return (
    <div className={`relative py-3 w-full perspective-1000 group/section ${className || ''}`}>

      <div className="container-padding">
        <SectionHeader
          title={displayTitle}
          icon={displayIcon}
          link={link}
          badge={badge}
          color={color}
          actions={
            <div className="flex items-center gap-2">
              <button 
                ref={setPrevEl} 
                className="w-10 h-10 rounded-full border border-white/10 bg-black/40 hover:bg-cyan-500/20 hover:border-cyan-500/50 flex items-center justify-center transition-all disabled:opacity-30"
                aria-label="Previous"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button 
                ref={setNextEl} 
                className="w-10 h-10 rounded-full border border-white/10 bg-black/40 hover:bg-cyan-500/20 hover:border-cyan-500/50 flex items-center justify-center transition-all disabled:opacity-30"
                aria-label="Next"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
          }
        />
      </div>

      <div className="relative z-10 w-full overflow-hidden">
        <div className="container-padding">
          <Swiper
            modules={[FreeMode, Navigation]}
            spaceBetween={10}
            slidesPerView="auto"
            freeMode={true}
            watchSlidesProgress={true}
            navigation={{
              prevEl,
              nextEl,
            }}
            className="!pb-6"
          >
          {railItems.slice(0, 100).map((movie, index) => {
            const isInInitialView = index < 6
            return (
              <SwiperSlide
                key={`${movie.id}-${index}`}
                className={isVideo
                  ? "!h-auto !w-auto !min-w-[200px] !max-w-[280px] md:!min-w-[240px] md:!max-w-[320px]"
                  : "!h-auto !w-auto !min-w-[100px] !max-w-[140px] md:!min-w-[120px] md:!max-w-[160px]"
                }
              >
                {isVideo ? (
                  <VideoCard video={movie} index={index} />
                ) : (
                  <MovieCard movie={movie} index={index} isVisible={isInInitialView} />
                )}
              </SwiperSlide>
            )
          })}
          
          {/* More Card */}
          {link && railItems.length >= 100 && (
            <SwiperSlide className="!h-auto !w-auto !min-w-[100px] !max-w-[140px] md:!min-w-[120px] md:!max-w-[160px]">
              <Link href={link}>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="relative aspect-[2/3] rounded-lg border-2 border-dashed border-cyan-500/50 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-cyan-500 transition-all group"
                >
                  <ChevronLeft className="w-8 h-8 text-cyan-500 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold text-cyan-500">المزيد</span>
                </motion.div>
              </Link>
            </SwiperSlide>
          )}
        </Swiper>
        </div>
      </div>
    </div>
  )
}, (prev, next) => {
  if (prev.title !== next.title) return false
  if (prev.items.length !== next.items.length) return false
  if (prev.items.length > 0 && next.items.length > 0) {
    for (let i = 0; i < Math.min(prev.items.length, 5); i++) {
      if (prev.items[i].id !== next.items[i].id) return false
    }
  }
  return true
})

QuantumTrain.displayName = 'QuantumTrain'
