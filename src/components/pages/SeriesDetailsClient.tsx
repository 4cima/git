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
import { Footer } from '../layout/Footer'

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

  // Parse cast from JSON with fallback
  const cast = useMemo(() => {
    if (!series?.cast_json) return []
    try {
      const castData = JSON.parse(series.cast_json) || []
      return castData.slice(0, 10)
    } catch {
      return []
    }
  }, [series?.cast_json])

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
    <div className="min-h-screen bg-zinc-800 text-white relative overflow-hidden">
      {/* Backdrop */}
      <div className="absolute top-0 left-0 right-0 h-[70vh]">
        {backdrop && (
          <div className="absolute inset-0">
            <img src={backdrop} alt="" className="w-full h-full object-cover object-top opacity-40" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-800 via-zinc-800/50 to-transparent" />
          </div>
        )}
      </div>

      <div className="relative z-10 page-container pt-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
          {/* Left: Poster */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-16"
          >
            <div className="relative rounded-xl overflow-hidden shadow-2xl aspect-[2/3] group">
              {poster && (
                <img src={poster} alt={title} className="w-full h-full object-cover" loading="lazy" />
              )}
            </div>
          </motion.div>

          {/* Right: Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
              {/* Left side: Title, Info, Genres, Description */}
              <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl">
                <h1 className="text-3xl md:text-4xl font-black mb-2 text-zinc-100">{title}</h1>
                {titleEn && titleEn !== title && (
                  <h2 className="text-xl text-zinc-400 mb-6 font-medium tracking-wide text-left">{titleEn}</h2>
                )}
                
                <div className="flex flex-wrap items-center gap-2 text-sm font-medium mb-6">
                  {/* Genres on the right */}
                  {genres.length > 0 && genres.map((g: any, idx: number) => {
                    const genreColorScheme = getGenreColor(g.name_ar || g.name_en || g.name)
                    return (
                      <span 
                        key={g.tmdb_id || g.id || `genre-${idx}`} 
                        className={`text-[10px] font-bold uppercase tracking-wider ${genreColorScheme.bg} ${genreColorScheme.text} border ${genreColorScheme.border} px-2 py-1 rounded-lg ${genreColorScheme.glow} shadow-lg transition-all hover:scale-105`}
                      >
                        {g.name_ar || g.name_en || g.name}
                      </span>
                    )
                  })}
                  
                  {/* Spacer to push next items to the left */}
                  <div className="flex-grow"></div>
                  
                  {/* Year, Rating on the left */}
                  {year && (
                    <span className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full text-zinc-200 text-xs">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      {year}
                    </span>
                  )}
                  {rating > 0 && (
                    <span className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 px-2 py-1 rounded-full text-yellow-500 text-xs">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {rating}
                    </span>
                  )}
                </div>

                <div className="prose prose-invert max-w-none">
                  <p className="text-base leading-relaxed text-zinc-300">
                    <span className="font-bold text-cyan-400 relative -top-2">القصة </span>
                    <span className="font-bold text-blue-600">"</span>
                    {overview}
                    <span className="font-bold text-blue-600">"</span>
                  </p>
                </div>
              </div>

              {/* Right side: Trailer or Backdrop */}
              <div className="space-y-4">
                <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl">
                  <div className="aspect-video rounded-xl overflow-hidden bg-black/50 border border-white/10">
                    {trailerKey ? (
                      <Player
                        url={`https://www.youtube.com/watch?v=${trailerKey}`}
                        width="100%"
                        height="100%"
                        controls
                        light={backdrop}
                      />
                    ) : backdrop ? (
                      <img src={backdrop} alt={title} className="w-full h-full object-cover" loading="lazy" />
                    ) : null}
                  </div>
                </div>

                {/* Cast under trailer/backdrop */}
                {cast.length > 0 && (
                  <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl">
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900 -mx-4 px-4" style={{maxWidth: 'calc(100% + 2rem)'}}>
                      {cast.map((person: any, idx: number) => (
                        <div key={person.tmdb_id || person.id || `cast-${idx}`} className="flex-shrink-0 text-center" style={{width: '31px'}}>
                          <div className="rounded-full overflow-hidden bg-zinc-800 mb-1" style={{width: '31px', height: '31px'}}>
                            {person.profile_path && (
                              <img
                                src={`/tmdb/w185${person.profile_path}`}
                                alt={person.name_ar || person.name_en}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            )}
                          </div>
                          <p className="text-[7px] text-zinc-300 truncate leading-tight">{person.name_ar || person.name_en}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Season Selector with Container */}
            {seasons.length > 0 && (
              <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl">
                <div className="flex items-start gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
                  <h3 className="flex-shrink-0 text-lg font-bold text-purple-500 flex items-center gap-2 pt-1">
                    <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
                    المواسم
                    <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
                  </h3>
                  {seasons
                    .filter((s: any) => s.season_number > 0)
                    .map((season: any, idx: number) => (
                      <button
                        key={season.id || `season-${season.season_number}-${idx}`}
                        onClick={() => setSelectedSeason(season.season_number)}
                        className={clsx(
                          'flex-shrink-0 px-2 py-1 rounded-xl transition-all duration-300 font-medium whitespace-nowrap',
                          selectedSeason === season.season_number
                            ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-105'
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        )}
                      >
                        <div className="text-[10px] font-bold">الموسم</div>
                        <div className="text-base font-black">{season.season_number}</div>
                        <div className="text-[9px] font-semibold opacity-90">{season.episode_count} حلقة</div>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Episodes with Container - merged with seasons */}
            <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl -mt-8">
              <div className="flex items-start gap-3">
                <h3 className="flex-shrink-0 text-lg font-bold text-cyan-400 flex items-center gap-2 pt-[5px]">
                  <span className="w-1 h-6 bg-cyan-400 rounded-full"></span>
                  الحلقات
                  <span className="w-1 h-6 bg-cyan-400 rounded-full"></span>
                </h3>
                <div className="flex-1 grid grid-cols-15 gap-2">
                  {episodes.map((ep) => (
                    <button
                      key={ep}
                      onClick={() => setSelectedEpisode(ep)}
                      className={clsx(
                        'w-[43px] h-[43px] rounded-xl transition-all duration-300 flex flex-col items-center justify-center gap-1',
                        selectedEpisode === ep
                          ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-110'
                          : 'bg-white/10 hover:bg-white/20 hover:scale-105'
                      )}
                    >
                      <div className="text-[13px] opacity-90 font-medium leading-none">حلقة</div>
                      <div className="text-base font-black leading-none">{ep}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Player with Side Servers */}
            <div className="flex gap-4">
              {/* Servers Sidebar */}
              <div className="flex-shrink-0 w-16">
                <h3 className="text-sm font-black mb-2 text-center text-white">السيرفرات</h3>
                <div className="flex flex-col gap-2 sticky top-4">
                  {servers.map((s, idx) => {
                    const isActive = idx === active
                    const isServerOffline = s.status === 'offline'

                    return (
                      <button
                        key={`${s.name}-${idx}`}
                        onClick={() => !isServerOffline && setActive(idx)}
                        title={`${s.name} - ${isServerOffline ? 'Offline' : isActive ? 'Active' : 'Available'}`}
                        disabled={isServerOffline}
                        className={clsx(
                          "flex items-center justify-center w-16 h-12 rounded-xl border transition-all duration-300 font-black text-lg leading-none",
                          isActive
                            ? "bg-green-700 border-green-700 text-white shadow-lg shadow-green-700/30"
                            : isServerOffline
                              ? "bg-rose-500/5 border-rose-500/20 text-rose-500/50 cursor-not-allowed opacity-50"
                              : "bg-white/5 border-white/5 text-white hover:bg-white/10 hover:border-white/10 hover:text-white"
                        )}
                      >
                        V{idx + 1}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Embedded Player */}
              <div className="flex-1 space-y-4">
              <EmbedPlayer
                server={servers[active]}
                serverIndex={active}
                cinemaMode={cinemaMode}
                toggleCinemaMode={() => setCinemaMode(!cinemaMode)}
                loading={serversLoading}
                onNextServer={() => active < servers.length - 1 ? setActive(active + 1) : setActive(0)}
                onReport={() => {}} // Disabled - moved to disclaimer
                reporting={false}
                poster={backdrop || poster}
                lang="ar"
                servers={servers}
                activeServerIndex={active}
                onServerSelect={setActive}
              />

              {/* Disclaimer with Report Button */}
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-400" />
                    <span className="text-sm text-red-400 font-bold">إخلاء مسؤولية</span>
                  </div>
                  <button
                    onClick={reportBroken}
                    disabled={reporting}
                    className={clsx(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-300 text-xs font-medium",
                      reporting
                        ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 cursor-not-allowed"
                        : "bg-white/5 border-white/5 text-yellow-400 hover:bg-yellow-500/10 hover:border-yellow-500/30 hover:text-yellow-300"
                    )}
                  >
                    <AlertTriangle size={14} />
                    {reporting ? 'جاري الإبلاغ...' : 'إبلاغ عن مشكلة'}
                  </button>
                </div>
                <p className="text-sm text-zinc-400">
                  جميع المحتويات المعروضة يتم جلبها تلقائياً من مصادر خارجية. الموقع غير مسؤول عن أي محتوى معروض.
                </p>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
