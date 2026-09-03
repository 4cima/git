'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import {
  Film,
  Tv,
  Star,
  Play,
  ArrowLeft,
  Heart,
} from 'lucide-react'
import { getGenreColor, getMediaTypeColor } from '@/utils/genreColors'
import { sanitizeTitle, sanitizeOverview } from '@/utils/textSanitizer'
import { Footer } from '@/components/layout/Footer'
import { AdsterraBanner } from '@/components/features/system/AdsterraBanner'
import { getAdByNum } from '@/data/ads/4cima.com'

/* الإعلانات المرجعية للصفحة الرئيسية — أرقام ثابتة من ملف بيانات 4cima.com:
   1 = 728×90 تحت الهيرو | 2 = 300×250 بين زر الأفلام وزر المسلسلات | 3 = 160×600 العمود الشمال وحيدًا
   (إعلان رقم 5 انتقل لصفوف الرائج في HomeTrendingSections) */
const AD_UNDER_HERO = getAdByNum(1)!
const AD_CTA = getAdByNum(2)!
const AD_SIDE = getAdByNum(3)!
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/hooks/useAuth'

// Trending sections are chunk-split via next/dynamic to keep them off the very
// first render's critical-path bundle, but they are server-rendered (ssr:true)
// and stable-height placeholders are shown while the chunk hydrates so the page
// does not shift (CLS) when the content arrives.
import dynamic from 'next/dynamic'
import type { HomeTrendingSectionsProps } from './HomeTrendingSections'

function TrendingSectionsLoading() {
  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <div className="w-40 h-7 bg-lumen-muted animate-pulse rounded-md" />
        <div className="horizontal-scroll -mx-4 px-4 overflow-hidden">
          <div className="flex gap-4 pb-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                key={i}
                variant="card"
                aspectRatio="2/3"
                className="w-40 sm:w-48 shrink-0"
              />
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="w-40 h-7 bg-lumen-muted animate-pulse rounded-md" />
        <div className="horizontal-scroll -mx-4 px-4 overflow-hidden">
          <div className="flex gap-4 pb-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                key={i}
                variant="card"
                aspectRatio="2/3"
                className="w-40 sm:w-48 shrink-0"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const HomeTrendingSections = dynamic<HomeTrendingSectionsProps>(
  () => import('./HomeTrendingSections').then((m) => m.HomeTrendingSections),
  {
    ssr: true,
    loading: () => <TrendingSectionsLoading />,
  }
)

interface MediaItem {
  id: number
  tmdb_id?: number
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

type CardState = 'neutral' | 'favorite' | 'completed'

interface HomeData {
  trendingMovies: MediaItem[]
  trendingSeries: MediaItem[]
  topRatedMovies?: MediaItem[]
  topRatedSeries?: MediaItem[]
  action?: MediaItem[]
  drama?: MediaItem[]
  sciFi?: MediaItem[]
  anime?: MediaItem[]
  crime?: MediaItem[]
  arabicMovies?: MediaItem[]
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
    
    // Extract year from various possible fields
    let year = item.year || item.release_year || item.first_air_year
    if (!year && item.release_date && typeof item.release_date === 'string' && /^\d{4}/.test(item.release_date)) {
      year = parseInt(item.release_date.substring(0, 4), 10)
    }
    if (!year && item.first_air_date && typeof item.first_air_date === 'string' && /^\d{4}/.test(item.first_air_date)) {
      year = parseInt(item.first_air_date.substring(0, 4), 10)
    }
    
    return {
      id: item.id,
      tmdb_id: item.tmdb_id && Number(item.tmdb_id) > 0 ? Number(item.tmdb_id) : undefined,
      slug: item.slug,
      title: item.title_ar || item.title_en || item.name_ar || item.name,
      title_ar: item.title_ar || item.name_ar || item.title || item.name,
      title_en: item.title_en || item.name_en || item.title_en,
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      vote_average: Number(item.vote_average) || 0,
      overview_ar: item.overview_ar || item.overview,
      year: year,
      media_type: item.media_type === 'movie' ? 'movie' : item.media_type === 'tv' ? 'tv' : type,
      primary_genre: primaryGenre,
    }
  })
}

