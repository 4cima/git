'use client'

import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from 'react'
import { useSearchParams } from 'next/navigation'
import { Tv, X } from 'lucide-react'
import { Footer } from '@/components/layout/Footer'
import { MovieCard } from '@/components/features/media/MovieCard'
import { AdFrame } from '@/components/features/system/AdsterraBanner'
import { MobileStickyAd } from '@/components/features/system/MobileStickyAd'
import { AdInRowCard, AD_EVERY_N_CARDS } from './HomeAdCard'
import { getAdByNum } from '@/data/ads/4cima.com'
import { LISTING_PAGE_SIZE, LISTING_TOP_CARDS_COUNT } from '@/lib/listing-config'
import { useListingGenres, isFallbackGenreList } from '@/hooks/useListingGenres'
import { ListingPageHeader, HeaderLinkButton } from './ListingPageHeader'
import { CinematicFilterBar, CinematicDropdown, CinematicSearch, CinematicSortGroup } from './CinematicFilterBar'
import { YEARS, RATINGS, COUNTRIES, SERIES_SORT_OPTIONS as SORT_OPTIONS } from './listingFilters'

/* ===== خريطة إعلانات القسم — الأرقام من src/data/ads/4cima.com =====
   1: 728×90 هيدر | 2: 300×250 أعلى العمود الجانبي | 3: 160×600 سكرايبر ديسكتوب
   4: 468×60 فاصل قبل الفوتر | 5: 160×300 كارت داخل الجريد (AdInRowCard)
   6: 320×50 شريط الموبايل الثابت (MobileStickyAd) */
const AD_HEADER = getAdByNum(1)!
const AD_SIDE_RECT = getAdByNum(2)!
const AD_FOOTER_MID = getAdByNum(4)!
import { useAuth } from '@/hooks/useAuth'

/* سلاجات التصنيفات — مُتحقَّق منها حياً على D1 (2026-09-16): الـ13 كلها موجودة في جدول genres
   بالصيغة الشرطية (action-adventure=10759، sci-fi-fantasy=10765).
   ⚠️ لا تستبدلها بصيغة الـ«&» (action-&-adventure / sci-fi-&-fantasy): تلك موجودة في قاعدة
   البيانات المحلية القديمة فقط، وغير موجودة في D1 ⇒ ترجع قائمة فارغة صامتة. */
const GENRES = [
  { name: 'دراما',               slug: 'drama',             emoji: '🎭' },
  { name: 'كوميديا',             slug: 'comedy',            emoji: '😂' },
  { name: 'رسوم متحركة',        slug: 'animation',         emoji: '🎨' },
  { name: 'أكشن ومغامرة',        slug: 'action-adventure', emoji: '💥' },
  { name: 'خيال علمي وفانتازيا', slug: 'sci-fi-fantasy',   emoji: '' },
  { name: 'جريمة',               slug: 'crime',             emoji: '🕵️' },
  { name: 'واقعي',               slug: 'reality',           emoji: '📹' },
  { name: 'غموض',                slug: 'mystery',           emoji: '🔍' },
  { name: 'عائلي',               slug: 'family',            emoji: '👨‍👩‍👧‍👦' },
  { name: 'أطفال',               slug: 'kids',              emoji: '👶' },
  { name: 'دراما اجتماعية',     slug: 'soap',              emoji: '🎭' },
  { name: 'غربي',                slug: 'western',           emoji: '🤠' },
  { name: 'رومانسي',             slug: 'romance',           emoji: '💕' },
] as const

// تسميات عربية لأكواد اللغات (تظهر في شرائح الفلاتر النشطة)
const LANGUAGE_LABELS: Record<string, string> = {
  ar: 'عربي', en: 'إنجليزي', ko: 'كوري', ja: 'ياباني', zh: 'صيني',
  hi: 'هندي', tr: 'تركي', es: 'إسباني', fr: 'فرنسي', de: 'ألماني',
  pt: 'برتغالي', ru: 'روسي', it: 'إيطالي', th: 'تايلاندي',
}

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

interface SeriesPageClientProps {
  initialSeries?: any[]
  initialHasMore?: boolean
  /** قفل اللغة (وضع صفحة قسم لغة): اللغة ثابتة من أول رندر — ممنوع fallback إلى 'all' ولو لحظة */
  forcedLanguage?: string
  /** عنوان مخصص (H1) — وضع قسم اللغة يمرّر "مسلسلات {اللغة}"، والعام يستخدم الافتراضي */
  title?: string
  /** كود اللغة في الـURL (مثل 'ar') — لرابط صفحة النظير في هيدر اللغة */
  langCode?: string
  /** اسم اللغة بالعربية (من findNavLanguage) — يظهر في الـbreadcrumb والـH1 */
  langLabel?: string
}

