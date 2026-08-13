'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Search, X, Film, Tv, Loader2, Star, Calendar, TrendingUp, Filter, SlidersHorizontal, ChevronDown, Clock, Award } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

interface SearchResult {
  id: number
  slug: string
  title_ar: string
  title_en: string
  poster_path: string
  backdrop_path?: string
  vote_average: number
  media_type: 'movie' | 'tv'
  release_year?: number
  first_air_year?: number
  overview_ar?: string
  genres_json?: string
  popularity?: number
}

type SortOption = 'relevance' | 'rating' | 'year' | 'popularity'
type FilterOption = 'all' | 'movie' | 'tv'

export function SearchBox() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [totalFound, setTotalFound] = useState(0)
  const [searchStrategy, setSearchStrategy] = useState<string>('')
  const [sortBy, setSortBy] = useState<SortOption>('relevance')
  const [filterBy, setFilterBy] = useState<FilterOption>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [hoveredResult, setHoveredResult] = useState<number | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Auto-collapse on scroll down
  const [isCollapsed, setIsCollapsed] = useState(false)
  const lastScrollY = useRef(0)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setShowFilters(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Simple auto-collapse on scroll down
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      // Collapse when scrolling down past 100px
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsCollapsed(true)
      } 
      // Expand when scrolling back to top
      else if (currentScrollY < 50) {
        setIsCollapsed(false)
      }
      
      lastScrollY.current = currentScrollY
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
        setShowFilters(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Search with debounce
  useEffect(() => {
    if (!query.trim() || query.length < 1) {
      setResults([])
      return
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        if (response.ok) {
          const data = await response.json()
          setResults(data.results || [])
          setTotalFound(data.totalFound || 0)
          setSearchStrategy(data.searchStrategy || '')
        }
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setLoading(false)
      }
    }, 200)

    return () => clearTimeout(timeoutId)
  }, [query])

  // Sort and filter results
  const filteredAndSortedResults = useMemo(() => {
    let filtered = results

    // Apply filter
    if (filterBy !== 'all') {
      filtered = results.filter(r => r.media_type === filterBy)
    }

    // Apply sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.vote_average || 0) - (a.vote_average || 0)
        case 'year':
          return (b.release_year || b.first_air_year || 0) - (a.release_year || a.first_air_year || 0)
        case 'popularity':
          return (b.popularity || 0) - (a.popularity || 0)
        case 'relevance':
        default:
          return 0
      }
    })

    return sorted
  }, [results, sortBy, filterBy])

  const handleClear = () => {
    setQuery('')
    setResults([])
    setTotalFound(0)
    setSearchStrategy('')
    inputRef.current?.focus()
  }

  const handleResultClick = () => {
    setIsOpen(false)
    setQuery('')
    setResults([])
    setTotalFound(0)
    setSearchStrategy('')
    setShowFilters(false)
  }

  const getGenres = (genresJson?: string): string[] => {
    try {
      const genres = JSON.parse(genresJson || '[]')
      return genres.slice(0, 2).map((g: any) => g.name_ar || g.name).filter(Boolean)
    } catch {
      return []
    }
  }

  const stats = useMemo(() => {
    const movies = results.filter(r => r.media_type === 'movie').length
    const series = results.filter(r => r.media_type === 'tv').length
    return { movies, series, total: results.length }
  }, [results])

  return (
    <div ref={searchRef} className="relative">
      {/* Search Button with Auto-Collapse on Hover */}
      {!isOpen && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onMouseEnter={() => setIsCollapsed(false)}
          animate={{ 
            width: isCollapsed ? '48px' : 'auto',
            opacity: isCollapsed ? 0.7 : 1
          }}
          transition={{ 
            duration: isCollapsed ? 1 : 0.25,
            ease: 'easeInOut'
          }}
          onClick={() => {
            setIsOpen(true)
            setIsCollapsed(false)
          }}
          className="relative flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-slate-800/80 to-slate-900/80 hover:from-cyan-900/40 hover:to-blue-900/40 border border-slate-700 hover:border-cyan-500/50 rounded-xl transition-all duration-300 group overflow-hidden shadow-lg hover:shadow-cyan-500/20"
          aria-label="بحث"
        >
          {/* Animated Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {/* Animated Border Glow */}
          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 blur-sm" />
          </div>
          
          <Search size={18} className="text-cyan-400 relative z-10 group-hover:scale-110 transition-transform duration-300 flex-shrink-0" />
          <motion.span 
            animate={{ 
              opacity: isCollapsed ? 0 : 1,
              width: isCollapsed ? 0 : 'auto'
            }}
            transition={{ 
              duration: isCollapsed ? 1 : 0.25,
              ease: 'easeInOut'
            }}
            className="hidden sm:inline text-sm text-slate-300 font-semibold relative z-10 group-hover:text-cyan-300 transition-colors whitespace-nowrap overflow-hidden"
          >
            بحث متقدم
          </motion.span>
          <motion.kbd 
            animate={{ 
              opacity: isCollapsed ? 0 : 1,
              width: isCollapsed ? 0 : 'auto'
            }}
            transition={{ 
              duration: isCollapsed ? 1 : 0.25,
              ease: 'easeInOut'
            }}
            className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs text-slate-400 bg-slate-950/50 border border-slate-700 rounded relative z-10 overflow-hidden"
          >
            <span>⌘</span>
            <span>K</span>
          </motion.kbd>
        </motion.button>
      )}

      {/* Expanded Advanced Search Box */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[998]"
              onClick={() => {
                setIsOpen(false)
                setShowFilters(false)
              }}
            />

            {/* Search Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-20 -translate-x-1/2 w-[95vw] sm:w-[450px] md:w-[500px] lg:w-[550px] max-h-[85vh] z-[999] flex flex-col"
            >
              {/* Main Search Container */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 backdrop-blur-2xl border-2 border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
                {/* Animated Border Glow */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 opacity-0 blur-xl animate-pulse pointer-events-none" style={{ animationDuration: '3s' }} />
                
                {/* Header with Search Input */}
                <div className="relative bg-gradient-to-r from-slate-800/50 to-slate-900/50 border-b border-slate-700/50">
                  <div className="flex items-center gap-3 px-4 py-4">
                    <div className="relative flex-shrink-0">
                      <Search size={22} className="text-cyan-400 animate-pulse" />
                      <div className="absolute inset-0 blur-md bg-cyan-400/30 animate-pulse" />
                    </div>
                    
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="ابحث بأي عدد حروف... حتى حرف واحد!"
                      className="flex-1 bg-transparent text-white placeholder-slate-400 outline-none text-lg font-medium"
                      autoComplete="off"
                    />
                    
                    {loading && (
                      <Loader2 size={20} className="text-cyan-400 animate-spin flex-shrink-0" />
                    )}
                    
                    {query && !loading && (
                      <motion.button
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleClear}
                        className="text-slate-400 hover:text-red-400 transition-colors flex-shrink-0"
                        aria-label="مسح"
                      >
                        <X size={20} />
                      </motion.button>
                    )}
                  </div>

                  {/* Stats Bar */}
                  {results.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between px-4 py-2 bg-slate-950/50 border-t border-slate-700/30 text-xs"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                          <Search size={13} className="text-cyan-400" />
                          {stats.total} نتيجة
                        </span>
                        {stats.movies > 0 && (
                          <span className="text-red-400 flex items-center gap-1">
                            <Film size={12} />
                            {stats.movies} فيلم
                          </span>
                        )}
                        {stats.series > 0 && (
                          <span className="text-blue-400 flex items-center gap-1">
                            <Tv size={12} />
                            {stats.series} مسلسل
                          </span>
                        )}
                      </div>
                      
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-1.5 px-2 py-1 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-md transition-colors"
                      >
                        <SlidersHorizontal size={12} />
                        <span>فلاتر</span>
                        <ChevronDown size={12} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                      </button>
                    </motion.div>
                  )}

                  {/* Filters Panel */}
                  <AnimatePresence>
                    {showFilters && results.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden bg-slate-950/80 border-t border-slate-700/30"
                      >
                        <div className="px-4 py-3 space-y-3">
                          {/* Sort Options */}
                          <div className="space-y-2">
                            <label className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                              <TrendingUp size={12} />
                              ترتيب حسب
                            </label>
                            <div className="flex gap-2 flex-wrap">
                              {[
                                { value: 'relevance', label: 'الأكثر صلة', icon: TrendingUp },
                                { value: 'rating', label: 'الأعلى تقييماً', icon: Star },
                                { value: 'year', label: 'الأحدث', icon: Calendar },
                                { value: 'popularity', label: 'الأكثر شعبية', icon: Award },
                              ].map((option) => (
                                <button
                                  key={option.value}
                                  onClick={() => setSortBy(option.value as SortOption)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    sortBy === option.value
                                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                                      : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:bg-slate-800 hover:text-slate-300'
                                  }`}
                                >
                                  <option.icon size={12} />
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Filter Options */}
                          <div className="space-y-2">
                            <label className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                              <Filter size={12} />
                              النوع
                            </label>
                            <div className="flex gap-2">
                              {[
                                { value: 'all', label: 'الكل', icon: Filter },
                                { value: 'movie', label: 'أفلام فقط', icon: Film },
                                { value: 'tv', label: 'مسلسلات فقط', icon: Tv },
                              ].map((option) => (
                                <button
                                  key={option.value}
                                  onClick={() => setFilterBy(option.value as FilterOption)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    filterBy === option.value
                                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                                      : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:bg-slate-800 hover:text-slate-300'
                                  }`}
                                >
                                  <option.icon size={12} />
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Results Area */}
                <div className="overflow-y-auto max-h-[calc(85vh-180px)] custom-scrollbar">
                  {query.length >= 1 && (
                    <>
                      {filteredAndSortedResults.length > 0 ? (
                        <div className="p-2 space-y-2">
                          {/* Smart Search Hint with total results */}
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="px-3 py-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg text-xs flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <Search size={12} className="text-cyan-400" />
                              <span className="text-cyan-400">
                                <span className="font-bold">{totalFound} نتيجة</span>
                                {query.length <= 2 && (
                                  <span className="text-slate-400 mr-1">
                                    • بحث ذكي متعدد المستويات
                                  </span>
                                )}
                              </span>
                            </div>
                            {searchStrategy === 'smart-cascading' && (
                              <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded text-[10px] font-bold">
                                🧠 SMART
                              </span>
                            )}
                          </motion.div>
                          
                          {filteredAndSortedResults.slice(0, 15).map((result, index) => {
                            const genres = getGenres(result.genres_json)
                            const isHovered = hoveredResult === result.id

                            return (
                              <motion.div
                                key={`${result.media_type}-${result.id}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03 }}
                                onMouseEnter={() => setHoveredResult(result.id)}
                                onMouseLeave={() => setHoveredResult(null)}
                              >
                                <Link
                                  href={`/${result.media_type === 'movie' ? 'movies' : 'series'}/${result.slug}`}
                                  onClick={handleResultClick}
                                  className="block relative overflow-hidden rounded-xl border-2 border-slate-700/50 hover:border-cyan-500/60 transition-all duration-300 group bg-gradient-to-br from-slate-900/50 to-slate-900/30 hover:from-slate-800/60 hover:to-slate-800/40 hover:shadow-xl hover:shadow-cyan-500/10"
                                >
                                  {/* Background Gradient on Hover */}
                                  <div className={`absolute inset-0 bg-gradient-to-r ${
                                    result.media_type === 'movie' 
                                      ? 'from-red-500/5 to-orange-500/5' 
                                      : 'from-blue-500/5 to-cyan-500/5'
                                  } opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                                  <div className="relative flex gap-3 p-3">
                                    {/* Poster with Overlay */}
                                    <div className="relative w-20 h-28 sm:w-24 sm:h-32 rounded-lg overflow-hidden flex-shrink-0 bg-slate-800 shadow-xl ring-1 ring-slate-700/50 group-hover:ring-cyan-500/30 transition-all">
                                      {result.poster_path ? (
                                        <>
                                          <img
                                            src={`/tmdb/w154${result.poster_path}`}
                                            alt={result.title_ar}
                                            className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-110"
                                            loading="lazy"
                                          />
                                          {/* Play Overlay on Hover */}
                                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                            <div className="w-12 h-12 rounded-full bg-cyan-500/20 backdrop-blur-sm border-2 border-cyan-400/50 flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform duration-300">
                                              <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[16px] border-l-cyan-400 border-b-[10px] border-b-transparent ml-1" />
                                            </div>
                                          </div>
                                        </>
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                                          {result.media_type === 'movie' ? <Film size={28} /> : <Tv size={28} />}
                                        </div>
                                      )}
                                      
                                      {/* Rating Badge */}
                                      {result.vote_average > 0 && (
                                        <div className="absolute bottom-1.5 left-1.5 px-2 py-1 bg-black/90 backdrop-blur-sm rounded-md text-xs font-bold text-amber-400 flex items-center gap-1 shadow-lg">
                                          <Star size={11} className="fill-amber-400" />
                                          {result.vote_average.toFixed(1)}
                                        </div>
                                      )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                                      {/* Title Section */}
                                      <div>
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                          <h4 className="text-base sm:text-lg font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-1">
                                            {result.title_ar}
                                          </h4>
                                          
                                          {/* Media Type Badge */}
                                          <div className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold border shadow-sm ${
                                            result.media_type === 'movie'
                                              ? 'bg-gradient-to-br from-red-500/15 to-orange-500/10 text-red-400 border-red-500/40'
                                              : 'bg-gradient-to-br from-blue-500/15 to-cyan-500/10 text-blue-400 border-blue-500/40'
                                          }`}>
                                            {result.media_type === 'movie' ? (
                                              <span className="flex items-center gap-1">
                                                <Film size={11} />
                                                فيلم
                                              </span>
                                            ) : (
                                              <span className="flex items-center gap-1">
                                                <Tv size={11} />
                                                مسلسل
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors line-clamp-1 mb-2 font-medium">
                                          {result.title_en}
                                        </p>

                                        {/* Metadata */}
                                        <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                                          {(result.release_year || result.first_air_year) && (
                                            <span className="flex items-center gap-1">
                                              <Calendar size={11} />
                                              {result.release_year || result.first_air_year}
                                            </span>
                                          )}
                                          {result.vote_average >= 7 && (
                                            <span className="flex items-center gap-1 text-amber-400">
                                              <Award size={11} />
                                              تقييم عالي
                                            </span>
                                          )}
                                        </div>

                                        {/* Genres */}
                                        {genres.length > 0 && (
                                          <div className="flex gap-1.5 flex-wrap">
                                            {genres.map((genre: string, idx: number) => (
                                              <span
                                                key={idx}
                                                className="px-2 py-0.5 bg-slate-800/50 border border-slate-700 rounded text-xs text-slate-400"
                                              >
                                                {genre}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>

                                      {/* Description on Hover */}
                                      <AnimatePresence>
                                        {isHovered && result.overview_ar && (
                                          <motion.p
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="text-xs text-slate-400 line-clamp-2 mt-2 pt-2 border-t border-slate-700/50"
                                          >
                                            {result.overview_ar}
                                          </motion.p>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  </div>

                                  {/* Bottom Glow Effect */}
                                  <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${
                                    result.media_type === 'movie'
                                      ? 'from-red-500 to-orange-500'
                                      : 'from-blue-500 to-cyan-500'
                                  } opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                                </Link>
                              </motion.div>
                            )
                          })}
                        </div>
                      ) : (
                        !loading && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="py-16 text-center"
                          >
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-2 border-cyan-500/20 flex items-center justify-center relative overflow-hidden">
                              {/* Animated scanning ring */}
                              <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30 animate-ping" />
                              <Search size={32} className="text-cyan-400 relative z-10" />
                            </div>
                            <p className="text-slate-300 text-base font-semibold mb-1">البحث الذكي لم يجد نتائج مطابقة</p>
                            <p className="text-slate-500 text-sm mb-4">جرب كلمات بحث مختلفة أو أقصر</p>
                            <div className="text-xs text-slate-600">
                              <p>💡 البحث الذكي فحص 6 مستويات مختلفة</p>
                              <p className="mt-1">تم البحث في: المطابقات التامة، البداية، الاحتواء، والبحث الضبابي</p>
                            </div>
                          </motion.div>
                        )
                      )}
                    </>
                  )}

                  {/* Initial State */}
                  {query.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="py-12 px-6 text-center space-y-6"
                    >
                      <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-2 border-cyan-500/20 flex items-center justify-center relative overflow-hidden">
                        {/* Animated Ring */}
                        <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30 animate-ping" />
                        <Search size={40} className="text-cyan-400 relative z-10" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white mb-2">اكتشف عالم السينما</h3>
                        <p className="text-slate-400 text-sm mb-4">ابحث بأي عدد من الحروف - حتى حرف واحد!</p>
                        
                        {/* Quick suggestions */}
                        <div className="space-y-2">
                          <p className="text-xs text-slate-500 mb-1">اقتراحات سريعة:</p>
                          <div className="flex flex-wrap gap-2 justify-center">
                            {['V', 'X', 'Up', 'It', 'Her', 'Ted', 'Inception'].map((suggestion) => (
                              <button
                                key={suggestion}
                                onClick={() => setQuery(suggestion)}
                                className="px-3 py-1.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 rounded-lg text-xs text-slate-400 hover:text-cyan-400 transition-all"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* No more "write 2 chars" message - now supports 1 char search! */}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.7);
        }
      `}</style>
    </div>
  )
}
