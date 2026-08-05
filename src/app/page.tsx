'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import {
  Film,
  Tv,
  Search,
  Star,
  Play,
  Database,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
  Info,
  ShieldCheck,
  BadgeCheck,
  Heart,
} from 'lucide-react'
import { Loading } from '@/components/common/Loading'
import { getGenreColor, getMediaTypeColor } from '@/utils/genreColors'
import { sanitizeTitle, sanitizeOverview } from '@/utils/textSanitizer'
import { Footer } from '@/components/layout/Footer'

// Genres constant - خارج الكومبوننت لتحسين الأداء
const GENRES = [
  { name: 'دراما', emoji: '🎭', color: 'purple' },
  { name: 'كوميديا', emoji: '😂', color: 'yellow' },
  { name: 'أكشن', emoji: '🔥', color: 'red' },
  { name: 'إثارة', emoji: '⚡', color: 'orange' },
  { name: 'رومانسي', emoji: '💕', color: 'pink' },
  { name: 'خيال علمي', emoji: '🚀', color: 'cyan' },
  { name: 'رعب', emoji: '👻', color: 'gray' },
  { name: 'جريمة', emoji: '🕵️', color: 'rose' },
  { name: 'مغامرة', emoji: '🗡️', color: 'emerald' },
  { name: 'رسوم متحركة', emoji: '🎨', color: 'blue' },
  { name: 'عائلي', emoji: '🎪', color: 'green' },
  { name: 'فانتازيا', emoji: '🧙', color: 'indigo' },
  { name: 'حرب', emoji: '⚔️', color: 'slate' }
] as const

// Color classes mapping - لتجنب dynamic class generation
const COLOR_CLASSES: Record<string, { active: string; inactive: string }> = {
  purple: {
    active: 'bg-purple-600 text-white border-2 border-purple-500',
    inactive: 'bg-purple-600/10 hover:bg-purple-600/20 border border-purple-600/30 hover:border-purple-600/50 text-purple-400 hover:text-purple-300'
  },
  yellow: {
    active: 'bg-yellow-600 text-white border-2 border-yellow-500',
    inactive: 'bg-yellow-600/10 hover:bg-yellow-600/20 border border-yellow-600/30 hover:border-yellow-600/50 text-yellow-400 hover:text-yellow-300'
  },
  red: {
    active: 'bg-red-600 text-white border-2 border-red-500',
    inactive: 'bg-red-600/10 hover:bg-red-600/20 border border-red-600/30 hover:border-red-600/50 text-red-400 hover:text-red-300'
  },
  orange: {
    active: 'bg-orange-600 text-white border-2 border-orange-500',
    inactive: 'bg-orange-600/10 hover:bg-orange-600/20 border border-orange-600/30 hover:border-orange-600/50 text-orange-400 hover:text-orange-300'
  },
  pink: {
    active: 'bg-pink-600 text-white border-2 border-pink-500',
    inactive: 'bg-pink-600/10 hover:bg-pink-600/20 border border-pink-600/30 hover:border-pink-600/50 text-pink-400 hover:text-pink-300'
  },
  cyan: {
    active: 'bg-cyan-600 text-white border-2 border-cyan-500',
    inactive: 'bg-cyan-600/10 hover:bg-cyan-600/20 border border-cyan-600/30 hover:border-cyan-600/50 text-cyan-400 hover:text-cyan-300'
  },
  gray: {
    active: 'bg-gray-600 text-white border-2 border-gray-500',
    inactive: 'bg-gray-600/10 hover:bg-gray-600/20 border border-gray-600/30 hover:border-gray-600/50 text-gray-400 hover:text-gray-300'
  },
  rose: {
    active: 'bg-rose-900 text-white border-2 border-rose-800',
    inactive: 'bg-rose-900/10 hover:bg-rose-900/20 border border-rose-900/30 hover:border-rose-900/50 text-rose-400 hover:text-rose-300'
  },
  emerald: {
    active: 'bg-emerald-600 text-white border-2 border-emerald-500',
    inactive: 'bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/30 hover:border-emerald-600/50 text-emerald-400 hover:text-emerald-300'
  },
  blue: {
    active: 'bg-blue-600 text-white border-2 border-blue-500',
    inactive: 'bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/30 hover:border-blue-600/50 text-blue-400 hover:text-blue-300'
  },
  green: {
    active: 'bg-green-600 text-white border-2 border-green-500',
    inactive: 'bg-green-600/10 hover:bg-green-600/20 border border-green-600/30 hover:border-green-600/50 text-green-400 hover:text-green-300'
  },
  indigo: {
    active: 'bg-indigo-600 text-white border-2 border-indigo-500',
    inactive: 'bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-600/30 hover:border-indigo-600/50 text-indigo-400 hover:text-indigo-300'
  },
  slate: {
    active: 'bg-slate-600 text-white border-2 border-slate-500',
    inactive: 'bg-slate-600/10 hover:bg-slate-600/20 border border-slate-600/30 hover:border-slate-600/50 text-slate-400 hover:text-slate-300'
  }
}

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
      year: item.year || item.release_date?.substring(0, 4),
      media_type: item.media_type || type,
      primary_genre: primaryGenre,
    }
  })
}

