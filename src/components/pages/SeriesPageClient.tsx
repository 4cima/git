'use client'

import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from 'react'
import { useSearchParams } from 'next/navigation'
import { Tv, Search, X, ChevronDown } from 'lucide-react'
import { Footer } from '@/components/layout/Footer'
import { MovieCard } from '@/components/features/media/MovieCard'
import { AdFrame } from '@/components/features/system/AdsterraBanner'
import { MobileStickyAd, DesktopOnly } from '@/components/features/system/MobileStickyAd'
import { AdInRowCard, AD_EVERY_N_CARDS } from './HomeAdCard'
import { getAdByNum } from '@/data/ads/4cima.com'
import { LISTING_PAGE_SIZE } from '@/lib/listing-config'
import { useListingGenres } from '@/hooks/useListingGenres'

/* ===== خريطة إعلانات القسم — الأرقام من src/data/ads/4cima.com =====
   1: 728×90 هيدر | 2: 300×250 أعلى العمود الجانبي | 3: 160×600 سكرايبر ديسكتوب
   4: 468×60 فاصل قبل الفوتر | 5: 160×300 كارت داخل الجريد (AdInRowCard)
   6: 320×50 شريط الموبايل الثابت (MobileStickyAd) */
const AD_HEADER = getAdByNum(1)!
const AD_SIDE_RECT = getAdByNum(2)!
const AD_SIDE_SKY = getAdByNum(3)!
const AD_FOOTER_MID = getAdByNum(4)!
import { useAuth } from '@/hooks/useAuth'

const GENRES = [
  { name: 'دراما',               slug: 'drama',             emoji: '🎭' },
  { name: 'كوميديا',             slug: 'comedy',            emoji: '😂' },
  { name: 'رسوم متحركة',        slug: 'animation',         emoji: '🎨' },
  { name: 'أكشن ومغامرة',        slug: 'action-adventure',  emoji: '💥' },
  { name: 'خيال علمي وفانتازيا', slug: 'sci-fi-fantasy',    emoji: '🚀' },
  { name: 'جريمة',               slug: 'crime',             emoji: '🕵️' },
  { name: 'واقعي',               slug: 'reality',           emoji: '📹' },
  { name: 'غموض',                slug: 'mystery',           emoji: '🔍' },
  { name: 'عائلي',               slug: 'family',            emoji: '👨‍👩‍👧‍👦' },
  { name: 'أطفال',               slug: 'kids',              emoji: '👶' },
  { name: 'دراما اجتماعية',     slug: 'soap',              emoji: '🎭' },
  { name: 'غربي',                slug: 'western',           emoji: '🤠' },
  { name: 'رومانسي',             slug: 'romance',           emoji: '💕' },
] as const

const YEARS = [
  { value: 'all', label: 'كل السنوات' },
  { value: '2026', label: '2026' },
  { value: '2025', label: '2025' },
  { value: '2024', label: '2024' },
  { value: '2023', label: '2023' },
  { value: '2022', label: '2022' },
  { value: '2021', label: '2021' },
  { value: '2020', label: '2020' },
  { value: '2019', label: '2019' },
  { value: '2018', label: '2018' },
  { value: '2017', label: '2017' },
  { value: '2016', label: '2016' },
  { value: '2015', label: '2015' },
  { value: '2014', label: '2014' },
  { value: '2013', label: '2013' },
  { value: '2012', label: '2012' },
  { value: '2011', label: '2011' },
  { value: '2000-2010', label: 'الألفينات' },
  { value: '1990-1999', label: 'التسعينات' },
  { value: 'before-1990', label: 'كلاسيكي' },
]

