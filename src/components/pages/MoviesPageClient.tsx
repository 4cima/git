'use client'

import { useState, useEffect } from 'react'
import { Film, Calendar, Star } from 'lucide-react'
import { FilterSidebar } from '@/components/features/filters/FilterSidebar'
import { SortBar } from '@/components/features/filters/SortBar'
import { MovieCard } from '@/components/features/media/MovieCard'

const GENRES = [
  { value: 'action', label: 'أكشن' },
  { value: 'comedy', label: 'كوميديا' },
  { value: 'drama', label: 'دراما' },
  { value: 'horror', label: 'رعب' },
  { value: 'thriller', label: 'إثارة' },
  { value: 'romance', label: 'رومانسي' },
  { value: 'sci-fi', label: 'خيال علمي' },
  { value: 'fantasy', label: 'فانتازيا' },
  { value: 'animation', label: 'أنيميشن' },
  { value: 'crime', label: 'جريمة' },
]

const YEARS = Array.from({ length: 30 }, (_, i) => {
  const year = new Date().getFullYear() - i
  return { value: year.toString(), label: year.toString() }
})

const RATINGS = [
  { value: '9-10', label: 'ممتاز (9+)' },
  { value: '8-9', label: 'جيد جداً (8-9)' },
  { value: '7-8', label: 'جيد (7-8)' },
  { value: '6-7', label: 'مقبول (6-7)' },
]

const SORT_OPTIONS = [
  { value: 'popularity', label: 'الأكثر شهرة' },
  { value: 'vote_average', label: 'الأعلى تقييماً' },
  { value: 'release_year', label: 'الأحدث' },
  { value: 'title_ar', label: 'الاسم (أ-ي)' },
]

export function MoviesPageClient() {
  const [movies, setMovies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 })
  
  // Filters
  const [activeFilters, setActiveFilters] = useState<Record<string, string | string[]>>({
    genre: [],
    year: '',
    rating: '',
  })
  
  // Sort
  const [sort, setSort] = useState('popularity')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')

  // Fetch movies
  useEffect(() => {
    fetchMovies()
  }, [activeFilters, sort, order, pagination.page])

  const fetchMovies = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', pagination.page.toString())
      params.set('limit', '20')
      params.set('sort', sort)
      params.set('order', order)
      
      // Add filters
      const genres = activeFilters.genre as string[]
      if (genres && genres.length > 0) {
        params.set('genre', genres[0]) // For now, single genre
      }
      
      if (activeFilters.year) {
        params.set('year', activeFilters.year as string)
      }
      
      if (activeFilters.rating) {
        const [min, max] = (activeFilters.rating as string).split('-')
        params.set('rating_min', min)
        if (max) params.set('rating_max', max)
      }
      
      const response = await fetch(`/api/movies?${params}`)
      const data = await response.json()
      
      setMovies(data.movies || [])
      setPagination(data.pagination || { page: 1, total: 0, totalPages: 0 })
    } catch (error) {
      console.error('Error fetching movies:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (filterId: string, value: string | string[]) => {
    setActiveFilters(prev => ({ ...prev, [filterId]: value }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to page 1
  }

  const handleClearAll = () => {
    setActiveFilters({ genre: [], year: '', rating: '' })
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleSortChange = (newSort: string, newOrder: 'asc' | 'desc') => {
    setSort(newSort)
    setOrder(newOrder)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const filterSections = [
    {
      id: 'genre',
      title: 'النوع',
      icon: <Film className="w-4 h-4" />,
      options: GENRES,
      multiple: true
    },
    {
      id: 'year',
      title: 'السنة',
      icon: <Calendar className="w-4 h-4" />,
      options: YEARS,
      multiple: false
    },
    {
      id: 'rating',
      title: 'التقييم',
      icon: <Star className="w-4 h-4" />,
      options: RATINGS,
      multiple: false
    }
  ]

  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-12">
      <div className="page-container">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-6xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
            🎬 الأفلام
          </h1>
          <p className="text-lg text-zinc-400">
            اكتشف آلاف الأفلام المترجمة بجودة عالية
          </p>
        </div>

        {/* Sort Bar */}
        <SortBar
          totalResults={pagination.total}
          sortOptions={SORT_OPTIONS}
          currentSort={sort}
          currentOrder={order}
          onSortChange={handleSortChange}
          className="mb-6"
        />

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Filters Sidebar */}
          <aside className="lg:sticky lg:top-24 h-fit">
            <FilterSidebar
              sections={filterSections}
              activeFilters={activeFilters}
              onFilterChange={handleFilterChange}
              onClearAll={handleClearAll}
            />
          </aside>

          {/* Movies Grid */}
          <main>
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
              </div>
            ) : movies.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                  {movies.map((movie, index) => (
                    <MovieCard key={movie.id} movie={movie} index={index} />
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                      disabled={pagination.page === 1}
                      className="px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      السابق
                    </button>
                    
                    <span className="text-sm text-zinc-400">
                      صفحة {pagination.page} من {pagination.totalPages}
                    </span>
                    
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                      disabled={pagination.page === pagination.totalPages}
                      className="px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      التالي
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <Film className="w-16 h-16 text-zinc-700 mb-4" />
                <p className="text-xl text-zinc-400">لا توجد نتائج</p>
                <p className="text-sm text-zinc-500 mt-2">جرب تغيير الفلاتر</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
