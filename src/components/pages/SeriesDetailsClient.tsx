'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Star, Heart, Play, Calendar } from 'lucide-react'
import ReactPlayer from 'react-player'
import clsx from 'clsx'

// @ts-ignore
const Player = ReactPlayer as any

interface SeriesDetailsClientProps {
  series: any
  seasons: any[]
}

export const SeriesDetailsClient = ({ series, seasons }: SeriesDetailsClientProps) => {
  const [inWatchlist, setInWatchlist] = useState(false)
  const [selectedSeason, setSelectedSeason] = useState<number>(
    seasons.find((s: any) => s.season_number > 0)?.season_number || 1
  )

  const title = series?.name_ar || series?.name || series?.original_name || 'مسلسل'
  const titleEn = series?.name_en || series?.name || series?.original_name
  const overview = series?.overview_ar || series?.overview || 'لا يوجد وصف متاح'
  const year = series?.first_air_date ? new Date(series.first_air_date).getFullYear() : 'غير محدد'
  const rating = series?.vote_average ? Math.round(series.vote_average * 10) / 10 : 0
  const poster = series?.poster_url || (series?.poster_path ? `https://image.tmdb.org/t/p/w300${series.poster_path}` : '')
  const backdrop = series?.backdrop_url || (series?.backdrop_path ? `https://image.tmdb.org/t/p/w1280${series.backdrop_path}` : '')
  
  // Parse genres from JSON with fallback
  const genres = useMemo(() => {
    if (!series?.genres_json) return []
    try {
      return JSON.parse(series.genres_json) || []
    } catch {
      return []
    }
  }, [series?.genres_json])

  const trailerKey = useMemo(() => {
    if (series?.trailer_key) return series.trailer_key
    if (!series?.videos) return null
    try {
      const videos = typeof series.videos === 'string' ? JSON.parse(series.videos) : series.videos
      const trailer = videos?.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer')
      return trailer?.key || null
    } catch {
      return null
    }
  }, [series])

  // Generate embed URL for first episode
  const embedUrl = useMemo(() => {
    if (!series?.id && !series?.tmdb_id) return ''
    const seriesId = series.tmdb_id || series.id
    return `https://vidsrc.xyz/embed/tv/${seriesId}/${selectedSeason}/1`
  }, [series, selectedSeason])

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 h-[70vh]">
        {backdrop && (
          <div className="absolute inset-0">
            <img src={backdrop} alt="" className="w-full h-full object-cover opacity-40" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          </div>
        )}
      </div>

      <div className="relative z-10 page-container pt-[20vh] pb-20">
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
          {/* Left: Poster */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="relative rounded-xl overflow-hidden shadow-2xl aspect-[2/3] group">
              {poster && (
                <img src={poster} alt={title} className="w-full h-full object-cover" loading="lazy" />
              )}
            </div>

            <button
              onClick={() => setInWatchlist(!inWatchlist)}
              className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-all ${
                inWatchlist ? 'bg-red-500/20 text-red-500' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              <Heart className={inWatchlist ? 'fill-current' : ''} />
              {inWatchlist ? 'في القائمة' : 'أضف للقائمة'}
            </button>
          </motion.div>

          {/* Right: Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">{title}</h1>
              {titleEn && titleEn !== title && (
                <h2 className="text-2xl text-zinc-400 mb-2">{titleEn}</h2>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
                {year && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {year}
                  </span>
                )}
                {rating > 0 && (
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span>{rating}</span>
                  </div>
                )}
                {genres.length > 0 && (
                  <span>{genres.map((g: any) => g.name_ar || g.name_en || g.name).join(', ')}</span>
                )}
              </div>
            </div>

            <p className="text-lg leading-relaxed text-zinc-300 max-w-3xl">
              {overview}
            </p>

            {/* Season Selector & Player */}
            {seasons.length > 0 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold mb-3">المواسم</h3>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {seasons
                      .filter((s: any) => s.season_number >= 0)
                      .map((season: any) => (
                        <button
                          key={season.id}
                          onClick={() => setSelectedSeason(season.season_number)}
                          className={clsx(
                            'px-4 py-2 rounded-lg whitespace-nowrap transition-all',
                            selectedSeason === season.season_number
                              ? 'bg-cyan-500 text-white'
                              : 'bg-white/10 hover:bg-white/20'
                          )}
                        >
                          الموسم {season.season_number}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Embedded Player */}
                <div className="relative w-full rounded-xl overflow-hidden bg-black border border-white/10 shadow-2xl">
                  <div className="aspect-video">
                    {embedUrl && (
                      <iframe
                        src={embedUrl}
                        className="w-full h-full"
                        allowFullScreen
                        allow="autoplay; fullscreen; picture-in-picture"
                        title={`مشاهدة ${title}`}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Trailer */}
            {trailerKey && (
              <div className="pt-4">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Play className="w-5 h-5 text-red-500" />
                  الإعلان الرسمي
                </h3>
                <div className="aspect-video rounded-xl overflow-hidden bg-black/50 border border-white/10 max-w-2xl">
                  <Player
                    url={`https://www.youtube.com/watch?v=${trailerKey}`}
                    width="100%"
                    height="100%"
                    controls
                    light={backdrop}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
