'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  Film,
  Tv,
  Star,
  Play,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react'
import { Loading } from '@/components/common/Loading'
import { getGenreColor, getMediaTypeColor } from '@/utils/genreColors'
import { sanitizeTitle, sanitizeOverview } from '@/utils/textSanitizer'
import { Footer } from '@/components/layout/Footer'

interface MediaItem {
  id: number
  slug: string
  title: string
  title_ar: string
  title_en: string
  poster_path: string
  backdrop_path: string
  vote_average: number
  overview_ar: string
  year: number
  media_type: 'movie' | 'tv'
  primary_genre: string | null
}

interface HomeData {
  trendingMovies: MediaItem[]
  trendingSeries: MediaItem[]
}

interface HomePageClientProps {
  initialData: HomeData
}

function mapItems(items: any[] | undefined, type: 'movie' | 'tv'): MediaItem[] {
  return (items || []).map((item) => {
    let primaryGenre = null
    try {
      const genres = JSON.parse(item.genres_json || '[]')
      primaryGenre = genres?.[0]?.name_ar || genres?.[0]?.name || null
    } catch (e) {
      // Silent error handling
    }
    
    return {
      id: item.id,
      slug: item.slug,
      title: item.title_ar || item.title_en || item.name_ar || item.name,
      title_ar: item.title_ar || item.name_ar || item.title || item.name,
      title_en: item.title_en || item.name_en || item.title_en,
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      vote_average: Number(item.vote_average) || 0,
      overview_ar: item.overview_ar || item.overview,
      year: item.year || item.release_year || item.first_air_year || item.release_date?.substring(0, 4),
      media_type: item.media_type || type,
      primary_genre: primaryGenre,
    }
  })
}