export function SeriesPageClient({ initialSeries = [], initialHasMore = false, forcedLanguage, title, langCode, langLabel }: SeriesPageClientProps) {
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
  const [selectedLanguage, setSelectedLanguage] = useState<string>(forcedLanguage ?? initialFilters.language ?? 'all')
  const [sortBy, setSortBy]                   = useState('popularity')
  const [sortOrder, setSortOrder]             = useState('desc')
  const [page, setPage]                       = useState(1)
  const [hasMore, setHasMore]                 = useState(initialHasMore)
  const [retryNonce, setRetryNonce]           = useState(0)
  const observerTarget = useRef<HTMLDivElement>(null)
  /* هوية آخر طلب fetch — الـfinally يفرّغ الحالات للطلب الأخير فقط (يمنع «جاري التحميل...» العالق) */
  const fetchRunRef = useRef(0)

  // Batch card states for heart buttons
  const [cardStates, setCardStates] = useState<Record<string, 'neutral' | 'favorite' | 'completed'>>({})
  // Keys already requested — so appended pages only fetch their own new items
  const fetchedStateKeys = useRef<Set<string>>(new Set())

  /* التقسيم ثابت في الـDOM (سيرفرًا وعميلًا): أول 16 كارت في البلوك العلوي والبقية
     في الشبكة السفلية. موضع الإعلان (جنب العلوي ديسكتوبًا / أسفل الكل على الجوال)
     يُضبط بـCSS grid فقط — لا JS ولا matchMedia في التخطيط. */
  const topItems = series.slice(0, LISTING_TOP_CARDS_COUNT)
  const restItems = series.slice(LISTING_TOP_CARDS_COUNT)

  // Single open dropdown at a time
  const [openDropdown, setOpenDropdown] = useState<'genre'|'year'|'rating'|'country'|'sort'|null>(null)
  const filtersRef = useRef<HTMLDivElement>(null)

  /* مزامنة فلتر التصنيف من الـURL بعد وصول القائمة الديناميكية —
     يغطي الروابط العميقة لتصنيفات غير موجودة في القائمة الاحتياطية */
  const didDynamicGenreSync = useRef(false)
  useEffect(() => {
    if (isFallbackGenreList(genresList, GENRES) || didDynamicGenreSync.current) return
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
    
    // Read language from URL (maps to country filter) — الوضع المقفول لا يتغيّر أبدًا
    if (forcedLanguage) {
      setSelectedLanguage(forcedLanguage)
    } else {
      const urlLanguage = searchParams.get('language')
      if (urlLanguage) {
        // Sent directly to the API — accurate original_language filter (no lossy country mapping)
        setSelectedLanguage(urlLanguage.toLowerCase())
      } else {
        setSelectedLanguage('all')
      }
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
  }, [searchParams, forcedLanguage]) // Re-run whenever URL search params change

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
    const runId = ++fetchRunRef.current
    /* مهلة أمان: أي طلب معلّق يُجهَض بعد 20 ثانية حتى لا يبقى «جاري التحميل...» عالقًا */
    const abortTimeout = setTimeout(() => abortController.abort(), 20000)
    
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

    /* تخطي الجلب الأول: بيانات الـSSR جاهزة ولا توجد فلاتر نشطة أو إعادة محاولة
       (نفس حارس MoviesPageClient.tsx:258-274 — يوفر طلبًا كاملًا ويمنع وميض القائمة) */
    if (
      retryNonce === 0 &&
      page === 1 &&
      sortBy === 'popularity' &&
      sortOrder === 'desc' &&
      series.length > 0 &&
      initialFilters.genre === 'all' &&
      initialFilters.year === 'all' &&
      initialFilters.rating === 'all' &&
      initialFilters.country === 'all' &&
      initialFilters.language === 'all' &&
      !initialFilters.search
    ) {
      return
    }

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
        clearTimeout(abortTimeout)
        // الطلبات المتجاوزة (الملغاة) لا تمس حالات الطلب الأحدث — وآخر طلب يفرّغ الحالات دائمًا
        if (fetchRunRef.current === runId) {
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
    if (selectedLanguage !== 'all' && !forcedLanguage)
      chips.push({ key: 'language', label: LANGUAGE_LABELS[selectedLanguage] || selectedLanguage, clear: () => resetAndFetch(() => setSelectedLanguage('all')) })
    if (debouncedSearch.trim())
      chips.push({ key: 'search', label: `"${debouncedSearch.trim()}"`, clear: () => resetAndFetch(() => { setSearchQuery(''); setDebouncedSearch('') }) })
    return chips
  }, [selectedGenre, selectedYear, selectedRating, selectedCountry, debouncedSearch, resetAndFetch, forcedLanguage])

  /* ===== الهيدر الموحّد (وضع اللغة + الوضع العام) — نفس نظام كل صفحات القوائم ===== */
  const isLangMode = Boolean(langLabel && langCode)
  const headerTitle = title ?? 'المسلسلات المترجمة'
  const headerDescription = isLangMode
    ? `استكشف جميع مسلسلات ${langLabel} المترجمة`
    : 'استكشف جميع المسلسلات المترجمة بجودة عالية'
  const headerBreadcrumb = isLangMode
    ? [
        { label: 'الرئيسية', href: '/' },
        { label: 'التصنيفات', href: '/genres' },
        { label: 'مسلسلات' },
        { label: langLabel! },
      ]
    : [
        { label: 'الرئيسية', href: '/' },
        { label: 'المسلسلات' },
      ]
  const headerActions = isLangMode ? (
    <>
      <HeaderLinkButton href="/series">نظرة عامة على المسلسلات</HeaderLinkButton>
      <HeaderLinkButton href={`/movies/lang/${langCode}`} accent="movie" chevron>أفلام {langLabel}</HeaderLinkButton>
    </>
  ) : (
    <HeaderLinkButton href="/movies" accent="movie" chevron>تصفح الأفلام</HeaderLinkButton>
  )

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" dir="rtl">

      {/* Header banner — إعلان 1 (728×90): يتمدد مركزيًا ويصغر تلقائيًا على الموبايل */}
      <div className="w-full bg-slate-950 flex justify-center px-3 sm:px-5 md:px-8 lg:px-12">
        <AdFrame ad={AD_HEADER} variant="x" />
      </div>

      {/* Main Content */}
      <section className="w-full bg-slate-950">
        <div className="max-w-[1920px] mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4">
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-x-6">

            {/* الهيدر الموحّد + الفلاتر + شريط النتائج (يمين في RTL) — الإعلان الجانبي بجانبها في صف واحد */}
            <div className="min-w-0">

          {/* Header موحّد (Breadcrumb + H1 + وصف + أزرار تنقّل) — نفس نظام كل صفحات القوائم */}
          <ListingPageHeader
            variant="series"
            title={headerTitle}
            description={headerDescription}
            breadcrumb={headerBreadcrumb}
            actions={headerActions}
          />

          {/* Bar الفلاتر السينمائي الموحّد (زجاجي داكن) */}
          <div ref={filtersRef}>
            <CinematicFilterBar accent="series">

            {/* Dropdowns row */}
            <div className="flex flex-wrap items-center gap-3 order-2 md:order-1">

              {/* Genre */}
              <CinematicDropdown
                open={openDropdown==='genre'}
                onToggle={()=>toggle('genre')}
                currentLabel={selectedGenre==='all' ? 'كل التصنيفات' : (genresList.find(g=>g.name===selectedGenre)?.emoji+' '+selectedGenre)}
                ariaLabel="اختر التصنيف"
                accent="series"
                options={[{ value: 'all', label: 'كل التصنيفات' }, ...genresList.map(g => ({ value: g.name, label: `${g.emoji} ${g.name}` }))]}
                isSelected={v => selectedGenre===v}
                onSelect={v => { resetAndFetch(() => setSelectedGenre(v)); setOpenDropdown(null) }}
              />

              {/* Year */}
              <CinematicDropdown
                open={openDropdown==='year'}
                onToggle={()=>toggle('year')}
                currentLabel={YEARS.find(y=>y.value===selectedYear)?.label||'كل السنوات'}
                ariaLabel="اختر السنة"
                accent="series"
                minWidth="min-w-[110px]"
                options={YEARS.map(y => ({ value: y.value, label: y.label }))}
                isSelected={v => selectedYear===v}
                onSelect={v => { resetAndFetch(() => setSelectedYear(v)); setOpenDropdown(null) }}
              />

              {/* Rating */}
              <CinematicDropdown
                open={openDropdown==='rating'}
                onToggle={()=>toggle('rating')}
                currentLabel={RATINGS.find(r=>r.value===selectedRating)?.label||'كل التقييمات'}
                ariaLabel="اختر التقييم"
                accent="series"
                options={RATINGS.map(r => ({ value: r.value, label: r.label }))}
                isSelected={v => selectedRating===v}
                onSelect={v => { resetAndFetch(() => setSelectedRating(v)); setOpenDropdown(null) }}
              />

              {/* Country */}
              <CinematicDropdown
                open={openDropdown==='country'}
                onToggle={()=>toggle('country')}
                currentLabel={COUNTRIES.find(c=>c.value===selectedCountry)?.label||'كل الدول'}
                ariaLabel="اختر الدولة"
                accent="series"
                minWidth="min-w-[100px]"
                options={COUNTRIES.map(c => ({ value: c.value, label: c.label }))}
                isSelected={v => selectedCountry===v}
                onSelect={v => { resetAndFetch(() => setSelectedCountry(v)); setOpenDropdown(null) }}
              />

            </div>

            {/* Sort — أزرار ظاهرة مباشرة (توحيدًا مع صفحات التصنيفات، بلا dropdown) */}
            <CinematicSortGroup
              className="order-3 md:order-2"
              accent="series"
              options={SORT_OPTIONS}
              value={sortBy}
              order={sortOrder}
              onChange={(v, o) => resetAndFetch(() => { setSortBy(v); setSortOrder(o) })}
            />

            {/* Search */}
            <CinematicSearch
              id="series-search"
              value={searchQuery}
              onChange={v => setSearchQuery(v)}
              placeholder="ابحث عن مسلسل..."
              ariaLabel="البحث عن مسلسل"
              accent="series"
            />
          </CinematicFilterBar>
        </div>

          {/* Results toolbar: active filter chips */}
          {activeFilters.length > 0 && (
            <div className="mt-3 mb-4 flex flex-wrap items-center gap-2">
              {activeFilters.map(f => (
                <button
                  key={f.key}
                  onClick={f.clear}
                  className="group flex items-center gap-1.5 bg-[#78350f]/25 hover:bg-[#78350f]/40 border border-[#b45309]/35 hover:border-[#b45309]/65 rounded-full pl-2 pr-3 py-1 text-xs font-bold text-[#fcd34d] transition-colors"
                  aria-label={`إزالة فلتر ${f.label}`}
                >
                  <span className="max-w-[160px] truncate">{f.label}</span>
                  <X className="w-3.5 h-3.5 text-[#fcd34d]/70 group-hover:text-[#fcd34d] transition-all duration-200 group-hover:rotate-90" />
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

          </div>

            {/* الإعلان الجانبي (يسار في RTL): 300×250 — بجانب الفلاتر فقط (صف واحد).
                ديسكتوب فقط؛ على الجوال مخفي تمامًا */}
            <aside className="hidden lg:flex flex-col items-start lg:w-[300px] lg:shrink-0 lg:sticky lg:top-24 lg:self-start mt-0">
              <AdFrame ad={AD_SIDE_RECT} variant="y" />
            </aside>
          </div>

          {/* الكروت بعرض كامل تحت صف (الهيدر + الفلاتر + الإعلان) — بلا هامش زائد بعد البار */}
          <div>
          <div className="min-w-0">

          {/* Grid */}
          <div>
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
                    <div className="h-full w-1/2 rounded-full bg-gradient-to-l from-[#b45309] via-[#f59e0b] to-[#b45309] animate-pulse" />
                  </div>
                )}
              <div className="grid-responsive gap-6">
                {topItems.map((item: any, index: number) => {
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
                      eager={index < LISTING_TOP_CARDS_COUNT}
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

            {/* الشبكة السفلية: بقية الأعمال + السكرول اللانهائي — بعرض كامل */}
            <div className="min-w-0 mt-6">
              {restItems.length > 0 && (
                <div className="grid-responsive gap-6">
                  {restItems.map((item: any, i: number) => {
                    const index = LISTING_TOP_CARDS_COUNT + i
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
              )}

              {series.length > 0 && (
                <>
                  {/* زر «تحميل المزيد» الموحّد — fallback يدوي يضمن التحميل حتى لو لم يعمل السكرول اللانهائي */}
                  {hasMore && !loading && !refreshing && (
                    <div className="flex justify-center">
                      <button
                        onClick={() => setPage(prev => prev + 1)}
                        disabled={loadingMore}
                        className="px-8 py-3 bg-black/40 hover:bg-black/60 border border-[#b45309]/40 hover:border-[#b45309]/70 rounded-xl text-sm font-bold text-[#fcd34d] hover:text-[#fde68a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {loadingMore ? 'جاري التحميل...' : 'تحميل المزيد'}
                      </button>
                    </div>
                  )}

                  {/* Infinite scroll trigger */}
                  <div ref={observerTarget} className="h-10 mt-6"></div>

                  {/* Loading indicator */}
                  {loadingMore && (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center gap-3 text-slate-400">
                        <div className="w-6 h-6 border-2 border-[#b45309] border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm font-bold">جاري التحميل...</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
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
