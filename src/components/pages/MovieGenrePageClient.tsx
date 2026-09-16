'use client'

import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from 'react'
import { Film, X } from 'lucide-react'
import { MovieCard } from '@/components/features/media/MovieCard'
import { ListingPageHeader, HeaderLinkButton } from './ListingPageHeader'
import { CinematicFilterBar, CinematicDropdown, CinematicSearch, CinematicSortGroup } from './CinematicFilterBar'
import { YEARS, RATINGS, COUNTRIES, LANGUAGES, MOVIE_SORT_OPTIONS as SORT_OPTIONS } from './listingFilters'
import { AdFrame } from '@/components/features/system/AdsterraBanner'
import { MobileStickyAd } from '@/components/features/system/MobileStickyAd'
import { Footer } from '@/components/layout/Footer'
import { AdInRowCard, AD_EVERY_N_CARDS } from './HomeAdCard'
import { getAdByNum } from '@/data/ads/4cima.com'
import { LISTING_PAGE_SIZE, LISTING_TOP_CARDS_COUNT } from '@/lib/listing-config'

/* ===== إعلانات صفحة التصنيف — أرقام موحّدة من src/data/ads/4cima.com (نظام موحّد لكل صفحات القوائم) =====
   1: 728×90 هيدر | 2: 300×250 عمود جانبي | 3: 160×600 سكرايبر ديسكتوب
   4: 468×60 فاصل قبل الفوتر | 5: 160×300 كارت داخل الجريد (AdInRowCard)
   6: 320×50 شريط الموبايل الثابت (MobileStickyAd) */
const AD_HEADER = getAdByNum(1)! // 728×90
const AD_SIDE_RECT = getAdByNum(2)! // 300×250
const AD_FOOTER_MID = getAdByNum(4)! // 468×60

interface MovieGenrePageClientProps {
  genre: any
  slug: string
  initialMovies: any[]
  initialHasMore: boolean
  /** رابط صفحة نظير المسلسلات (افتراضي: /series/genres/{slug}) */
  seriesHref?: string
}

