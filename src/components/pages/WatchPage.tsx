'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Star, Calendar, Clock, Film, Tv, Users, Sparkles, AlertTriangle,
  Play, Layers
} from 'lucide-react'
import { MovieCard } from '../features/media/MovieCard'
import { Loading } from '../common/Loading'
import clsx from 'clsx'
import Link from 'next/link'

interface WatchPageProps {
  type: 'movies' | 'series'
  slug: string
  season?: number
  episode?: number
}

export const WatchPage = ({ type, slug, season, episode }: WatchPageProps) => {
  const router = useRouter()
  const [content, setContent] = useState<any>(null)
  const [seasons, setSeasons] = useState<any[]>([])
  const [episodes, setEpisodes] = useState<any[]>([])
  const [cast, setCast] = useState<any[]>([])
  const [similar, setSimilar] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedServer, setSelectedServer] = useState(0)
  const [currentSeason, setCurrentSeason] = useState(season || 1)
  const [currentEpisode, setCurrentEpisode] = useState(episode || 1)

  const isMovie = type === 'movies'
  const isSeries = type === 'series'

  // Fetch content
  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true)
        const endpoint = isMovie ? `/api/movies/${slug}` : `/api/tv/${slug}`
        const response = await fetch(endpoint)
        if (response.ok) {
          const data = await response.json()
          setContent(data)
          if (isSeries && data.seasons) {
            setSeasons(data.seasons)
          }
        }
      } catch (error) {
        console.error('Error fetching content:', error)
      } finally {
        setLoading(false)
      }
    }
    if (slug) fetchContent()
  }, [slug, isMovie, isSeries])

  // Fetch episodes
  useEffect(() => {
    const fetchEpisodes = async () => {
      if (!isSeries || !currentSeason) return
      try {
        const response = await fetch(`/api/tv/${slug}/season/${currentSeason}/episodes`)
        if (response.ok) {
          const data = await response.json()
          setEpisodes(data.episodes || [])
        }
      } catch (error) {
        console.error('Error fetching episodes:', error)
      }
    }
    if (isSeries && currentSeason) fetchEpisodes()
  }, [slug, currentSeason, isSeries])

  // Fetch seasons
  useEffect(() => {
    const fetchSeasons = async () => {
      if (!isSeries) return
      try {
        const response = await fetch(`/api/tv/${slug}/seasons`)
        if (response.ok) {
          const data = await response.json()
          setSeasons(data.data || [])
        }
      } catch (error) {
        console.error('Error fetching seasons:', error)
      }
    }
    if (isSeries && slug) fetchSeasons()
  }, [slug, isSeries])

  // Fetch cast
  useEffect(() => {
    const fetchCast = async () => {
      try {
        const endpoint = isMovie 
          ? `/api/movies/${slug}/cast?limit=12`
          : `/api/tv/${slug}/cast?limit=12`
        const response = await fetch(endpoint)
        if (response.ok) {
          const data = await response.json()
          setCast(data.data || [])
        }
      } catch (error) {
        console.error('Error fetching cast:', error)
      }
    }
    if (slug) fetchCast()
  }, [slug, isMovie])

  // Fetch similar
  useEffect(() => {
    const fetchSimilar = async () => {
      try {
        const endpoint = isMovie
          ? `/api/movies/${slug}/similar?limit=18`
          : `/api/tv/${slug}/similar?limit=18`
        const response = await fetch(endpoint)
        if (response.ok) {
          const data = await response.json()
          setSimilar(data.data || [])
        }
      } catch (error) {
        console.error('Error fetching similar:', error)
      }
    }
    if (slug) fetchSimilar()
  }, [slug, isMovie])

  // Extract data
  const title = content?.title_ar || content?.name_ar || content?.title || content?.name || 'محتوى'
  const titleEn = content?.title_en || content?.name_en || content?.title || content?.name
  const overview = content?.overview_ar || content?.overview || 'لا يوجد وصف'
  const year = content?.release_date || content?.first_air_date ? new Date(content.release_date || content.first_air_date).getFullYear() : ''
  const rating = content?.vote_average ? Math.round(content.vote_average * 10) / 10 : 0
  const voteCount = content?.vote_count || 0
  const runtime = content?.runtime || null
  const originalLanguage = content?.original_language || ''
  const seriesType = content?.type || ''
  const genres = content?.genres ? (typeof content.genres === 'string' ? JSON.parse(content.genres) : content.genres) : []
  const keywords = content?.keywords ? (typeof content.keywords === 'string' ? JSON.parse(content.keywords) : content.keywords) : []
  const poster = content?.poster_url || (content?.poster_path ? `https://image.tmdb.org/t/p/w500${content.poster_path}` : '')

  // Generate embed URL
  const embedUrl = useMemo(() => {
    if (!content?.id) return ''
    const servers = [
      `https://vidsrc.xyz/embed/${isMovie ? 'movie' : 'tv'}/${content.id}${isSeries ? `/${currentSeason}/${currentEpisode}` : ''}`,
      `https://www.2embed.cc/embed/${isMovie ? content.id : `${content.id}&s=${currentSeason}&e=${currentEpisode}`}`,
      `https://embed.su/embed/${isMovie ? 'movie' : 'tv'}/${content.id}${isSeries ? `/${currentSeason}/${currentEpisode}` : ''}`
    ]
    return servers[selectedServer] || servers[0]
  }, [content, selectedServer, isMovie, isSeries, currentSeason, currentEpisode])

  const handleEpisodeChange = useCallback((newEpisode: number) => {
    setCurrentEpisode(newEpisode)
    router.push(`/watch/series/${slug}?season=${currentSeason}&episode=${newEpisode}`)
  }, [slug, currentSeason, router])

  const handleSeasonChange = useCallback((newSeason: number) => {
    setCurrentSeason(newSeason)
    setCurrentEpisode(1)
    router.push(`/watch/series/${slug}?season=${newSeason}&episode=1`)
  }, [slug, router])

  if (loading) {
    return <Loading fullScreen text="جاري التحميل..." />
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <p className="text-white text-xl">المحتوى غير موجود</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* 1. Hero Section: البوستر + المعلومات */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-8">
          
          {/* البوستر - يسار */}
          {poster && (
            <div className="md:col-span-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative rounded-xl overflow-hidden border border-white/10"
              >
                <img
                  src={poster}
                  alt={title}
                  className="w-full aspect-[2/3] object-cover"
                  loading="lazy"
                />
              </motion.div>
            </div>
          )}

          {/* المعلومات - يمين */}
          <div className="md:col-span-9 space-y-6">
            
            {/* العنوان + Stats في صف واحد */}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{title}</h1>
              {titleEn && titleEn !== title && (
                <p className="text-lg text-zinc-400 mb-4">{titleEn}</p>
              )}
              
              {/* Stats Bar */}
              <div className="flex flex-wrap gap-3">
                {rating > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <Star size={16} className="fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-bold text-yellow-400">{rating}</span>
                  </div>
                )}
                {year && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                    <Calendar size={16} className="text-cyan-400" />
                    <span className="text-sm font-bold text-white">{year}</span>
                  </div>
                )}
                {runtime && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                    <Clock size={16} className="text-purple-400" />
                    <span className="text-sm font-bold text-white">{Math.floor(runtime / 60)}س {runtime % 60}د</span>
                  </div>
                )}
                {voteCount > 0 && (
                  <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-xs text-zinc-400">تقييمات: </span>
                    <span className="text-sm font-bold text-white">{voteCount.toLocaleString()}</span>
                  </div>
                )}
                {originalLanguage && (
                  <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-xs text-zinc-400">لغة: </span>
                    <span className="text-sm font-bold text-white uppercase">{originalLanguage}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  {isMovie ? <Film size={16} className="text-cyan-400" /> : <Tv size={16} className="text-cyan-400" />}
                  <span className="text-sm font-bold text-cyan-400">{isMovie ? 'فيلم' : 'مسلسل'}</span>
                </div>
                {isSeries && seriesType && (
                  <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-sm font-bold text-white">{seriesType}</span>
                  </div>
                )}
              </div>
            </div>

            {/* الأجناس */}
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {genres.map((genre: any, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-sm text-purple-300"
                  >
                    {genre.name || genre}
                  </span>
                ))}
              </div>
            )}

            {/* الكلمات المفتاحية */}
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {keywords.slice(0, 10).map((keyword: any, index: number) => (
                  <span
                    key={index}
                    className="px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-zinc-400"
                  >
                    {keyword.name || keyword}
                  </span>
                ))}
              </div>
            )}

            {/* القصة */}
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <p className="text-zinc-300 leading-relaxed">{overview}</p>
            </div>

            {/* الممثلين - horizontal scroll */}
            {cast.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users size={18} className="text-pink-400" />
                  <h3 className="text-lg font-bold text-white">طاقم العمل</h3>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {cast.map((person: any) => (
                    <Link 
                      key={person.id} 
                      href={`/actor/${person.slug || person.id}`}
                      className="flex-shrink-0 text-center group"
                    >
                      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-pink-500/50 transition-colors mb-2">
                        {person.profile_path || person.profile_url ? (
                          <img
                            src={person.profile_url || `https://image.tmdb.org/t/p/w185${person.profile_path}`}
                            alt={person.name_ar || person.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                            <Users size={24} className="text-zinc-600" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-zinc-300 group-hover:text-pink-400 transition-colors w-20 line-clamp-2">
                        {person.name_ar || person.name}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. Player Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          
          {/* المشغل */}
          <div className={clsx("space-y-4", isSeries ? "lg:col-span-8" : "lg:col-span-12")}>
            
            {/* Server Selector - فوق المشغل */}
            <div className="flex items-center justify-center gap-3">
              <span className="text-sm text-zinc-400">السيرفر:</span>
              {['vidsrc', '2embed', 'embed.su'].map((name, index) => (
                <button
                  key={name}
                  onClick={() => setSelectedServer(index)}
                  className={clsx(
                    'px-4 py-2 rounded-lg font-bold transition-all',
                    selectedServer === index
                      ? 'bg-cyan-500 text-white'
                      : 'bg-white/10 text-zinc-400 hover:bg-white/20'
                  )}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            <div className="relative w-full rounded-xl overflow-hidden bg-black border border-white/10">
              <div className="aspect-video">
                {embedUrl && (
                  <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    allowFullScreen allow="autoplay; fullscreen; picture-in-picture"
                  />
                )}
              </div>
            </div>

            {/* إخلاء المسؤولية - تحت المشغل */}
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

          {/* Seasons + Episodes (للمسلسلات فقط) */}
          {isSeries && (
            <div className="lg:col-span-4 space-y-4">
              
              {/* Seasons */}
              {seasons.length > 0 && (
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Layers size={18} className="text-cyan-400" />
                    <h3 className="text-lg font-bold text-white">المواسم</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {seasons
                      .filter((s: any) => s.season_number >= 0)
                      .map((s: any) => (
                        <button
                          key={s.id}
                          onClick={() => handleSeasonChange(s.season_number)}
                          className={clsx(
                            'px-3 py-1.5 rounded-lg font-bold transition-all text-sm',
                            currentSeason === s.season_number
                              ? 'bg-cyan-500 text-white'
                              : 'bg-white/10 text-zinc-400 hover:bg-white/20'
                          )}
                        >
                          {s.season_number}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Episodes */}
              {episodes.length > 0 && (
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Play size={18} className="text-purple-400" />
                    <h3 className="text-lg font-bold text-white">الحلقات</h3>
                  </div>
                  <div className="grid grid-cols-5 gap-2 max-h-96 overflow-y-auto">
                    {episodes.map((ep: any) => (
                      <button
                        key={ep.id}
                        onClick={() => handleEpisodeChange(ep.episode_number)}
                        className={clsx(
                          'aspect-square rounded-lg flex items-center justify-center font-bold transition-all text-sm',
                          currentEpisode === ep.episode_number
                            ? 'bg-cyan-500 text-white'
                            : 'bg-white/10 text-zinc-400 hover:bg-white/20'
                        )}
                      >
                        {ep.episode_number}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Similar Content */}
        {similar.length > 0 && (
          <div className="p-6 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles size={20} className="text-yellow-400" />
              <h3 className="text-xl font-bold text-white">
                {isMovie ? 'أفلام مشابهة' : 'مسلسلات مشابهة'}
              </h3>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {similar.slice(0, 12).map((item: any) => (
                <MovieCard 
                  key={item.id} 
                  movie={{ ...item, media_type: isMovie ? 'movie' : 'tv' }} 
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
