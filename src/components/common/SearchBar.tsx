'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Film, Tv } from 'lucide-react'

interface SearchResult {
  id: number
  slug: string
  title_ar: string
  title_en: string
  media_type: 'movie' | 'tv'
  poster_path: string
}

export const SearchBar = () => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }

    const timeout = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=5`)
        const data = await res.json()
        setResults(data.results || [])
        setIsOpen(true)
      } catch (e) {
        console.error('Search error:', e)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeout)
  }, [query])

  const handleSelect = (item: SearchResult) => {
    const path = item.media_type === 'tv' ? '/series' : '/movies'
    router.push(`${path}/${item.slug}`)
    setQuery('')
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <div className="relative group bg-black/40 backdrop-blur-sm rounded-full hover:bg-black/60 transition-colors">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-hover:text-cyan-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder="بحث..."
          className="bg-transparent border-none rounded-full py-2 pl-10 pr-10 text-sm text-zinc-300 w-36 lg:w-48 transition-all focus:outline-none focus:w-64 placeholder:text-zinc-500"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-2 w-80 right-0 bg-zinc-900/95 backdrop-blur-xl rounded-xl border border-zinc-700/50 shadow-2xl overflow-hidden z-50">
          {isLoading ? (
            <div className="p-4 text-center text-zinc-500">
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-80 overflow-y-auto">
              {results.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-zinc-800/50 transition-colors text-right"
                >
                  {item.poster_path ? (
                    <img 
                      src={`/tmdb/w92${item.poster_path}`} 
                      alt={item.title_ar}
                      className="w-10 h-14 object-cover rounded"
                    />
                  ) : (
                    <div className="w-10 h-14 bg-zinc-800 rounded flex items-center justify-center">
                      <Film className="w-5 h-5 text-zinc-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{item.title_ar || item.title_en}</p>
                    <p className="text-xs text-zinc-500 flex items-center gap-1">
                      {item.media_type === 'tv' ? <Tv className="w-3 h-3" /> : <Film className="w-3 h-3" />}
                      {item.media_type === 'tv' ? 'مسلسل' : 'فيلم'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-zinc-500 text-sm">
              لا توجد نتائج
            </div>
          )}
          
          {/* Footer - Search All */}
          {results.length > 0 && (
            <button
              onClick={() => {
                router.push(`/search?q=${encodeURIComponent(query)}`)
                setIsOpen(false)
              }}
              className="w-full p-3 bg-zinc-800/30 text-cyan-400 text-sm hover:bg-zinc-800/50 transition-colors border-t border-zinc-700/50"
            >
              بحث متقدم...
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Add Loader2 import if not present in imports
import { Loader2 } from 'lucide-react'
