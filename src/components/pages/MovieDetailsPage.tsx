'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Star, Heart, Play, Calendar, Clock } from 'lucide-react'
import { MovieCard } from '../features/media/MovieCard'
import { SectionHeader } from '../common/SectionHeader'
import { Loading } from '../common/Loading'
import ReactPlayer from 'react-player'

// @ts-ignore - react-player types issue
const Player = ReactPlayer as any

export const MovieDetailsPage = ({ slug }: { slug: string }) => {
  const router = useRouter()
  const [movie, setMovie] = useState<any>(null)
  const [similar, setSimilar] = useState<any[]>([])
  const [cast, setCast] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [inWatchlist, setInWatchlist] = useState(false)

  useEffect(() => {
    const fetchMovie = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/movies/${slug}`)
        if (response.ok) {
          const data = await response.json()
          setMovie(data)
          
          // Cast comes with movie response
          if (data.cast) {
            setCast(data.cast)
          }
        }
      } catch (error) {
        console.error('Error fetching movie:', error)
      } finally {
        setLoading(false)
      }
    }

    if (slug) {
      fetchMovie()
    }
  }, [slug])

  const title = movie?.title_ar || movie?.title || 'فيلم'
  const titleEn = movie?.title_en || movie?.title
  const overview = movie?.overview_ar || movie?.overview || 'لا يوجد وصف متاح'
  const year = movie?.release_date ? new Date(movie.release_date).getFullYear() : 'غير محدد'
  const rating = movie?.vote_average ? Math.round(movie.vote_average * 10) / 10 : 0
  const poster = movie?.poster_url || (movie?.poster_path ? `https://image.tmdb.org/t/p/w300${movie.poster_path}` : '')
  const backdrop = movie?.backdrop_url || (movie?.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : '')
  const genres = movie?.genres || []
  const runtime = movie?.runtime || 0
  const releaseDate = movie?.release_date ? new Date(movie.release_date).toLocaleDateString('ar-EG') : 'غير محدد'

  const trailerKey = useMemo(() => {
    if (!movie?.videos) return null
    try {
      const videos = typeof movie.videos === 'string' ? JSON.parse(movie.videos) : movie.videos
      const trailer = videos?.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer')
      return trailer?.key || null
    } catch {
      return null
    }
  }, [movie])

  if (loading) {
    return <Loading fullScreen text="جاري التحميل..." />
  }

  // STRICT: If no valid data, show error
  if (!movie || !movie.title || !movie.overview || !movie.release_date) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">الفيلم غير متوفر</p>
          <p className="text-gray-400 text-sm">البيانات غير كاملة أو الفيلم غير موجود</p>
        </div>
      </div>
    )
  }

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
              onClick={() => router.push(`/watch/movies/${slug}`)}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center gap-2 font-bold hover:scale-105 transition-transform"
            >
              <Play className="fill-current" />
              مشاهدة الآن
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
                  <span>{genres.map((g: any) => g.name).join(', ')}</span>
                )}
              </div>
            </div>

            <p className="text-lg leading-relaxed text-zinc-300 max-w-3xl">
              {overview}
            </p>

            {/* Cast */}
            {cast.length > 0 && (
              <div>
                <h3 className="text-xl font-bold mb-4">طاقم العمل</h3>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {cast.map((person: any) => (
                    <div key={person.id} className="flex-shrink-0 w-24 text-center">
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-800 mb-2">
                        {person.profile_url && (
                          <img
                            src={person.profile_url}
                            alt={person.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        )}
                      </div>
                      <p className="text-xs text-zinc-300 truncate">{person.name}</p>
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

            {/* Similar Movies */}
            {similar.length > 0 && (
              <div className="pt-12">
                <SectionHeader title="أفلام مشابهة" icon={<Play className="w-5 h-5" />} />
                <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-4">
                  {similar.slice(0, 8).map((item: any) => (
                    <MovieCard key={item.id} movie={{ ...item, media_type: 'movie' }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
