'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Tv, Star, Search, Play, ChevronDown, Filter as FilterIcon } from 'lucide-react'
import { Footer } from '@/components/layout/Footer'
import { getGenreColor } from '@/utils/genreColors'
import { sanitizeTitle } from '@/utils/textSanitizer'

const GENRES = [
  { name: 'دراما',              emoji: '🎭', color: 'purple' },
  { name: 'كوميديا',            emoji: '😂', color: 'yellow' },
  { name: 'أكشن ومغامرة',       emoji: '🔥', color: 'red'    },
  { name: 'رومانسي',            emoji: '💕', color: 'pink'   },
  { name: 'جريمة',              emoji: '🕵️', color: 'rose'   },
  { name: 'غموض',               emoji: '🔍', color: 'indigo' },
  { name: 'إثارة',              emoji: '😱', color: 'orange' },
  { name: 'عائلي',              emoji: '🎪', color: 'green'  },
  { name: 'رسوم متحركة',        emoji: '🎨', color: 'blue'   },
  { name: 'خيال علمي وفانتازيا',emoji: '🚀', color: 'cyan'   },
  { name: 'رعب',                emoji: '👻', color: 'gray'   },
  { name: 'وثائقي',             emoji: '🎬', color: 'emerald'},
  { name: 'تاريخي',             emoji: '🏛️', color: 'slate'  },
] as const

const COLOR_CLASSES: Record<string, { active: string; inactive: string }> = {
  purple:  { active: 'bg-purple-600 text-white border-2 border-purple-500',   inactive: 'bg-purple-600/10 hover:bg-purple-600/20 border border-purple-600/30 hover:border-purple-600/50 text-purple-400 hover:text-purple-300' },
  yellow:  { active: 'bg-yellow-600 text-white border-2 border-yellow-500',   inactive: 'bg-yellow-600/10 hover:bg-yellow-600/20 border border-yellow-600/30 hover:border-yellow-600/50 text-yellow-400 hover:text-yellow-300' },
  red:     { active: 'bg-red-600 text-white border-2 border-red-500',         inactive: 'bg-red-600/10 hover:bg-red-600/20 border border-red-600/30 hover:border-red-600/50 text-red-400 hover:text-red-300' },
  orange:  { active: 'bg-orange-600 text-white border-2 border-orange-500',   inactive: 'bg-orange-600/10 hover:bg-orange-600/20 border border-orange-600/30 hover:border-orange-600/50 text-orange-400 hover:text-orange-300' },
  pink:    { active: 'bg-pink-600 text-white border-2 border-pink-500',       inactive: 'bg-pink-600/10 hover:bg-pink-600/20 border border-pink-600/30 hover:border-pink-600/50 text-pink-400 hover:text-pink-300' },
  cyan:    { active: 'bg-cyan-600 text-white border-2 border-cyan-500',       inactive: 'bg-cyan-600/10 hover:bg-cyan-600/20 border border-cyan-600/30 hover:border-cyan-600/50 text-cyan-400 hover:text-cyan-300' },
  gray:    { active: 'bg-gray-600 text-white border-2 border-gray-500',       inactive: 'bg-gray-600/10 hover:bg-gray-600/20 border border-gray-600/30 hover:border-gray-600/50 text-gray-400 hover:text-gray-300' },
  rose:    { active: 'bg-rose-700 text-white border-2 border-rose-600',       inactive: 'bg-rose-700/10 hover:bg-rose-700/20 border border-rose-700/30 hover:border-rose-700/50 text-rose-400 hover:text-rose-300' },
  emerald: { active: 'bg-emerald-600 text-white border-2 border-emerald-500', inactive: 'bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/30 hover:border-emerald-600/50 text-emerald-400 hover:text-emerald-300' },
  blue:    { active: 'bg-blue-600 text-white border-2 border-blue-500',       inactive: 'bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/30 hover:border-blue-600/50 text-blue-400 hover:text-blue-300' },
  green:   { active: 'bg-green-600 text-white border-2 border-green-500',     inactive: 'bg-green-600/10 hover:bg-green-600/20 border border-green-600/30 hover:border-green-600/50 text-green-400 hover:text-green-300' },
  indigo:  { active: 'bg-indigo-600 text-white border-2 border-indigo-500',   inactive: 'bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-600/30 hover:border-indigo-600/50 text-indigo-400 hover:text-indigo-300' },
  slate:   { active: 'bg-slate-600 text-white border-2 border-slate-500',     inactive: 'bg-slate-600/10 hover:bg-slate-600/20 border border-slate-600/30 hover:border-slate-600/50 text-slate-400 hover:text-slate-300' },
}

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
  { value: '2000-2014', label: 'الألفينات' },
  { value: '1990-1999', label: 'التسعينات' },
  { value: 'before-1990', label: 'كلاسيكي' },
]

