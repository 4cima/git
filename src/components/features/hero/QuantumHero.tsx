'use client'

import { useState, memo } from 'react'
import { useRouter } from 'next/navigation'
import { Star, Calendar, Play } from 'lucide-react'
import { TmdbImage } from '../../common/TmdbImage'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay } from 'swiper/modules'
import 'swiper/css'

export const QuantumHero = memo(({ items }: { items: any[] }) => {
  const router = useRouter()
  const [activeId, setActiveId] = useState<number | null>(null)

  const heroItems = (items || []).filter(item =>
    item && item.slug && typeof item.slug === 'string' && 
    item.slug.trim() !== '' && item.slug !== 'content'
  )

  if (!heroItems.length) return null

  const extractGenre = (genresJson: any) => {
    if (!genresJson) return null
    if (typeof genresJson === 'string') {
      try { return JSON.parse(genresJson)?.[0]?.name_ar || null } catch { return null }
    }
    return Array.isArray(genresJson) ? genresJson[0]?.name_ar || null : null
  }

  const getWatchUrl = (item: any) => {
    const isTv = item.media_type === 'tv' || item.category === 'series'
    return `/${isTv ? 'series' : 'movies'}/${item.slug}`
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
          autoplay={{ delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true }}
          breakpoints={{
            640: { slidesPerView: 3 }, 768: { slidesPerView: 4 },
            1024: { slidesPerView: 5 }, 1280: { slidesPerView: 6 }, 1536: { slidesPerView: 7 },
          }}
          className="h-full w-full"
        >
          {heroItems.map((item) => {
            const genre = item.primary_genre || extractGenre(item.genres_json)
            const year = item.release_year || item.first_air_year || item.year

            return (
              <SwiperSlide key={item.id} className="h-full">
                <div
                  className="relative h-full w-full border-r border-white/10 overflow-hidden group cursor-pointer"
                  onMouseEnter={() => setActiveId(item.id)}
                  onMouseLeave={() => setActiveId(null)}
                  onClick={() => router.push(getWatchUrl(item))}
                >
                  {/* Glow Effect */}
                  <div className="absolute -inset-1 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500 via-blue-500/50 to-transparent rounded-xl opacity-0 group-hover:opacity-60 blur-2xl transition-opacity duration-500 -z-10"></div>
                  
                  {/* Background Image */}
                  <div className="absolute inset-0 z-0">
                    <TmdbImage path={item.poster_path} alt={item.title || item.name} size="w342" priority={true}
                      className="w-full h-full" imgClassName="object-cover object-center transition-transform duration-1000 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition-colors duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-90" />
                  </div>

                  {/* Genre Badge - AT THE TOP */}
                  {genre && (
                    <div className="absolute top-3 right-3 z-20">
                      <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm bg-purple-600/80 text-white border border-purple-500/50">
                        {genre}
                      </span>
                    </div>
                  )}

                  {/* Content Layer */}
                  <div className="absolute inset-0 z-20 flex flex-col justify-end p-4">
                    <div className="space-y-2">
                      {/* Title */}
                      <h2 className="font-syne font-black text-white leading-tight text-base lg:text-lg line-clamp-2 drop-shadow-lg">
                        {item.title_ar || item.name_ar || item.title_en || item.name_en}
                      </h2>

                      {/* Year + Rating - Always visible */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-300 font-medium">
                        {year && (
                          <div className="flex items-center gap-1 text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
                            <Calendar size={12} /><span className="font-bold">{year}</span>
                          </div>
                        )}
                        {item.vote_average > 0 && (
                          <div className="flex items-center gap-1 text-yellow-400 bg-yellow-950/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
                            <Star size={12} fill="currentColor" /><span className="font-bold">{Number(item.vote_average).toFixed(1)}</span>
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
}, (prev, next) => prev.items === next.items || (prev.items.length === next.items.length && prev.items.every((i, idx) => i.id === next.items[idx]?.id)))

QuantumHero.displayName = 'QuantumHero'
