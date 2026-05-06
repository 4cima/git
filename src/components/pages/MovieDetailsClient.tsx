'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Star, Heart, Play, Calendar, Clock, Film, AlertTriangle } from 'lucide-react'
import ReactPlayer from 'react-player'
import clsx from 'clsx'

// @ts-ignore
const Player = ReactPlayer as any

interface MovieDetailsClientProps {
  movie: any
}

export const MovieDetailsClient = ({ movie }: MovieDetailsClientProps) => {
  const [inWatchlist, setInWatchlist] = useState(false)
  const [selectedServer, setSelectedServer] = useState(0)
  const [showPlayer, setShowPlayer] = useState(false)

  const title = movie?.title_ar || movie?.title_en || movie?.title || 'فيلم'
  const titleEn = movie?.title_en || movie?.title
  const overview = movie?.overview_ar || movie?.overview || 'لا يوجد وصف متاح'
  const year = movie?.release_date ? new Date(movie.release_date).getFullYear() : (movie?.release_year || 'غير محدد')
  const rating = movie?.vote_average ? Math.round(movie.vote_average * 10) / 10 : 0
  const poster = movie?.poster_url || (movie?.poster_path ? `https://image.tmdb.org/t/p/w300${movie.poster_path}` : '')
  const backdrop = movie?.backdrop_url || (movie?.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : '')
  
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

  // Generate embed URL for player
  const embedUrl = useMemo(() => {
    if (!movie?.id && !movie?.tmdb_id) return ''
    const movieId = movie.tmdb_id || movie.id
    const servers = [
      `https://vidsrc.xyz/embed/movie/${movieId}`,
      `https://www.2embed.cc/embed/${movieId}`,
      `https://embed.su/embed/movie/${movieId}`
    ]
    return servers[selectedServer] || servers[0]
  }, [movie, selectedServer])

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

            <button
              onClick={() => setShowPlayer(!showPlayer)}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center gap-2 font-bold hover:scale-105 transition-transform"
            >
              <Play className="fill-current" />
              {showPlayer ? 'إخفاء المشغل' : 'مشاهدة الآن'}
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
                {movie?.runtime && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {Math.floor(movie.runtime / 60)}س {movie.runtime % 60}د
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

            {/* Video Player Section */}
            {showPlayer && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                {/* Server Selector */}
                <div className="flex items-center justify-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10">
                  <Film className="w-5 h-5 text-cyan-400" />
                  <span className="text-sm text-zinc-400 font-medium">اختر السيرفر:</span>
                  {['vidsrc', '2embed', 'embed.su'].map((name, index) => (
                    <button
                      key={name}
                      onClick={() => setSelectedServer(index)}
                      className={clsx(
                        'px-4 py-2 rounded-lg font-bold transition-all text-sm',
                        selectedServer === index
                          ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50'
                          : 'bg-white/10 text-zinc-400 hover:bg-white/20'
                      )}
                    >
                      سيرفر {index + 1}
                    </button>
                  ))}
                </div>

                {/* Player */}
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
            )}

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
                            src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
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