const RATINGS = [
  { value: 'all',   label: 'كل التقييمات' },
  { value: '9.1-10',  label: '⭐ 10 مذهل' },
  { value: '8.1-9',   label: '⭐ 9 ممتاز'     },
  { value: '7.1-8',   label: '⭐ 8 جيد جداً'  },
  { value: '6.1-7',   label: '⭐ 7 جيد'       },
  { value: '5.1-6',   label: '⭐ 6 مقبول'    },
  { value: '4.1-5',   label: '⭐ 5 متوسط'    },
]

// تسميات عربية لأكواد اللغات (تظهر في شرائح الفلاتر النشطة)
const LANGUAGE_LABELS: Record<string, string> = {
  ar: 'عربي', en: 'إنجليزي', ko: 'كوري', ja: 'ياباني', zh: 'صيني',
  hi: 'هندي', tr: 'تركي', es: 'إسباني', fr: 'فرنسي', de: 'ألماني',
  pt: 'برتغالي', ru: 'روسي', it: 'إيطالي', th: 'تايلاندي',
}

const COUNTRIES = [
  { value: 'all', label: 'كل الدول'      },
  { value: 'US',  label: 'أمريكا'        },
  { value: 'JP',  label: 'اليابان'       },
  { value: 'GB',  label: 'بريطانيا'      },
  { value: 'CN',  label: 'الصين'         },
  { value: 'KR',  label: 'كوريا'         },
  { value: 'CA',  label: 'كندا'          },
  { value: 'FR',  label: 'فرنسا'         },
  { value: 'DE',  label: 'ألمانيا'       },
  { value: 'IN',  label: 'الهند'         },
  { value: 'TH',  label: 'تايلاند'       },
  { value: 'RU',  label: 'روسيا'         },
  { value: 'AU',  label: 'أستراليا'      },
  { value: 'BR',  label: 'البرازيل'      },
  { value: 'MX',  label: 'المكسيك'       },
  { value: 'TR',  label: 'تركيا'         },
]

const SORT_OPTIONS = [
  { value: 'popularity',     order: 'desc', label: 'الأكثر شهرة',      icon: '🔥' },
  { value: 'vote_average',   order: 'desc', label: 'الأعلى تقييماً',   icon: '⭐' },
  { value: 'vote_count',     order: 'desc', label: 'الأكثر تقييماً',   icon: '📊' },
  { value: 'first_air_year', order: 'desc', label: 'الأحدث',          icon: '📅' },
  { value: 'first_air_year', order: 'asc',  label: 'الأقدم',          icon: '🕰️' },
]

/** قراءة الفلاتر من الـURL مرة واحدة عند الـmount — يمنع الطلب المزدوج ومسح بيانات الـSSR */
function readFiltersFromURL(searchParams: { get(name: string): string | null }) {
  const urlGenre = searchParams.get('genre')
  const genre = urlGenre ? (GENRES.find(g => g.slug === urlGenre)?.name ?? 'all') : 'all'

  // Language filter — passed directly to the API (original_language), no country mapping
  const urlLanguage = searchParams.get('language')
  const language    = urlLanguage ? urlLanguage.toLowerCase() : 'all'
  const urlCountry  = searchParams.get('country')
  const country     = urlCountry && COUNTRIES.some(c => c.value === urlCountry) ? urlCountry : 'all'

  const urlYear   = searchParams.get('year')
  const urlRating = searchParams.get('rating')
  const year   = urlYear   && YEARS.some(y => y.value === urlYear)     ? urlYear   : 'all'
  const rating = urlRating && RATINGS.some(r => r.value === urlRating) ? urlRating : 'all'
  const search = searchParams.get('search') || searchParams.get('q') || ''

  return { genre, country, year, rating, search, language }
}

