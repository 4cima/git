'use client'

import { useEffect, useState, useMemo, useRef, Fragment } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { MovieCard } from '../features/media/MovieCard'
import { Star, Clock, TrendingUp, SearchX, Film, Tv } from 'lucide-react'
import { UnifiedFilters } from '../unified/UnifiedFilters'
import { Footer } from '../layout/Footer'
import { AdFrame } from '@/components/features/system/AdsterraBanner'
import { MobileStickyAd, DesktopOnly } from '@/components/features/system/MobileStickyAd'
import { AdInRowCard, AD_EVERY_N_CARDS } from './HomeAdCard'
import { getAdByNum } from '@/data/ads/4cima.com'
import { LISTING_PAGE_SIZE } from '@/lib/listing-config'

/* ===== إعلانات صفحة التصنيف — أرقام موحّدة من src/data/ads/4cima.com (نظام موحّد لكل صفحات القوائم) =====
   1: 728×90 هيدر | 2: 300×250 عمود جانبي | 3: 160×600 سكرايبر ديسكتوب
   4: 468×60 فاصل قبل الفوتر | 5: 160×300 كارت داخل الجريد (AdInRowCard)
   6: 320×50 شريط الموبايل الثابت (MobileStickyAd) */
const AD_HEADER = getAdByNum(1)! // 728×90
const AD_SIDE_RECT = getAdByNum(2)! // 300×250
const AD_SIDE_SKY = getAdByNum(3)! // 160×600
const AD_FOOTER_MID = getAdByNum(4)! // 468×60

import type { ContentType } from '../../types/unified-section'

/**
 * خريطة الأقسام — تُترجم إلى باراميترات /api/movies و /api/series الرسمية:
 *   language : original_language (يدعم 'a|b|c')
 *   genreSlug: slug تصنيف TMDB (يُطابق genres_json)
 */
const CATEGORY_MAP: Record<string, any> = {
  foreign: { language: 'en' },
  arabic: { language: 'ar' },
  asian: { language: 'ko|ja|zh|th|vi|id' },
  turkish: { language: 'tr' },
  indian: { language: 'hi|ta|te|ml' },
  animation: { genreSlug: 'animation' },
  /* الأنمي = رسوم متحركة يابانية — فلترة صحيحة بدل عرض أعمال عامة */
  anime: { language: 'ja', genreSlug: 'animation' },
  top_rated: {},
  popular: {},
  trending: {},
}

interface CategoryHubProps {
  type?: 'movie' | 'tv'
  category?: string
  /** السماح بالتبديل بين الأفلام والمسلسلات (تُستخدم في صفحة الأنمي) */
  allowTypeSwitch?: boolean
}

