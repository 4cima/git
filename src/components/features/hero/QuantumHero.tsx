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
          slidesPerView={1}
          loop={heroItems.length >= 5}
          speed={1000}
          autoplay={{
            delay: 5000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true
          }}
          breakpoints={{
            640: { slidesPerView: 2 },
            768: { slidesPerView: 3 },
            1024: { slidesPerView: 4 },
            1280: { slidesPerView: 6 },
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
                  
                  {/* Background Image */}
                  <div className="absolute inset-0 z-0">
                    <TmdbImage
                      path={item.poster_path}
                      alt={item.title || item.name}
                      size="w1280"
                      priority={true}
                      className="w-full h-full"
                      imgClassName="object-cover object-center transition-transform duration-1000 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90" />
                  </div>

                  {/* Content Layer */}
                  <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 transition-all duration-500 group-hover:pb-12">
                    <div className="space-y-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      
                      {/* Media Type + Genre + Country */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider backdrop-blur-sm border ${getMediaTypeColor(item.media_type)} bg-black/60 border-current/30`}>
                          {getMediaTypeLabel(item.media_type)}
                        </span>
                        
                        {item.primary_genre && (
                          <span className="px-2 py-0.5 rounded bg-white/20 text-white text-xs font-bold backdrop-blur-sm border border-white/30">
                            {translateGenre(item.primary_genre)}
                          </span>
                        )}
                        
                        <span className="px-2 py-0.5 rounded bg-amber-500/30 text-amber-200 text-xs font-bold backdrop-blur-sm border border-amber-500/40">
                          {getCountryLabel(item.original_language, item.production_countries)}
                        </span>
                      </div>

                      {/* Title */}
                      {(() => {
                        const titleAr = item.title_ar || item.name_ar
                        const titleEn = item.title_en || item.title || item.name
                        const primaryTitle = titleAr || titleEn
                        const secondaryTitle = titleAr ? titleEn : null
                        return (
                          <div>
                            <h2 className="font-syne font-black text-white leading-tight text-2xl lg:text-3xl line-clamp-2 drop-shadow-lg">
                              {primaryTitle}
                            </h2>
                            {secondaryTitle && (
                              <p className="text-zinc-400 text-sm mt-1 line-clamp-1">{secondaryTitle}</p>
                            )}
                          </div>
                        )
                      })()}

                      {/* Metadata */}
                      <div className="flex items-center gap-3 text-xs text-zinc-300 font-medium">
                        {item.vote_average > 0 && (
                          <div className="flex items-center gap-1 text-yellow-400">
                            <Star size={12} fill="currentColor" />
                            <span>{item.vote_average.toFixed(1)}</span>
                          </div>
                        )}

                        {(item.release_date || item.first_air_date) && (
                          <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            <span>{(item.release_date || item.first_air_date).substring(0, 4)}</span>
                          </div>
                        )}
                      </div>

                      {/* Expanded Content - Always Visible */}
                      <div className="transition-all duration-500">
                        <p className="text-zinc-300 text-sm line-clamp-3 mb-4 pt-2">
                          {item.overview_ar || item.overview}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={generateWatchUrl(item)}
                            className="flex items-center gap-2 bg-lumen-gold text-black px-4 py-2 rounded-lg font-bold text-xs hover:bg-yellow-400 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Play size={14} fill="currentColor" />
                            <span>مشاهدة</span>
                          </Link>

                          {trailerKey && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setIsMuted(!isMuted)
                              }}
                              className="p-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/20 transition-colors"
                            >
                              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            </button>
                          )}
                        </div>
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