export function SeriesPageClient({ initialSeries = [], initialHasMore = false }: { initialSeries?: any[]; initialHasMore?: boolean }) {
  const { user } = useAuth() // Check if user is logged in
  const searchParams = useSearchParams()
  /* قائمة تصنيفات ديناميكية من قاعدة البيانات (GENRES احتياطية حتى وصول الاستجابة) */
  const genresList = useListingGenres('tv', GENRES)
  // Initialize filters from the URL exactly once (SSR data survives the first render)
  const [initialFilters] = useState(() => readFiltersFromURL(searchParams))
  const [series, setSeries]                   = useState<any[]>(initialSeries)
  const [loading, setLoading]                 = useState(initialSeries.length === 0)
  const [loadingMore, setLoadingMore]         = useState(false)
  /* تحديث بدون قفز: عند تغيير فلتر والمحتوى معروض، يبقى مكانه ونعرض شريط تقدم رفيع */
  const [refreshing, setRefreshing]           = useState(false)
  const [error, setError]                     = useState<string | null>(null)
  const [searchQuery, setSearchQuery]         = useState(initialFilters.search)
  const [debouncedSearch, setDebouncedSearch] = useState(initialFilters.search)
  const [selectedGenre, setSelectedGenre]     = useState<string>(initialFilters.genre)
  const [selectedYear, setSelectedYear]       = useState<string>(initialFilters.year)
  const [selectedRating, setSelectedRating]   = useState<string>(initialFilters.rating)
  const [selectedCountry, setSelectedCountry] = useState<string>(initialFilters.country)
  const [selectedLanguage, setSelectedLanguage] = useState<string>(initialFilters.language || 'all')
  const [sortBy, setSortBy]                   = useState('popularity')
  const [sortOrder, setSortOrder]             = useState('desc')
  const [page, setPage]                       = useState(1)
  const [hasMore, setHasMore]                 = useState(initialHasMore)
  const [retryNonce, setRetryNonce]           = useState(0)
  const observerTarget = useRef<HTMLDivElement>(null)

  // Batch card states for heart buttons
  const [cardStates, setCardStates] = useState<Record<string, 'neutral' | 'favorite' | 'completed'>>({})
  // Keys already requested — so appended pages only fetch their own new items
  const fetchedStateKeys = useRef<Set<string>>(new Set())

  // Single open dropdown at a time
  const [openDropdown, setOpenDropdown] = useState<'genre'|'year'|'rating'|'country'|'sort'|null>(null)
  const filtersRef = useRef<HTMLDivElement>(null)

  /* مزامنة فلتر التصنيف من الـURL بعد وصول القائمة الديناميكية —
     يغطي الروابط العميقة لتصنيفات غير موجودة في القائمة الاحتياطية */
  const didDynamicGenreSync = useRef(false)
  useEffect(() => {
    if (genresList === GENRES || didDynamicGenreSync.current) return
    didDynamicGenreSync.current = true
    const urlGenre = searchParams.get('genre')
    if (!urlGenre || selectedGenre !== 'all') return
    const g = genresList.find(x => x.slug === urlGenre)
    if (g) setSelectedGenre(g.name)
  }, [genresList])

  // المنطق الموحد: 20 عنصرًا في كل دفعة (نفس حجم دفعة الـSSR) — ثابت لا يتغير مع تغيّر الشاشة
  const limitRef = useRef(LISTING_PAGE_SIZE)
  
  // Fixed skeleton count for SSR (avoids hydration mismatch)
  const SKELETON_COUNT = 24 // 2 columns × 12 rows (mobile default)

  // Sync filters from URL params on navigation — first mount is already handled
  // by the useState initializers above (skipping it here avoids a duplicate fetch)
  const isFirstUrlSync = useRef(true)
  useEffect(() => {
    if (isFirstUrlSync.current) {
      isFirstUrlSync.current = false
      return
    }
    // Read genre from URL (expects slug format)
    const urlGenre = searchParams.get('genre')
    if (urlGenre) {
      // Find genre by slug and set the Arabic name as selected value
      const genre = genresList.find(g => g.slug === urlGenre)
      if (genre) {
        setSelectedGenre(genre.name)
      }
    } else {
      setSelectedGenre('all')
    }
    
    // Read language from URL (maps to country filter)
    const urlLanguage = searchParams.get('language')
    if (urlLanguage) {
      // Sent directly to the API — accurate original_language filter (no lossy country mapping)
      setSelectedLanguage(urlLanguage.toLowerCase())
    } else {
      setSelectedLanguage('all')
    }
    
    // Read country from URL
    const urlCountry = searchParams.get('country')
    if (urlCountry) {
      const countryExists = COUNTRIES.some(c => c.value === urlCountry)
      if (countryExists) {
        setSelectedCountry(urlCountry)
      }
    }
    
    // Read year from URL
    const urlYear = searchParams.get('year')
    if (urlYear) {
      const yearExists = YEARS.some(y => y.value === urlYear)
      if (yearExists) {
        setSelectedYear(urlYear)
      }
    } else {
      setSelectedYear('all')
    }
    
    // Read rating from URL
    const urlRating = searchParams.get('rating')
    if (urlRating) {
      const ratingExists = RATINGS.some(r => r.value === urlRating)
      if (ratingExists) {
        setSelectedRating(urlRating)
      }
    } else {
      setSelectedRating('all')
    }
    
    // Read search query from URL
    const urlSearch = searchParams.get('search') || searchParams.get('q')
    if (urlSearch) {
      setSearchQuery(urlSearch)
      setDebouncedSearch(urlSearch)
    } else {
      setSearchQuery('')
      setDebouncedSearch('')
    }
    
    // Reset to page 1 when URL changes — المحتوى يبقى حتى وصول النتائج الجديدة
    setPage(1)
  }, [searchParams]) // Re-run whenever URL search params change

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setDebouncedSearch(searchQuery) }, 400)
    return () => clearTimeout(t)
  }, [searchQuery])

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) setOpenDropdown(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Fetch
  useEffect(() => {
    const abortController = new AbortController()
    
    const params = new URLSearchParams({ page: page.toString(), limit: limitRef.current.toString(), sort: sortBy, order: sortOrder })
    if (selectedGenre !== 'all') {
      // Convert Arabic name to slug for API
      const genre = genresList.find(g => g.name === selectedGenre)
      params.set('genre', genre?.slug || selectedGenre)
    }
    if (selectedYear      !== 'all') params.set('year',       selectedYear)
    if (selectedRating    !== 'all') params.set('rating_min', selectedRating)
    if (selectedCountry   !== 'all') params.set('country',    selectedCountry)
    if (selectedLanguage  !== 'all') params.set('language',   selectedLanguage)
    if (debouncedSearch.trim())      params.set('search',     debouncedSearch.trim())

    const isFirstPage = page === 1
    if (isFirstPage) {
      // محتوى معروض بالفعل؟ حدّث مكانه بشريط رفيع (لا سكبور — لا قفز)
      if (series.length > 0) setRefreshing(true)
      else setLoading(true)
    }
    else setLoadingMore(true)
    
    setError(null) // Clear previous errors

    fetch(`/api/series?${params}`, { signal: abortController.signal })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => { 
        const newSeries = data.series || []
        
        // Remove duplicates by id using functional update
        setSeries(prevSeries => {
          const combined = isFirstPage ? newSeries : [...prevSeries, ...newSeries]
          const seenIds = new Set<number>()
          return combined.filter((item: any) => {
            if (seenIds.has(item.id)) return false
            seenIds.add(item.id)
            return true
          })
        })
        
        setHasMore(data.pagination?.hasMore || false)
      })
      .catch((err) => { 
        // Ignore abort errors
        if (err.name === 'AbortError') return
        
        console.error('Failed to fetch series:', err)
        // نحتفظ بالمحتوى القديم المعروض عند الخطأ — لا نسقطه (يمنع القفز)
        setError('فشل تحميل المسلسلات. حاول مرة أخرى.')
      })
      .finally(() => { 
        // Check if request was aborted before updating loading state
        if (!abortController.signal.aborted) {
          setLoading(false)
          setLoadingMore(false)
          setRefreshing(false)
        }
      })
    
    return () => {
      abortController.abort()
    }
  }, [selectedGenre, selectedYear, selectedRating, selectedCountry, selectedLanguage, sortBy, sortOrder, page, debouncedSearch, retryNonce])

  // Batch fetch card states for all series (only if user is logged in)
  useEffect(() => {
    if (!user || series.length === 0) return

    // Incremental: ask only about items we haven't checked yet, merge into existing states
    const missing = series
      .map(s => ({ content_type: 'tv', tmdb_id: (s.tmdb_id || s.id) as number | string }))
      .filter(i => !fetchedStateKeys.current.has(`tv-${i.tmdb_id}`))
    if (missing.length === 0) return
    missing.forEach(i => fetchedStateKeys.current.add(`tv-${i.tmdb_id}`))

    const fetchStates = async () => {
      try {
        const res = await fetch('/api/user/card-state', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: missing })
        })

        if (!res.ok) return

        const data = await res.json()
        if (data.states) {
          setCardStates(prev => ({ ...prev, ...data.states }))
        }
      } catch (err) {
        // Silently fail - heart buttons will show neutral state
      }
    }

    fetchStates()
  }, [series, user])

  // Infinite scroll observer - prefetch before reaching last rows
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore && !refreshing) {
          setPage(prev => prev + 1)
        }
      },
      { threshold: 0.1, rootMargin: '400px' } // Start loading 400px before reaching the trigger (reduced from 800px)
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, loading, loadingMore, refreshing])

  const toggle = useCallback((name: typeof openDropdown) => {
    setOpenDropdown(prev => prev === name ? null : name)
  }, [])

  // Reset to page 1 when filters change — مع الإبقاء على المحتوى المعروض
  // (يُستبدل عند وصول النتائج الجديدة — يمنع انهيار الشبكة وقفز الصفحة)
  const resetAndFetch = useCallback((callback: () => void) => {
    callback()
    setPage(1)
    setError(null)
  }, [])

  // Clear every active filter at once
  const clearAllFilters = useCallback(() => {
    resetAndFetch(() => {
      setSelectedGenre('all')
      setSelectedYear('all')
      setSelectedRating('all')
      setSelectedCountry('all')
      setSearchQuery('')
      setDebouncedSearch('')
    })
  }, [resetAndFetch])

  // Active filter chips for the results toolbar
  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = []
    if (selectedGenre !== 'all')
      chips.push({ key: 'genre', label: selectedGenre, clear: () => resetAndFetch(() => setSelectedGenre('all')) })
    if (selectedYear !== 'all')
      chips.push({ key: 'year', label: YEARS.find(y => y.value === selectedYear)?.label || selectedYear, clear: () => resetAndFetch(() => setSelectedYear('all')) })
    if (selectedRating !== 'all')
      chips.push({ key: 'rating', label: RATINGS.find(r => r.value === selectedRating)?.label || selectedRating, clear: () => resetAndFetch(() => setSelectedRating('all')) })
    if (selectedCountry !== 'all')
      chips.push({ key: 'country', label: COUNTRIES.find(c => c.value === selectedCountry)?.label || selectedCountry, clear: () => resetAndFetch(() => setSelectedCountry('all')) })
    if (selectedLanguage !== 'all')
      chips.push({ key: 'language', label: LANGUAGE_LABELS[selectedLanguage] || selectedLanguage, clear: () => resetAndFetch(() => setSelectedLanguage('all')) })
    if (debouncedSearch.trim())
      chips.push({ key: 'search', label: `"${debouncedSearch.trim()}"`, clear: () => resetAndFetch(() => { setSearchQuery(''); setDebouncedSearch('') }) })
    return chips
  }, [selectedGenre, selectedYear, selectedRating, selectedCountry, debouncedSearch, resetAndFetch])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" dir="rtl">

      {/* Single page H1 for SEO (visually hidden) */}
      <h1 className="sr-only">المسلسلات المترجمة</h1>

      {/* Header banner — إعلان 1 (728×90): يتمدد مركزيًا ويصغر تلقائيًا على الموبايل */}
      <div className="w-full bg-slate-950 flex justify-center px-3 sm:px-5 md:px-8 lg:px-12 py-3">
        <AdFrame ad={AD_HEADER} variant="x" />
      </div>

      {/* Main Content */}
      <section className="w-full bg-slate-950">
        <div className="max-w-[1920px] mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row gap-6">

            {/* Main column — filters + grid (appears on the RIGHT in RTL) */}
            <div className="flex-1 min-w-0 space-y-6">

          {/* Search & Filters */}
          <div ref={filtersRef} className="flex flex-col md:flex-row items-stretch md:items-center gap-4 bg-slate-800/40 border border-slate-700 p-4 rounded-xl">

            {/* Dropdowns row */}
            <div className="flex flex-wrap items-center gap-3 order-2 md:order-1">

              {/* Genre */}
              <div className="relative">
                <button 
                  onClick={()=>toggle('genre')} 
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50 flex items-center gap-2 min-w-[120px] justify-between"
                  aria-label="اختر التصنيف"
                  aria-expanded={openDropdown==='genre'}
                  aria-haspopup="listbox"
                >
                  <span>{selectedGenre==='all' ? 'كل التصنيفات' : genresList.find(g=>g.name===selectedGenre)?.emoji+' '+selectedGenre}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown==='genre'?'rotate-180':''}`}/>
                </button>
                {openDropdown==='genre' && (
                  <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 min-w-full max-h-[255px] overflow-y-scroll overflow-x-hidden custom-scrollbar overscroll-contain" role="listbox">
                    <button onClick={()=>{resetAndFetch(() => setSelectedGenre('all'));setOpenDropdown(null)}} className={`w-full text-right px-3 py-2 text-sm hover:bg-slate-700 ${selectedGenre==='all'?'bg-slate-700 text-cyan-400':'text-slate-100'}`} role="option" aria-selected={selectedGenre==='all'}>كل التصنيفات</button>
                    {genresList.map(g=>(
                      <button key={g.name} onClick={()=>{resetAndFetch(() => setSelectedGenre(g.name));setOpenDropdown(null)}} className={`w-full text-right px-3 py-2 text-sm hover:bg-slate-700 whitespace-nowrap ${selectedGenre===g.name?'bg-slate-700 text-cyan-400':'text-slate-100'}`} role="option" aria-selected={selectedGenre===g.name}>{g.emoji} {g.name}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Year */}
              <div className="relative">
                <button onClick={()=>toggle('year')} className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 flex items-center gap-2 min-w-[110px] justify-between">
                  <span>{YEARS.find(y=>y.value===selectedYear)?.label||'كل السنوات'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown==='year'?'rotate-180':''}`}/>
                </button>
                {openDropdown==='year' && (
                  <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 min-w-full max-h-[255px] overflow-y-scroll overflow-x-hidden custom-scrollbar overscroll-contain">
                    {YEARS.map(y=>(
                      <button key={y.value} onClick={()=>{resetAndFetch(() => setSelectedYear(y.value));setOpenDropdown(null)}} className={`w-full text-right px-3 py-2 text-sm hover:bg-slate-700 ${selectedYear===y.value?'bg-slate-700 text-cyan-400':'text-slate-100'}`}>{y.label}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Rating */}
              <div className="relative">
                <button onClick={()=>toggle('rating')} className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 flex items-center gap-2 min-w-[120px] justify-between">
                  <span>{RATINGS.find(r=>r.value===selectedRating)?.label||'كل التقييمات'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown==='rating'?'rotate-180':''}`}/>
                </button>
                {openDropdown==='rating' && (
                  <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 min-w-full max-h-[255px] overflow-y-scroll overflow-x-hidden custom-scrollbar overscroll-contain">
                    {RATINGS.map(r=>(
                      <button key={r.value} onClick={()=>{resetAndFetch(() => setSelectedRating(r.value));setOpenDropdown(null)}} className={`w-full text-right px-3 py-2 text-sm hover:bg-slate-700 ${selectedRating===r.value?'bg-slate-700 text-cyan-400':'text-slate-100'}`}>{r.label}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Country */}
              <div className="relative">
                <button onClick={()=>toggle('country')} className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 flex items-center gap-2 min-w-[100px] justify-between">
                  <span>{COUNTRIES.find(c=>c.value===selectedCountry)?.label||'كل الدول'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown==='country'?'rotate-180':''}`}/>
                </button>
                {openDropdown==='country' && (
                  <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 min-w-full max-h-[255px] overflow-y-scroll overflow-x-hidden custom-scrollbar overscroll-contain">
                    {COUNTRIES.map(c=>(
                      <button key={c.value} onClick={()=>{resetAndFetch(() => setSelectedCountry(c.value));setOpenDropdown(null)}} className={`w-full text-right px-3 py-2 text-sm hover:bg-slate-700 ${selectedCountry===c.value?'bg-slate-700 text-cyan-400':'text-slate-100'}`}>{c.label}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sort */}
              <div className="relative">
                <button onClick={()=>toggle('sort')} className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 flex items-center gap-2 min-w-[120px] justify-between">
                  <span>{SORT_OPTIONS.find(s=>s.value===sortBy && s.order===sortOrder)?.icon} {SORT_OPTIONS.find(s=>s.value===sortBy && s.order===sortOrder)?.label}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown==='sort'?'rotate-180':''}`}/>
                </button>
                {openDropdown==='sort' && (
                  <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 min-w-full max-h-[255px] overflow-y-scroll overflow-x-hidden custom-scrollbar overscroll-contain">
                    {SORT_OPTIONS.map((o, idx)=>(
                      <button key={`${o.value}-${o.order}-${idx}`} onClick={()=>{resetAndFetch(() => { setSortBy(o.value); setSortOrder(o.order) });setOpenDropdown(null)}} className={`w-full text-right px-3 py-2 text-sm hover:bg-slate-700 whitespace-nowrap ${sortBy===o.value && sortOrder===o.order?'bg-slate-700 text-cyan-400':'text-slate-100'}`}>{o.icon} {o.label}</button>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Search */}
            <div className="relative flex-1 order-1 md:order-2">
              <input 
                type="text" 
                id="series-search"
                name="search"
                placeholder="ابحث عن مسلسل..." 
                value={searchQuery}
                onChange={e=>setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 pr-10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50 text-sm"
                aria-label="البحث عن مسلسل"
              />
              <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5"/>
            </div>
          </div>

          {/* Results toolbar: count + active filter chips */}
          {(activeFilters.length > 0 || series.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 mb-5">
              {series.length > 0 && (
                <span className="text-sm font-bold text-slate-500 ml-1">
                  {series.length} <span className="font-medium">نتيجة</span>
                </span>
              )}
              {activeFilters.map(f => (
                <button
                  key={f.key}
                  onClick={f.clear}
                  className="group flex items-center gap-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 hover:border-cyan-500/50 rounded-full pl-2 pr-3 py-1 text-xs font-bold text-cyan-300 transition-colors"
                  aria-label={`إزالة فلتر ${f.label}`}
                >
                  <span className="max-w-[160px] truncate">{f.label}</span>
                  <X className="w-3.5 h-3.5 text-cyan-400/70 group-hover:text-cyan-300 transition-all duration-200 group-hover:rotate-90" />
                </button>
              ))}
              {activeFilters.length > 1 && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs font-bold text-slate-500 hover:text-slate-300 underline underline-offset-4 decoration-slate-700 hover:decoration-slate-500 transition-colors mr-1"
                >
                  مسح الكل
                </button>
              )}
            </div>
          )}

          {/* Grid */}
          <div className="mt-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
              <div className="text-red-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-red-300 text-sm font-bold">{error}</p>
              </div>
              <button 
                onClick={() => setRetryNonce(n => n + 1)}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-300 text-sm font-bold transition-colors"
              >
                إعادة المحاولة
              </button>
            </div>
          )}
          {loading && series.length === 0 ? (
            <div className="grid-responsive gap-6">
              {[...Array(SKELETON_COUNT)].map((_,i)=>(
                <div key={i} className="rounded-2xl overflow-hidden bg-slate-900/20 border border-slate-800/60">
                  <div className="aspect-[2/3] w-full bg-slate-800 animate-pulse"/>
                  <div className="p-2.5 h-[52px] flex flex-col justify-center gap-2">
                    <div className="h-3 bg-slate-800 rounded animate-pulse w-3/4"/>
                    <div className="h-2 bg-slate-800 rounded animate-pulse w-1/2"/>
                  </div>
                </div>
              ))}
            </div>
          ) : series.length > 0 ? (
            <>
              {/* شبكة ثابتة: مساحة محجزة دائمًا + شريط تحديث رفيع (لا تغيّر ارتفاعها) */}
              <div className="relative min-h-[320px]">
                {refreshing && (
                  <div className="absolute top-0 left-0 right-0 z-20 h-0.5 overflow-hidden rounded-full bg-slate-800/80" aria-hidden="true">
                    <div className="h-full w-1/2 rounded-full bg-gradient-to-l from-sky-500 via-cyan-400 to-sky-500 animate-pulse" />
                  </div>
                )}
              <div className="grid-responsive gap-6">
                {series.map((item, index) => {
                  const tmdbId = item.tmdb_id || item.id
                  const stateKey = `tv-${tmdbId}`
                  return (
                    <Fragment key={item.id}>
                      <MovieCard
                      key={item.id}
                      movie={{
                        ...item,
                        media_type: 'tv'
                      }} 
                      index={index} 
                      isVisible={true}
                      initialCardState={user ? cardStates[stateKey] : undefined}
                      onStateChange={(newState) => {
                        setCardStates(prev => ({ ...prev, [stateKey]: newState }))
                      }}
                    />
                      {(index + 1) % AD_EVERY_N_CARDS === 0 && (
                        <div className="flex justify-center">
                          <AdInRowCard pos={`s-${index + 1}`} />
                        </div>
                      )}
                    </Fragment>
                  )
                })}
                </div>
              </div>

              {/* Infinite scroll trigger */}
              <div ref={observerTarget} className="h-10 mt-6"></div>

              {/* Loading indicator */}
              {loadingMore && (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-3 text-slate-400">
                    <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-bold">جاري التحميل...</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <Tv className="w-20 h-20 text-slate-800 mb-4"/>
              <p className="text-2xl font-bold text-slate-300 mb-2">لا توجد نتائج</p>
              <p className="text-slate-500">جرب تغيير الفلاتر أو البحث</p>
            </div>
          )}
            </div>
            </div>

            {/* Side ads column — last child in RTL => appears on the LEFT of the grid: 300×250 then 160×600 stacked */}
            {/* العمود الجانبي (يسار في RTL) — لاصق أثناء السكرول لعروض أعلى:
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
        </div>
      </section>

      {/* إعلان 4 (468×60) — فاصل خفيف بين الشبكة والفوتر */}
      <div className="flex justify-center px-4 py-2">
        <AdFrame ad={AD_FOOTER_MID} variant="x" />
      </div>

      {/* شريط الموبايل الثابت — إعلان 6 (320×50) */}
      <MobileStickyAd />

      <div className="pb-12"><Footer/></div>
    </div>
  )
}
