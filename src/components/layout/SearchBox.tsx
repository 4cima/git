'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, Film, Tv, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

interface SearchResult {
  id: number
  slug: string
  title_ar: string
  title_en: string
  poster_path: string
  vote_average: number
  media_type: 'movie' | 'tv'
  release_year?: number
  first_air_year?: number
}

export function SearchBox() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Search with debounce
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
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
        }
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

  const handleClear = () => {
    setQuery('')
    setResults([])
    inputRef.current?.focus()
  }

  const handleResultClick = () => {
    setIsOpen(false)
    setQuery('')
    setResults([])
  }

  return (
    <div ref={searchRef} className="relative">
      {/* Search Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 rounded-lg transition-all duration-200"
          aria-label="بحث"
        >
          <Search size={18} className="text-slate-400" />
          <span className="hidden sm:inline text-sm text-slate-400">بحث...</span>
        </button>
      )}

      {/* Expanded Search Box */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-0 w-64 sm:w-80 md:w-96 z-50"
          >
            <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-lg shadow-2xl overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-700">
                <Search size={18} className="text-cyan-400 flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ابحث عن أفلام أو مسلسلات..."
                  className="flex-1 bg-transparent text-white placeholder-slate-400 outline-none text-sm"
                  autoComplete="off"
                />
                {query && (
                  <button
                    onClick={handleClear}
                    className="text-slate-400 hover:text-white transition-colors"
                    aria-label="مسح"
                  >
                    <X size={16} />
                  </button>
                )}
                {loading && (
                  <Loader2 size={16} className="text-cyan-400 animate-spin" />
                )}
              </div>

              {/* Search Results */}
              {query.length >= 2 && (
                <div className="max-h-96 overflow-y-auto">
                  {results.length > 0 ? (
                    <div className="py-2">
                      {results.slice(0, 8).map((result) => (
                        <Link
                          key={`${result.media_type}-${result.id}`}
                          href={`/${result.media_type === 'movie' ? 'movies' : 'series'}/${result.slug}`}
                          onClick={handleResultClick}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-slate-800/50 transition-colors"
                        >
                          {/* Poster */}
                          <div className="w-10 h-14 rounded overflow-hidden bg-slate-800 flex-shrink-0">
                            {result.poster_path ? (
                              <img
                                src={`/tmdb/w92${result.poster_path}`}
                                alt={result.title_ar}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-600">
                                {result.media_type === 'movie' ? <Film size={16} /> : <Tv size={16} />}
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-white truncate">
                              {result.title_ar}
                            </h4>
                            <p className="text-xs text-slate-400 truncate">
                              {result.title_en}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-slate-500">
                                {result.release_year || result.first_air_year}
                              </span>
                              {result.vote_average > 0 && (
                                <span className="text-xs text-amber-400">
                                  ⭐ {result.vote_average.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Media Type Badge */}
                          <div className={`px-2 py-0.5 rounded text-xs font-bold flex-shrink-0 ${
                            result.media_type === 'movie'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          }`}>
                            {result.media_type === 'movie' ? 'فيلم' : 'مسلسل'}
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    !loading && (
                      <div className="py-8 text-center text-slate-400 text-sm">
                        لا توجد نتائج
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Helper Text */}
              {query.length === 0 && (
                <div className="py-4 px-3 text-center text-slate-500 text-xs">
                  ابدأ بكتابة اسم الفيلم أو المسلسل
                </div>
              )}
              {query.length === 1 && (
                <div className="py-4 px-3 text-center text-slate-500 text-xs">
                  اكتب حرفين على الأقل للبحث
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
