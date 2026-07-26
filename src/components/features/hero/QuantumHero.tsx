'use client'

import { useState, useEffect, memo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Volume2, VolumeX, Star, Calendar } from 'lucide-react'
import Link from 'next/link'
import { TmdbImage } from '../../common/TmdbImage'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay } from 'swiper/modules'
import { translateGenre, getCountryLabel, getMediaTypeLabel, getMediaTypeColor } from '@/lib/content-utils'
import 'swiper/css'

/**
 * QUANTUM HERO - DIVERSE CAROUSEL
 * Features:
 * - 5 Visible Columns
 * - Continuous Smooth Scrolling (Marquee-like)
 * - Diverse Content (Movies/Series from various regions)
 * - Auto-play Trailers on Active/Hover
 */
export const QuantumHero = memo(({ items }: { items: any[] }) => {
  const router = useRouter()
  const [activeId, setActiveId] = useState<number | null>(null)
  const [trailers, setTrailers] = useState<Record<number, string>>({})
  const [isMuted, setIsMuted] = useState(true)

  // Filter out items without valid slugs
  const heroItems = (items || []).filter(item =>
    item &&
    item.slug &&
    typeof item.slug === 'string' &&
    item.slug.trim() !== '' &&
    item.slug !== 'content'
  )

  useEffect(() => {
    if (!activeId) return
    if (trailers[activeId]) return

    let mounted = true
    const fetchTrailer = async () => {
      try {
        const item = heroItems.find(i => i.id === activeId)
        if (!item) return

        // Handle Custom Videos (YouTube)
        if (item.media_type === 'video' || item.source === 'youtube' || item.category === 'plays' || item.category === 'quran' || item.category === 'prophets' || item.category === 'summary') {
          let videoId = typeof item.id === 'string' ? item.id : null
          if (!videoId && item.url) {
            const match = item.url.match(/[?&]v=([^&]+)/)
            videoId = match ? match[1] : null
          }

          if (mounted && videoId) {
            setTrailers(prev => ({ ...prev, [activeId]: videoId }))
          }
          return
        }

        // Use videos from database
        if (item.videos && Array.isArray(item.videos) && item.videos.length > 0) {
          const trailer = item.videos.find(
            (v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
          )
          if (mounted && trailer?.key) {
            setTrailers(prev => ({ ...prev, [activeId]: trailer.key }))
          }
        }
      } catch (e: any) {
        // Silent fail
      }
    }

    fetchTrailer()
    return () => { mounted = false }
  }, [activeId, heroItems, trailers])

  if (!heroItems.length) return null

  const generateWatchUrl = (item: any) => {
    const isTv = item.media_type === 'tv' || item.category === 'series'
    const mediaType = isTv ? 'series' : 'movies'
    return `/${mediaType}/${item.slug}`
  }

  return (
    <div className="relative h-[70vh] w-full bg-transparent overflow-hidden container-padding">
      <div className="h-full">
        <Swiper
          modules={[Autoplay]}
          spaceBetween={0}
          slidesPerView={2}
          loop={heroItems.length >= 10}
          speed={1000}
          autoplay={{
            delay: 5000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true
          }}
          breakpoints={{
            640: { slidesPerView: 3, loop: heroItems.length >= 10 },
            768: { slidesPerView: 4, loop: heroItems.length >= 10 },
            1024: { slidesPerView: 5, loop: heroItems.length >= 10 },
            1280: { slidesPerView: 6, loop: heroItems.length >= 10 },
            1536: { slidesPerView: 7, loop: heroItems.length >= 10 },
          }}
          pagination={false}
          className="h-full w-full [&_.swiper-pagination]:!hidden"
        >
          {heroItems.map((item) => {
            const trailerKey = trailers[item.id]
            const isHovered = activeId === item.id

            return (
              <SwiperSlide key={item.id} className="h-full">
                <div
                  className="relative h-full w-full border-r border-white/10 overflow-hidden group cursor-pointer"
                  onMouseEnter={() => setActiveId(item.id)}
                  onMouseLeave={() => setActiveId(null)}
                  onClick={() => router.push(generateWatchUrl(item))}
                >
                  {/* Glow Effect on Hover */}
                  <div className="absolute -inset-1 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500 via-blue-500/50 to-transparent rounded-xl opacity-0 group-hover:opacity-60 blur-2xl transition-opacity duration-500 -z-10"></div>
                  
                  {/* Background Image - w342 for smaller size */}
                  <div className="absolute inset-0 z-0">
                    <TmdbImage
                      path={item.poster_path}
                      alt={item.title || item.name}
                      size="w342"
                      priority={true}
                      className="w-full h-full"
                      imgClassName="object-cover object-center transition-transform duration-1000 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90" />
                  </div>

                  {/* Genre Badge - AT THE TOP */}
                  <div className="absolute top-3 right-3 z-20">
                    {item.primary_genre && (
                      <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm bg-purple-600/80 text-white border border-purple-500/50">
                        {item.primary_genre}
                      </span>
                    )}
                  </div>

                  {/* Content Layer */}
                  <div className="absolute inset-0 z-20 flex flex-col justify-end p-4">
                    <div className="space-y-2">
                      {/* Title */}
                      <h2 className="font-syne font-black text-white leading-tight text-base lg:text-lg line-clamp-2 drop-shadow-lg">
                        {item.title_ar || item.name_ar || item.title_en || item.name_en}
                      </h2>

                      {/* Year + Rating - Always visible */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-300 font-medium">
                        {(item.release_year || item.first_air_year) && (
                          <div className="flex items-center gap-1 text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
                            <Calendar size={12} />
                            <span className="font-bold">{item.release_year || item.first_air_year}</span>
                          </div>
                        )}
                        {item.vote_average > 0 && (
                          <div className="flex items-center gap-1 text-yellow-400 bg-yellow-950/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
                            <Star size={12} fill="currentColor" />
                            <span className="font-bold">{item.vote_average.toFixed(1)}</span>
                          </div>
                        )}
                      </div>

                      {/* Description on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 max-h-0 group-hover:max-h-24 overflow-hidden">
                        {item.overview_ar && (
                          <p className="text-zinc-300 text-[10px] leading-relaxed line-clamp-4 pt-1 bg-black/60 backdrop-blur-sm rounded p-2">
                            {item.overview_ar}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            )
          })}
        </Swiper>
      </div>
    </div>
  )
}, (prev, next) => {
  if (prev.items === next.items) return true
  if (prev.items.length !== next.items.length) return false
  return prev.items.every((item, index) => item.id === next.items[index].id)
})

QuantumHero.displayName = 'QuantumHero'
