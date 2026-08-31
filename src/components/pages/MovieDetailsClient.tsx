'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Star, Calendar, Clock, Film, Heart, Play } from 'lucide-react'
import clsx from 'clsx'
import Link from 'next/link'
import { getGenreColor } from '@/utils/genreColors'
import { sanitizeTitle, sanitizeOverview } from '@/utils/textSanitizer'
import { Footer } from '../layout/Footer'
import { useImageBrightness } from '@/utils/imageAnalysis'
import { MovieCard } from '@/components/features/media/MovieCard'
import { useAuth } from '@/hooks/useAuth'
import { prefetchWatchAd, openWatchWithPlayer } from '@/lib/openWatch'
import { preparePopunder, firePopunderOnClick } from '@/components/features/system/adsClick'
import { AdsManager } from '@/components/features/system/AdsManager'

interface MovieDetailsClientProps {
  movie: any
}

export const MovieDetailsClient = ({ movie }: MovieDetailsClientProps) => {
  const { user } = useAuth() // Check if user is logged in
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(100)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [similarMovies, setSimilarMovies] = useState<any[]>([])
  const [similarLoading, setSimilarLoading] = useState(true)
  const [watchLogged, setWatchLogged] = useState(false)
  const [cardState, setCardState] = useState<'neutral' | 'favorite' | 'completed'>('neutral')
  const [stateLoading, setStateLoading] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const title = sanitizeTitle(movie?.title_ar || movie?.title_en || movie?.title || 'فيلم')
  const titleEn = sanitizeTitle(movie?.title_en || movie?.title)
  const overview = sanitizeOverview(movie?.overview_ar || movie?.overview || 'لا يوجد وصف متاح')
  const year = movie?.release_date ? new Date(movie.release_date).getFullYear() : (movie?.release_year || 'غير محدد')
  const rating = movie?.vote_average ? Math.round(movie.vote_average * 10) / 10 : 0
  const poster = movie?.poster_url || (movie?.poster_path ? `/tmdb/w342${movie.poster_path}` : '')
  const backdrop = movie?.backdrop_url || (movie?.backdrop_path ? `/tmdb/w780${movie.backdrop_path}` : '')
  
  // Analyze backdrop brightness for adaptive overlay
  const overlayConfig = useImageBrightness(backdrop)
  
  const effectiveId = movie?.tmdb_id || movie?.id || 0
  
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

  // Parse keywords from seo_keywords_json
  const keywords = useMemo(() => {
    if (!movie?.seo_keywords_json) return []
    try {
      const keywordsData = typeof movie.seo_keywords_json === 'string' 
        ? JSON.parse(movie.seo_keywords_json) 
        : movie.seo_keywords_json
      return keywordsData || []
    } catch {
      return []
    }
  }, [movie?.seo_keywords_json])

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
  
  // Build YouTube embed URL with quality restriction
  const trailerUrl = useMemo(() => {
    if (!trailerKey) return null
    const params = new URLSearchParams({
      autoplay: '1',
      controls: '1',
      modestbranding: '1',
      rel: '0',
      showinfo: '0',
      fs: '0', // Disable YouTube's fullscreen button
      iv_load_policy: '3',
      vq: 'medium', // Force 480p quality
      disablekb: '1', // Disable keyboard controls to prevent conflicts
      enablejsapi: '1' // Enable JavaScript API for volume control
    })
    return `https://www.youtube.com/embed/${trailerKey}?${params.toString()}`
  }, [trailerKey])
  
  // Sync volume with YouTube iframe
  useEffect(() => {
    if (!iframeRef.current || !isModalOpen) return
    
    const sendVolumeToYouTube = () => {
      const volumeValue = isMuted ? 0 : volume
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'setVolume',
          args: [volumeValue]
        }),
        'https://www.youtube.com'
      )
      
      if (isMuted) {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({
            event: 'command',
            func: 'mute',
            args: []
          }),
          'https://www.youtube.com'
        )
      } else {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({
            event: 'command',
            func: 'unMute',
            args: []
          }),
          'https://www.youtube.com'
        )
      }
    }
    
    // Small delay to ensure iframe is ready
    const timeout = setTimeout(sendVolumeToYouTube, 100)
    return () => clearTimeout(timeout)
  }, [volume, isMuted, isModalOpen])
  
  // Debug: Log values
  console.log('🎬 Movie Debug:', {
    title: movie?.title_ar || movie?.title_en,
    backdrop: movie?.backdrop_path,
    trailerKey,
    trailerUrl
  })

  // Close trailer on scroll
  useEffect(() => {
    if (!isModalOpen) return

    const handleScroll = () => {
      handleCloseTrailer()
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    document.addEventListener('wheel', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('wheel', handleScroll)
    }
  }, [isModalOpen])

  // Fetch similar movies
  useEffect(() => {
    if (!movie?.slug) return
    
    const fetchSimilar = async () => {
      try {
        setSimilarLoading(true)
        const response = await fetch(`/api/movies/${movie.slug}/similar?limit=12`)
        if (response.ok) {
          const data = await response.json()
          setSimilarMovies(data.data || [])
        }
      } catch (error) {
        console.error('Failed to fetch similar movies:', error)
      } finally {
        setSimilarLoading(false)
      }
    }
    
    fetchSimilar()
  }, [movie?.slug])

  // Check card state on mount
  useEffect(() => {
    // Don't fetch if user is not logged in
    if (!user || !movie?.tmdb_id) return
    
    const fetchState = async () => {
      try {
        const res = await fetch('/api/user/card-state', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: [{ content_type: 'movie', tmdb_id: movie.tmdb_id }]
          })
        })
        if (res.ok) {
          const data = await res.json()
          const key = `movie-${movie.tmdb_id}`
          if (data.states && data.states[key]) {
            setCardState(data.states[key])
          }
        }
      } catch {
        // Silent fail - user might not be logged in
      }
    }
    
    fetchState()
  }, [user, movie?.tmdb_id])

  const logWatch = async () => {
    if (watchLogged || !movie?.tmdb_id) return
    
    try {
      await fetch('/api/user/watch-progress', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_type: 'movie',
          tmdb_id: movie.tmdb_id,
          title: movie.title_ar || movie.title_en,
          poster_path: movie.poster_path,
          watch_duration: 0,
          completed: false
        })
      })
      setWatchLogged(true)
    } catch (error) {
      // Silent fail - don't break player
    }
  }

  const handleWatch = () => {
    // Log watch progress, then: pop-under ad first, then open the external
    // player (hosted on 4cima.stream) passing the film's TMDB id.
    const id = Number(effectiveId)
    if (!(Number.isFinite(id) && id > 0)) return
    // user-click popunder — fail-open, never blocks opening the player
    firePopunderOnClick()
    logWatch()
    openWatchWithPlayer({
      type: 'movie',
      id,
      slug: movie?.slug,
      who: user
        ? (user.user_metadata?.name || user.email?.split('@')[0] || '').trim()
        : '',
    })
  }

  // Preload the pop-under URL once so it can fire synchronously on click.
  useEffect(() => {
    preparePopunder()
  }, [])

  const toggleCardState = async () => {
    if (stateLoading || !movie?.tmdb_id) return
    
    setStateLoading(true)
    const prevState = cardState
    
    // Optimistic update
    const nextState = cardState === 'neutral' ? 'favorite' : 
                      cardState === 'favorite' ? 'completed' : 'neutral'
    setCardState(nextState)
    
    try {
      const res = await fetch('/api/user/card-action', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_type: 'movie',
          tmdb_id: movie.tmdb_id,
          title: movie.title_ar || movie.title_en,
          poster_path: movie.poster_path
        })
      })
      
      if (!res.ok) {
        // Revert on error
        setCardState(prevState)
      } else {
        const data = await res.json()
        if (data.newState) {
          setCardState(data.newState)
        }
      }
    } catch {
      setCardState(prevState)
    } finally {
      setStateLoading(false)
    }
  }

  const handleOpenTrailer = () => {
    setIsModalOpen(true)
  }

  const handleCloseTrailer = () => {
    setIsModalOpen(false)
  }

  const toggleFullscreen = () => {
    const modalElement = document.querySelector('.trailer-modal') as HTMLElement
    if (!modalElement) return

    if (!document.fullscreenElement) {
      if (modalElement.requestFullscreen) {
        modalElement.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value)
    setVolume(newVolume)
    if (newVolume === 0) {
      setIsMuted(true)
    } else {
      setIsMuted(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-800 text-white relative overflow-hidden">
      {/* Backdrop with Adaptive Overlay - يغطي الشاشة كاملة من أول بكسل */}
      <div className="absolute inset-0 h-screen">
        {backdrop && (
          <div className="absolute inset-0">
            <img src={backdrop} alt="" className="w-full h-full object-cover object-top opacity-60" loading="eager" fetchPriority="high" />
            {/* Adaptive gradient based on image brightness */}
            <div className={`absolute inset-0 ${overlayConfig.gradient}`} />
            {/* Bottom fade for smooth transition - last 25% fades to background */}
            <div className="absolute inset-x-0 bottom-0 h-[25%] bg-gradient-to-b from-transparent to-zinc-800" />
          </div>
        )}
      </div>

      <div className="relative z-10 page-container pt-24 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
          {/* Right (First in RTL): Poster with badge on corner */}
          <div className="relative">
            <div className="relative rounded-xl overflow-hidden shadow-2xl aspect-[2/3] group">
              {poster && (
                <img src={poster} alt={title} className="w-full h-full object-cover" loading="lazy" />
              )}
            </div>

            {/* Keywords under poster */}
            {keywords.length > 0 && (
              <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl mt-4">
                <h3 className="text-sm font-bold text-purple-400 mb-3">كلمات مفتاحية</h3>
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
              </div>
            )}
          </div>

          {/* Right: Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
              {/* Left side: Title, Info, Genres, Description */}
              <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full text-red-400 text-sm font-bold whitespace-nowrap">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm3 2h6v4H7V5zm8 8v2h1v-2h-1zm-2-2H7v4h6v-4zm2 0h1V9h-1v2zm1-4V5h-1v2h1zM5 5v2H4V5h1zm0 4H4v2h1V9zm-1 4h1v2H4v-2z" clipRule="evenodd" />
                        </svg>
                        فيلم
                      </span>
                      <h1 className="text-xl md:text-2xl font-black text-zinc-100">{title}</h1>
                    </div>
                    {titleEn && titleEn !== title && (
                      <h2 className="text-xl text-zinc-400 mt-2 font-medium tracking-wide text-left">{titleEn}</h2>
                    )}
                  </div>
                </div>

                {/* Watch + favorite row — directly under the titles, above genres */}
                <div className="mb-5">
                  <div className="mx-auto flex w-full max-w-2xl flex-wrap items-stretch justify-center gap-3">
                    <div className="relative flex-1 min-w-[140px] max-w-[260px] group">
                      <div
                        aria-hidden="true"
                        className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-orange-500 opacity-60 blur-lg transition-opacity duration-300 group-hover:opacity-100"
                      />
                      <button
                        type="button"
                        onClick={handleWatch}
                        className="relative flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-orange-500 px-5 py-3 text-white shadow-xl transition-transform duration-200 active:scale-95"
                      >
                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/25 ring-2 ring-white/30">
                          <Play className="ml-0.5 h-5 w-5 fill-current" />
                        </span>
                        <span className="flex flex-col text-right">
                          <span className="text-base sm:text-lg leading-tight font-black">مشاهدة الفيلم</span>
                          <span className="text-xs font-medium leading-tight text-white/85">تشغيل فوري بجودة عالية</span>
                        </span>
                      </button>
                    </div>
                    {user && (
                      <button
                        onClick={toggleCardState}
                        disabled={stateLoading}
                        className={clsx(
                          "group relative flex w-[68px] flex-shrink-0 items-center justify-center self-stretch rounded-xl border border-white/15 bg-zinc-900 text-white shadow-xl transition-transform duration-200 active:scale-95",
                          stateLoading && "opacity-60 cursor-not-allowed"
                        )}
                        title={
                          cardState === 'neutral' ? 'إضافة للمفضلة' :
                          cardState === 'favorite' ? 'نقل لتمت المشاهدة' :
                          'إزالة من تمت المشاهدة'
                        }
                        aria-label={
                          cardState === 'neutral' ? 'إضافة للمفضلة' :
                          cardState === 'favorite' ? 'نقل لتمت المشاهدة' :
                          'إزالة من تمت المشاهدة'
                        }
                      >
                        <span
                          className={clsx(
                            "flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900/80 ring-1 ring-white/20 transition-colors",
                            cardState === 'favorite'
                              ? "text-red-500"
                              : cardState === 'completed'
                              ? "text-green-500"
                              : "text-zinc-400"
                          )}
                        >
                          <Heart className={clsx("h-6 w-6", (cardState === 'favorite' || cardState === 'completed') && "fill-current")} />
                        </span>
                      </button>
                    )}
                  </div>
                </div>

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

                  {/* Year, Runtime, Rating on the left */}
                  {year && (
                    <span className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full text-zinc-200 text-xs">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      {year}
                    </span>
                  )}
                  {movie?.runtime && (
                    <span className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full text-zinc-200 text-xs">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      {Math.floor(movie.runtime / 60)}س {movie.runtime % 60}د
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
                  {/* Trailer Thumbnail with Play Button */}
                  <div className="aspect-video rounded-xl overflow-hidden bg-black/50 border border-white/10 relative group cursor-pointer" onClick={handleOpenTrailer}>
                    {trailerKey && backdrop ? (
                      <>
                        {/* Backdrop Image */}
                        <img src={backdrop} alt={title} className="w-full h-full object-cover" loading="lazy" style={{aspectRatio: '16/9'}} />
                        {/* Play Button Overlay */}
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <div className="relative">
                            <div className="absolute inset-0 bg-red-600/30 blur-3xl"></div>
                            <button className="relative w-20 h-20 rounded-full bg-red-600 group-hover:bg-red-500 group-hover:scale-110 transition-all flex items-center justify-center shadow-2xl">
                              <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="absolute bottom-3 left-3 bg-black/80 px-3 py-1.5 rounded-lg text-white text-sm font-bold">
                          🎬 شاهد التريلر
                        </div>
                      </>
                    ) : backdrop ? (
                      <img src={backdrop} alt={title} className="w-full h-full object-cover" loading="lazy" style={{aspectRatio: '16/9'}} />
                    ) : null}
                  </div>
                </div>

                {/* Trailer Modal */}
                {isModalOpen && trailerUrl && (
                  <div 
                    className="fixed inset-0 z-[100] bg-black flex items-center justify-center trailer-modal"
                    onClick={handleCloseTrailer}
                  >
                    <div 
                      className="relative w-full h-full flex items-center justify-center p-1 sm:p-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* YouTube iframe */}
                      <div 
                        className="w-full h-full max-w-full overflow-hidden relative"
                        style={{aspectRatio: '16/9', maxHeight: '100vh'}}
                      >
                        <iframe
                          ref={iframeRef}
                          src={trailerUrl}
                          className="absolute inset-0 w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          style={{border: 'none'}}
                        />
                        {/* Black overlay on top to hide YouTube title and block clicks - responsive height */}
                        <div className="absolute top-0 left-0 right-0 h-20 sm:h-24 md:h-28 bg-gradient-to-b from-black via-black to-transparent z-[10]" />
                        
                        {/* Black overlay on bottom to hide everything below progress bar - responsive height */}
                        <div className="absolute bottom-0 left-0 right-0 h-12 sm:h-14 md:h-16 bg-black z-[3]" />
                      </div>
                      
                      {/* Close button - right side for Arabic RTL */}
                      <button
                        onClick={handleCloseTrailer}
                        className="absolute bottom-2 sm:bottom-3 md:bottom-4 right-2 sm:right-3 md:right-4 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-red-600 hover:bg-red-700 active:bg-red-800 text-white transition-all flex items-center gap-1.5 sm:gap-2 z-50 shadow-lg text-xs sm:text-sm font-bold"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>إغلاق</span>
                      </button>
                      
                      {/* Volume Control - next to close button, slider appears to the left */}
                      <div 
                        className="absolute bottom-2 sm:bottom-3 md:bottom-4 right-[100px] sm:right-[120px] md:right-[140px] z-50 flex items-center-reverse gap-2"
                        onMouseEnter={() => setShowVolumeSlider(true)}
                        onMouseLeave={() => setShowVolumeSlider(false)}
                        dir="ltr"
                      >
                        {/* Volume Button */}
                        <button
                          onClick={toggleMute}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-all flex items-center justify-center shadow-lg"
                          title={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
                          aria-label={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
                        >
                          {isMuted || volume === 0 ? (
                            // Muted icon
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                            </svg>
                          ) : volume < 50 ? (
                            // Low volume icon
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M7 9v6h4l5 5V4l-5 5H7z"/>
                            </svg>
                          ) : (
                            // High volume icon
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                            </svg>
                          )}
                        </button>
                        
                        {/* Volume Slider - appears on hover to the left */}
                        <div className={`transition-all duration-200 overflow-hidden ${showVolumeSlider ? 'w-24 opacity-100' : 'w-0 opacity-0'}`}>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                            style={{
                              background: `linear-gradient(to right, #fff ${isMuted ? 0 : volume}%, rgba(255,255,255,0.2) ${isMuted ? 0 : volume}%)`
                            }}
                          />
                        </div>
                      </div>
                      
                      {/* Fullscreen button - left side for Arabic RTL */}
                      <button
                        onClick={toggleFullscreen}
                        className="absolute bottom-2 sm:bottom-3 md:bottom-4 left-2 sm:left-3 md:left-4 w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-all flex items-center justify-center z-50 shadow-lg"
                        title="ملء الشاشة"
                        aria-label="ملء الشاشة"
                      >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Cast under trailer/backdrop */}
                {cast.length > 0 && (
                  <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl">
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900 -mx-4 px-4" style={{maxWidth: 'calc(100% + 2rem)'}}>
                      {cast.map((person: any, idx: number) => (
                        <div key={person.tmdb_id || person.id || `cast-${idx}`} className="flex-shrink-0 text-center" style={{width: '31px'}}>
                          <div className="rounded-full overflow-hidden bg-zinc-800 mb-1" style={{width: '31px', height: '31px'}}>
                            {person.profile_path && (
                              <img
                                src={`/tmdb/w45${person.profile_path}`}
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

                {/* Desktop sidebar ad (160×600) — desktop only, hidden on mobile */}
                <div className="hidden lg:flex justify-center pt-4">
                  <AdsManager type="banner" position="details-sidebar" />
                </div>
              </div>
            </div>

            {/* Watch CTA moved under the titles above genres */}
          </div>
        </div>
      </div>

      {/* Ad banner below the player/story (details-below-player) */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-6 flex justify-center">
        <AdsManager type="banner" position="details-below-player" />
      </div>

      {/* Similar Movies Section */}
      {!similarLoading && similarMovies.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
            <Film className="w-6 h-6 text-red-500" />
            قد يعجبك أيضاً
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {similarMovies.map((item: any, i: number) => (
              <MovieCard
                key={item.id}
                movie={{ 
                  ...item, 
                  media_type: 'movie',
                  title: item.title_ar || item.title_en
                }}
                index={i}
              />
            ))}
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