export function HomePageClient({ initialData }: HomePageClientProps) {
  // State management - Initialize with server data
  const [data, setData] = useState<HomeData>({
    trendingMovies: mapItems(initialData.trendingMovies, 'movie'),
    trendingSeries: mapItems(initialData.trendingSeries, 'tv')
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [heroIndex, setHeroIndex] = useState(0)
  const [heroItems, setHeroItems] = useState<MediaItem[]>([])
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right'>('left')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Lazy loading state
  const [moviesDisplayCount, setMoviesDisplayCount] = useState(25) // نبدأ بـ 25
  const [seriesDisplayCount, setSeriesDisplayCount] = useState(25) // نبدأ بـ 25
  
  // Simple refs for scroll
  const moviesScrollRef = useRef<HTMLDivElement>(null)
  const seriesScrollRef = useRef<HTMLDivElement>(null)
  const moviesEndRef = useRef<HTMLDivElement>(null)
  const seriesEndRef = useRef<HTMLDivElement>(null)
  
  // Drag to scroll state
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [currentScrollRef, setCurrentScrollRef] = useState<HTMLDivElement | null>(null)
  
  // Touch scroll state
  const [isTouching, setIsTouching] = useState(false)
  const [touchStartX, setTouchStartX] = useState(0)
  const [touchScrollLeft, setTouchScrollLeft] = useState(0)
  const [clickDisabled, setClickDisabled] = useState(false)

  // إنشاء قائمة الهيرو من البيانات الأولية
  useEffect(() => {
    if (!data) return
    
    const trendingMovies = data.trendingMovies
    const trendingSeries = data.trendingSeries

    // إنشاء قائمة الهيرو من أول 20 عمل فقط
    const heroList: MediaItem[] = []
    const addedIds = new Set<number>()
    
    const movies2026 = trendingMovies.filter(item => item.year === 2026).slice(0, 10)
    const tvShows2026 = trendingSeries.filter(item => item.year === 2026).slice(0, 10)
    
    const maxItems = Math.max(movies2026.length, tvShows2026.length)
    for (let i = 0; i < maxItems && heroList.length < 10; i++) {
      if (movies2026[i] && !addedIds.has(movies2026[i].id)) {
        heroList.push(movies2026[i])
        addedIds.add(movies2026[i].id)
      }
      if (tvShows2026[i] && !addedIds.has(tvShows2026[i].id) && heroList.length < 10) {
        heroList.push(tvShows2026[i])
        addedIds.add(tvShows2026[i].id)
      }
    }
    
    if (heroList.length < 10) {
      const allMovies = trendingMovies.slice(0, 20)
      const allTvShows = trendingSeries.slice(0, 20)
      
      const maxExtra = Math.max(allMovies.length, allTvShows.length)
      for (let i = 0; i < maxExtra && heroList.length < 10; i++) {
        if (allMovies[i] && !addedIds.has(allMovies[i].id) && heroList.length < 10) {
          heroList.push(allMovies[i])
          addedIds.add(allMovies[i].id)
        }
        if (allTvShows[i] && !addedIds.has(allTvShows[i].id) && heroList.length < 10) {
          heroList.push(allTvShows[i])
          addedIds.add(allTvShows[i].id)
        }
      }
    }
    
    setHeroItems(heroList)
  }, [data])

  // Intersection Observer للـ lazy loading - Movies
  useEffect(() => {
    if (!moviesEndRef.current || !data || moviesDisplayCount >= data.trendingMovies.length) return
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // حمّل 25 عمل إضافية
          setMoviesDisplayCount(prev => Math.min(prev + 25, data.trendingMovies.length))
        }
      },
      {
        root: moviesScrollRef.current,
        rootMargin: '400px',
        threshold: 0
      }
    )
    
    observer.observe(moviesEndRef.current)
    
    return () => observer.disconnect()
  }, [moviesDisplayCount, data])

  // Intersection Observer للـ lazy loading - Series
  useEffect(() => {
    if (!seriesEndRef.current || !data || seriesDisplayCount >= data.trendingSeries.length) return
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // حمّل 25 عمل إضافية
          setSeriesDisplayCount(prev => Math.min(prev + 25, data.trendingSeries.length))
        }
      },
      {
        root: seriesScrollRef.current,
        rootMargin: '400px',
        threshold: 0
      }
    )
    
    observer.observe(seriesEndRef.current)
    
    return () => observer.disconnect()
  }, [seriesDisplayCount, data])

  // دالة لإعادة تشغيل مهلة التبديل التلقائي
  const resetAutoRotate = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    
    intervalRef.current = setInterval(() => {
      setSwipeDirection('left')
      setHeroIndex((prev) => (prev + 1) % heroItems.length)
    }, 7000)
  }, [heroItems.length])

  // تبديل الهيرو تلقائياً كل 7 ثوانٍ (يرمى لليسار)
  useEffect(() => {
    if (heroItems.length === 0) return
    
    resetAutoRotate()

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [heroItems.length, resetAutoRotate])



  const handleHeroChange = useCallback((newIndex: number, direction: 'left' | 'right') => {
    setSwipeDirection(direction)
    setHeroIndex(newIndex)
    resetAutoRotate() // إعادة تشغيل المهلة
  }, [resetAutoRotate])
  
  const retryFetch = useCallback(() => {
    setError(null)
    setLoading(true)
    // Re-trigger fetch by re-mounting (simple approach)
    window.location.reload()
  }, [])

  // Scroll helper functions
  const scrollHorizontal = useCallback((ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (!ref.current) return
    const scrollAmount = 800
    ref.current.scrollBy({
      left: direction === 'right' ? scrollAmount : -scrollAmount,
      behavior: 'smooth'
    })
  }, [])

  // Mouse wheel horizontal scroll
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (moviesScrollRef.current?.contains(e.target as Node)) {
        e.preventDefault()
        moviesScrollRef.current.scrollLeft += e.deltaY
      } else if (seriesScrollRef.current?.contains(e.target as Node)) {
        e.preventDefault()
        seriesScrollRef.current.scrollLeft += e.deltaY
      }
    }

    const moviesEl = moviesScrollRef.current
    const seriesEl = seriesScrollRef.current

    moviesEl?.addEventListener('wheel', handleWheel, { passive: false })
    seriesEl?.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      moviesEl?.removeEventListener('wheel', handleWheel)
      seriesEl?.removeEventListener('wheel', handleWheel)
    }
  }, [])

  // Drag to scroll functionality
  useEffect(() => {
    // منع السلوك الافتراضي لسحب الصور والروابط
    const preventDefaultDrag = (e: DragEvent) => {
      e.preventDefault()
      return false
    }
    
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      let scrollContainer: HTMLDivElement | null = null
      
      if (moviesScrollRef.current?.contains(target)) {
        scrollContainer = moviesScrollRef.current
      } else if (seriesScrollRef.current?.contains(target)) {
        scrollContainer = seriesScrollRef.current
      }
      
      if (scrollContainer) {
        e.preventDefault() // منع السلوك الافتراضي
        setIsDragging(true)
        setCurrentScrollRef(scrollContainer)
        setStartX(e.pageX - scrollContainer.offsetLeft)
        setScrollLeft(scrollContainer.scrollLeft)
        scrollContainer.style.cursor = 'grabbing'
        scrollContainer.style.userSelect = 'none'
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !currentScrollRef) return
      e.preventDefault()
      const x = e.pageX - currentScrollRef.offsetLeft
      const walk = (x - startX) * 2 // سرعة السحب
      currentScrollRef.scrollLeft = scrollLeft - walk
      
      // منع النقر إذا تم السحب
      if (Math.abs(walk) > 5) {
        setClickDisabled(true)
      }
      
      // Trigger scroll event manually
      const scrollEvent = new Event('scroll', { bubbles: true })
      currentScrollRef.dispatchEvent(scrollEvent)
    }

    const handleMouseUp = () => {
      if (currentScrollRef) {
        currentScrollRef.style.cursor = 'grab'
        currentScrollRef.style.userSelect = 'auto'
        
        // Trigger final scroll check
        const scrollEvent = new Event('scroll', { bubbles: true })
        currentScrollRef.dispatchEvent(scrollEvent)
      }
      setIsDragging(false)
      setCurrentScrollRef(null)
      
      // إعادة تفعيل النقر بعد وقت قصير
      setTimeout(() => setClickDisabled(false), 100)
    }

    const handleMouseLeave = () => {
      if (isDragging && currentScrollRef) {
        currentScrollRef.style.cursor = 'grab'
        currentScrollRef.style.userSelect = 'auto'
        setIsDragging(false)
        setCurrentScrollRef(null)
      }
    }

    // إضافة مستمعي الأحداث للـ drag
    const moviesEl = moviesScrollRef.current
    const seriesEl = seriesScrollRef.current
    
    moviesEl?.addEventListener('dragstart', preventDefaultDrag)
    seriesEl?.addEventListener('dragstart', preventDefaultDrag)
    moviesEl?.addEventListener('drop', preventDefaultDrag)
    seriesEl?.addEventListener('drop', preventDefaultDrag)

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      moviesEl?.removeEventListener('dragstart', preventDefaultDrag)
      seriesEl?.removeEventListener('dragstart', preventDefaultDrag)
      moviesEl?.removeEventListener('drop', preventDefaultDrag)
      seriesEl?.removeEventListener('drop', preventDefaultDrag)
      
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [isDragging, startX, scrollLeft, currentScrollRef])

  // Touch scroll functionality for mobile
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as Node
      let scrollContainer: HTMLDivElement | null = null
      
      if (moviesScrollRef.current?.contains(target)) {
        scrollContainer = moviesScrollRef.current
      } else if (seriesScrollRef.current?.contains(target)) {
        scrollContainer = seriesScrollRef.current
      }
      
      if (scrollContainer) {
        setIsTouching(true)
        setCurrentScrollRef(scrollContainer)
        setTouchStartX(e.touches[0].pageX)
        setTouchScrollLeft(scrollContainer.scrollLeft)
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTouching || !currentScrollRef) return
      const x = e.touches[0].pageX
      const walk = (touchStartX - x) * 1.5 // سرعة السحب باللمس
      currentScrollRef.scrollLeft = touchScrollLeft + walk
    }

    const handleTouchEnd = () => {
      setIsTouching(false)
      setCurrentScrollRef(null)
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isTouching, touchStartX, touchScrollLeft, currentScrollRef])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && moviesScrollRef.current?.contains(document.activeElement)) {
        e.preventDefault()
        scrollHorizontal(moviesScrollRef, 'left')
      } else if (e.key === 'ArrowRight' && moviesScrollRef.current?.contains(document.activeElement)) {
        e.preventDefault()
        scrollHorizontal(moviesScrollRef, 'right')
      } else if (e.key === 'ArrowLeft' && seriesScrollRef.current?.contains(document.activeElement)) {
        e.preventDefault()
        scrollHorizontal(seriesScrollRef, 'left')
      } else if (e.key === 'ArrowRight' && seriesScrollRef.current?.contains(document.activeElement)) {
        e.preventDefault()
        scrollHorizontal(seriesScrollRef, 'right')
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [scrollHorizontal])

  const heroItem = heroItems.length > 0 ? heroItems[heroIndex] : null

  if (loading) return <Loading fullScreen text="جاري التحميل..." />
  
  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-200">حدث خطأ أثناء التحميل</h2>
          <p className="text-sm text-slate-400">{error}</p>
          <button
            onClick={retryFetch}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans" dir="rtl">

      {/* 1. Cinema Banner - Full Width Edge-to-Edge */}
      <section className="w-full bg-slate-950">
        <div className="max-w-[1920px] mx-auto px-3 sm:px-5 md:px-8 lg:px-12">
          {/* Cinema Banner Board */}
          <div className="relative bg-slate-950/80 backdrop-blur-sm rounded-lg border-2 border-slate-800 shadow-2xl overflow-hidden h-14 md:h-16">
            {/* Animated Background Image with Film Strip Effect */}
            <div className="absolute inset-0 overflow-hidden">
              {/* Moving Background - Seamless infinite scroll */}
              <div 
                className="absolute inset-0 opacity-40"
                style={{ 
                  backgroundImage: 'url(/banner.png)',
                  backgroundSize: '2000px 100%',
                  backgroundRepeat: 'repeat-x',
                  backgroundPosition: '0 center',
                  animation: 'banner-scroll 40s linear infinite'
                }}
              />
              
              {/* Film Strip Overlay - Horizontal lines with HOLES */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Top film strip holes */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-slate-950/90 flex justify-around items-center px-2">
                  {[...Array(25)].map((_, i) => (
                    <div key={`hole-top-${i}`} className="w-1.5 h-1.5 bg-slate-800 rounded-sm" />
                  ))}
                </div>
                {/* Bottom film strip holes */}
                <div className="absolute bottom-0 left-0 right-0 h-2 bg-slate-950/90 flex justify-around items-center px-2">
                  {[...Array(25)].map((_, i) => (
                    <div key={`hole-bottom-${i}`} className="w-1.5 h-1.5 bg-slate-800 rounded-sm" />
                  ))}
                </div>
              </div>
              
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/30 via-transparent to-slate-950/30" />
            </div>

            {/* Light Bulbs - Left & Right Sides ONLY (Vertical) */}
            <div className="absolute top-0 left-0 w-3 h-full bg-slate-950/95 border-r border-amber-500/40 flex flex-col justify-around py-1 z-10">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={`left-${i}`} 
                  className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_10px_#fbbf24] mx-auto"
                  style={{
                    animation: `pulse-glow 1.5s ease-in-out infinite`,
                    animationDelay: `${i * 0.2}s`
                  }}
                />
              ))}
            </div>
            <div className="absolute top-0 right-0 w-3 h-full bg-slate-950/95 border-l border-amber-500/40 flex flex-col justify-around py-1 z-10">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={`right-${i}`} 
                  className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_10px_#fbbf24] mx-auto"
                  style={{
                    animation: `pulse-glow 1.5s ease-in-out infinite`,
                    animationDelay: `${i * 0.2}s`
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Hero Banner with Frame and Auto-Rotate - Full Width */}
      {heroItem && (
        <section className="w-full bg-slate-950">
          <div className="max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
            <div className="relative w-full h-[70vh] md:h-[80vh] flex items-end overflow-hidden rounded-2xl border-2 border-amber-400/50 bg-slate-950 shadow-2xl shadow-amber-500/30" style={{ boxShadow: '0 0 30px rgba(251, 191, 36, 0.4), inset 0 0 20px rgba(251, 191, 36, 0.1)' }}>
              {/* Meteor Shower Effect - مطر الشهب الملتهب */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl z-50">
                <div className="meteor-shower">
                  <div className="meteor meteor-1"></div>
                  <div className="meteor meteor-2"></div>
                  <div className="meteor meteor-3"></div>
                  <div className="meteor meteor-4"></div>
                  <div className="meteor meteor-5"></div>
                  <div className="meteor meteor-6"></div>
                  <div className="meteor meteor-7"></div>
                  <div className="meteor meteor-8"></div>
                </div>
              </div>
              {/* Backdrop Background with transition */}
              <div
                key={`backdrop-${heroItem.id}`}
                className="absolute inset-0 bg-cover transition-all duration-1000"
                style={{
                  backgroundImage: `url(/tmdb/w780${heroItem.backdrop_path || heroItem.poster_path})`,
                  backgroundPosition: 'center 30%'
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-l from-slate-950/80 via-transparent to-transparent" />

              {/* Hero Content */}
              <div className="relative w-full h-full pt-8 pb-6 md:pb-8 z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 md:px-8">
                <div className="lg:col-span-8 flex flex-col justify-between h-full text-right">
                  
                  {/* Top Section: Badges, Titles, Description */}
                  <div className="space-y-3">
                    {/* Badge row - Fixed at Top */}
                    <div className="flex flex-wrap gap-2 items-center text-xs">
                      {(() => {
                        const mediaColorScheme = getMediaTypeColor(heroItem.media_type)
                        return (
                          <span className={`${mediaColorScheme.bg} ${mediaColorScheme.text} border ${mediaColorScheme.border} font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1.5`}>
                            <span>{mediaColorScheme.icon}</span>
                            <span>{heroItem.media_type === 'movie' ? 'فيلم' : 'مسلسل'}</span>
                          </span>
                        )
                      })()}
                      <span className="bg-slate-900/80 border border-slate-800 px-2 py-0.5 rounded text-slate-300">
                        {heroItem.year}
                      </span>
                      <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-bold flex items-center">
                        <Star className="w-3 h-3 ml-1 fill-amber-400" />{' '}
                        {heroItem.vote_average.toFixed(1)}
                      </span>
                      {heroItem.primary_genre && (
                        <span className={`${getGenreColor(heroItem.primary_genre).bg} ${getGenreColor(heroItem.primary_genre).text} border ${getGenreColor(heroItem.primary_genre).border} px-2 py-0.5 rounded font-bold`}>
                          {heroItem.primary_genre}
                        </span>
                      )}
                    </div>

                    {/* Arabic Title */}
                    <h1 className="text-3xl md:text-5xl font-black text-slate-100 tracking-tight leading-none animate-slideInRight" key={`title-ar-${heroItem.id}`}>
                      {sanitizeTitle(heroItem.title_ar)}
                    </h1>
                    
                    {/* English Title - 35% larger with professional effects and color based on media type */}
                    <div className="relative inline-block" key={`title-en-wrapper-${heroItem.id}`}>
                      <p 
                        className={`text-lg md:text-xl font-bold italic animate-slideInRight relative z-10 ${
                          heroItem.media_type === 'movie' 
                            ? 'text-red-400' 
                            : 'text-blue-400'
                        }`} 
                        style={{ 
                          animationDelay: '0.1s',
                          textShadow: heroItem.media_type === 'movie'
                            ? '0 0 20px rgba(248, 113, 113, 0.6), 0 0 40px rgba(248, 113, 113, 0.3), 0 2px 4px rgba(0, 0, 0, 0.8)'
                            : '0 0 20px rgba(96, 165, 250, 0.6), 0 0 40px rgba(96, 165, 250, 0.3), 0 2px 4px rgba(0, 0, 0, 0.8)',
                          letterSpacing: '0.02em'
                        }}
                        key={`title-en-${heroItem.id}`}
                      >
                        {sanitizeTitle(heroItem.title_en)}
                      </p>
                      {/* Glow effect background */}
                      <div 
                        className={`absolute inset-0 blur-xl opacity-30 ${
                          heroItem.media_type === 'movie' 
                            ? 'bg-red-500' 
                            : 'bg-blue-500'
                        }`}
                        style={{ zIndex: 0 }}
                      />
                    </div>

                    {/* Description with Limited Width */}
                    <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-sm line-clamp-7" style={{ animationDelay: '0.2s' }}>
                      {sanitizeOverview(heroItem.overview_ar)}
                    </p>
                  </div>

                  {/* Bottom Section: Buttons */}
                  <div className="space-y-4">
                    {/* Action Button */}
                    <div className="animate-fadeIn" style={{ animationDelay: '0.3s' }}>
                      <Link
                        href={`${
                          heroItem.media_type === 'movie'
                            ? `/movies/${heroItem.slug}`
                            : `/series/${heroItem.slug}`
                        }`}
                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-slate-950 font-black rounded-xl transition shadow-lg shadow-red-950/30"
                      >
                        <Play className="w-5 h-5 ml-2 fill-slate-950" /> شاهد العمل الآن
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Animated Poster Thumbnail with Swipe Gesture */}
                <div className="hidden lg:block lg:col-span-4 pl-8">
                  <div 
                    className="relative w-64 aspect-[2/3] cursor-grab active:cursor-grabbing select-none translate-y-2 hover:animate-wiggle"
                    onMouseDown={(e) => {
                      const startX = e.clientX
                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        const diffX = moveEvent.clientX - startX
                        if (Math.abs(diffX) > 50) {
                          if (diffX > 0) {
                            // سحب لليمين - العمل السابق - يرمى لليمين
                            const newIndex = (heroIndex - 1 + heroItems.length) % heroItems.length
                            handleHeroChange(newIndex, 'right')
                          } else {
                            // سحب لليسار - العمل التالي - يرمى لليسار
                            const newIndex = (heroIndex + 1) % heroItems.length
                            handleHeroChange(newIndex, 'left')
                          }
                          document.removeEventListener('mousemove', handleMouseMove)
                          document.removeEventListener('mouseup', handleMouseUp)
                        }
                      }
                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove)
                        document.removeEventListener('mouseup', handleMouseUp)
                      }
                      document.addEventListener('mousemove', handleMouseMove)
                      document.addEventListener('mouseup', handleMouseUp)
                    }}
                    onTouchStart={(e) => {
                      const startX = e.touches[0].clientX
                      const handleTouchMove = (moveEvent: TouchEvent) => {
                        const diffX = moveEvent.touches[0].clientX - startX
                        if (Math.abs(diffX) > 50) {
                          if (diffX > 0) {
                            const newIndex = (heroIndex - 1 + heroItems.length) % heroItems.length
                            handleHeroChange(newIndex, 'right')
                          } else {
                            const newIndex = (heroIndex + 1) % heroItems.length
                            handleHeroChange(newIndex, 'left')
                          }
                          document.removeEventListener('touchmove', handleTouchMove)
                          document.removeEventListener('touchend', handleTouchEnd)
                        }
                      }
                      const handleTouchEnd = () => {
                        document.removeEventListener('touchmove', handleTouchMove)
                        document.removeEventListener('touchend', handleTouchEnd)
                      }
                      document.addEventListener('touchmove', handleTouchMove)
                      document.addEventListener('touchend', handleTouchEnd)
                    }}
                  >
                    {heroItems.map((item, idx) => {
                      const isActive = idx === heroIndex
                      const isPrevious = idx === (heroIndex - 1 + heroItems.length) % heroItems.length
                      
                      return (
                        <div
                          key={`hero-${idx}-${item.id}`}
                          className={`absolute inset-0 w-full h-full rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl transition-all duration-700 ${
                            isActive
                              ? swipeDirection === 'left'
                                ? 'opacity-100 rotate-2 z-10 animate-cardEnterFromRight'
                                : 'opacity-100 rotate-2 z-10 animate-cardEnterFromLeft'
                              : isPrevious && swipeDirection === 'left'
                              ? 'opacity-0 -translate-x-32 -translate-y-8 rotate-[-15deg] scale-90 z-0 animate-cardThrowLeft'
                              : isPrevious && swipeDirection === 'right'
                              ? 'opacity-0 translate-x-32 translate-y-8 rotate-[15deg] scale-90 z-0 animate-cardThrowRight'
                              : 'opacity-0 scale-95 z-0'
                          }`}
                        >
                          <img
                            src={`/tmdb/w300${item.poster_path}`}
                            alt={item.title_ar}
                            className="w-full h-full object-cover pointer-events-none"
                            draggable="false"
                          />
                          
                          {/* Shimmer Effect on Active Card */}
                          {isActive && (
                            <div className="absolute inset-0 pointer-events-none">
                              <div 
                                className="absolute -inset-full"
                                style={{
                                  background: 'linear-gradient(110deg, transparent 0%, transparent 40%, rgba(255,255,255,0.5) 50%, transparent 60%, transparent 100%)',
                                  animation: 'shimmer 4s ease-in-out infinite'
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. Trending Content Sections */}
      <section className="w-full bg-slate-950">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8 space-y-12">
          
          {/* Trending Movies Section */}
          {data && data.trendingMovies.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl md:text-3xl font-black text-slate-100 flex items-center gap-3">
                  <Film className="w-7 h-7 text-red-500" />
                  <span>الأفلام الرائجة</span>
                </h2>
                <div className="flex items-center gap-2">
                  {/* Navigation Arrows */}
                  <div className="hidden md:flex items-center gap-2">
                    <button
                      onClick={() => scrollHorizontal(moviesScrollRef, 'right')}
                      className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/60 transition-all hover:scale-110"
                      aria-label="Scroll right"
                    >
                      <ArrowLeft className="w-5 h-5 text-slate-300 rotate-180" />
                    </button>
                    <button
                      onClick={() => scrollHorizontal(moviesScrollRef, 'left')}
                      className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/60 transition-all hover:scale-110"
                      aria-label="Scroll left"
                    >
                      <ArrowLeft className="w-5 h-5 text-slate-300" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div 
                ref={moviesScrollRef}
                className="horizontal-scroll -mx-4 px-4 cursor-grab active:cursor-grabbing"
                tabIndex={0}
                style={{ userSelect: 'none' }}
              >
                <div className="flex gap-4 pb-4" style={{ width: 'max-content' }}>
                  {data.trendingMovies.slice(0, moviesDisplayCount).map((item) => (
                    <Link
                      href={`/movies/${item.slug}`}
                      key={`movie-${item.id}`}
                      className="group flex-shrink-0 w-40 sm:w-48"
                      onClick={(e) => {
                        if (clickDisabled) {
                          e.preventDefault()
                        }
                      }}
                    >
                      <div className="bg-slate-900/20 border border-slate-800/60 hover:border-slate-700/80 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-slate-950/50 relative">
                        {/* Poster with Overlay Badges */}
                        <div className="aspect-[2/3] w-full relative overflow-hidden bg-slate-950">
                          {item.poster_path ? (
                            <img
                              src={`/tmdb/w185${item.poster_path}`}
                              alt={item.title_ar}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 p-4 text-center">
                              <Film className="w-8 h-8 text-slate-700 mb-2" />
                              <span className="text-[10px] text-slate-500">{item.title_ar}</span>
                            </div>
                          )}
                          
                          {/* Dark gradient on hover */}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          
                          {/* Top Right - Media Type Badge */}
                          {(() => {
                            const mediaColorScheme = getMediaTypeColor(item.media_type)
                            return (
                              <div className="absolute top-2 right-2 z-20">
                                <span className={`${mediaColorScheme.bg} ${mediaColorScheme.text} border ${mediaColorScheme.border} px-2 py-1 rounded-lg text-[9px] font-bold backdrop-blur-md shadow-lg`}>
                                  {mediaColorScheme.label}
                                </span>
                              </div>
                            )
                          })()}
                          
                          {/* Top Left - Rating Badge */}
                          {item.vote_average > 0 && (
                            <div className="absolute top-2 left-2 z-20">
                              <span className="flex items-center gap-1 bg-slate-900 text-yellow-400 border border-yellow-500/40 px-2 py-1 rounded-lg backdrop-blur-md shadow-lg">
                                <Star className="w-[11px] h-[11px] fill-yellow-400 shrink-0" />
                                <span className="text-[9px] font-bold">{item.vote_average.toFixed(1)}</span>
                              </span>
                            </div>
                          )}
                          
                          {/* Bottom Right - Genre Badge */}
                          {item.primary_genre && (() => {
                            const genreColorScheme = getGenreColor(item.primary_genre)
                            return (
                              <div className="absolute bottom-2 right-2 z-20">
                                <span className={`${genreColorScheme.bg} ${genreColorScheme.text} border ${genreColorScheme.border} px-2 py-1 rounded-lg text-[9px] font-bold backdrop-blur-md shadow-lg`}>
                                  {item.primary_genre}
                                </span>
                              </div>
                            )
                          })()}
                          
                          {/* Bottom Left - Year Badge */}
                          {item.year && (() => {
                            const y = Number(item.year)
                            const currentYear = new Date().getFullYear()
                            
                            let yearStyle = ''
                            if (y === currentYear) {
                              yearStyle = 'bg-purple-500 text-white border border-purple-400 shadow-lg shadow-purple-500/50 animate-pulse'
                            } else if (y >= 2020 && y <= 2025) {
                              yearStyle = 'bg-blue-600 text-white border border-blue-500 shadow-md'
                            } else if (y >= 2010 && y <= 2019) {
                              yearStyle = 'bg-cyan-600 text-white border border-cyan-500 shadow-md'
                            } else if (y >= 2000 && y <= 2009) {
                              yearStyle = 'bg-slate-100 text-slate-900 border border-slate-200 shadow-md font-bold'
                            } else {
                              yearStyle = 'bg-slate-700 text-slate-300 border border-slate-600'
                            }
                            
                            return (
                              <div className="absolute bottom-2 left-2 z-20">
                                <span className={`px-2 py-1 rounded-lg text-[9px] font-bold backdrop-blur-md shadow-lg ${yearStyle}`}>
                                  {item.year}
                                </span>
                              </div>
                            )
                          })()}
                          
                          {/* Play Hover Button - Center */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30">
                            <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                              <Play className="w-5 h-5 text-white fill-white mr-0.5" />
                            </div>
                          </div>
                        </div>
                        
                        {/* Title Section - Reduced Height */}
                        <div className="p-2.5 h-[52px] flex flex-col justify-center relative overflow-hidden">
                          <h3 className="text-[13px] font-bold text-slate-200 line-clamp-1 group-hover:text-amber-400 transition leading-tight">
                            {sanitizeTitle(item.title_ar)}
                          </h3>
                          {item.title_en && (
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-1 leading-tight">
                              {item.title_en}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                  
                  {/* Sentinel for lazy loading */}
                  {moviesDisplayCount < data.trendingMovies.length && (
                    <div ref={moviesEndRef} className="flex-shrink-0 w-10" />
                  )}
                  
                  {/* CTA Card - اذهب لقسم الأفلام */}
                  <Link
                    href="/movies"
                    className="group flex-shrink-0 w-40 sm:w-48"
                  >
                    <div className="bg-gradient-to-br from-red-600/20 to-amber-600/20 border-2 border-red-500/40 hover:border-red-400 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-red-950/50 relative h-full">
                      <div className="aspect-[2/3] w-full relative overflow-hidden flex items-center justify-center p-6">
                        <div className="text-center space-y-4">
                          <Film className="w-16 h-16 text-red-400 mx-auto animate-pulse" />
                          <div>
                            <h3 className="text-lg font-black text-red-400 mb-2">اذهب لقسم الأفلام</h3>
                            <p className="text-xs text-slate-300">اكتشف المزيد من الأفلام الرائعة</p>
                          </div>
                          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-600/30 border border-red-500/50 rounded-lg text-sm font-bold text-red-300 group-hover:bg-red-600/50 transition-colors">
                            <span>عرض الكل</span>
                            <ArrowLeft className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Trending Series Section */}
          {data && data.trendingSeries.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl md:text-3xl font-black text-slate-100 flex items-center gap-3">
                  <Tv className="w-7 h-7 text-blue-500" />
                  <span>المسلسلات الرائجة</span>
                </h2>
                <div className="flex items-center gap-2">
                  {/* Navigation Arrows */}
                  <div className="hidden md:flex items-center gap-2">
                    <button
                      onClick={() => scrollHorizontal(seriesScrollRef, 'right')}
                      className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/60 transition-all hover:scale-110"
                      aria-label="Scroll right"
                    >
                      <ArrowLeft className="w-5 h-5 text-slate-300 rotate-180" />
                    </button>
                    <button
                      onClick={() => scrollHorizontal(seriesScrollRef, 'left')}
                      className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/60 transition-all hover:scale-110"
                      aria-label="Scroll left"
                    >
                      <ArrowLeft className="w-5 h-5 text-slate-300" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div 
                ref={seriesScrollRef}
                className="horizontal-scroll -mx-4 px-4 cursor-grab active:cursor-grabbing"
                tabIndex={0}
                style={{ userSelect: 'none' }}
              >
                <div className="flex gap-4 pb-4" style={{ width: 'max-content' }}>
                  {data.trendingSeries.slice(0, seriesDisplayCount).map((item) => (
                    <Link
                      href={`/series/${item.slug}`}
                      key={`series-${item.id}`}
                      className="group flex-shrink-0 w-40 sm:w-48"
                      onClick={(e) => {
                        if (clickDisabled) {
                          e.preventDefault()
                        }
                      }}
                    >
                      <div className="bg-slate-900/20 border border-slate-800/60 hover:border-slate-700/80 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-slate-950/50 relative">
                        {/* Poster with Overlay Badges */}
                        <div className="aspect-[2/3] w-full relative overflow-hidden bg-slate-950">
                          {item.poster_path ? (
                            <img
                              src={`/tmdb/w185${item.poster_path}`}
                              alt={item.title_ar}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 p-4 text-center">
                              <Tv className="w-8 h-8 text-slate-700 mb-2" />
                              <span className="text-[10px] text-slate-500">{item.title_ar}</span>
                            </div>
                          )}
                          
                          {/* Dark gradient on hover */}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          
                          {/* Top Right - Media Type Badge */}
                          {(() => {
                            const mediaColorScheme = getMediaTypeColor(item.media_type)
                            return (
                              <div className="absolute top-2 right-2 z-20">
                                <span className={`${mediaColorScheme.bg} ${mediaColorScheme.text} border ${mediaColorScheme.border} px-2 py-1 rounded-lg text-[9px] font-bold backdrop-blur-md shadow-lg`}>
                                  {mediaColorScheme.label}
                                </span>
                              </div>
                            )
                          })()}
                          
                          {/* Top Left - Rating Badge */}
                          {item.vote_average > 0 && (
                            <div className="absolute top-2 left-2 z-20">
                              <span className="flex items-center gap-1 bg-slate-900 text-yellow-400 border border-yellow-500/40 px-2 py-1 rounded-lg backdrop-blur-md shadow-lg">
                                <Star className="w-[11px] h-[11px] fill-yellow-400 shrink-0" />
                                <span className="text-[9px] font-bold">{item.vote_average.toFixed(1)}</span>
                              </span>
                            </div>
                          )}
                          
                          {/* Bottom Right - Genre Badge */}
                          {item.primary_genre && (() => {
                            const genreColorScheme = getGenreColor(item.primary_genre)
                            return (
                              <div className="absolute bottom-2 right-2 z-20">
                                <span className={`${genreColorScheme.bg} ${genreColorScheme.text} border ${genreColorScheme.border} px-2 py-1 rounded-lg text-[9px] font-bold backdrop-blur-md shadow-lg`}>
                                  {item.primary_genre}
                                </span>
                              </div>
                            )
                          })()}
                          
                          {/* Bottom Left - Year Badge */}
                          {item.year && (() => {
                            const y = Number(item.year)
                            const currentYear = new Date().getFullYear()
                            
                            let yearStyle = ''
                            if (y === currentYear) {
                              yearStyle = 'bg-purple-500 text-white border border-purple-400 shadow-lg shadow-purple-500/50 animate-pulse'
                            } else if (y >= 2020 && y <= 2025) {
                              yearStyle = 'bg-blue-600 text-white border border-blue-500 shadow-md'
                            } else if (y >= 2010 && y <= 2019) {
                              yearStyle = 'bg-cyan-600 text-white border border-cyan-500 shadow-md'
                            } else if (y >= 2000 && y <= 2009) {
                              yearStyle = 'bg-slate-100 text-slate-900 border border-slate-200 shadow-md font-bold'
                            } else {
                              yearStyle = 'bg-slate-700 text-slate-300 border border-slate-600'
                            }
                            
                            return (
                              <div className="absolute bottom-2 left-2 z-20">
                                <span className={`px-2 py-1 rounded-lg text-[9px] font-bold backdrop-blur-md shadow-lg ${yearStyle}`}>
                                  {item.year}
                                </span>
                              </div>
                            )
                          })()}
                          
                          {/* Play Hover Button - Center */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30">
                            <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                              <Play className="w-5 h-5 text-white fill-white mr-0.5" />
                            </div>
                          </div>
                        </div>
                        
                        {/* Title Section - Reduced Height */}
                        <div className="p-2.5 h-[52px] flex flex-col justify-center relative overflow-hidden">
                          <h3 className="text-[13px] font-bold text-slate-200 line-clamp-1 group-hover:text-amber-400 transition leading-tight">
                            {sanitizeTitle(item.title_ar)}
                          </h3>
                          {item.title_en && (
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-1 leading-tight">
                              {item.title_en}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                  
                  {/* Sentinel for lazy loading */}
                  {seriesDisplayCount < data.trendingSeries.length && (
                    <div ref={seriesEndRef} className="flex-shrink-0 w-10" />
                  )}
                  
                  {/* CTA Card - اذهب لقسم المسلسلات */}
                  <Link
                    href="/series"
                    className="group flex-shrink-0 w-40 sm:w-48"
                  >
                    <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-2 border-blue-500/40 hover:border-blue-400 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-blue-950/50 relative h-full">
                      <div className="aspect-[2/3] w-full relative overflow-hidden flex items-center justify-center p-6">
                        <div className="text-center space-y-4">
                          <Tv className="w-16 h-16 text-blue-400 mx-auto animate-pulse" />
                          <div>
                            <h3 className="text-lg font-black text-blue-400 mb-2">اذهب لقسم المسلسلات</h3>
                            <p className="text-xs text-slate-300">اكتشف المزيد من المسلسلات الرائعة</p>
                          </div>
                          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/30 border border-blue-500/50 rounded-lg text-sm font-bold text-blue-300 group-hover:bg-blue-600/50 transition-colors">
                            <span>عرض الكل</span>
                            <ArrowLeft className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* CTA Buttons Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">
            {/* Movies CTA */}
            <Link
              href="/movies"
              className="group relative overflow-hidden bg-gradient-to-br from-red-600/20 to-amber-600/20 border-2 border-red-500/30 hover:border-red-500/60 rounded-2xl p-8 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-red-950/50"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center justify-between">
                <div className="space-y-2">
                  <div className="w-14 h-14 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Film className="w-7 h-7 text-red-400" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-100">شاهد كل الأفلام</h3>
                  <p className="text-sm text-slate-400">استكشف مكتبة الأفلام الكاملة</p>
                </div>
                <ArrowLeft className="w-8 h-8 text-red-400 group-hover:translate-x-[-8px] transition-transform" />
              </div>
            </Link>

            {/* Series CTA */}
            <Link
              href="/series"
              className="group relative overflow-hidden bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border-2 border-blue-500/30 hover:border-blue-500/60 rounded-2xl p-8 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-950/50"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center justify-between">
                <div className="space-y-2">
                  <div className="w-14 h-14 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Tv className="w-7 h-7 text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-100">شاهد كل المسلسلات</h3>
                  <p className="text-sm text-slate-400">استكشف مكتبة المسلسلات الكاملة</p>
                </div>
                <ArrowLeft className="w-8 h-8 text-blue-400 group-hover:translate-x-[-8px] transition-transform" />
              </div>
            </Link>
          </div>

        </div>
      </section>

      {/* Footer Component */}
      <Footer />
    </div>
  )
}