const RATINGS = [
  { value: 'all', label: 'كل التقييمات' },
  { value: '9',   label: '⭐ 9+ ممتاز'    },
  { value: '8',   label: '⭐ 8+ جيد جداً' },
  { value: '7',   label: '⭐ 7+ جيد'      },
  { value: '6',   label: '⭐ 6+ مقبول'    },
]

const COUNTRIES = [
  { value: 'all', label: 'كل الدول'  },
  { value: 'US',  label: '🇺🇸 أمريكي' },
  { value: 'JP',  label: '🇯🇵 ياباني' },
  { value: 'GB',  label: '🇬🇧 بريطاني'},
  { value: 'KR',  label: '🇰🇷 كوري'   },
  { value: 'CN',  label: '🇨🇳 صيني'   },
  { value: 'FR',  label: '🇫🇷 فرنسي'  },
  { value: 'DE',  label: '🇩🇪 ألماني' },
  { value: 'IN',  label: '🇮🇳 هندي'   },
  { value: 'TR',  label: '🇹🇷 تركي'   },
]

const AGE_RATINGS = [
  { value: 'all',    label: 'كل الأعمار' },
  { value: 'family', label: '👶 أطفال'   },
  { value: 'teens',  label: '🧑 شباب'    },
  { value: 'mature', label: '📺 عادي'    },
]

const SORT_OPTIONS = [
  { value: 'popularity',     label: 'الأكثر شهرة',   icon: '🔥' },
  { value: 'vote_average',   label: 'الأعلى تقييماً', icon: '⭐' },
  { value: 'first_air_year', label: 'الأحدث',         icon: '📅' },
  { value: 'name_ar',        label: 'الاسم (أ-ي)',    icon: '🔤' },
]