export default function Home() {
  const [data, setData] = useState<HomeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'movie' | 'tv'>('all')
  const [selectedGenre, setSelectedGenre] = useState<string>('all') // التصنيف المحدد
  const [heroIndex, setHeroIndex] = useState(0)
  const [heroItems, setHeroItems] = useState<MediaItem[]>([])
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right'>('left')
  const [hoveredItemSlug, setHoveredItemSlug] = useState<string | null>(null)
  const [itemsToShow, setItemsToShow] = useState(60) // Dynamic based on screen
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Calculate items to show based on screen width
  // Target: 10 rows on home page
  useEffect(() => {
    const calculateItemsToShow = () => {
      const width = window.innerWidth
      let columns = 2 // default mobile
      
      if (width >= 1536) columns = 8      // 2xl: 8 columns
      else if (width >= 1280) columns = 7 // xl: 7 columns  
      else if (width >= 1024) columns = 6 // lg: 6 columns
      else if (width >= 768) columns = 5  // md: 5 columns
      else if (width >= 640) columns = 4  // sm: 4 columns
      else if (width >= 480) columns = 3  // xs: 3 columns
      else columns = 2                    // mobile: 2 columns
      
      const ROWS_ON_HOME = 10
      setItemsToShow(columns * ROWS_ON_HOME)
    }

    calculateItemsToShow()
    
    // Debounced resize handler
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
      resizeTimeoutRef.current = setTimeout(calculateItemsToShow, 150)
    }
    
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
    }
  }, [])

  // جلب البيانات من API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/home')
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        }
        
        const json = await res.json()

        const trendingMovies = mapItems(json.trendingMovies, 'movie')
        const trendingSeries = mapItems(json.trendingSeries, 'tv')

        setData({
          trendingMovies,
          trendingSeries
        })

        // إنشاء قائمة الهيرو: 5 أفلام + 5 مسلسلات بالتناوب
        const heroList: MediaItem[] = []
        const addedIds = new Set<number>() // لتتبع الأعمال المضافة ومنع التكرار
        
        // فلترة الأفلام والمسلسلات لتكون من سنة 2026 فقط
        const movies2026 = trendingMovies.filter(item => item.year === 2026).slice(0, 10)
        const tvShows2026 = trendingSeries.filter(item => item.year === 2026).slice(0, 10)
        
        // التناوب بين الأفلام والمسلسلات من 2026
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
        
        // إذا لم نجد أعمال كافية من 2026، نضيف من باقي الأعمال
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
      } catch (error) {
        console.error('Error fetching home data:', error)
        setError(error instanceof Error ? error.message : 'فشل تحميل البيانات')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // دالة لإعادة تشغيل مهلة التبديل التلقائي
  const resetAutoRotate = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    
    intervalRef.current = setInterval(() => {
      setSwipeDirection('left')
      setHeroIndex((prev) => (prev + 1) % heroItems.length)
    }, 5000)
  }, [heroItems.length])

  // تبديل الهيرو تلقائياً كل 5 ثوانٍ (يرمى لليسار)
  useEffect(() => {
    if (heroItems.length === 0) return
    
    resetAutoRotate()

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [heroItems.length, resetAutoRotate])

  const handleToggleWatchlist = useCallback((e: React.MouseEvent, id: number) => {
    e.preventDefault()
    e.stopPropagation()
    // Removed watchlist functionality
  }, [])

  const handleHeroChange = useCallback((newIndex: number, direction: 'left' | 'right') => {
    setSwipeDirection(direction)
    setHeroIndex(newIndex)
    resetAutoRotate() // إعادة تشغيل المهلة
  }, [])
  
  const retryFetch = useCallback(() => {
    setError(null)
    setLoading(true)
    // Re-trigger fetch by re-mounting (simple approach)
    window.location.reload()
  }, [])

  // دمج البيانات وترتيبها
  const allContent = useMemo(() => 
    data ? [...(data.trendingMovies || []), ...(data.trendingSeries || [])] : []
  , [data])

  // تصفية البيانات
  const filteredContent = useMemo(() => allContent.filter((item) => {
    // فلتر حسب النوع (أفلام/مسلسلات)
    if (activeTab !== 'all' && item.media_type !== activeTab) return false
    
    // فلتر حسب التصنيف
    if (selectedGenre !== 'all' && item.primary_genre !== selectedGenre) return false
    
    // فلتر حسب البحث
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase()
      const matchTitle =
        (item.title_ar?.toLowerCase() || '').includes(q) ||
        (item.title_en?.toLowerCase() || '').includes(q)
      const matchOverview = (item.overview_ar?.toLowerCase() || '').includes(q)
      if (!matchTitle && !matchOverview) return false
    }
    return true
  }), [allContent, activeTab, selectedGenre, searchQuery])

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
        <div className="max-w-[1920px] mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
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
      {heroItem && searchQuery === '' && (
        <section className="w-full bg-slate-950">
          <div className="max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
            <div className="relative w-full h-[70vh] md:h-[80vh] flex items-end overflow-hidden rounded-2xl border-2 border-slate-800 bg-slate-950 shadow-2xl">
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
                className="absolute inset-0 bg-cover transition-all duration-1000 scale-105 animate-fadeIn"
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
                          <span className={`${mediaColorScheme.bg} ${mediaColorScheme.text} border ${mediaColorScheme.border} font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider animate-fadeIn flex items-center gap-1.5`}>
                            <span>{mediaColorScheme.icon}</span>
                            <span>{heroItem.media_type === 'movie' ? 'فيلم' : 'مسلسل'}</span>
                          </span>
                        )
                      })()}
                      <span className="bg-slate-900/80 border border-slate-800 px-2 py-0.5 rounded text-slate-300 animate-fadeIn">
                        {heroItem.year}
                      </span>
                      <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-bold flex items-center animate-fadeIn">
                        <Star className="w-3 h-3 ml-1 fill-amber-400" />{' '}
                        {heroItem.vote_average.toFixed(1)}
                      </span>
                      {heroItem.primary_genre && (
                        <span className={`${getGenreColor(heroItem.primary_genre).bg} ${getGenreColor(heroItem.primary_genre).text} border ${getGenreColor(heroItem.primary_genre).border} px-2 py-0.5 rounded font-bold animate-fadeIn`}>
                          {heroItem.primary_genre}
                        </span>
                      )}
                    </div>

                    {/* Arabic Title */}
                    <h1 className="text-3xl md:text-5xl font-black text-slate-100 tracking-tight leading-none animate-slideInRight" key={`title-ar-${heroItem.id}`}>
                      {sanitizeTitle(heroItem.title_ar)}
                    </h1>
                    
                    {/* English Title */}
                    <p className="text-sm text-slate-400 italic animate-slideInRight" style={{ animationDelay: '0.1s' }} key={`title-en-${heroItem.id}`}>
                      {sanitizeTitle(heroItem.title_en)}
                    </p>

                    {/* Description with Limited Width */}
                    <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-sm line-clamp-7 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
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
                                ? 'opacity-100 scale-105 rotate-2 z-10 animate-cardEnterFromRight'
                                : 'opacity-100 scale-105 rotate-2 z-10 animate-cardEnterFromLeft'
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

      {/* 3. Main Catalog Section - Contained Width */}
      <section className="w-full bg-slate-950">
        <div className="max-w-[1920px] mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4 space-y-0">
        {/* Search and Filters Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-4">
          {/* Navigation tabs */}
          <div className="flex space-x-2 space-x-reverse bg-slate-900/60 border border-slate-800 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg font-bold text-xs transition ${
                activeTab === 'all'
                  ? 'bg-red-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setActiveTab('movie')}
              className={`px-4 py-2 rounded-lg font-bold text-xs transition flex items-center ${
                activeTab === 'movie'
                  ? 'bg-red-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Film className="w-3.5 h-3.5 ml-1.5" /> الأفلام
            </button>
            <button
              onClick={() => setActiveTab('tv')}
              className={`px-4 py-2 rounded-lg font-bold text-xs transition flex items-center ${
                activeTab === 'tv'
                  ? 'bg-red-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Tv className="w-3.5 h-3.5 ml-1.5" /> المسلسلات
            </button>
          </div>

          {/* Search Box */}
          <div className="relative max-w-md w-full">
            <input
              type="text"
              placeholder="ابحث عن الأفلام أو المسلسلات بالاسم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-3 pr-10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 text-xs"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          </div>
        </div>

        {/* Popular Genres - Quick Access */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 mt-0">
          <div className="flex flex-wrap gap-2 items-center">
            {/* زر كل التصنيفات */}
            <button
              onClick={() => setSelectedGenre('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 ${
                selectedGenre === 'all'
                  ? 'bg-amber-600 text-white border-2 border-amber-500'
                  : 'bg-amber-600/10 hover:bg-amber-600/20 border border-amber-600/30 hover:border-amber-600/50 text-amber-400 hover:text-amber-300'
              }`}
            >
              الكل
            </button>
            
            {/* أزرار التصنيفات */}
            {GENRES.map((genre) => (
              <button
                key={genre.name}
                onClick={() => setSelectedGenre(genre.name)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 ${
                  selectedGenre === genre.name
                    ? COLOR_CLASSES[genre.color].active
                    : COLOR_CLASSES[genre.color].inactive
                }`}
              >
                {genre.emoji} {genre.name}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Grid of Content Cards */}
        {filteredContent.length > 0 ? (
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-6 mt-6">
            {filteredContent.slice(0, itemsToShow).map((item) => {
              return (
                <Link
                  href={`${
                    item.media_type === 'movie'
                      ? `/movies/${item.slug}`
                      : `/series/${item.slug}`
                  }`}
                  key={`${item.media_type}-${item.id}`}
                  className="group bg-slate-900/20 border border-slate-800/60 hover:border-slate-700/80 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-slate-950/50 relative"
                  onMouseEnter={() => setHoveredItemSlug(item.slug)}
                  onMouseLeave={() => setHoveredItemSlug(null)}
                >
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
                        <span className="text-[10px] text-slate-500">
                          {item.title_ar}
                        </span>
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
                        // Current year - Purple neon glow
                        yearStyle = 'bg-purple-500 text-white border border-purple-400 shadow-lg shadow-purple-500/50 animate-pulse'
                      } else if (y >= 2020 && y <= 2025) {
                        // 2020-2025 - Blue
                        yearStyle = 'bg-blue-600 text-white border border-blue-500 shadow-md'
                      } else if (y >= 2010 && y <= 2019) {
                        // 2010-2019 - Cyan
                        yearStyle = 'bg-cyan-600 text-white border border-cyan-500 shadow-md'
                      } else if (y >= 2000 && y <= 2009) {
                        // 2000-2009 - White/Silver
                        yearStyle = 'bg-slate-100 text-slate-900 border border-slate-200 shadow-md font-bold'
                      } else {
                        // Before 2000 - Dim gray (classic)
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
                    {/* Titles - Hidden on hover */}
                    <div className={`transition-opacity duration-200 ${item.slug === hoveredItemSlug ? 'opacity-0' : 'opacity-100'}`}>
                      <h3 className="text-[13px] font-bold text-slate-200 line-clamp-1 group-hover:text-amber-400 transition leading-tight">
                        {sanitizeTitle(item.title_ar)}
                      </h3>
                      {item.title_en && (
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-1 leading-tight">
                          {item.title_en}
                        </p>
                      )}
                    </div>

                    {/* Overview on hover - replaces titles */}
                    {item.slug === hoveredItemSlug && (
                      <div className="absolute inset-0 p-2.5 flex items-center">
                        <p className="text-[9px] text-slate-300 line-clamp-3 leading-relaxed">
                          {item.overview_ar || 'لا يوجد وصف متاح'}
                        </p>
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-20 bg-slate-900/20 border border-slate-900 rounded-3xl p-8 max-w-2xl mx-auto space-y-6">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto border border-amber-500/20">
              <Database className="w-8 h-8 text-amber-400" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-200">قاعدة البيانات المحلية فارغة حالياً 🍿</h3>
              <p className="text-slate-400 text-xs leading-relaxed max-w-md mx-auto">
                أهلاً بك في موقع <strong className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-500">فور سيما</strong> لمشاهدة الأفلام والمسلسلات. يرجى تهيئة وتعبئة قاعدة البيانات بالبيانات التجريبية أو سحب عمل من TMDB للبدء الفوري!
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/admin"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-amber-500 via-amber-600 to-red-600 hover:from-amber-400 hover:to-red-500 text-slate-950 font-black rounded-xl transition text-xs shadow-lg shadow-amber-950/20"
              >
                <Database className="w-4 h-4 ml-2" /> اذهب لتعبئة قاعدة البيانات فورياً
              </Link>
            </div>
          </div>
        )}
        </div>
      </section>

      {/* Footer Component */}
      <Footer />
    </div>
  )
}
