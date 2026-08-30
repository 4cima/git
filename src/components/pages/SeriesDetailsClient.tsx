'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Star, Clock, Calendar, Tv, Heart, Play, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import Link from 'next/link'
import { getGenreColor } from '@/utils/genreColors'
import { sanitizeTitle, sanitizeOverview } from '@/utils/textSanitizer'
import { Footer } from '../layout/Footer'
import { useImageBrightness } from '@/utils/imageAnalysis'
import { MovieCard } from '@/components/features/media/MovieCard'
import { useAuth } from '@/hooks/useAuth'
import { prefetchWatchAd, openWatchWithPlayer } from '@/lib/openWatch'
import { firePopunderOnClick } from '@/components/features/system/adsClick'

interface SeriesDetailsClientProps {
  series: any
  seasons: any[]
}

export const SeriesDetailsClient = ({ series, seasons }: SeriesDetailsClientProps) => {
  const { user } = useAuth() // Check if user is logged in
  const [selectedSeason, setSelectedSeason] = useState<number>(
    seasons.find((s: any) => s.season_number > 0)?.season_number || 1
  )
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1)
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
  const [watchLogged, setWatchLogged] = useState(false)
  const [cardState, setCardState] = useState<'neutral' | 'favorite' | 'completed'>('neutral')
  const [stateLoading, setStateLoading] = useState(false)
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

  // Check card state on mount
  useEffect(() => {
    // Don't fetch if user is not logged in
    if (!user || !series?.tmdb_id) return
    
    const fetchState = async () => {
      try {
        const res = await fetch('/api/user/card-state', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: [{ content_type: 'tv', tmdb_id: series.tmdb_id }]
          })
        })
        if (res.ok) {
          const data = await res.json()
          const key = `tv-${series.tmdb_id}`
          if (data.states && data.states[key]) {
            setCardState(data.states[key])
          }
        }
      } catch {
        // Silent fail - user might not be logged in
      }
    }
    
    fetchState()
  }, [user, series?.tmdb_id])

  // Reset watch log when episode changes
  useEffect(() => {
    setWatchLogged(false)
  }, [selectedSeason, selectedEpisode])

  const logWatch = async () => {
    if (watchLogged || !series?.tmdb_id) return
    
    try {
      await fetch('/api/user/watch-progress', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_type: 'tv',
          tmdb_id: series.tmdb_id,
          title: series.name_ar || series.name_en,
          poster_path: series.poster_path,
          season_number: selectedSeason,
          episode_number: selectedEpisode,
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
    // player (hosted on 4cima.stream) passing series id + season/episode.
    const id = Number(series?.tmdb_id)
    if (!(Number.isFinite(id) && id > 0)) return
    // user-click popunder — fail-open, never blocks opening the player
    firePopunderOnClick()
    logWatch()
    openWatchWithPlayer({
      type: 'tv',
      id,
      slug: series?.slug,
      season: selectedSeason,
      episode: selectedEpisode,
      who: user
        ? (user.user_metadata?.name || user.email?.split('@')[0] || '').trim()
        : '',
    })
  }
  // Preload the pop-under URL once so it can fire synchronously on click.
  useEffect(() => {
    prefetchWatchAd()
  }, [])

  const toggleCardState = async () => {
    if (stateLoading || !series?.tmdb_id) return
    
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
          content_type: 'tv',
          tmdb_id: series.tmdb_id,
          title: series.name_ar || series.name_en,
          poster_path: series.poster_path
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
                      <span className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full text-cyan-400 text-sm font-bold whitespace-nowrap">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                        </svg>
                        مسلسل
                      </span>
                      <h1 className="text-xl md:text-2xl font-black text-zinc-100">{title}</h1>
                    </div>
                    {titleEn && titleEn !== title && (
                      <h2 className="text-xl text-zinc-400 mt-2 font-medium tracking-wide text-left">{titleEn}</h2>
                    )}
                  </div>
                </div>

                {/* Watch + favorite + season/episode dropdowns — directly under the titles, above genres */}
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
                          <span className="text-base sm:text-lg leading-tight font-black">مشاهدة المسلسل</span>
                          <span className="text-xs font-medium leading-tight text-white/85">الموسم {selectedSeason} - الحلقة {selectedEpisode}</span>
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
                    {seasons.length > 0 && (
                      <div className="relative h-16 flex-1 min-w-[110px] max-w-[150px]">
                        <select
                          value={selectedSeason}
                          onChange={(e) => setSelectedSeason(Number(e.target.value))}
                          aria-label="اختر الموسم"
                          className="h-full w-full cursor-pointer appearance-none rounded-xl border border-white/15 bg-zinc-900 pr-4 pl-9 text-sm font-bold text-white shadow-xl transition-colors duration-200 hover:border-white/30 focus:outline-none"
                        >
                          {seasons
                            .filter((s: any) => s.season_number > 0)
                            .map((season: any, idx: number) => (
                              <option
                                key={season.id || `season-${season.season_number}-${idx}`}
                                value={season.season_number}
                                className="bg-zinc-900 text-white"
                              >
                                الموسم {season.season_number}
                              </option>
                            ))}
                        </select>
                        <ChevronDown aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                      </div>
                    )}
                    <div className="relative h-16 flex-1 min-w-[110px] max-w-[150px]">
                      <select
                        value={selectedEpisode}
                        onChange={(e) => setSelectedEpisode(Number(e.target.value))}
                        aria-label="اختر الحلقة"
                        className="h-full w-full cursor-pointer appearance-none rounded-xl border border-white/15 bg-zinc-900 pr-4 pl-9 text-sm font-bold text-white shadow-xl transition-colors duration-200 hover:border-white/30 focus:outline-none"
                      >
                        {episodes.map((ep) => (
                          <option key={ep} value={ep} className="bg-zinc-900 text-white">
                            حلقة {ep}
                          </option>
                        ))}
                      </select>
                      <ChevronDown aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    </div>
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

            {/* Seasons/episodes selection moved to dropdowns in the action row. */}

            {/* Watch CTA moved under the titles above genres */}
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
            {similarSeries.map((item: any, i: number) => (
              <MovieCard
                key={item.id}
                movie={{
                  ...item,
                  media_type: 'tv',
                  title_ar: item.name_ar,
                  title_en: item.name_en,
                  name: item.name_ar || item.name_en
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