export const CategoryHub = ({ type = 'movie', category, allowTypeSwitch = false }: CategoryHubProps) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const year = searchParams.get('year')
  const genre = searchParams.get('genre')
  const rating = searchParams.get('rating') ? Number(searchParams.get('rating')) : null
  const language = searchParams.get('language')

  /* نوع الوسائط — قابل للتبديل عندما يكون مسموحًا (صفحة الأنمي) */
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>(type)

  const [content, setContent] = useState<any[]>([])
  const [featuredContent, setFeaturedContent] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [activeTab, setActiveTab] = useState<'latest' | 'top_rated' | 'trending' | 'popular'>('latest')
  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (category === 'top_rated') setActiveTab('top_rated')
    else if (category === 'popular') setActiveTab('popular')
    else if (category === 'trending') setActiveTab('trending')
    else setActiveTab('latest')
  }, [category])

  /* باراميترات الفلترة المشتركة لكل الطلبات (تصنيف + لغة + سنة + تقييم) */
  const buildFilterParams = () => {
    const params: Record<string, string> = {}
    const catParams = category ? CATEGORY_MAP[category] : undefined
    if (catParams?.language) params.language = catParams.language
    if (catParams?.genreSlug) params.genre = catParams.genreSlug
    if (language) params.language = language
    /* الفلتر يُصدر slug التصنيف — نمرره كما هو (يُطابق "slug" داخل genres_json) */
    if (genre) params.genre = genre
    if (year) params.year = year
    if (rating) params.rating_min = String(rating)
    return params
  }

  /* قسم «مختارات» — 8 أعمال الأعلى تقييمًا (يُخفى عند وجود فلاتر نشطة) */
  useEffect(() => {
    if (year || genre || rating || language) {
      setFeaturedContent([])
      return
    }

    const fetchFeatured = async () => {
      try {
        const endpoint = mediaType === 'movie' ? '/api/movies' : '/api/series'
        const params = new URLSearchParams({
          sort: 'vote_average',
          order: 'desc',
          rating_min: '8',
          limit: '8',
        })
        const catParams = category ? CATEGORY_MAP[category] : undefined
        if (catParams?.language) params.set('language', catParams.language)
        if (catParams?.genreSlug) params.set('genre', catParams.genreSlug)

        const response = await fetch(`${endpoint}?${params.toString()}`)
        if (response.ok) {
          const data = await response.json()
          const items = data.movies || data.series || []
          setFeaturedContent(items.map((item: any) => ({ ...item, media_type: mediaType })))
        }
      } catch (err) {
        console.error('Error fetching featured content:', err)
      }
    }

    fetchFeatured()
  }, [category, year, genre, rating, language, mediaType])

  /* القائمة الرئيسية — المنطق الموحد: 20 عنصرًا لكل دفعة + سكرول لانهائي */
  useEffect(() => {
    let cancelled = false

    const fetchContent = async () => {
      const isFirstPage = page === 1
      if (isFirstPage) {
        if (content.length > 0) setRefreshing(true)
        else setLoading(true)
      } else {
        setLoadingMore(true)
      }

      try {
        const endpoint = mediaType === 'movie' ? '/api/movies' : '/api/series'
        const params = new URLSearchParams({
          page: String(page),
          limit: String(LISTING_PAGE_SIZE),
        })

        /* الترتيب حسب التبويب — أعمدة الترتيب الرسمية لكل نوع */
        if (activeTab === 'top_rated') {
          params.set('sort', 'vote_average')
          params.set('rating_min', params.get('rating_min') || '7')
        } else if (activeTab === 'trending' || activeTab === 'popular') {
          params.set('sort', 'popularity')
          if (activeTab === 'popular') params.set('rating_min', params.get('rating_min') || '8')
        } else {
          params.set('sort', mediaType === 'movie' ? 'release_year' : 'first_air_year')
        }
        params.set('order', 'desc')

        Object.entries(buildFilterParams()).forEach(([k, v]) => {
          if (k === 'rating_min') {
            /* تقييم الفلتر أعلى أولوية من تقييم التبويب */
            params.set('rating_min', v)
          } else {
            params.set(k, v)
          }
        })

        const response = await fetch(`${endpoint}?${params.toString()}`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        if (cancelled) return

        const newItems = (data.movies || data.series || []).map((item: any) => ({
          ...item,
          media_type: mediaType,
        }))

        setContent(prevContent => {
          const combined = isFirstPage ? newItems : [...prevContent, ...newItems]
          const seenIds = new Set<number>()
          return combined.filter((item: any) => {
            if (seenIds.has(item.id)) return false
            seenIds.add(item.id)
            return true
          })
        })
        setHasMore(data.pagination?.hasMore || false)
      } catch (err) {
        if (!cancelled) console.error('Error fetching content:', err)
      } finally {
        if (!cancelled) {
          setLoading(false)
          setLoadingMore(false)
          setRefreshing(false)
        }
      }
    }

    fetchContent()
    return () => { cancelled = true }
  }, [category, year, genre, rating, language, mediaType, activeTab, page])

  /* السكرول اللانهائي — نفس إعدادات كل صفحات القوائم (جذر 400px) */
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore && !refreshing) {
          setPage(prev => prev + 1)
        }
      },
      { threshold: 0.1, rootMargin: '400px' }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) observer.observe(currentTarget)

    return () => {
      if (currentTarget) observer.unobserve(currentTarget)
    }
  }, [hasMore, loading, loadingMore, refreshing])


  const handleApplyFilters = (filters: {
    genre?: string | null;
    year?: string | null;
    rating?: number | null;
    language?: string | null;
    platform?: string | null;
    os?: string | null;
  }) => {
    const params = new URLSearchParams()

    if (filters.genre) params.set('genre', filters.genre)
    if (filters.year) params.set('year', String(filters.year))
    if (filters.rating) params.set('rating', String(filters.rating))
    if (filters.language) params.set('language', filters.language)
    if (filters.platform) params.set('platform', filters.platform)
    if (filters.os) params.set('os', filters.os)

    router.push(`?${params.toString()}`)
  }

  const handleClearFilters = () => {
    router.push(window.location.pathname)
  }

  const categoryTitle = useMemo(() => {
    if (category === 'anime') return 'أنمي'
    if (category === 'foreign') return 'أجنبي'
    if (category === 'arabic') return 'عربي'
    if (category === 'asian') return 'آسيوي'
    if (category === 'turkish') return 'تركي'
    if (category === 'indian') return 'هندي'
    if (category === 'animation') return 'انيميشن'
    if (category === 'popular') return 'الأكثر رواجاً'
    if (category === 'top_rated') return 'الأعلى تقييماً'
    return category || 'الكل'
  }, [category])

  return (
    <div className="min-h-screen pt-16 page-container pb-8">
      {/* بنر الهيدر 728×90 — نظام AdFrame الموحّد (لا طلبات وسيطة) */}
      <div className="mb-4 flex justify-center">
        <AdFrame ad={AD_HEADER} variant="x" />
      </div>
      <div className="mb-6 relative">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-2xl md:text-4xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500 font-cairo">
            {mediaType === 'movie' ? 'أفلام' : 'مسلسلات'}
            {category && <span className="text-primary"> : {categoryTitle}</span>}
          </h1>

          {/* تبديل النوع (أفلام/مسلسلات) — لصفحات القسمين مثل الأنمي */}
          {allowTypeSwitch && (
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/30 p-1 mb-2">
              <button
                onClick={() => { setMediaType('movie'); setPage(1); setContent([]) }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold transition-colors ${mediaType === 'movie' ? 'bg-red-600/80 text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                <Film size={14} />
                أفلام
              </button>
              <button
                onClick={() => { setMediaType('tv'); setPage(1); setContent([]) }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold transition-colors ${mediaType === 'tv' ? 'bg-sky-600/80 text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                <Tv size={14} />
                مسلسلات
              </button>
            </div>
          )}
        </div>

        {/* Unified Filters */}
        <UnifiedFilters
          contentType={(mediaType === 'movie' ? 'movies' : 'series') as ContentType}
          year={year}
          rating={rating}
          language={language}
          onApplyFilters={handleApplyFilters}
          onClearAll={handleClearFilters}
          lang="ar"
        />
      </div>


      <div className="flex items-center gap-4 mb-3 border-b border-white/10 pb-1 overflow-x-auto">
        <button
          onClick={() => { setActiveTab('latest'); setPage(1) }}
          className={`text-sm font-bold pb-2 -mb-2 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'latest' ? 'border-primary text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
        >
          <Clock size={14} />
          أضيف حديثاً
        </button>
        <button
          onClick={() => { setActiveTab('top_rated'); setPage(1) }}
          className={`text-sm font-bold pb-2 -mb-2 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'top_rated' ? 'border-primary text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
        >
          <Star size={14} />
          الأعلى تقييماً
        </button>
        <button
          onClick={() => { setActiveTab('trending'); setPage(1) }}
          className={`text-sm font-bold pb-2 -mb-2 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'trending' ? 'border-primary text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
        >
          <TrendingUp size={14} />
          الأكثر شهرة
        </button>
        <button
          onClick={() => { setActiveTab('popular'); setPage(1) }}
          className={`text-sm font-bold pb-2 -mb-2 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'popular' ? 'border-primary text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
        >
          <Star className="fill-current" size={14} />
          الأفضل في الكل
        </button>
      </div>


      {/* المنطق الموحد: شبكة الأعمال + العمود الجانبي الإعلاني */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          {/* قسم مختارات — يظهر فقط بدون فلاتر */}
          {!year && !genre && !rating && !language && featuredContent.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-black text-white">
                <Star className="h-5 w-5 text-amber-400" />
                مختارات {categoryTitle} — الأعلى تقييماً
              </h2>
              <div className="grid-responsive gap-4">
                {featuredContent.map((item, i) => (
                  <MovieCard key={`featured-${item.id}`} movie={item} index={i} />
                ))}
              </div>
            </section>
          )}

          {loading ? (
            <div className="grid-responsive gap-4">
              {Array.from({ length: LISTING_PAGE_SIZE }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden bg-white/5 border border-white/5">
                  <div className="aspect-[2/3] w-full bg-white/5 animate-pulse" />
                </div>
              ))}
            </div>
          ) : content.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-8 px-6 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md"
            >
              <SearchX size={40} className="text-zinc-500 mb-3" />
              <h2 className="text-lg md:text-xl font-bold text-zinc-200 mb-2">لا يوجد محتوى</h2>
              <p className="text-zinc-400 text-center max-w-md mb-3 text-sm">
                لم نجد أفلاماً أو مسلسلات تطابق اختياراتك. جرّب تغيير السنة أو التصنيف.
              </p>
            </motion.div>
          ) : (
            <>
              {/* شبكة ثابتة: مساحة محجوزة + شريط تحديث رفيع (لا قفز) */}
              <div className="relative min-h-[320px]">
                {refreshing && (
                  <div className="absolute top-0 left-0 right-0 z-20 h-0.5 overflow-hidden rounded-full bg-slate-800/80" aria-hidden="true">
                    <div className="h-full w-1/2 rounded-full bg-gradient-to-l from-amber-500 via-amber-300 to-amber-500 animate-pulse" />
                  </div>
                )}
                <div className="grid-responsive gap-4" suppressHydrationWarning>
                  {content.map((item, i) => (
                    <Fragment key={item.id}>
                      <MovieCard movie={item} index={i} forceTv={mediaType === 'tv'} />
                      {(i + 1) % AD_EVERY_N_CARDS === 0 && (
                        <div className="flex justify-center">
                          <AdInRowCard pos={`hub-${i + 1}`} />
                        </div>
                      )}
                    </Fragment>
                  ))}
                </div>
              </div>

              {/* مشغّل السكرول اللانهائي */}
              <div ref={observerTarget} className="h-10 mt-6"></div>

              {loadingMore && (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-3 text-zinc-400">
                    <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-bold">جاري التحميل...</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* العمود الجانبي (يسار في RTL) — لاصق أثناء السكرول:
            إعلان 2 (300×250) دائمًا + إعلان 3 (160×600) ديسكتوب فقط */}
        <aside className="flex w-full flex-col items-center gap-6 lg:w-[300px] lg:shrink-0 lg:sticky lg:top-24 lg:self-start">
          <AdFrame ad={AD_SIDE_RECT} variant="y" />
          <DesktopOnly>
            <div className="w-full">
              <AdFrame ad={AD_SIDE_SKY} variant="y" />
            </div>
          </DesktopOnly>
        </aside>
      </div>

      {/* إعلان 4 (468×60) — فاصل خفيف قبل الفوتر (موحّد مع باقي صفحات التصنيفات) */}
      <div className="flex justify-center px-4 py-2 mt-8">
        <AdFrame ad={AD_FOOTER_MID} variant="x" />
      </div>

      {/* شريط الموبايل الثابت — إعلان 6 (320×50) */}
      <MobileStickyAd />

      <Footer />
    </div>
  )
}

