'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import React from 'react'
import Link from 'next/link'
import { Tv, Star, Search, Play, ChevronDown, Filter as FilterIcon } from 'lucide-react'
import { Footer } from '@/components/layout/Footer'
import { getGenreColor } from '@/utils/genreColors'
import { sanitizeTitle } from '@/utils/textSanitizer'
import { useResponsiveGrid } from '@/hooks/useResponsiveGrid'
import { MovieCard } from '@/components/features/media/MovieCard'
import { useAuth } from '@/hooks/useAuth'

const GENRES = [
  { name: 'دراما',               slug: 'drama',              emoji: '🎭' },
  { name: 'كوميديا',             slug: 'comedy',             emoji: '😂' },
  { name: 'رسوم متحركة',        slug: 'animation',          emoji: '🎨' },
  { name: 'وثائقي',              slug: 'documentary',        emoji: '🎬' },
  { name: 'أكشن ومغامرة',        slug: 'action-&-adventure', emoji: '💥' },
  { name: 'خيال علمي وفانتازيا', slug: 'sci-fi-&-fantasy',   emoji: '🚀' },
  { name: 'جريمة',               slug: 'crime',              emoji: '🕵️' },
  { name: 'واقعي',               slug: 'reality',            emoji: '📹' },
  { name: 'غموض',                slug: 'mystery',            emoji: '🔍' },
  { name: 'عائلي',               slug: 'family',             emoji: '👨‍👩‍👧‍👦' },
  { name: 'أطفال',               slug: 'kids',               emoji: '👶' },
  { name: 'دراما اجتماعية',     slug: 'soap',               emoji: '🎭' },
  { name: 'حرب وسياسة',         slug: 'war-&-politics',     emoji: '⚔️' },
  { name: 'برنامج حواري',       slug: 'talk',               emoji: '🎙️' },
  { name: 'أخبار',               slug: 'news',               emoji: '📰' },
  { name: 'غربي',                slug: 'western',            emoji: '🤠' },
  { name: 'رومانسي',             slug: 'romance',            emoji: '💕' },
  { name: 'تاريخي',              slug: 'history',            emoji: '📜' },
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

export function SeriesPageClient({ initialSeries = [] }: { initialSeries?: any[] }) {
  const { user } = useAuth() // Check if user is logged in
  const searchParams = useSearchParams()
  const [series, setSeries]                   = useState<any[]>(initialSeries)
  const [loading, setLoading]                 = useState(initialSeries.length === 0)
  const [loadingMore, setLoadingMore]         = useState(false)
  const [error, setError]                     = useState<string | null>(null)
  const [searchQuery, setSearchQuery]         = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedGenre, setSelectedGenre]     = useState<string>('all')
  const [selectedYear, setSelectedYear]       = useState<string>('all')
  const [selectedRating, setSelectedRating]   = useState<string>('all')
  const [selectedCountry, setSelectedCountry] = useState<string>('all')
  const [sortBy, setSortBy]                   = useState('popularity')
  const [sortOrder, setSortOrder]             = useState('desc')
  const [page, setPage]                       = useState(1)
  const [hasMore, setHasMore]                 = useState(false)
  const observerTarget = useRef<HTMLDivElement>(null)

  // Batch card states for heart buttons
  const [cardStates, setCardStates] = useState<Record<string, 'neutral' | 'favorite' | 'completed'>>({})

  // Single open dropdown at a time
  const [openDropdown, setOpenDropdown] = useState<'genre'|'year'|'rating'|'country'|'sort'|null>(null)
  const filtersRef = useRef<HTMLDivElement>(null)

  // Use shared responsive grid hook (12 rows per page)
  const itemsPerPage = useResponsiveGrid(12)
  
  // Fixed skeleton count for SSR (avoids hydration mismatch)
  const SKELETON_COUNT = 24 // 2 columns × 12 rows (mobile default)

  // Sync filters from URL params whenever they change
  useEffect(() => {
    // Read genre from URL (expects slug format)
    const urlGenre = searchParams.get('genre')
    if (urlGenre) {
      // Find genre by slug and set the Arabic name as selected value
      const genre = GENRES.find(g => g.slug === urlGenre)
      if (genre) {
        setSelectedGenre(genre.name)
      }
    } else {
      setSelectedGenre('all')
    }
    
    // Read language from URL (maps to country filter)
    const urlLanguage = searchParams.get('language')
    if (urlLanguage) {
      // Map language codes to country codes (e.g., 'ko' -> 'KR')
      const languageMap: Record<string, string> = {
        'ko': 'KR',  // Korean
        'ja': 'JP',  // Japanese
        'zh': 'CN',  // Chinese
        'hi': 'IN',  // Hindi (India)
        'tr': 'TR',  // Turkish
        'ar': 'SA',  // Arabic (Saudi Arabia placeholder)
        'en': 'US',  // English (US)
        'es': 'MX',  // Spanish (Mexico)
        'fr': 'FR',  // French
        'de': 'DE',  // German
        'pt': 'BR',  // Portuguese (Brazil)
        'ru': 'RU',  // Russian
      }
      const country = languageMap[urlLanguage] || urlLanguage.toUpperCase()
      const countryExists = COUNTRIES.some(c => c.value === country)
      if (countryExists) {
        setSelectedCountry(country)
      }
    } else if (!searchParams.get('country')) {
      setSelectedCountry('all')
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
    
    // Reset to page 1 when URL changes
    setPage(1)
    setSeries([])
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
    
    const params = new URLSearchParams({ page: page.toString(), limit: itemsPerPage.toString(), sort: sortBy, order: sortOrder })
    if (selectedGenre !== 'all') {
      // Convert Arabic name to slug for API
      const genre = GENRES.find(g => g.name === selectedGenre)
      params.set('genre', genre?.slug || selectedGenre)
    }
    if (selectedYear      !== 'all') params.set('year',       selectedYear)
    if (selectedRating    !== 'all') params.set('rating_min', selectedRating)
    if (selectedCountry   !== 'all') params.set('country',    selectedCountry)
    if (debouncedSearch.trim())      params.set('search',     debouncedSearch.trim())

    const isFirstPage = page === 1
    if (isFirstPage) setLoading(true)
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
        setSeries(prev => isFirstPage ? [] : prev)
        setError('فشل تحميل المسلسلات. حاول مرة أخرى.')
      })
      .finally(() => { 
        // Check if request was aborted before updating loading state
        if (!abortController.signal.aborted) {
          setLoading(false)
          setLoadingMore(false)
        }
      })
    
    return () => {
      abortController.abort()
    }
  }, [selectedGenre, selectedYear, selectedRating, selectedCountry, sortBy, sortOrder, page, debouncedSearch])

  // Batch fetch card states for all series (only if user is logged in)
  useEffect(() => {
    if (!user || series.length === 0) return

    const fetchStates = async () => {
      try {
        const res = await fetch('/api/user/card-state', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: series.map(s => ({ 
              content_type: 'tv', 
              tmdb_id: s.tmdb_id || s.id 
            }))
          })
        })
        
        if (!res.ok) return
        
        const data = await res.json()
        if (data.states) {
          setCardStates(data.states)
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
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
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
  }, [hasMore, loading, loadingMore])

  const toggle = useCallback((name: typeof openDropdown) => {
    setOpenDropdown(prev => prev === name ? null : name)
  }, [])

  // Reset to page 1 when filters change
  const resetAndFetch = useCallback((callback: () => void) => {
    callback()
    setPage(1)
    setSeries([])
    setError(null)
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" dir="rtl">

      {/* Cinema Banner */}
      <section className="w-full bg-slate-950">
        <div className="max-w-[1920px] mx-auto px-3 sm:px-5 md:px-8 lg:px-12 mb-6">
          <div className="relative bg-slate-950/80 backdrop-blur-sm rounded-lg border-2 border-slate-800 shadow-2xl overflow-hidden" style={{ height: '56px' }}>
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 opacity-40" style={{ backgroundImage:'url(/banner.png)', backgroundSize:'2000px 100%', backgroundRepeat:'repeat-x', backgroundPosition:'0 center', animation:'banner-scroll 40s linear infinite' }} />
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 right-0 h-2 bg-slate-950/90 flex justify-around items-center px-2">
                  {[...Array(25)].map((_,i)=><div key={i} className="w-1.5 h-1.5 bg-slate-800 rounded-sm"/>)}
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-2 bg-slate-950/90 flex justify-around items-center px-2">
                  {[...Array(25)].map((_,i)=><div key={i} className="w-1.5 h-1.5 bg-slate-800 rounded-sm"/>)}
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/30 via-transparent to-slate-950/30" />
            </div>
            <div className="absolute top-0 left-0 w-3 h-full bg-slate-950/95 border-r border-amber-500/40 flex flex-col justify-around py-1 z-10">
              {[...Array(5)].map((_,i)=><div key={i} className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_10px_#fbbf24] mx-auto" style={{animation:'pulse-glow 1.5s ease-in-out infinite',animationDelay:`${i*0.2}s`}}/>)}
            </div>
            <div className="absolute top-0 right-0 w-3 h-full bg-slate-950/95 border-l border-amber-500/40 flex flex-col justify-around py-1 z-10">
              {[...Array(5)].map((_,i)=><div key={i} className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_10px_#fbbf24] mx-auto" style={{animation:'pulse-glow 1.5s ease-in-out infinite',animationDelay:`${i*0.2}s`}}/>)}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="w-full bg-slate-950">
        <div className="max-w-[1920px] mx-auto px-2 sm:px-4 md:px-6 lg:px-8">

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
                  <span>{selectedGenre==='all' ? 'كل التصنيفات' : GENRES.find(g=>g.name===selectedGenre)?.emoji+' '+selectedGenre}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown==='genre'?'rotate-180':''}`}/>
                </button>
                {openDropdown==='genre' && (
                  <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 min-w-full max-h-[255px] overflow-y-scroll overflow-x-hidden custom-scrollbar overscroll-contain" role="listbox">
                    <button onClick={()=>{resetAndFetch(() => setSelectedGenre('all'));setOpenDropdown(null)}} className={`w-full text-right px-3 py-2 text-sm hover:bg-slate-700 ${selectedGenre==='all'?'bg-slate-700 text-cyan-400':'text-slate-100'}`} role="option" aria-selected={selectedGenre==='all'}>كل التصنيفات</button>
                    {GENRES.map(g=>(
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
                onClick={() => setPage(1)}
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
              <div className="grid-responsive gap-6">
                {series.map((item, index) => {
                  const tmdbId = item.tmdb_id || item.id
                  const stateKey = `tv-${tmdbId}`
                  return (
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
                  )
                })}
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
      </section>

      <div className="pb-12"><Footer/></div>
    </div>
  )
}