export function MovieGenrePageClient({ genre, slug, initialMovies, initialHasMore, seriesHref }: MovieGenrePageClientProps) {

  const [content, setContent] = useState<any[]>(initialMovies)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  /* تحديث بدون قفز: عند ترتيب/تغيير والمحتوى معروض يبقى مكانه + شريط رفيع */
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState('popularity')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  /* إعادة المحاولة: زيادة الرقم تجبر الـeffect على العمل حتى لو نفس الصفحة/الترتيب */
  const [retryNonce, setRetryNonce] = useState(0)

  /* فلاتر موحّدة — نفس فلاتر صفحات اللغة (التصنيف مثبّت كفلتر الصفحة نفسه، مثل قفل اللغة هناك) */
  const [openDropdown, setOpenDropdown]       = useState<'year'|'rating'|'country'|'language'|null>(null)
  const [selectedYear, setSelectedYear]       = useState('all')
  const [selectedRating, setSelectedRating]   = useState('all')
  const [selectedCountry, setSelectedCountry] = useState('all')
  /* (E-10) فلتر اللغة — كان غائباً في صفحات التصنيف (لم يكن متاحاً إلا بتمرير ?language= في الرابط) */
  const [selectedLanguage, setSelectedLanguage] = useState('all')
  const [searchQuery, setSearchQuery]         = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const filtersRef = useRef<HTMLDivElement>(null)

  const observerTarget = useRef<HTMLDivElement>(null)
  const SKELETON_COUNT = 24

  /* الهيدر الموحّد: مسار التنقل + أزرار التنقّل السريع (نفس نظام كل صفحات القوائم) */
  /* (E-11) فرع slug === 'arabic' حُذف: لا يوجد صف 'arabic' في جدول genres
     (تحقق مباشر من قاعدة البيانات)، والقسم العربي مساره الرسمي /movies/lang/ar
     كما في src/lib/language-nav.ts — فالفرع كان كودًا ميتًا غير قابل للبلوغ. */
  const headerBreadcrumb = [
    { label: 'الرئيسية', href: '/' },
    { label: 'التصنيفات', href: '/genres' },
    { label: genre.name_ar, href: `/genres/${slug}` },
    { label: 'أفلام' },
  ]
  const headerActions = (
    <>
      <HeaderLinkButton href={`/genres/${slug}`}>نظرة عامة على {genre.name_ar}</HeaderLinkButton>
      <HeaderLinkButton href={seriesHref ?? `/series/genres/${slug}`} accent="series" chevron>مسلسلات {genre.name_ar}</HeaderLinkButton>
    </>
  )

  /* التقسيم ثابت في الـDOM (سيرفرًا وعميلًا): أول 16 كارت في البلوك العلوي والبقية
     في الشبكة السفلية. موضع الإعلان (جنب العلوي ديسكتوبًا / أسفل الكل على الجوال)
     يُضبط بـCSS grid فقط — لا JS ولا matchMedia في التخطيط. */
  const topItems = content.slice(0, LISTING_TOP_CARDS_COUNT)
  const restItems = content.slice(LISTING_TOP_CARDS_COUNT)

  // Fetch movies — نفس منطق صفحات اللغة: /api/movies والتصنيف مثبّت كفلتر + الفلاتر الكاملة
  useEffect(() => {
    // Skip initial fetch if we already have data from SSR (unless retry requested)
    if (
      retryNonce === 0 && page === 1 && sort === 'popularity' && order === 'desc' && content.length > 0 &&
      selectedYear === 'all' && selectedRating === 'all' && selectedCountry === 'all' &&
      selectedLanguage === 'all' && !debouncedSearch.trim()
    ) {
      return
    }
    
    let cancelled = false
    const abortController = new AbortController()
    /* مهلة أمان: أي طلب معلّق يُجهَض بعد 20 ثانية — «جاري التحميل...» لا يبقى عالقًا أبدًا */
    const abortTimeout = setTimeout(() => abortController.abort(), 20000)
    
    const params = new URLSearchParams({
      genre: slug,
      page: page.toString(),
      limit: LISTING_PAGE_SIZE.toString(),
      sort,
      order
    })
    if (selectedYear    !== 'all') params.set('year', selectedYear)
    if (selectedRating  !== 'all') params.set('rating_min', selectedRating)
    if (selectedCountry !== 'all') params.set('country', selectedCountry)
    if (selectedLanguage !== 'all') params.set('language', selectedLanguage)
    if (debouncedSearch.trim())    params.set('search', debouncedSearch.trim())

    const isFirstPage = page === 1
    if (isFirstPage) {
      // محتوى معروض؟ حدّث مكانه بشريط رفيع (لا سكبور — لا قفز)
      if (content.length > 0) setRefreshing(true)
      else setLoading(true)
    }
    else setLoadingMore(true)
    
    setError(null)
    
    fetch(`/api/movies?${params}`, { signal: abortController.signal })

      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        if (cancelled) return
        const newContent = data.movies || []
        
        setContent(prevContent => {
          const combined = isFirstPage ? newContent : [...prevContent, ...newContent]
          const seenIds = new Set<number>()
          return combined.filter((item: any) => {
            if (seenIds.has(item.id)) return false
            seenIds.add(item.id)
            return true
          })
        })
        
        setHasMore(data.pagination?.hasMore || false)
      })
      .catch(err => {
        // التجاهل الصامت للإلغاء (مهلة الأمان أو طلب متجاوز) — لا رسالة خطأ زائفة
        if (!cancelled && err.name !== 'AbortError') {
          console.error('Failed to fetch movies:', err)
          // نحتفظ بالمحتوى المعروض — لا نسقطه (يمنع القفز)
          setError('فشل تحميل الأفلام. حاول مرة أخرى.')
        }
      })
      .finally(() => {
        clearTimeout(abortTimeout)
        if (!cancelled) {
          setLoading(false)
          setLoadingMore(false)
          setRefreshing(false)
        }
      })
    
    return () => { cancelled = true; abortController.abort() }
  }, [slug, sort, order, page, initialMovies.length, retryNonce, selectedYear, selectedRating, selectedCountry, selectedLanguage, debouncedSearch])

  // Infinite scroll observer
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

  // Reset to page 1 when filters change — مع الإبقاء على المحتوى المعروض
  const resetAndFetch = useCallback((callback: () => void) => {
    callback()
    setPage(1)
    setError(null)
  }, [])

  /* Debounce للبحث — نفس سلوك صفحات اللغة */
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setDebouncedSearch(searchQuery) }, 400)
    return () => clearTimeout(t)
  }, [searchQuery])

  // إغلاق القوائم المنسدلة عند النقر خارجها
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) setOpenDropdown(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = useCallback((name: 'year'|'rating'|'country'|'language') => {
    setOpenDropdown(prev => prev === name ? null : name)
  }, [])

  // Clear every active filter at once
  const clearAllFilters = useCallback(() => {
    resetAndFetch(() => {
      setSelectedYear('all')
      setSelectedRating('all')
      setSelectedCountry('all')
      setSelectedLanguage('all')
      setSearchQuery('')
      setDebouncedSearch('')
    })
  }, [resetAndFetch])

  // Active filter chips (بلا عدّاد نتائج)
  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = []
    if (selectedYear !== 'all')
      chips.push({ key: 'year', label: YEARS.find(y => y.value === selectedYear)?.label || selectedYear, clear: () => resetAndFetch(() => setSelectedYear('all')) })
    if (selectedRating !== 'all')
      chips.push({ key: 'rating', label: RATINGS.find(r => r.value === selectedRating)?.label || selectedRating, clear: () => resetAndFetch(() => setSelectedRating('all')) })
    if (selectedCountry !== 'all')
      chips.push({ key: 'country', label: COUNTRIES.find(c => c.value === selectedCountry)?.label || selectedCountry, clear: () => resetAndFetch(() => setSelectedCountry('all')) })
    if (selectedLanguage !== 'all')
      chips.push({ key: 'language', label: LANGUAGES.find(l => l.value === selectedLanguage)?.label || selectedLanguage, clear: () => resetAndFetch(() => setSelectedLanguage('all')) })
    if (debouncedSearch.trim())
      chips.push({ key: 'search', label: `"${debouncedSearch.trim()}"`, clear: () => resetAndFetch(() => { setSearchQuery(''); setDebouncedSearch('') }) })
    return chips
  }, [selectedYear, selectedRating, selectedCountry, selectedLanguage, debouncedSearch, resetAndFetch])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12">
      <div className="page-container">
        {/* بنر 728×90 — نظام AdFrame */}
        <div className="flex justify-center">
          <AdFrame ad={AD_HEADER} variant="x" />
        </div>

        {/* الصف الوحيد في الجريد: الهيدر + السورت، وبجانبهما الإعلان الجانبي (ديسكتوب فقط — مخفي تمامًا على الجوال).
            الكروت تحت بعرض كامل خارج الـgrid. */}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-x-6">
          <div className="min-w-0">

        {/* Header موحّد (Breadcrumb + H1 + وصف + أزرار تنقّل) — نفس نظام كل صفحات القوائم */}
        <ListingPageHeader
          variant="movie"
          title={`أفلام ${genre.name_ar}`}
          description={`استكشف جميع أفلام ${genre.name_ar} المترجمة`}
          breadcrumb={headerBreadcrumb}
          actions={headerActions}
        />

        {/* Bar الفلاتر السينمائي الموحّد — نفس فلاتر صفحات اللغة (التصنيف مثبّت كفلتر الصفحة) */}
        <div ref={filtersRef}>
          <CinematicFilterBar accent="movie">
            {/* Dropdowns row */}
            <div className="flex flex-wrap items-center gap-3 order-2 md:order-1">
              <CinematicDropdown
                open={openDropdown==='year'}
                onToggle={()=>toggle('year')}
                currentLabel={YEARS.find(y=>y.value===selectedYear)?.label||'كل السنوات'}
                ariaLabel="اختر السنة"
                accent="movie"
                minWidth="min-w-[110px]"
                options={YEARS.map(y => ({ value: y.value, label: y.label }))}
                isSelected={v => selectedYear===v}
                onSelect={v => { resetAndFetch(() => setSelectedYear(v)); setOpenDropdown(null) }}
              />
              <CinematicDropdown
                open={openDropdown==='rating'}
                onToggle={()=>toggle('rating')}
                currentLabel={RATINGS.find(r=>r.value===selectedRating)?.label||'كل التقييمات'}
                ariaLabel="اختر التقييم"
                accent="movie"
                options={RATINGS.map(r => ({ value: r.value, label: r.label }))}
                isSelected={v => selectedRating===v}
                onSelect={v => { resetAndFetch(() => setSelectedRating(v)); setOpenDropdown(null) }}
              />
              <CinematicDropdown
                open={openDropdown==='country'}
                onToggle={()=>toggle('country')}
                currentLabel={COUNTRIES.find(c=>c.value===selectedCountry)?.label||'كل الدول'}
                ariaLabel="اختر الدولة"
                accent="movie"
                minWidth="min-w-[100px]"
                options={COUNTRIES.map(c => ({ value: c.value, label: c.label }))}
                isSelected={v => selectedCountry===v}
                onSelect={v => { resetAndFetch(() => setSelectedCountry(v)); setOpenDropdown(null) }}
              />
              {/* (E-10) فلتر اللغة — نفس CinematicDropdown الموحّد، ويُرسل original_language إلى /api/movies */}
              <CinematicDropdown
                open={openDropdown==='language'}
                onToggle={()=>toggle('language')}
                currentLabel={LANGUAGES.find(l=>l.value===selectedLanguage)?.label||'كل اللغات'}
                ariaLabel="اختر اللغة"
                accent="movie"
                minWidth="min-w-[110px]"
                options={LANGUAGES.map(l => ({ value: l.value, label: l.label }))}
                isSelected={v => selectedLanguage===v}
                onSelect={v => { resetAndFetch(() => setSelectedLanguage(v)); setOpenDropdown(null) }}
              />
            </div>

            {/* Sort — أزرار ظاهرة مباشرة */}
            <CinematicSortGroup
              className="order-3 md:order-2"
              accent="movie"
              options={SORT_OPTIONS}
              value={sort}
              order={order}
              onChange={(v, o) => resetAndFetch(() => { setSort(v); setOrder(o as 'asc' | 'desc') })}
            />

            {/* Search */}
            <CinematicSearch
              id="genre-movies-search"
              value={searchQuery}
              onChange={v => setSearchQuery(v)}
              placeholder="ابحث عن فيلم..."
              ariaLabel="البحث عن فيلم"
              accent="movie"
            />
          </CinematicFilterBar>
        </div>

        {/* شرائح الفلاتر النشطة (بلا عدّاد نتائج) */}
        {activeFilters.length > 0 && (
          <div className="mt-3 mb-4 flex flex-wrap items-center gap-2">
            {activeFilters.map(f => (
              <button
                key={f.key}
                onClick={f.clear}
                className="group flex items-center gap-1.5 bg-[#7f1d1d]/20 hover:bg-[#7f1d1d]/35 border border-[#b91c1c]/30 hover:border-[#b91c1c]/60 rounded-full pl-2 pr-3 py-1 text-xs font-bold text-[#fca5a5] transition-colors"
                aria-label={`إزالة فلتر ${f.label}`}
              >
                <span className="max-w-[160px] truncate">{f.label}</span>
                <X className="w-3.5 h-3.5 text-[#fca5a5]/70 group-hover:text-[#fca5a5] transition-all duration-200 group-hover:rotate-90" />
              </button>
            ))}
            {activeFilters.length > 1 && (
              <button
                onClick={clearAllFilters}
                className="text-xs font-bold text-zinc-500 hover:text-zinc-300 underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-500 transition-colors mr-1"
              >
                مسح الكل
              </button>
            )}
          </div>
        )}
          </div>          {/* إغلاق خلية الهيدر */}

          {/* الإعلان الجانبي: بجانب الهيدر فقط (صف واحد). ديسكتوب فقط؛ على الجوال مخفي تمامًا */}
          <aside className="hidden lg:flex flex-col items-start lg:w-[300px] lg:shrink-0 lg:sticky lg:top-24 lg:self-start mt-0">
            <AdFrame ad={AD_SIDE_RECT} variant="y" />
          </aside>
        </div>

        {/* تحت: الكروت بعرض كامل — بدون grid جانبي — بلا هامش زائد بعد البار */}
        <div>
          <div className="min-w-0">

        {/* Error State */}
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

        {/* Content */}
        {loading ? (
          <div className="grid-responsive gap-4">
            {[...Array(SKELETON_COUNT)].map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden bg-zinc-900/20 border border-zinc-800/60">
                <div className="aspect-[2/3] w-full bg-zinc-800 animate-pulse" />
                <div className="p-2.5 h-[52px] flex flex-col justify-center gap-2">
                  <div className="h-3 bg-zinc-800 rounded animate-pulse w-3/4" />
                  <div className="h-2 bg-zinc-800 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : content.length > 0 ? (
          <>
            {/* شبكة ثابتة: مساحة محجزة + شريط تحديث رفيع (لا تغيّر ارتفاعها) */}
            <div className="relative min-h-[320px]">
              {refreshing && (
                <div className="absolute top-0 left-0 right-0 z-20 h-0.5 overflow-hidden rounded-full bg-slate-800/80" aria-hidden="true">
                  <div className="h-full w-1/2 rounded-full bg-gradient-to-l from-red-500 via-amber-400 to-red-500 animate-pulse" />
                </div>
              )}
            <div className="grid-responsive gap-4" suppressHydrationWarning>
              {topItems.map((item: any, index: number) => (
                <Fragment key={item.id}>
                  <MovieCard key={item.id} movie={item} index={index} eager={index < LISTING_TOP_CARDS_COUNT} />
                  {(index + 1) % AD_EVERY_N_CARDS === 0 && (
                    <div className="flex justify-center">
                      <AdInRowCard pos={`gm-${index + 1}`} />
                    </div>
                  )}
                </Fragment>
              ))}
            </div>
            </div>

          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <Film className="w-16 h-16 text-zinc-700 mb-4" />
            <p className="text-xl text-zinc-400">لا توجد أفلام في هذا التصنيف</p>
          </div>
        )}

          </div>

          <div className="min-w-0 mt-6">
            {restItems.length > 0 && (
              <div className="grid-responsive gap-4" suppressHydrationWarning>
                {restItems.map((item: any, i: number) => {
                  const gi = LISTING_TOP_CARDS_COUNT + i
                  return (
                    <Fragment key={item.id}>
                      <MovieCard movie={item} index={gi} />
                      {(gi + 1) % AD_EVERY_N_CARDS === 0 && (
                        <div className="flex justify-center">
                          <AdInRowCard pos={`gm-${gi + 1}`} />
                        </div>
                      )}
                    </Fragment>
                  )
                })}
              </div>
            )}

            {content.length > 0 && (
              <>
                {/* زر «تحميل المزيد» الموحّد — fallback يدوي يضمن التحميل حتى لو لم يعمل السكرول اللانهائي */}
                {hasMore && !loading && !refreshing && (
                  <div className="flex justify-center">
                    <button
                      onClick={() => setPage(prev => prev + 1)}
                      disabled={loadingMore}
                      className="px-8 py-3 bg-black/40 hover:bg-black/60 border border-[#b91c1c]/40 hover:border-[#b91c1c]/70 rounded-xl text-sm font-bold text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loadingMore ? 'جاري التحميل...' : 'تحميل المزيد'}
                    </button>
                  </div>
                )}

                <div ref={observerTarget} className="h-10 mt-6"></div>

                {loadingMore && (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-3 text-zinc-400">
                      <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm font-bold">جاري التحميل...</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

        </div>

        {/* إعلان 4 (468×60) — فاصل خفيف قبل الفوتر (نفس نظام صفحات الأقسام) */}
        <div className="flex justify-center px-4 py-2 mt-8">
          <AdFrame ad={AD_FOOTER_MID} variant="x" />
        </div>
      </div>

      <div className="pb-12"><Footer /></div>

      {/* شريط الموبايل الثابت — إعلان 6 (320×50) */}
      <MobileStickyAd />
    </div>
  )
}