export function HomePageClient({ initialData }: HomePageClientProps) {
  const { user } = useAuth() // Check if user is logged in

  // البيانات موحّدة عبر mapItems — useMemo لأنها لا تتغير بعد الاستلام أبداً
  // (كانت useState مع setPlayer لا يُستدعى — كود ميت)
  const data = useMemo<HomeData>(() => ({
    trendingMovies: mapItems(initialData.trendingMovies, 'movie'),
    trendingSeries: mapItems(initialData.trendingSeries, 'tv'),
    topRatedMovies: mapItems(initialData.topRatedMovies, 'movie'),
    topRatedSeries: mapItems(initialData.topRatedSeries, 'tv'),
    action: mapItems(initialData.action, 'movie'),
    drama: mapItems(initialData.drama, 'movie'),
    sciFi: mapItems(initialData.sciFi, 'tv'),
    anime: mapItems(initialData.anime, 'tv'),
    crime: mapItems(initialData.crime, 'movie'),
    arabicMovies: mapItems(initialData.arabicMovies, 'movie')
  }), [initialData])

  const [heroIndex, setHeroIndex] = useState(0)
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right'>('left')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Lazy loading state
  const [moviesDisplayCount, setMoviesDisplayCount] = useState(25) // نبدأ بـ 25
  const [seriesDisplayCount, setSeriesDisplayCount] = useState(25) // نبدأ بـ 25

  // Card states for hearts
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({})
  const [stateLoading, setStateLoading] = useState<Record<string, boolean>>({})

  // إنشاء قائمة الهيرو — useMemo ليُرسم الهيرو من أول Render على السيرفر
  // (كان useState+useEffect → الهيرو لا يظهر إلا بعد الـhydration = تأخير LCP)
  const heroItems = useMemo<MediaItem[]>(() => {
    if (!data) return []

    const trendingMovies = data.trendingMovies
    const trendingSeries = data.trendingSeries

    // إنشاء قائمة الهيرو من أول 20 عمل فقط
    const heroList: MediaItem[] = []
    const addedIds = new Set<number>()

    // السنة الحالية ديناميكياً — لا سنوات مكتوبة يدوياً (كانت 2026 ثابتة!)
    const currentYear = new Date().getFullYear()
    const currentYearMovies = trendingMovies.filter(item => item.year === currentYear).slice(0, 10)
    const currentYearTv = trendingSeries.filter(item => item.year === currentYear).slice(0, 10)

    const maxItems = Math.max(currentYearMovies.length, currentYearTv.length)
    for (let i = 0; i < maxItems && heroList.length < 10; i++) {
      if (currentYearMovies[i] && !addedIds.has(currentYearMovies[i].id)) {
        heroList.push(currentYearMovies[i])
        addedIds.add(currentYearMovies[i].id)
      }
      if (currentYearTv[i] && !addedIds.has(currentYearTv[i].id) && heroList.length < 10) {
        heroList.push(currentYearTv[i])
        addedIds.add(currentYearTv[i].id)
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

    return heroList
  }, [data])


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

  // سحب الخلفية/المساحة الفارغة لتغيير عمل الهيرو (ماوس) — يُتجاهل على عناصر المعلومات والمربع الملحوظ بـ data-hero-no-swipe
  const beginHeroMouseSwipe = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('[data-hero-no-swipe]')) return
    // منع تحديد النص فقط عند بدء السحب من المساحة الفارغة — النصوص تبقى قابلة للتحديد والنسخ
    e.preventDefault()

    const startX = e.clientX
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diffX = moveEvent.clientX - startX
      if (Math.abs(diffX) > 50) {
        if (diffX > 0) {
          const newIndex = (heroIndex - 1 + heroItems.length) % heroItems.length
          handleHeroChange(newIndex, 'right')
        } else {
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
  }, [heroIndex, heroItems.length, handleHeroChange])

  // سحب الخلفية/المساحة الفارغة لتغيير عمل الهيرو (لمس) — نفس الاستثناءات
  const beginHeroTouchSwipe = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('[data-hero-no-swipe]')) return

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
    // passive: true — لا نستدعي preventDefault، فلا نحجب thread التمرير
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd)
  }, [heroIndex, heroItems.length, handleHeroChange])
  
  // إظهار/إخفاء الهيرو من الشاشة → إيقاف أنيميشن الشهب عند خروجها (توفير GPU/بطارية)
  const heroSectionRef = useRef<HTMLElement>(null)
  const [heroVisible, setHeroVisible] = useState(true)

  useEffect(() => {
    const section = heroSectionRef.current
    if (!section || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => setHeroVisible(entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [heroItems.length])

  const heroItem = heroItems.length > 0 ? heroItems[heroIndex] : null

  // Fetch card states — مرة واحدة لكل جلسة تسجيل دخول (كان يُعاد مع كل تحميل
  // كسول: كل زيادة عرض كانت ترسل POST بكل العناصر الظاهرة من جديد!)
  const cardStatesFetchedRef = useRef(false)
  useEffect(() => {
    // Don't fetch if user is not logged in
    if (!user || cardStatesFetchedRef.current) return

    const allItems = [...(data?.trendingMovies || []), ...(data?.trendingSeries || []), ...(heroItems || [])]
    // إزالة التكرار (الهيرو يشارك العناصر مع صفوف الرائج)
    const unique = new Map<string, { content_type: string; tmdb_id: number }>()
    for (const item of allItems) {
      if (!item.tmdb_id && !item.id) continue
      const contentType = item.media_type === 'tv' ? 'tv' : 'movie'
      const tmdbId = item.tmdb_id || item.id
      unique.set(`${contentType}-${tmdbId}`, { content_type: contentType, tmdb_id: tmdbId })
    }
    const items = Array.from(unique.values())
    if (items.length === 0) return

    cardStatesFetchedRef.current = true

    const fetchStates = async () => {
      try {
        const res = await fetch('/api/user/card-state', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items })
        })
        if (res.ok) {
          const result = await res.json()
          setCardStates(result.states || {})
        }
      } catch {
        // Silent fail - user might not be logged in
      }
    }

    fetchStates()
  }, [user, data, heroItems])

  // Toggle card state function
  const toggleCardState = async (item: MediaItem, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    const tmdbId = item.tmdb_id
    if (!tmdbId) return
    
    const contentType = item.media_type === 'tv' ? 'tv' : 'movie'
    const key = `${contentType}-${tmdbId}`
    
    if (stateLoading[key]) return
    
    setStateLoading(prev => ({ ...prev, [key]: true }))
    
    const currentState = cardStates[key] || 'neutral'
    const nextState = currentState === 'neutral' ? 'favorite' : 
                      currentState === 'favorite' ? 'completed' : 'neutral'
    
    // Optimistic update
    setCardStates(prev => ({ ...prev, [key]: nextState }))
    
    try {
      const res = await fetch('/api/user/card-action', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_type: contentType,
          tmdb_id: tmdbId,
          title: item.title_ar || item.title_en,
          poster_path: item.poster_path
        })
      })
      
      if (!res.ok) {
        // Revert on error
        setCardStates(prev => ({ ...prev, [key]: currentState }))
      } else {
        const data = await res.json()
        if (data.newState) {
          setCardStates(prev => ({ ...prev, [key]: data.newState }))
        }
      }
    } catch {
      // Revert on error
      setCardStates(prev => ({ ...prev, [key]: currentState }))
    } finally {
      setStateLoading(prev => ({ ...prev, [key]: false }))
    }
  }
  
  // Get card state for an item
  const getCardState = (item: MediaItem): CardState => {
    const tmdbId = item.tmdb_id
    if (!tmdbId) return 'neutral'
    const contentType = item.media_type === 'tv' ? 'tv' : 'movie'
    const key = `${contentType}-${tmdbId}`
    return cardStates[key] || 'neutral'
  }
  
  // Check if loading
  const isCardLoading = (item: MediaItem): boolean => {
    const tmdbId = item.tmdb_id
    if (!tmdbId) return false
    const contentType = item.media_type === 'tv' ? 'tv' : 'movie'
    const key = `${contentType}-${tmdbId}`
    return stateLoading[key] || false
  }
  
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans" dir="rtl">

      {/* Single page H1 for SEO (visually hidden — the hero title stays as-is) */}
      <h1 className="sr-only">أحدث الأفلام والمسلسلات المترجمة</h1>

      {/* 2. Hero Banner with Frame and Auto-Rotate - Full Width */}
      {heroItem && (
        <section ref={heroSectionRef} className="w-full bg-slate-950">
          <div className="max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
            <div
              className="relative w-full h-[70vh] md:h-[80vh] flex items-end overflow-hidden rounded-2xl border-2 border-amber-400/50 bg-slate-950 shadow-2xl shadow-amber-500/30"
              style={{ boxShadow: '0 0 30px rgba(251, 191, 36, 0.4), inset 0 0 20px rgba(251, 191, 36, 0.1)' }}
              onMouseDown={beginHeroMouseSwipe}
              onTouchStart={beginHeroTouchSwipe}
            >
              {/* Meteor Shower Effect - مطر الشهب الملتهب — يتوقف عند خروج الهيرو من الشاشة */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl z-50">
                <div className="meteor-shower" data-paused={!heroVisible}>
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
              {/* Backdrop Background — LCP: preloadable <img> with high priority + async decode */}
              {(heroItem.backdrop_path || heroItem.poster_path) ? (
                <>
                  {/* preload لأول عمل فقط — لا نتراكم preloads جديدة مع كل دورة هيرو */}
                  {heroIndex === 0 && (
                    <link
                      rel="preload"
                      as="image"
                      href={`/tmdb/w780${heroItem.backdrop_path || heroItem.poster_path}`}
                      fetchPriority="high"
                    />
                  )}
                  <img
                    key={`backdrop-${heroItem.id}`}
                    src={`/tmdb/w780${heroItem.backdrop_path || heroItem.poster_path}`}
                    alt=""
                    aria-hidden="true"
                    width={780}
                    height={439}
                    fetchPriority="high"
                    decoding="async"
                    loading="eager"
                    draggable="false"
                    className="absolute inset-0 w-full h-full object-cover object-[center_30%] cursor-grab active:cursor-grabbing transition-all duration-1000"
                  />
                </>
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent cursor-grab" />
              <div className="absolute inset-0 bg-gradient-to-l from-slate-950/80 via-transparent to-transparent cursor-grab" />

              {/* Hero Content */}
              <div className="relative w-full h-full pt-24 pb-6 md:pt-28 md:pb-8 z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 md:px-8">
                <div className="lg:col-span-8 flex flex-col justify-between h-full text-right">
                  
                  {/* Top Section: Badges, Titles, Description */}
                  <div className="space-y-3">
                    {/* Badge row - Fixed at Top */}
                    <div className="flex flex-wrap gap-2 items-center text-xs" data-hero-no-swipe>
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
                    <h2 className="text-3xl md:text-5xl font-black text-slate-100 tracking-tight leading-none animate-slideInRight" data-hero-no-swipe key={`title-ar-${heroItem.id}`}>
                      {sanitizeTitle(heroItem.title_ar)}
                    </h2>
                    
                    {/* English Title - 35% larger with professional effects and color based on media type */}
                    <div className="relative inline-block" data-hero-no-swipe key={`title-en-wrapper-${heroItem.id}`}>
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
                    <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-sm line-clamp-7" data-hero-no-swipe style={{ animationDelay: '0.2s' }}>
                      {sanitizeOverview(heroItem.overview_ar)}
                    </p>
                  </div>

                  {/* Bottom Section: Buttons */}
                  <div className="space-y-4">
                    {/* Action Buttons Row */}
                    <div className="flex items-center gap-3" data-hero-no-swipe>
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
                      
                      {/* Hero Heart Button - Only show if logged in */}
                      {user && (
                        <button
                          onClick={(e) => toggleCardState(heroItem, e)}
                          disabled={isCardLoading(heroItem)}
                          className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg border-2 ${
                            getCardState(heroItem) === 'favorite' 
                              ? 'bg-red-500 border-red-400 hover:bg-red-600 shadow-red-500/50' 
                              : getCardState(heroItem) === 'completed'
                              ? 'bg-green-500 border-green-400 hover:bg-green-600 shadow-green-500/50'
                              : 'bg-black/80 border-white/40 hover:bg-black/90 hover:border-white/60'
                          } ${isCardLoading(heroItem) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          title={
                            getCardState(heroItem) === 'neutral' ? 'إضافة للمفضلة' :
                            getCardState(heroItem) === 'favorite' ? 'نقل لتمت المشاهدة' :
                            'إزالة من تمت المشاهدة'
                          }
                        >
                          <Heart 
                            size={24} 
                            className={`${
                              getCardState(heroItem) === 'favorite' ? 'fill-white text-white' :
                              getCardState(heroItem) === 'completed' ? 'fill-white text-white' :
                              'text-white'
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Animated Poster Thumbnail with Swipe Gesture */}
                <div className="hidden lg:flex lg:col-span-4 items-center justify-center">
                  <div
                    className="relative w-64 aspect-[2/3] cursor-grab active:cursor-grabbing select-none hover:animate-wiggle"
                    data-hero-no-swipe
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
                      document.addEventListener('touchmove', handleTouchMove, { passive: true })
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
                            width={300}
                            height={450}
                            decoding="async"
                            fetchPriority={isActive ? 'high' : 'low'}
                            loading={isActive ? 'eager' : 'lazy'}
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

      {/* إعلان رقم 1 — 728×90 تحت الهيرو، إطار متدرّج بألوان التصميم وأركان دائرية بلا فراغات */}
      <div className="flex w-full justify-center">
        <div className="rounded-2xl bg-gradient-to-l from-red-500/60 via-slate-700/70 to-blue-500/60 p-[1.5px] shadow-lg shadow-slate-950/70">
          <div className="rounded-[14.5px] bg-slate-950 p-1">
            <AdsterraBanner ad={AD_UNDER_HERO} />
          </div>
        </div>
      </div>


          {/* 3. Trending Content Sections — lazy client chunk (off critical path) */}
      <section className="w-full bg-slate-950">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8">
          <div className="flex flex-col lg:flex-row gap-8">

            {/* Main content column (appears on the RIGHT in RTL) */}
            <div className="flex-1 min-w-0">

          <HomeTrendingSections
            data={data}
            isLoggedIn={!!user}
            moviesDisplayCount={moviesDisplayCount}
            seriesDisplayCount={seriesDisplayCount}
            onMoviesLoadMore={() => setMoviesDisplayCount(prev => Math.min(prev + 25, data.trendingMovies.length))}
            onSeriesLoadMore={() => setSeriesDisplayCount(prev => Math.min(prev + 25, data.trendingSeries.length))}
            getCardState={getCardState}
            isCardLoading={isCardLoading}
            toggleCardState={toggleCardState}
          />

          {/* بوابة المكتبة — ثلاث خلايا متجاورة: زر الأفلام | إعلان رقم 2 (300×250 بالمقاس الأصلي بالظبط) | زر المسلسلات.
              بدون ارتفاع ثابت: الخلية الوسطى محددة بمقاس الإعلان الأصلي (300×250 + الإطار) والزران يمدّدان لنفس الارتفاع — ممنوع أي قص */}
          <div className="mt-8 grid w-full grid-cols-1 overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-900/50 sm:grid-cols-3">
            {/* الخلية 1 — زر كل الأفلام */}
            <Link
              href="/movies"
              className="group relative flex min-h-[180px] flex-col items-center justify-center gap-3 border-b border-slate-800/60 p-4 text-center transition-all duration-300 hover:bg-red-600/10 sm:min-h-0 sm:border-b-0 sm:border-l"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/40 bg-red-600/15 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                <Film className="h-7 w-7 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-100 sm:text-xl">شاهد كل الأفلام</h3>
                <p className="mt-0.5 text-xs text-slate-400">اكتشف المكتبة الكاملة</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-red-500/40 bg-red-600/15 transition-all duration-300 group-hover:bg-red-600">
                <ArrowLeft className="h-4 w-4 text-red-400 transition-transform duration-300 group-hover:-translate-x-0.5 group-hover:text-white" />
              </div>
            </Link>

            {/* الخلية 2 — إعلان رقم 2 (300×250) بمقاسه الأصلي بالظبط داخل إطار موحّد — بلا أي قص */}
            <div className="relative flex items-center justify-center overflow-visible py-2">
              <div className="w-fit rounded-2xl bg-gradient-to-l from-red-500/60 via-slate-700/70 to-blue-500/60 p-[1.5px] shadow-lg shadow-slate-950/70">
                <div className="rounded-[14.5px] bg-slate-950 p-1">
                  <AdsterraBanner ad={AD_CTA} />
                </div>
              </div>
            </div>

            {/* الخلية 3 — زر كل المسلسلات */}
            <Link
              href="/series"
              className="group relative flex min-h-[180px] flex-col items-center justify-center gap-3 border-b border-slate-800/60 p-4 text-center transition-all duration-300 hover:bg-blue-600/10 sm:min-h-0 sm:border-b-0"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/40 bg-blue-600/15 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
                <Tv className="h-7 w-7 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-100 sm:text-xl">شاهد كل المسلسلات</h3>
                <p className="mt-0.5 text-xs text-slate-400">اكتشف المكتبة الكاملة</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-500/40 bg-blue-600/15 transition-all duration-300 group-hover:bg-blue-600">
                <ArrowLeft className="h-4 w-4 text-blue-400 transition-transform duration-300 group-hover:-translate-x-0.5 group-hover:text-white" />
              </div>
            </Link>
          </div>

            </div>

            {/* إعلان رقم 3 (Zone 31008096 — 160×600) العمود الشمال — وحيدًا بدون أي إعلان آخر: mt-[62px] لمساواة أعلاه مع أعلى كروت الأفلام الرائجة */}
            <aside className="w-full lg:sticky lg:top-6 lg:mt-[62px] lg:w-[184px] lg:shrink-0 lg:self-start">
              <div className="rounded-2xl bg-gradient-to-b from-blue-500/60 via-slate-700/70 to-red-500/60 p-[1.5px] shadow-lg shadow-slate-950/70">
                <div className="rounded-[14.5px] bg-slate-950 p-1">
                  <AdsterraBanner ad={AD_SIDE} />
                </div>
              </div>
            </aside>

          </div>
        </div>
      </section>

      {/* Footer Component */}
      <Footer />
    </div>
  )
}
