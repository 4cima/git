'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MovieCard } from '../features/media/MovieCard'
import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { UnifiedFilters } from '../unified/UnifiedFilters'

interface MoviesGridProps {
  initialMovies: any[]
  initialCursor: any
}

export const MoviesGrid = ({ initialMovies, initialCursor }: MoviesGridProps) => {
  const [movies, setMovies] = useState(initialMovies)
  const [cursor, setCursor] = useState(initialCursor)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<any>({})

  // Reset and fetch when filters change
  useEffect(() => {
    if (Object.keys(filters).length === 0 && movies.length > 0 && movies[0].id === initialMovies[0]?.id) {
      return // Skip initial render if no filters
    }

    const fetchFiltered = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (filters.genre) params.append('genre', filters.genre)
        if (filters.year) params.append('year', filters.year)
        if (filters.rating) params.append('rating', filters.rating)
        
        const response = await fetch(`/api/movies/explore?${params.toString()}`)
        if (response.ok) {
          const data = await response.json()
          setMovies(data.results || data.movies || [])
          setCursor(data.nextCursor)
        }
      } catch (error) {
        console.error('Error fetching filtered movies:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchFiltered()
  }, [filters])

  const loadMore = async (e: React.MouseEvent) => {
    e.preventDefault()
    
    if (!cursor || loading) return
    
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('cursor', cursor)
      if (filters.genre) params.append('genre', filters.genre)
      if (filters.year) params.append('year', filters.year)
      if (filters.rating) params.append('rating', filters.rating)

      const response = await fetch(`/api/movies/explore?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setMovies(prev => [...prev, ...(data.results || data.movies || [])])
        setCursor(data.nextCursor)
      }
    } catch (error) {
      console.error('Error loading more movies:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <UnifiedFilters 
        contentType="movies"
        onApplyFilters={setFilters}
        onClearAll={() => {
          setFilters({})
          setMovies(initialMovies)
          setCursor(initialCursor)
        }}
      />

      <motion.div
        layout
        className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-4 md:gap-6"
      >
        {movies.map((movie, i) => (
          <MovieCard key={movie.id} movie={{ ...movie, media_type: 'movie' }} index={i} />
        ))}
      </motion.div>

      {cursor && (
        <div className="flex justify-center mt-8">
          <Link
            href={`?cursor=${cursor}`}
            onClick={loadMore}
            className="px-8 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold hover:scale-105 transition-transform flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                جاري التحميل...
              </>
            ) : (
              <>
                <ChevronDown className="w-5 h-5" />
                عرض المزيد
              </>
            )}
          </Link>
        </div>
      )}
    </>
  )
}
