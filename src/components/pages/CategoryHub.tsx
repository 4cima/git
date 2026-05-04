'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { MovieCard } from '../features/media/MovieCard'
import { Star, Clock, TrendingUp, SearchX } from 'lucide-react'
import { SectionHeader } from '../common/SectionHeader'
import { UnifiedFilters } from '../unified/UnifiedFilters'
import type { ContentType } from '../../types/unified-section'

const CATEGORY_MAP: Record<string, any> = {
  foreign: { language: 'en' },
  arabic: { language: 'ar' },
  asian: { language: 'ko|ja|zh|th|vi|id' },
  turkish: { language: 'tr' },
  indian: { language: 'hi|ta|te|ml' },
  animation: { genres: '16' },
  top_rated: { sort: 'vote_average', ratingFrom: 7 },
  popular: { sort: 'popularity' },
  trending: { sort: 'popularity' },
}

const YEARS = Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - i)

interface CategoryHubProps {
  type?: 'movie' | 'tv'
  category?: string
}

export const CategoryHub = ({ type = 'movie', category }: CategoryHubProps) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const year = searchParams.get('year')
  const genre = searchParams.get('genre')
  const rating = searchParams.get('rating') ? Number(searchParams.get('rating')) : null
  const language = searchParams.get('language')

  const [content, setContent] = useState<any[]>([])
  const [featuredContent, setFeaturedContent] = useState<any[]>([])
  const [genresList, setGenresList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState<'latest' | 'top_rated' | 'trending' | 'popular'>('latest')
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (category === 'top_rated') setActiveTab('top_rated')
    else if (category === 'popular') setActiveTab('popular')
    else if (category === 'trending') setActiveTab('trending')
    else setActiveTab('latest')
  }, [category])

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await fetch(`/api/genres?type=${type}`)
        if (response.ok) {
          const data = await response.json()
          setGenresList(data.genres || [])
        }
      } catch (err) {
        console.error('Error fetching genres:', err)
      }
    }
    fetchGenres()
  }, [type])

  useEffect(() => {
    if (year || genre || rating) return

    const fetchFeatured = async () => {
      try {
        const endpoint = type === 'movie' ? '/api/movies' : '/api/tv'
        const params: any = {
          sort: 'vote_average',
          ratingFrom: 8,
          limit: 8
        }

        if (category && CATEGORY_MAP[category]) {
          const catParams = CATEGORY_MAP[category]
          if (catParams.language) params.language = catParams.language
          if (catParams.genres) params.genres = catParams.genres
        }

        const queryString = new URLSearchParams(params).toString()
        const response = await fetch(`${endpoint}?${queryString}`)
        if (response.ok) {
          const data = await response.json()
          setFeaturedContent((data.results || []).slice(0, 8).map((item: any) => ({ ...item, media_type: type })))
        }
      } catch (err) {
        console.error('Error fetching featured content:', err)
      }
    }

    fetchFeatured()
  }, [category, year, genre, type, rating])

  useEffect(() => {
    setLoading(true)
    const fetchContent = async () => {
      try {
        const endpoint = type === 'movie' ? '/api/movies' : '/api/tv'
        const params: any = {
          page: 1,
          limit: 100
        }

        if (activeTab === 'top_rated') {
          params.sort = 'vote_average'
          params.ratingFrom = 7
        } else if (activeTab === 'trending' || activeTab === 'popular') {
          params.sort = 'popularity'
          if (activeTab === 'popular') {
            params.ratingFrom = 8  // Best of all - high rating + popular
          }
        } else {
          params.sort = type === 'movie' ? 'release_date' : 'first_air_date'
        }

        if (category && CATEGORY_MAP[category]) {
          const catParams = CATEGORY_MAP[category]
          if (catParams.language) params.language = catParams.language
          if (catParams.genres) params.genres = catParams.genres
        }

        if (year) {
          // Handle both single year and year range
          if (typeof year === 'string' && year.includes('-')) {
            const [startYear, endYear] = year.split('-').map(Number)
            params.yearFrom = startYear
            params.yearTo = endYear
          } else {
            params.year = Number(year)
          }
        }
        if (genre) {
          const g = genresList.find(x =>
            x.name.toLowerCase() === genre.toLowerCase() ||
            x.id.toString() === genre
          )
          if (g) params.genres = g.id
        }
        if (rating) params.ratingFrom = Number(rating)
        if (language) params.language = language

        const queryString = new URLSearchParams(params).toString()
        const response = await fetch(`${endpoint}?${queryString}`)
        if (response.ok) {
          const data = await response.json()
          setContent((data.results || []).map((item: any) => ({
            ...item,
            media_type: type
          })))
          setTotalPages(data.total_pages ?? 1)
          setPage(1)
        }
      } catch (err) {
        console.error('Error fetching content:', err)
        setContent([])
      } finally {
        setLoading(false)
      }
    }

    fetchContent()
  }, [category, year, genre, type, activeTab, genresList, rating, language])

  const handleApplyFilters = (filters: {
    genre?: string | null;
    year?: string | null;
    rating?: number | null;
    language?: string | null;
    platform?: string | null;
    os?: string | null;
  }) => {
    const params = new URLSearchParams()
    
    if (filters.genre) params.set('genre', filters.genre)
    if (filters.year) params.set('year', String(filters.year))
    if (filters.rating) params.set('rating', String(filters.rating))
    if (filters.language) params.set('language', filters.language)
    if (filters.platform) params.set('platform', filters.platform)
    if (filters.os) params.set('os', filters.os)
    
    router.push(`?${params.toString()}`)
  }

  const handleClearFilters = () => {
    router.push(window.location.pathname)
  }

  const categoryTitle = useMemo(() => {
    if (category === 'foreign') return 'أجنبي'
    if (category === 'arabic') return 'عربي'
    if (category === 'asian') return 'آسيوي'
    if (category === 'turkish') return 'تركي'
    if (category === 'indian') return 'هندي'
    if (category === 'animation') return 'انيميشن'
    if (category === 'popular') return 'الأكثر رواجاً'
    if (category === 'top_rated') return 'الأعلى تقييماً'
    if (category && genresList.length > 0) {
      const g = genresList.find(x => x.name.toLowerCase() === category.toLowerCase())
      if (g) return g.name
    }
    return category || 'الكل'
  }, [category, genresList])

  const hubTitle = `${type === 'movie' ? 'أفلام' : 'مسلسلات'} ${categoryTitle} ${year || ''} ${genre || ''} ${rating ? `تقييم ${rating}+` : ''}`.trim()

  return (
    <div className="min-h-screen pt-16 page-container pb-8">
      <div className="mb-6 relative">
        <h1 className="text-2xl md:text-4xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500 font-cairo">
          {type === 'movie' ? 'أفلام' : 'مسلسلات'}
          {category && <span className="text-primary"> : {categoryTitle}</span>}
        </h1>

        {/* Unified Filters */}
        <UnifiedFilters
          contentType={type === 'movie' ? 'movies' : 'series'}
          genre={genre}
          year={year}
          rating={rating}
          language={language}
          onApplyFilters={handleApplyFilters}
          onClearAll={handleClearFilters}
          lang="ar"
        />
      </div>

      <div className="flex items-center gap-4 mb-3 border-b border-white/10 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('latest')}
          className={`text-sm font-bold pb-2 -mb-2 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'latest' ? 'border-primary text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
        >
          <Clock size={14} />
          أضيف حديثاً
        </button>
        <button
          onClick={() => setActiveTab('top_rated')}
          className={`text-sm font-bold pb-2 -mb-2 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'top_rated' ? 'border-primary text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
        >
          <Star size={14} />
          الأعلى تقييماً
        </button>
        <button
          onClick={() => setActiveTab('trending')}
          className={`text-sm font-bold pb-2 -mb-2 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'trending' ? 'border-primary text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
        >
          <TrendingUp size={14} />
          الأكثر شهرة
        </button>
        <button
          onClick={() => setActiveTab('popular')}
          className={`text-sm font-bold pb-2 -mb-2 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'popular' ? 'border-primary text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
        >
          <Star className="fill-current" size={14} />
          الأفضل في الكل
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-4 md:gap-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : content.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-8 px-6 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md"
        >
          <SearchX size={40} className="text-zinc-500 mb-3" />
          <h2 className="text-lg md:text-xl font-bold text-zinc-200 mb-2">لا يوجد محتوى</h2>
          <p className="text-zinc-400 text-center max-w-md mb-3 text-sm">
            لم نجد أفلاماً أو مسلسلات تطابق اختياراتك. جرّب تغيير السنة أو التصنيف.
          </p>
        </motion.div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-4 md:gap-6"
        >
          {content.map((item, i) => (
            <MovieCard key={item.id} movie={item} index={i} />
          ))}
        </motion.div>
      )}
    </div>
  )
}