export function SeriesPageClient() {
  const [series, setSeries]                   = useState<any[]>([])
  const [loading, setLoading]                 = useState(true)
  const [searchQuery, setSearchQuery]         = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedGenre, setSelectedGenre]     = useState<string>('all')
  const [selectedYear, setSelectedYear]       = useState<string>('all')
  const [selectedRating, setSelectedRating]   = useState<string>('all')
  const [selectedCountry, setSelectedCountry] = useState<string>('all')
  const [selectedAgeRating, setSelectedAgeRating] = useState<string>('all')
  const [sortBy, setSortBy]                   = useState('popularity')
  const [page, setPage]                       = useState(1)
  const [hasMore, setHasMore]                 = useState(false)

  // Single open dropdown at a time
  const [openDropdown, setOpenDropdown] = useState<'genre'|'year'|'rating'|'country'|'age'|'sort'|null>(null)
  const filtersRef = useRef<HTMLDivElement>(null)

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
    let cancelled = false
    const params = new URLSearchParams({ page: page.toString(), limit: '24', sort: sortBy, order: 'desc' })
    if (selectedGenre     !== 'all') params.set('genre',      selectedGenre)
    if (selectedYear      !== 'all') params.set('year',       selectedYear)
    if (selectedRating    !== 'all') params.set('rating_min', selectedRating)
    if (selectedCountry   !== 'all') params.set('country',    selectedCountry)
    if (selectedAgeRating !== 'all') params.set('age_rating', selectedAgeRating)
    if (debouncedSearch.trim())      params.set('search',     debouncedSearch.trim())

    setLoading(true)
    fetch(`/api/series?${params}`)
      .then(r => r.json())
      .then(data => { if (cancelled) return; setSeries(data.series || []); setHasMore(data.pagination?.hasMore || false) })
      .catch(() => { if (!cancelled) setSeries([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [selectedGenre, selectedYear, selectedRating, selectedCountry, selectedAgeRating, sortBy, page, debouncedSearch])

  const toggle = (name: typeof openDropdown) => setOpenDropdown(prev => prev === name ? null : name)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" dir="rtl">

      {/* Cinema Banner */}
      <section className="w-full bg-slate-950">
        <div className="max-w-[1920px] mx-auto px-2 sm:px-4 md:px-6 lg:px-8 mb-6">
          <div className="relative bg-slate-950/80 backdrop-blur-sm rounded-lg border-2 border-slate-800 shadow-2xl overflow-hidden h-14 md:h-16">
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
      <section className="w-full bg-slate-950 pt-20">
        <div className="max-w-[1920px] mx-auto px-2 sm:px-4 md:px-6 lg:px-8">

          {/* Search & Filters */}
          <div ref={filtersRef} className="flex flex-col md:flex-row items-stretch md:items-center gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-xl">

            {/* Dropdowns row */}
            <div className="flex flex-wrap items-center gap-3 order-2 md:order-1">

              {/* Genre */}
              <div className="relative">
                <button onClick={()=>toggle('genre')} className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 flex items-center gap-2 min-w-[120px] justify-between">
                  <span>{selectedGenre==='all' ? 'كل التصنيفات' : GENRES.find(g=>g.name===selectedGenre)?.emoji+' '+selectedGenre}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown==='genre'?'rotate-180':''}`}/>
                </button>
                {openDropdown==='genre' && (
                  <div className="absolute top-full left-0 mt-1 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl z-50 min-w-full max-h-[255px] overflow-y-scroll overflow-x-hidden custom-scrollbar overscroll-contain">
                    <button onClick={()=>{setSelectedGenre('all');setPage(1);setOpenDropdown(null)}} className={`w-full text-right px-3 py-2 text-sm hover:bg-slate-800 ${selectedGenre==='all'?'bg-slate-800 text-cyan-400':'text-slate-100'}`}>كل التصنيفات</button>
                    {GENRES.map(g=>(
                      <button key={g.name} onClick={()=>{setSelectedGenre(g.name);setPage(1);setOpenDropdown(null)}} className={`w-full text-right px-3 py-2 text-sm hover:bg-slate-800 ${selectedGenre===g.name?'bg-slate-800 text-cyan-400':'text-slate-100'}`}>{g.emoji} {g.name}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Year */}
              <div className="relative">
                <button onClick={()=>toggle('year')} className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 flex items-center gap-2 min-w-[110px] justify-between">
                  <span>{YEARS.find(y=>y.value===selectedYear)?.label||'كل السنوات'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown==='year'?'rotate-180':''}`}/>
                </button>
                {openDropdown==='year' && (
                  <div className="absolute top-full left-0 mt-1 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl z-50 min-w-full max-h-[255px] overflow-y-scroll overflow-x-hidden custom-scrollbar overscroll-contain">
                    {YEARS.map(y=>(
                      <button key={y.value} onClick={()=>{setSelectedYear(y.value);setPage(1);setOpenDropdown(null)}} className={`w-full text-right px-3 py-2 text-sm hover:bg-slate-800 ${selectedYear===y.value?'bg-slate-800 text-cyan-400':'text-slate-100'}`}>{y.label}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Rating */}
              <div className="relative">
                <button onClick={()=>toggle('rating')} className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 flex items-center gap-2 min-w-[120px] justify-between">
                  <span>{RATINGS.find(r=>r.value===selectedRating)?.label||'كل التقييمات'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown==='rating'?'rotate-180':''}`}/>
                </button>
                {openDropdown==='rating' && (
                  <div className="absolute top-full left-0 mt-1 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl z-50 min-w-full max-h-[255px] overflow-y-scroll overflow-x-hidden custom-scrollbar overscroll-contain">
                    {RATINGS.map(r=>(
                      <button key={r.value} onClick={()=>{setSelectedRating(r.value);setPage(1);setOpenDropdown(null)}} className={`w-full text-right px-3 py-2 text-sm hover:bg-slate-800 ${selectedRating===r.value?'bg-slate-800 text-cyan-400':'text-slate-100'}`}>{r.label}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Country */}
              <div className="relative">
                <button onClick={()=>toggle('country')} className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 flex items-center gap-2 min-w-[100px] justify-between">
                  <span>{COUNTRIES.find(c=>c.value===selectedCountry)?.label||'كل الدول'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown==='country'?'rotate-180':''}`}/>
                </button>
                {openDropdown==='country' && (
                  <div className="absolute top-full left-0 mt-1 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl z-50 min-w-full max-h-[255px] overflow-y-scroll overflow-x-hidden custom-scrollbar overscroll-contain">
                    {COUNTRIES.map(c=>(
                      <button key={c.value} onClick={()=>{setSelectedCountry(c.value);setPage(1);setOpenDropdown(null)}} className={`w-full text-right px-3 py-2 text-sm hover:bg-slate-800 ${selectedCountry===c.value?'bg-slate-800 text-cyan-400':'text-slate-100'}`}>{c.label}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Age */}
              <div className="relative">
                <button onClick={()=>toggle('age')} className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 flex items-center gap-2 min-w-[100px] justify-between">
                  <span>{AGE_RATINGS.find(a=>a.value===selectedAgeRating)?.label||'كل الأعمار'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown==='age'?'rotate-180':''}`}/>
                </button>
                {openDropdown==='age' && (
                  <div className="absolute top-full left-0 mt-1 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl z-50 min-w-full max-h-[255px] overflow-y-scroll overflow-x-hidden custom-scrollbar overscroll-contain">
                    {AGE_RATINGS.map(a=>(
                      <button key={a.value} onClick={()=>{setSelectedAgeRating(a.value);setPage(1);setOpenDropdown(null)}} className={`w-full text-right px-3 py-2 text-sm hover:bg-slate-800 ${selectedAgeRating===a.value?'bg-slate-800 text-cyan-400':'text-slate-100'}`}>{a.label}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sort */}
              <div className="relative">
                <button onClick={()=>toggle('sort')} className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 flex items-center gap-2 min-w-[120px] justify-between">
                  <span>{SORT_OPTIONS.find(s=>s.value===sortBy)?.icon} {SORT_OPTIONS.find(s=>s.value===sortBy)?.label}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown==='sort'?'rotate-180':''}`}/>
                </button>
                {openDropdown==='sort' && (
                  <div className="absolute top-full left-0 mt-1 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl z-50 min-w-full max-h-[255px] overflow-y-scroll overflow-x-hidden custom-scrollbar overscroll-contain">
                    {SORT_OPTIONS.map(o=>(
                      <button key={o.value} onClick={()=>{setSortBy(o.value);setPage(1);setOpenDropdown(null)}} className={`w-full text-right px-3 py-2 text-sm hover:bg-slate-800 ${sortBy===o.value?'bg-slate-800 text-cyan-400':'text-slate-100'}`}>{o.icon} {o.label}</button>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Search */}
            <div className="relative flex-1 order-1 md:order-2">
              <input type="text" placeholder="ابحث عن مسلسل..." value={searchQuery}
                onChange={e=>setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-3 pr-10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm"
              />
              <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5"/>
            </div>
          </div>

          {/* Genre buttons */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 mt-6">
            <div className="flex flex-wrap gap-2 items-center">
              <button onClick={()=>{setSelectedGenre('all');setPage(1)}}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 ${selectedGenre==='all'?'bg-amber-600 text-white border-2 border-amber-500':'bg-amber-600/10 hover:bg-amber-600/20 border border-amber-600/30 text-amber-400 hover:text-amber-300'}`}>
                الكل
              </button>
              {GENRES.map(g=>(
                <button key={g.name} onClick={()=>{setSelectedGenre(g.name);setPage(1)}}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 ${selectedGenre===g.name?COLOR_CLASSES[g.color].active:COLOR_CLASSES[g.color].inactive}`}>
                  {g.emoji} {g.name}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="mt-6">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {[...Array(24)].map((_,i)=>(
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {series.map((item)=>{
                  let primaryGenre = null
                  try { const g=JSON.parse(item.genres_json||'[]'); primaryGenre=g?.[0]?.name_ar||null } catch {}
                  const year = Number(item.first_air_year||item.year)
                  const currentYear = new Date().getFullYear()
                  const yearStyle = year===currentYear
                    ? 'bg-purple-500 text-white border border-purple-400 shadow-lg shadow-purple-500/50 animate-pulse'
                    : year>=2020 ? 'bg-blue-600 text-white border border-blue-500'
                    : year>=2010 ? 'bg-cyan-600 text-white border border-cyan-500'
                    : year>=2000 ? 'bg-slate-100 text-slate-900 border border-slate-200 font-bold'
                    : 'bg-slate-700 text-slate-300 border border-slate-600'

                  return (
                    <Link key={item.id} href={`/series/${item.slug}`}
                      className="group bg-slate-900/20 border border-slate-800/60 hover:border-slate-700/80 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-slate-950/50 relative"
                    >
                      <div className="aspect-[2/3] w-full relative overflow-hidden bg-slate-950">
                        <img src={`/tmdb/w500${item.poster_path}`} alt={item.name_ar}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy"/>
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"/>
                        {item.vote_average>0 && (
                          <div className="absolute top-2 left-2 z-20">
                            <span className="flex items-center gap-1 bg-slate-900 text-yellow-400 border border-yellow-500/40 px-2 py-1 rounded-lg backdrop-blur-md shadow-lg">
                              <Star className="w-[11px] h-[11px] fill-yellow-400 shrink-0"/>
                              <span className="text-[9px] font-bold">{item.vote_average.toFixed(1)}</span>
                            </span>
                          </div>
                        )}
                        {primaryGenre && (
                          <div className="absolute bottom-2 right-2 z-20">
                            <span className={`${getGenreColor(primaryGenre).bg} ${getGenreColor(primaryGenre).text} border ${getGenreColor(primaryGenre).border} px-2 py-1 rounded-lg text-[9px] font-bold backdrop-blur-md shadow-lg`}>{primaryGenre}</span>
                          </div>
                        )}
                        {year>0 && (
                          <div className="absolute bottom-2 left-2 z-20">
                            <span className={`px-2 py-1 rounded-lg text-[9px] font-bold backdrop-blur-md shadow-lg ${yearStyle}`}>{year}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30">
                          <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                            <Play className="w-5 h-5 text-white fill-white mr-0.5"/>
                          </div>
                        </div>
                      </div>
                      <div className="p-2.5 h-[52px] flex flex-col justify-center relative overflow-hidden">
                        <div className="transition-opacity duration-200 group-hover:opacity-0">
                          <h3 className="text-[13px] font-bold text-slate-200 line-clamp-1 leading-tight">{sanitizeTitle(item.name_ar)}</h3>
                          {item.name_en && <p className="text-[11px] text-slate-400 line-clamp-1 mt-1 leading-tight">{item.name_en}</p>}
                        </div>
                        <div className="absolute inset-0 p-2.5 flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <p className="text-[9px] text-slate-300 line-clamp-3 leading-relaxed">{item.overview_ar||'لا يوجد وصف متاح'}</p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>

              {(page>1||hasMore) && (
                <div className="flex items-center justify-center gap-3 mt-8">
                  <button onClick={()=>setPage(Math.max(1,page-1))} disabled={page===1}
                    className="px-6 py-3 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-100 font-bold">السابق</button>
                  <span className="text-slate-400 font-bold">صفحة {page}</span>
                  <button onClick={()=>setPage(page+1)} disabled={!hasMore}
                    className="px-6 py-3 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-100 font-bold">التالي</button>
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

      <style jsx global>{`
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: rgb(51 65 85) transparent; }
        .custom-scrollbar::-webkit-scrollbar { width: 12px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgb(51 65 85); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgb(100 116 139); }
      `}</style>

      <div className="pb-12"><Footer/></div>
    </div>
  )
}
