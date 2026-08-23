'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Star, Clock, Calendar, AlertTriangle, Tv } from 'lucide-react'
import clsx from 'clsx'
import Link from 'next/link'
import { EmbedPlayer } from '../features/media/EmbedPlayer'
import { useServers } from '../../hooks/useServers'
import { getGenreColor } from '@/utils/genreColors'
import { sanitizeTitle, sanitizeOverview } from '@/utils/textSanitizer'
import { Footer } from '../layout/Footer'
import { useImageBrightness } from '@/utils/imageAnalysis'

interface SeriesDetailsClientProps {
  series: any
  seasons: any[]
}

export const SeriesDetailsClient = ({ series, seasons }: SeriesDetailsClientProps) => {
  const [selectedSeason, setSelectedSeason] = useState<number>(
    seasons.find((s: any) => s.season_number > 0)?.season_number || 1
  )
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1)
  const [cinemaMode, setCinemaMode] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [player, setPlayer] = useState<any>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playingTrailer, setPlayingTrailer] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [similarSeries, setSimilarSeries] = useState<any[]>([])
  const [similarLoading, setSimilarLoading] = useState(true)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(100)
  const [isMuted, setIsMuted] = useState(false)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const playerRef = useRef<HTMLDivElement>(null)
  const progressInterval = useRef<NodeJS.Timeout | null>(null)

  const title = sanitizeTitle(series?.name_ar || series?.name || series?.original_name || 'مسلسل')
  const titleEn = sanitizeTitle(series?.name_en || series?.name || series?.original_name)
  const overview = sanitizeOverview(series?.overview_ar || series?.overview || 'لا يوجد وصف متاح')
  const year = series?.first_air_date ? new Date(series.first_air_date).getFullYear() : 'غير محدد'
  const rating = series?.vote_average ? Math.round(series.vote_average * 10) / 10 : 0
  const poster = series?.poster_url || (series?.poster_path ? `/tmdb/w342${series.poster_path}` : '')
  const backdrop = series?.backdrop_url || (series?.backdrop_path ? `/tmdb/w780${series.backdrop_path}` : '')
  
  // Analyze backdrop brightness for adaptive overlay
  const overlayConfig = useImageBrightness(backdrop)
  
  // Parse episode runtime (can be array or single value)
  const episodeRuntime = useMemo(() => {
    if (!series?.episode_run_time) return null
    try {
      // If it's a JSON string array
      if (typeof series.episode_run_time === 'string') {
        const parsed = JSON.parse(series.episode_run_time)
        return Array.isArray(parsed) ? parsed[0] : parsed
      }
      // If it's already an array
      if (Array.isArray(series.episode_run_time)) {
        return series.episode_run_time[0]
      }
      // If it's a number
      return series.episode_run_time
    } catch {
      return null
    }
  }, [series?.episode_run_time])
  
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

  // Parse keywords from seo_keywords_json
  const keywords = useMemo(() => {
    if (!series?.seo_keywords_json) return []
    try {
      const keywordsData = typeof series.seo_keywords_json === 'string' 
        ? JSON.parse(series.seo_keywords_json) 
        : series.seo_keywords_json
      return keywordsData || []
    } catch {
      return []
    }
  }, [series?.seo_keywords_json])

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
      disablekb: '1' // Disable keyboard controls to prevent conflicts
    })
    return `https://www.youtube.com/embed/${trailerKey}?${params.toString()}`
  }, [trailerKey])
  
  // Debug: Log values
  console.log('🎬 Series Debug:', {
    title: series?.name_ar || series?.name,
    backdrop: series?.backdrop_path,
    trailerKey
  })

  // Load YouTube IFrame API
  useEffect(() => {
    if (!trailerKey) return

    // Check if API already loaded
    if ((window as any).YT && (window as any).YT.Player) {
      return // Don't init player yet, wait for modal
    }

    // Load YouTube IFrame API
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
    }
  }, [trailerKey])

  // Init player when modal opens
  useEffect(() => {
    if (!isModalOpen || !trailerKey || player) return

    const initPlayer = () => {
      if (!playerRef.current) return
      
      const newPlayer = new (window as any).YT.Player(playerRef.current, {
        height: '100%',
        width: '100%',
        videoId: trailerKey,
        playerVars: {
          autoplay: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          playsinline: 1,
          start: 5,
          autohide: 1,
          enablejsapi: 1,
          cc_load_policy: 0
        },
        events: {
          onStateChange: (event: any) => {
            console.log('Player state changed:', event.data)
            const isNowPlaying = event.data === 1
            setIsPlaying(isNowPlaying)
            
            if (isNowPlaying) { // Playing
              console.log('Video is playing, starting progress tracking')
              startProgressTracking()
            } else {
              console.log('Video paused/stopped, stopping progress tracking')
              stopProgressTracking()
            }
          },
          onReady: (event: any) => {
            console.log('Player ready')
            const dur = event.target.getDuration()
            console.log('Duration on ready:', dur)
            setDuration(dur)
            
            // Start playing
            event.target.playVideo()
            setIsPlaying(true)
            
            // Force start progress tracking after a delay
            setTimeout(() => {
              console.log('Force starting progress tracking after delay')
              startProgressTracking()
            }, 1000)
          }
        }
      })
      setPlayer(newPlayer)
    }

    // Wait for API to load
    if ((window as any).YT && (window as any).YT.Player) {
      setTimeout(initPlayer, 100)
    } else {
      ;(window as any).onYouTubeIframeAPIReady = () => {
        setTimeout(initPlayer, 100)
      }
    }
  }, [isModalOpen, trailerKey])

  useEffect(() => {
    return () => {
      if (player && player.destroy) {
        player.destroy()
        setPlayer(null)
      }
    }
  }, [player])

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

  // Fetch similar series
  useEffect(() => {
    if (!series?.slug) return
    
    const fetchSimilar = async () => {
      try {
        setSimilarLoading(true)
        const response = await fetch(`/api/tv/${series.slug}/similar?limit=12`)
        if (response.ok) {
          const data = await response.json()
          setSimilarSeries(data.data || [])
        }
      } catch (error) {
        console.error('Failed to fetch similar series:', error)
      } finally {
        setSimilarLoading(false)
      }
    }
    
    fetchSimilar()
  }, [series?.slug])

  const handlePlayPause = () => {
    if (!player) return
    
    try {
      const playerState = player.getPlayerState()
      
      if (playerState === 1) { // Playing
        player.pauseVideo()
        setIsPlaying(false)
      } else { // Paused or other
        player.playVideo()
        setIsPlaying(true)
        setPlayingTrailer(true)
      }
    } catch (err) {
      console.error('Play/Pause error:', err)
      // Fallback
      if (isPlaying) {
        player.pauseVideo()
        setIsPlaying(false)
      } else {
        player.playVideo()
        setIsPlaying(true)
        setPlayingTrailer(true)
      }
    }
  }

  const startProgressTracking = () => {
    if (progressInterval.current) clearInterval(progressInterval.current)
    progressInterval.current = setInterval(() => {
      if (player && typeof player.getCurrentTime === 'function' && typeof player.getDuration === 'function') {
        try {
          const current = player.getCurrentTime()
          const total = player.getDuration()
          if (current !== undefined && total !== undefined && total > 0) {
            setCurrentTime(current)
            setProgress((current / total) * 100)
            if (!duration || duration === 0) {
              setDuration(total)
            }
            console.log('Progress update:', {current, total, progress: (current/total)*100})
          }
        } catch (err) {
          console.error('Progress tracking error:', err)
        }
      }
    }, 1000)
  }

  const stopProgressTracking = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current)
      progressInterval.current = null
    }
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!player) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * duration
    player.seekTo(newTime, true)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value)
    setVolume(newVolume)
    if (player) {
      player.setVolume(newVolume)
      if (newVolume === 0) {
        setIsMuted(true)
      } else {
        setIsMuted(false)
      }
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const toggleFullscreen = async () => {
    const modalElement = document.querySelector('.trailer-modal') as HTMLElement
    if (!modalElement) return

    try {
      if (!document.fullscreenElement) {
        // Request fullscreen with different browser methods
        if (modalElement.requestFullscreen) {
          await modalElement.requestFullscreen()
        } else if ((modalElement as any).webkitRequestFullscreen) {
          await (modalElement as any).webkitRequestFullscreen()
        } else if ((modalElement as any).mozRequestFullScreen) {
          await (modalElement as any).mozRequestFullScreen()
        } else if ((modalElement as any).msRequestFullscreen) {
          await (modalElement as any).msRequestFullscreen()
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen()
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen()
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen()
        }
      }
    } catch (err) {
      console.error('Fullscreen error:', err)
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const handleVideoClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    handlePlayPause()
  }

  const handleVideoDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFullscreen()
  }

  const handleOpenTrailer = () => {
    setIsModalOpen(true)
  }

  const handleCloseTrailer = () => {
    stopProgressTracking()
    if (player && player.destroy) {
      player.destroy()
      setPlayer(null)
    }
    setIsModalOpen(false)
    setPlayingTrailer(false)
    setIsPlaying(false)
    setProgress(0)
  }

  // Get episodes for selected season
  const currentSeason = seasons.find((s: any) => s.season_number === selectedSeason)
  const episodeCount = currentSeason?.episode_count || 1
  const episodes = Array.from({ length: episodeCount }, (_, i) => i + 1)

  return (
    <div className="min-h-screen bg-zinc-800 text-white relative overflow-hidden">
      {/* Backdrop with Adaptive Overlay */}
      <div className="absolute top-0 left-0 right-0 h-[70vh]">
        {backdrop && (
          <div className="absolute inset-0">
            <img src={backdrop} alt="" className="w-full h-full object-cover object-top opacity-60" loading="eager" fetchPriority="high" style={{aspectRatio: '16/9'}} />
            {/* Adaptive gradient based on image brightness */}
            <div className={`absolute inset-0 ${overlayConfig.gradient}`} />
            {/* Bottom fade for smooth transition - last 25% fades to background */}
            <div className="absolute inset-x-0 bottom-0 h-[25%] bg-gradient-to-b from-transparent to-zinc-800" />
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
            {/* Series Badge - Above poster, aligned to right edge, same level as title */}
            <div className="flex items-center justify-end mb-4 -mt-14">
              <span className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 px-4 py-2 rounded-full text-cyan-400 text-base font-bold shadow-lg whitespace-nowrap">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
                مسلسل
              </span>
            </div>
            
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
          </motion.div>

          {/* Right: Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
              {/* Left side: Title, Info, Genres, Description */}
              <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl">
                <h1 className="text-xl md:text-2xl font-black mb-2 text-zinc-100">{title}</h1>
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
                  
                  {/* Year, Episode Runtime, Rating on the left */}
                  {year && (
                    <span className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full text-zinc-200 text-xs">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      {year}
                    </span>
                  )}
                  {episodeRuntime && (
                    <span className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full text-zinc-200 text-xs">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      {episodeRuntime}د
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
                        <img src={backdrop} alt={title} className="w-full h-full object-cover" loading="lazy" />
                        {/* Play Button Overlay */}
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <div className="relative">
                            <div className="absolute inset-0 bg-red-600/30 blur-3xl animate-pulse"></div>
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
                      <img src={backdrop} alt={title} className="w-full h-full object-cover" loading="lazy" />
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
                      
                      {/* Close button - on top of bottom black overlay - responsive size and position */}
                      <button
                        onClick={handleCloseTrailer}
                        className="absolute bottom-2 sm:bottom-3 md:bottom-4 left-2 sm:left-3 md:left-4 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-red-600 hover:bg-red-700 active:bg-red-800 text-white transition-all flex items-center gap-1.5 sm:gap-2 z-50 shadow-lg text-xs sm:text-sm font-bold"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>إغلاق</span>
                      </button>
                      
                      {/* Fullscreen button - left side (swapped with close) */}
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
                      
                      {/* Volume Control - right side with slider */}
                      <div 
                        className="absolute bottom-2 sm:bottom-3 md:bottom-4 right-2 sm:right-3 md:right-4 z-50 flex items-center gap-2"
                        onMouseEnter={() => setShowVolumeSlider(true)}
                        onMouseLeave={() => setShowVolumeSlider(false)}
                      >
                        {/* Volume Slider - appears on hover */}
                        <div className={`transition-all duration-200 ${showVolumeSlider ? 'w-24 opacity-100' : 'w-0 opacity-0'} overflow-hidden`}>
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
                      </div>

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
              </div>
            </div>

            {/* Season Selector with Container */}
            {seasons.length > 0 && (
              <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl">
                <h3 className="text-lg font-bold text-purple-500 flex items-center gap-2 mb-3">
                  <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
                  المواسم
                  <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {seasons
                    .filter((s: any) => s.season_number > 0)
                    .map((season: any, idx: number) => (
                      <button
                        key={season.id || `season-${season.season_number}-${idx}`}
                        onClick={() => setSelectedSeason(season.season_number)}
                        className={clsx(
                          'px-2.5 py-1.5 rounded-lg transition-all duration-300 font-medium',
                          selectedSeason === season.season_number
                            ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-105'
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        )}
                      >
                        <div className="text-[9px] font-bold leading-tight">الموسم</div>
                        <div className="text-sm font-black leading-tight">{season.season_number}</div>
                        <div className="text-[8px] font-semibold opacity-90 leading-tight">{season.episode_count} حلقة</div>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Episodes with Container */}
            <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl">
              <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2 mb-3">
                <span className="w-1 h-6 bg-cyan-400 rounded-full"></span>
                الحلقات
                <span className="w-1 h-6 bg-cyan-400 rounded-full"></span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {episodes.map((ep) => (
                  <button
                    key={ep}
                    onClick={() => setSelectedEpisode(ep)}
                    className={clsx(
                      'min-w-[50px] px-2.5 py-1.5 rounded-lg transition-all duration-300 flex flex-col items-center justify-center',
                      selectedEpisode === ep
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-105'
                        : 'bg-white/10 hover:bg-white/20 hover:scale-105'
                    )}
                  >
                    <div className="text-[9px] opacity-90 font-medium leading-tight">حلقة</div>
                    <div className="text-sm font-black leading-tight">{ep}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Player with Side Servers */}
            <div className="flex gap-4">
              {/* Servers Sidebar */}
              <div className="flex-shrink-0 w-14">
                <h3 className="text-xs font-black mb-2 text-center text-white">السيرفرات</h3>
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
                          "flex items-center justify-center w-14 h-10 rounded-lg border transition-all duration-300 font-black text-base leading-none",
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

      {/* Similar Series Section */}
      {!similarLoading && similarSeries.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
            <Tv className="w-6 h-6 text-blue-500" />
            قد يعجبك أيضاً
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {similarSeries.map((item: any) => (
              <Link
                key={item.id}
                href={`/series/${item.slug}`}
                className="group relative"
              >
                <div className="aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 transition-all">
                  {item.poster_path ? (
                    <img
                      src={`/tmdb/w185${item.poster_path}`}
                      alt={item.name_ar || item.name_en}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Tv className="w-12 h-12 text-zinc-700" />
                    </div>
                  )}
                  {item.vote_average > 0 && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/80 px-2 py-1 rounded">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-xs font-bold text-white">{item.vote_average.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <h3 className="mt-2 text-sm font-bold text-white line-clamp-2 group-hover:text-blue-400 transition-colors">
                  {item.name_ar || item.name_en}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
