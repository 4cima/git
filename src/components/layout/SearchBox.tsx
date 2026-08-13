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

// YouTube-Style Keyboard Component
function YouTubeKeyboard({ onKeyPress, onClose }: { onKeyPress: (key: string) => void; onClose: () => void }) {
  const [layout, setLayout] = useState<'arabic' | 'english' | 'numbers'>('arabic')
  
  const layouts = {
    arabic: [
      ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج'],
      ['ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك', 'ط'],
      ['ئ', 'ء', 'ؤ', 'ر', 'ى', 'ة', 'و', 'ز', 'ظ', 'د', 'ذ']
    ],
    english: [
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
      ['z', 'x', 'c', 'v', 'b', 'n', 'm']
    ],
    numbers: [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['-', '/', ':', ';', '(', ')', '$', '&', '@', '"'],
      ['.', ',', '?', '!', "'", '#', '%', '*', '+', '=']
    ]
  }
  
  const currentLayout = layouts[layout]
  
  return (
    <div className="space-y-2">
      {currentLayout.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1 justify-center">
          {row.map((key) => (
            <button
              key={key}
              onClick={() => onKeyPress(key)}
              className="px-3 py-2.5 min-w-[32px] bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 rounded text-sm text-white font-medium transition-all active:scale-95"
            >
              {key}
            </button>
          ))}
        </div>
      ))}
      
      {/* Bottom Row - Control Keys */}
      <div className="flex gap-1 justify-center items-center pt-1">
        {/* Language Toggle */}
        <button
          onClick={() => setLayout(layout === 'arabic' ? 'english' : 'arabic')}
          className="px-4 py-2.5 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-700/50 rounded text-xs text-blue-400 font-semibold transition-all active:scale-95"
        >
          {layout === 'arabic' ? 'EN' : 'عر'}
        </button>
        
        {/* Numbers Toggle */}
        <button
          onClick={() => setLayout(layout === 'numbers' ? 'arabic' : 'numbers')}
          className="px-4 py-2.5 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-700/50 rounded text-xs text-purple-400 font-semibold transition-all active:scale-95"
        >
          123
        </button>
        
        {/* Space */}
        <button
          onClick={() => onKeyPress('space')}
          className="flex-1 px-8 py-2.5 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 border border-slate-600 rounded text-sm text-white font-medium transition-all active:scale-95"
        >
          مسافة
        </button>
        
        {/* Backspace */}
        <button
          onClick={() => onKeyPress('backspace')}
          className="px-4 py-2.5 bg-red-900/30 hover:bg-red-900/50 border border-red-700/50 rounded text-sm text-red-400 font-semibold transition-all active:scale-95"
        >
          ⌫
        </button>
        
        {/* Close */}
        <button
          onClick={onClose}
          className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-sm text-slate-300 font-semibold transition-all active:scale-95"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

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
  const [displayLimit, setDisplayLimit] = useState(50) // عرض 50 في البداية
  const [isListening, setIsListening] = useState(false) // البحث الصوتي
  const [showKeyboard, setShowKeyboard] = useState(false) // الكيبورد الافتراضي
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const recognitionRef = useRef<any>(null)
  
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
        setShowKeyboard(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Voice Search Setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = false
        recognitionRef.current.lang = 'ar-SA' // Arabic by default
        
        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript
          setQuery(transcript)
          setIsListening(false)
        }
        
        recognitionRef.current.onerror = () => {
          setIsListening(false)
        }
        
        recognitionRef.current.onend = () => {
          setIsListening(false)
        }
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])
  
  // Remote Control & Gamepad Support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      
      // Remote Control Keys
      switch(e.key) {
        case 'Enter':
          // Open keyboard or close search
          if (showKeyboard) {
            setShowKeyboard(false)
          }
          break
        case 'ArrowUp':
          e.preventDefault()
          // Navigate results up
          break
        case 'ArrowDown':
          e.preventDefault()
          // Navigate results down
          break
        case 'Back':
        case 'Backspace':
          if (!query) {
            e.preventDefault()
            setIsOpen(false)
          }
          break
      }
    }
    
    // Gamepad support for TV remotes
    let gamepadInterval: NodeJS.Timeout | null = null
    if (isOpen && typeof window !== 'undefined' && 'getGamepads' in navigator) {
      gamepadInterval = setInterval(() => {
        const gamepads = navigator.getGamepads()
        const gamepad = gamepads[0]
        
        if (gamepad) {
          // D-pad up (button 12)
          if (gamepad.buttons[12]?.pressed) {
            // Navigate up
          }
          // D-pad down (button 13)
          if (gamepad.buttons[13]?.pressed) {
            // Navigate down
          }
          // A button (button 0) or Enter
          if (gamepad.buttons[0]?.pressed) {
            // Select result
          }
          // B button (button 1) or Back
          if (gamepad.buttons[1]?.pressed) {
            setIsOpen(false)
          }
        }
      }, 100)
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (gamepadInterval) clearInterval(gamepadInterval)
    }
  }, [isOpen, showKeyboard, query])
  
  // Touch Gestures Support
  useEffect(() => {
    if (!isOpen || !searchRef.current) return
    
    let touchStartY = 0
    let touchStartX = 0
    
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY
      touchStartX = e.touches[0].clientX
    }
    
    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndY = e.changedTouches[0].clientY
      const touchEndX = e.changedTouches[0].clientX
      const deltaY = touchStartY - touchEndY
      const deltaX = touchStartX - touchEndX
      
      // Swipe down to close search
      if (deltaY < -100 && Math.abs(deltaX) < 50) {
        setIsOpen(false)
      }
      
      // Swipe right to open keyboard
      if (deltaX < -100 && Math.abs(deltaY) < 50) {
        setShowKeyboard(true)
      }
      
      // Swipe left to close keyboard
      if (deltaX > 100 && Math.abs(deltaY) < 50 && showKeyboard) {
        setShowKeyboard(false)
      }
    }
    
    const element = searchRef.current
    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })
    
    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isOpen, showKeyboard])
  
  // Start/Stop Voice Search
  const toggleVoiceSearch = () => {
    if (!recognitionRef.current) {
      alert('البحث الصوتي غير مدعوم في هذا المتصفح')
      return
    }
    
    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  // Search with debounce
  useEffect(() => {
    if (!query.trim() || query.length < 1) {
      setResults([])
      setDisplayLimit(50) // إعادة تعيين الحد عند مسح البحث
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
          setDisplayLimit(50) // إعادة تعيين الحد عند بحث جديد
        }
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setLoading(false)
      }
    }, 200)

    return () => clearTimeout(timeoutId)
  }, [query])

  // Sort and filter results with interleaving for 'all' mode
  const filteredAndSortedResults = useMemo(() => {
    let filtered = results

    // Apply sort first
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

    // Apply filter with special handling for 'all' mode
    if (filterBy === 'all') {
      // التداخل: فيلم → مسلسل → فيلم → مسلسل
      const movies = sorted.filter(r => r.media_type === 'movie')
      const series = sorted.filter(r => r.media_type === 'tv')
      const interleaved: SearchResult[] = []
      
      const maxLength = Math.max(movies.length, series.length)
      for (let i = 0; i < maxLength; i++) {
        if (i < movies.length) interleaved.push(movies[i])
        if (i < series.length) interleaved.push(series[i])
      }
      
      return interleaved
    } else {
      // فلترة حسب النوع المحدد
      return sorted.filter(r => r.media_type === filterBy)
    }
  }, [results, sortBy, filterBy])

  const handleClear = () => {
    setQuery('')
    setResults([])
    setTotalFound(0)
    setSearchStrategy('')
    setDisplayLimit(50)
    inputRef.current?.focus()
  }

  const handleResultClick = () => {
    setIsOpen(false)
    setQuery('')
    setResults([])
    setTotalFound(0)
    setSearchStrategy('')
    setShowFilters(false)
    setDisplayLimit(50)
  }
  
  const handleLoadMore = () => {
    setDisplayLimit(prev => prev + 50)
  }
  
  // Virtual Keyboard - Handle key press
  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      setQuery(prev => prev.slice(0, -1))
    } else if (key === 'space') {
      setQuery(prev => prev + ' ')
    } else if (key === 'clear') {
      setQuery('')
    } else {
      setQuery(prev => prev + key)
    }
    inputRef.current?.focus()
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
          ref={buttonRef}
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

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Search Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                position: 'fixed',
                top: buttonRef.current ? `${buttonRef.current.getBoundingClientRect().bottom + 8}px` : '80px',
                left: '20px',
              }}
              className="w-[280px] sm:w-[320px] max-h-[85vh] z-[999] flex flex-col"
            >
              {/* Main Search Container */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 backdrop-blur-2xl border-2 border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
                {/* Animated Border Glow */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 opacity-0 blur-xl animate-pulse pointer-events-none" style={{ animationDuration: '3s' }} />
                
                {/* Header with Search Input */}
                <div className="relative bg-gradient-to-r from-slate-800/50 to-slate-900/50 border-b border-slate-700/50">
                  <div className="flex items-center gap-3 px-4 py-4">
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="ابحث عن فيلم أو مسلسل..."
                      className="flex-1 bg-transparent text-white placeholder-slate-400 outline-none text-lg font-medium"
                      autoComplete="off"
                    />
                    
                    {loading && (
                      <Loader2 size={20} className="text-cyan-400 animate-spin flex-shrink-0" />
                    )}
                    
                    {/* Voice Search Button */}
                    {!loading && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={toggleVoiceSearch}
                        className={`flex-shrink-0 transition-colors ${
                          isListening 
                            ? 'text-red-500 animate-pulse' 
                            : 'text-slate-400 hover:text-cyan-400'
                        }`}
                        aria-label="بحث صوتي"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                          <line x1="12" y1="19" x2="12" y2="22"/>
                        </svg>
                      </motion.button>
                    )}
                    
                    {/* Virtual Keyboard Toggle Button */}
                    {!loading && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowKeyboard(!showKeyboard)}
                        className={`flex-shrink-0 transition-colors ${
                          showKeyboard 
                            ? 'text-cyan-400' 
                            : 'text-slate-400 hover:text-cyan-400'
                        }`}
                        aria-label="لوحة مفاتيح"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="4" width="20" height="16" rx="2"/>
                          <path d="M6 8h.01"/>
                          <path d="M10 8h.01"/>
                          <path d="M14 8h.01"/>
                          <path d="M18 8h.01"/>
                          <path d="M8 12h.01"/>
                          <path d="M12 12h.01"/>
                          <path d="M16 12h.01"/>
                          <path d="M7 16h10"/>
                        </svg>
                      </motion.button>
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

                  {/* Virtual Keyboard - YouTube Style */}
                  <AnimatePresence>
                    {showKeyboard && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden bg-slate-950/95 border-t border-slate-700/30 px-3 py-3"
                      >
                        <YouTubeKeyboard 
                          onKeyPress={handleKeyPress}
                          onClose={() => setShowKeyboard(false)}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Stats Bar with External Type Filter */}
                  {results.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="px-4 py-2 bg-slate-950/50 border-t border-slate-700/30"
                    >
                      {/* Type Filter - External and Clickable */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {/* All Button */}
                          <button
                            onClick={() => setFilterBy('all')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              filterBy === 'all'
                                ? 'bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-white border-2 border-purple-400/50 shadow-lg shadow-purple-500/20'
                                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:bg-slate-800 hover:text-slate-300'
                            }`}
                          >
                            <Filter size={13} />
                            <span>الكل {stats.total}</span>
                          </button>
                          
                          {/* Movies Button */}
                          {stats.movies > 0 && (
                            <button
                              onClick={() => setFilterBy('movie')}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                filterBy === 'movie'
                                  ? 'bg-gradient-to-r from-red-500/20 to-orange-500/20 text-red-400 border-2 border-red-400/50 shadow-lg shadow-red-500/20'
                                  : 'bg-slate-800/50 text-red-400/60 border border-slate-700 hover:bg-slate-800 hover:text-red-400'
                              }`}
                            >
                              <Film size={13} />
                              <span>أفلام {stats.movies}</span>
                            </button>
                          )}
                          
                          {/* Series Button */}
                          {stats.series > 0 && (
                            <button
                              onClick={() => setFilterBy('tv')}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                filterBy === 'tv'
                                  ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border-2 border-blue-400/50 shadow-lg shadow-blue-500/20'
                                  : 'bg-slate-800/50 text-blue-400/60 border border-slate-700 hover:bg-slate-800 hover:text-blue-400'
                              }`}
                            >
                              <Tv size={13} />
                              <span>مسلسلات {stats.series}</span>
                            </button>
                          )}
                        </div>
                        
                        {/* Sort Filters Button */}
                        <button
                          onClick={() => setShowFilters(!showFilters)}
                          className="flex items-center gap-1.5 px-2 py-1 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-md transition-colors text-xs"
                        >
                          <SlidersHorizontal size={12} />
                          <span>ترتيب</span>
                          <ChevronDown size={12} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Filters Panel - Sort Only */}
                  <AnimatePresence>
                    {showFilters && results.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden bg-slate-950/80 border-t border-slate-700/30"
                      >
                        <div className="px-4 py-3">
                          {/* Sort Options Only */}
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
                                <span className="font-bold">عرض {Math.min(displayLimit, filteredAndSortedResults.length)} من {filteredAndSortedResults.length}</span>
                                {query.length <= 2 && (
                                  <span className="text-slate-400 mr-1">
                                    • بحث ذكي
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
                          
                          {filteredAndSortedResults.slice(0, displayLimit).map((result, index) => {
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
                          
                          {/* Load More Button */}
                          {displayLimit < filteredAndSortedResults.length && (
                            <motion.button
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={handleLoadMore}
                              className="w-full mt-3 px-4 py-3 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 border border-cyan-500/30 hover:border-cyan-500/50 rounded-xl transition-all duration-300 group"
                            >
                              <div className="flex items-center justify-center gap-2 text-cyan-400 font-semibold text-sm">
                                <ChevronDown size={18} className="group-hover:animate-bounce" />
                                <span>تحميل المزيد ({Math.min(50, filteredAndSortedResults.length - displayLimit)} إضافية)</span>
                                <ChevronDown size={18} className="group-hover:animate-bounce" />
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                المتبقي: {filteredAndSortedResults.length - displayLimit} نتيجة
                              </div>
                            </motion.button>
                          )}
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

                  {/* Initial State - Clean and Simple */}
                  {query.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="py-8 px-4 text-center"
                    >
                      <p className="text-slate-400 text-sm mb-3">ابدأ البحث للعثور على أفلام ومسلسلات</p>
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
