'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Star, Heart, Play, Calendar, AlertTriangle } from 'lucide-react'
import ReactPlayer from 'react-player'
import clsx from 'clsx'
import { EmbedPlayer } from '../features/media/EmbedPlayer'
import { useServers } from '../../hooks/useServers'
import { getGenreColor } from '@/utils/genreColors'
import { sanitizeTitle, sanitizeOverview } from '@/utils/textSanitizer'

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
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1)
  const [cinemaMode, setCinemaMode] = useState(false)

  const title = sanitizeTitle(series?.name_ar || series?.name || series?.original_name || 'مسلسل')
  const titleEn = sanitizeTitle(series?.name_en || series?.name || series?.original_name)
  const overview = sanitizeOverview(series?.overview_ar || series?.overview || 'لا يوجد وصف متاح')
  const year = series?.first_air_date ? new Date(series.first_air_date).getFullYear() : 'غير محدد'
  const rating = series?.vote_average ? Math.round(series.vote_average * 10) / 10 : 0
  const poster = series?.poster_url || (series?.poster_path ? `/tmdb/w300${series.poster_path}` : '')
  const backdrop = series?.backdrop_url || (series?.backdrop_path ? `/tmdb/w300${series.backdrop_path}` : '')
  
  const effectiveId = series?.tmdb_id || series?.id || 0
  const { servers, active, setActive, loading: serversLoading, reportBroken, reporting } = useServers(
    effectiveId,
    'tv',
    selectedSeason,
    selectedEpisode
  )
  
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

  // Get episodes for selected season
  const currentSeason = seasons.find((s: any) => s.season_number === selectedSeason)
  const episodeCount = currentSeason?.episode_count || 1
  const episodes = Array.from({ length: episodeCount }, (_, i) => i + 1)

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
          </motion.div>

          {/* Right: Info */}
          <div className="space-y-8">
            <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl">
              <h1 className="text-4xl md:text-5xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">{title}</h1>
              {titleEn && titleEn !== title && (
                <h2 className="text-xl text-zinc-400 mb-6 font-medium tracking-wide">{titleEn}</h2>
              )}
              
              <div className="flex flex-wrap items-center gap-3 text-sm font-medium mb-6">
                {year && (
                  <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full text-zinc-200">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    {year}
                  </span>
                )}
                {rating > 0 && (
                  <span className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-full text-yellow-500">
                    <Star className="w-4 h-4 fill-current" />
                    {rating}
                  </span>
                )}
              </div>

              {genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {genres.map((g: any) => {
                    const genreColorScheme = getGenreColor(g.name_ar || g.name_en || g.name)
                    return (
                      <span 
                        key={g.id || g.name} 
                        className={`text-xs font-bold uppercase tracking-wider ${genreColorScheme.bg} ${genreColorScheme.text} border ${genreColorScheme.border} px-3 py-1.5 rounded-lg ${genreColorScheme.glow} shadow-lg transition-all hover:scale-105`}
                      >
                        {g.name_ar || g.name_en || g.name}
                      </span>
                    )
                  })}
                </div>
              )}

              <div className="prose prose-invert max-w-none">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <Play className="w-5 h-5 text-purple-400" />
                  القصة
                </h3>
                <p className="text-base leading-relaxed text-zinc-300">
                  {overview}
                </p>
              </div>
            </div>

            {/* Season Selector & Player */}
            <div className="space-y-4">
              {seasons.length > 0 && (
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
              )}

              <div>
                <h3 className="text-xl font-bold mb-3">الحلقات</h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {episodes.map((ep) => (
                    <button
                      key={ep}
                      onClick={() => setSelectedEpisode(ep)}
                      className={clsx(
                        'px-4 py-2 rounded-lg whitespace-nowrap transition-all',
                        selectedEpisode === ep
                          ? 'bg-purple-500 text-white'
                          : 'bg-white/10 hover:bg-white/20'
                      )}
                    >
                      حلقة {ep}
                    </button>
                  ))}
                </div>
              </div>

              {/* Embedded Player */}
              <div className="space-y-4">
                <EmbedPlayer
                  server={servers[active]}
                  serverIndex={active}
                  cinemaMode={cinemaMode}
                  toggleCinemaMode={() => setCinemaMode(!cinemaMode)}
                  loading={serversLoading}
                  onNextServer={() => active < servers.length - 1 ? setActive(active + 1) : setActive(0)}
                  onReport={reportBroken}
                  reporting={reporting}
                  poster={backdrop || poster}
                  lang="ar"
                  servers={servers}
                  activeServerIndex={active}
                  onServerSelect={setActive}
                />

                {/* Disclaimer */}
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} className="text-red-400" />
                    <span className="text-sm text-red-400 font-bold">إخلاء مسؤولية</span>
                  </div>
                  <p className="text-sm text-zinc-400">
                    جميع المحتويات المعروضة يتم جلبها تلقائياً من مصادر خارجية. الموقع غير مسؤول عن أي محتوى معروض.
                  </p>
                </div>
              </div>
            </div>

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
