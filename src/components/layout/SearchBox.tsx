'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Search, X, Film, Tv, Loader2, Star, Calendar, TrendingUp, Filter, SlidersHorizontal, ChevronDown, Clock, Award } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

interface SearchResult {
  id: number
  slug: string
  title_ar?: string
  title_en?: string
  name_ar?: string
  name_en?: string
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
    <div ref={searchRef} className="relative flex items-center gap-3">
      {/* Android App Button - Coming Soon (يظهر فقط عند عدم التمرير) */}
      {!isOpen && !isCollapsed && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="relative h-9 px-8 bg-slate-700/95 hover:bg-slate-600/95 backdrop-blur-sm border border-slate-500/50 hover:border-slate-400 rounded-md shadow-lg transition-all duration-300 group overflow-hidden"
          aria-label="التطبيق قريباً"
        >
          <div className="flex items-center gap-1.5 relative z-10">
            <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-200 transition-colors" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85a.637.637 0 0 0-.83.22l-1.88 3.24a11.43 11.43 0 0 0-8.94 0L5.65 5.67a.643.643 0 0 0-.87-.2c-.28.18-.37.54-.22.83L6.4 9.48A10.81 10.81 0 0 0 1 18h22a10.81 10.81 0 0 0-5.4-8.52M7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5m10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5"/>
            </svg>
            <span className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">قريباً</span>
          </div>
          
          {/* Subtle hover glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-500/0 via-slate-400/10 to-slate-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </motion.button>
      )}
      
      {/* Search Button - Modern Glass Design */}
      {!isOpen && (
        <motion.button
          ref={buttonRef}
          animate={{
            width: isCollapsed ? '36px' : 'auto',
            paddingLeft: isCollapsed ? '9px' : '32px',
            paddingRight: isCollapsed ? '9px' : '32px',
          }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setIsOpen(true)
            setIsCollapsed(false)
          }}
          className="relative h-9 py-1.5 bg-slate-700/95 hover:bg-slate-600/95 backdrop-blur-sm border border-slate-500/50 hover:border-blue-400/50 rounded-md shadow-lg hover:shadow-blue-500/20 transition-all duration-300 group overflow-hidden"
          aria-label="بحث"
        >
          <div className="flex items-center gap-1.5 relative z-10">
            <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35" strokeLinecap="round"/>
            </svg>
            <motion.span
              animate={{
                opacity: isCollapsed ? 0 : 1,
                width: isCollapsed ? 0 : 'auto',
              }}
              transition={{ duration: 0.2 }}
              className="text-sm font-semibold text-slate-200 group-hover:text-white whitespace-nowrap overflow-hidden"
            >
              بحث متقدم
            </motion.span>
          </div>
          
          {/* Subtle accent line */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </motion.button>
      )}

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Search Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                position: 'fixed',
                top: '0',
                left: '20px',
              }}
              className="w-[280px] sm:w-[320px] max-h-screen z-[999] flex flex-col"
            >
              {/* Main Search Container */}
              <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden">
                
                {/* Header with Search Input */}
                <div className="relative bg-slate-800/80 border-b border-slate-700">
                  <div className="flex items-center gap-2 px-2 py-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="ابحث..."
                      className="flex-1 bg-slate-900/50 text-white placeholder-slate-500 outline-none text-xs font-medium px-2 py-0.5 rounded border border-slate-700 focus:border-slate-600"
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
                      className="px-3 py-2 bg-slate-950/50 border-t border-slate-700/30 space-y-1.5"
                    >
                      {/* Type Filter - Row 1 */}
                      <div className="flex items-center gap-1.5">
                        {/* All Button */}
                        <button
                          onClick={() => setFilterBy('all')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                            filterBy === 'all'
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                              : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:bg-slate-800 hover:text-slate-300'
                          }`}
                        >
                          الكل {stats.total}
                        </button>
                        
                        {/* Movies Button */}
                        {stats.movies > 0 && (
                          <button
                            onClick={() => setFilterBy('movie')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                              filterBy === 'movie'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:bg-slate-800 hover:text-slate-300'
                            }`}
                          >
                            أفلام {stats.movies}
                          </button>
                        )}
                        
                        {/* Series Button */}
                        {stats.series > 0 && (
                          <button
                            onClick={() => setFilterBy('tv')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                              filterBy === 'tv'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:bg-slate-800 hover:text-slate-300'
                            }`}
                          >
                            مسلسلات {stats.series}
                          </button>
                        )}
                      </div>
                      
                      {/* Sort Options - Row 2 */}
                      <div className="flex gap-1.5 flex-wrap">
                        {[
                          { value: 'relevance', label: 'الأفضل' },
                          { value: 'rating', label: 'الأعلى تقييماً' },
                          { value: 'year', label: 'الأحدث' },
                          { value: 'popularity', label: 'الأشهر' },
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setSortBy(option.value as SortOption)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                              sortBy === option.value
                                ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                </div>

                {/* Results Area - 2 Columns Grid */}
                <div className="overflow-y-auto max-h-[calc(100vh-120px)] custom-scrollbar">
                  {query.length >= 1 && (
                    <>
                      {filteredAndSortedResults.length > 0 ? (
                        <div className="p-2 space-y-2">
                          {/* 2-Column Grid Layout */}
                          <div className="grid grid-cols-2 gap-2">
                          {filteredAndSortedResults.slice(0, displayLimit).map((result, index) => {
                            const year = result.release_year || result.first_air_year
                            const titleAr = result.title_ar || result.name_ar || ''
                            const titleEn = result.title_en || result.name_en || ''
                            const genres = getGenres(result.genres_json)
                            const mainGenre = genres[0] || ''

                            return (
                              <motion.div
                                key={`${result.media_type}-${result.id}`}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.02 }}
                              >
                                <Link
                                  href={`/${result.media_type === 'movie' ? 'movies' : 'series'}/${result.slug}`}
                                  onClick={handleResultClick}
                                  className="block relative rounded-lg overflow-hidden border border-slate-700/50 hover:border-cyan-500/50 bg-slate-900/50 hover:bg-slate-800/70 transition-all duration-200 group"
                                >
                                  {/* Poster with Badges */}
                                  <div className="relative aspect-[2/3] bg-slate-800">
                                    {result.poster_path ? (
                                      <img
                                        src={`/tmdb/w154${result.poster_path}`}
                                        alt={titleAr}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        loading="lazy"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                                        {result.media_type === 'movie' ? <Film size={24} /> : <Tv size={24} />}
                                      </div>
                                    )}
                                    
                                    {/* Rating Badge - Top Left */}
                                    {result.vote_average > 0 && (
                                      <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/80 backdrop-blur-sm rounded text-[10px] font-bold text-amber-400 flex items-center gap-0.5">
                                        <Star size={9} className="fill-amber-400" />
                                        {result.vote_average.toFixed(1)}
                                      </div>
                                    )}
                                    
                                    {/* Year Badge - Top Right */}
                                    {year && (
                                      <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-black/80 backdrop-blur-sm rounded text-[10px] font-bold text-slate-300">
                                        {year}
                                      </div>
                                    )}
                                    
                                    {/* Type Badge - Bottom */}
                                    <div className={`absolute bottom-0 left-0 right-0 px-2 py-1 ${
                                      result.media_type === 'movie'
                                        ? 'bg-gradient-to-t from-red-900/90 to-transparent'
                                        : 'bg-gradient-to-t from-blue-900/90 to-transparent'
                                    }`}>
                                      <div className="flex items-center justify-between text-[10px]">
                                        <span className={`font-bold ${
                                          result.media_type === 'movie' ? 'text-red-400' : 'text-blue-400'
                                        }`}>
                                          {result.media_type === 'movie' ? 'فيلم' : 'مسلسل'}
                                        </span>
                                        {mainGenre && (
                                          <span className="text-slate-300 truncate max-w-[60px]">{mainGenre}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Title Below Poster */}
                                  <div className="p-1.5 space-y-0.5">
                                    <h4 className="text-[11px] font-bold text-white line-clamp-1 leading-tight">
                                      {titleAr}
                                    </h4>
                                    <p className="text-[9px] text-slate-400 line-clamp-1 leading-tight">
                                      {titleEn}
                                    </p>
                                  </div>
                                </Link>
                              </motion.div>
                            )
                          })}
                          </div>
                          {/* Load More Button */}
                          {displayLimit < filteredAndSortedResults.length && (
                            <motion.button
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={handleLoadMore}
                              className="col-span-2 mt-3 px-4 py-3 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 border border-cyan-500/30 hover:border-cyan-500/50 rounded-xl transition-all duration-300"
                            >
                              <div className="flex items-center justify-center gap-2 text-cyan-400 font-semibold text-sm">
                                <ChevronDown size={18} />
                                <span>تحميل المزيد ({Math.min(50, filteredAndSortedResults.length - displayLimit)})</span>
                                <ChevronDown size={18} />
                              </div>
                            </motion.button>
                          )}
                        </div>
                      ) : (
                        !loading && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="py-8 text-center px-3"
                          >
                            <p className="text-slate-300 text-sm font-semibold mb-1">لا توجد نتائج</p>
                            <p className="text-slate-500 text-xs">جرب كلمات بحث مختلفة</p>
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
                      className="py-6 px-3 text-center"
                    >
                      <p className="text-slate-400 text-xs">ابدأ البحث للعثور على أفلام ومسلسلات</p>
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
