'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Star, Heart, Play, Calendar, Clock, Film, AlertTriangle } from 'lucide-react'
import ReactPlayer from 'react-player'
import clsx from 'clsx'
import { EmbedPlayer } from '../features/media/EmbedPlayer'
import { useServers } from '../../hooks/useServers'

// @ts-ignore
const Player = ReactPlayer as any

interface MovieDetailsClientProps {
  movie: any
}

export const MovieDetailsClient = ({ movie }: MovieDetailsClientProps) => {
  const [cinemaMode, setCinemaMode] = useState(false)

  const title = movie?.title_ar || movie?.title_en || movie?.title || 'فيلم'
  const titleEn = movie?.title_en || movie?.title
  const overview = movie?.overview_ar || movie?.overview || 'لا يوجد وصف متاح'
  const year = movie?.release_date ? new Date(movie.release_date).getFullYear() : (movie?.release_year || 'غير محدد')
  const rating = movie?.vote_average ? Math.round(movie.vote_average * 10) / 10 : 0
  const poster = movie?.poster_url || (movie?.poster_path ? `/tmdb/w300${movie.poster_path}` : '')
  const backdrop = movie?.backdrop_url || (movie?.backdrop_path ? `/tmdb/w1280${movie.backdrop_path}` : '')
  
  const effectiveId = movie?.tmdb_id || movie?.id || 0
  const { servers, active, setActive, loading: serversLoading, reportBroken, reporting } = useServers(
    effectiveId,
    'movie'
  )
  
  // Parse genres from JSON with fallback
  const genres = useMemo(() => {
    if (!movie?.genres_json) return []
    try {
      return JSON.parse(movie.genres_json) || []
    } catch {
      return []
    }
  }, [movie?.genres_json])
  
  // Parse cast from JSON with fallback
  const cast = useMemo(() => {
    if (!movie?.cast_json) return []
    try {
      const castData = JSON.parse(movie.cast_json) || []
      return castData.slice(0, 10)
    } catch {
      return []
    }
  }, [movie?.cast_json])

  const trailerKey = useMemo(() => {
    if (movie?.trailer_key) return movie.trailer_key
    if (!movie?.videos) return null
    try {
      const videos = typeof movie.videos === 'string' ? JSON.parse(movie.videos) : movie.videos
      const trailer = videos?.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer')
      return trailer?.key || null
    } catch {
      return null
    }
  }, [movie])

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
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    {year}
                  </span>
                )}
                {movie?.runtime && (
                  <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full text-zinc-200">
                    <Clock className="w-4 h-4 text-purple-400" />
                    {Math.floor(movie.runtime / 60)}س {movie.runtime % 60}د
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
                  {genres.map((g: any) => (
                    <span key={g.id || g.name} className="text-xs font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3 py-1 rounded-md">
                      {g.name_ar || g.name_en || g.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="prose prose-invert max-w-none">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <Film className="w-5 h-5 text-cyan-400" />
                  القصة
                </h3>
                <p className="text-base leading-relaxed text-zinc-300">
                  {overview}
                </p>
              </div>
            </div>

            {/* Video Player Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 pt-6"
            >
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
            </motion.div>

            {/* Cast */}
            {cast.length > 0 && (
              <div>
                <h3 className="text-xl font-bold mb-4">طاقم العمل</h3>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {cast.map((person: any) => (
                    <div key={person.id} className="flex-shrink-0 w-24 text-center">
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-800 mb-2">
                        {person.profile_path && (
                          <img
                            src={`/tmdb/w185${person.profile_path}`}
                            alt={person.name_ar || person.name_en}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        )}
                      </div>
                      <p className="text-xs text-zinc-300 truncate">{person.name_ar || person.name_en}</p>
                    </div>
                  ))}
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
