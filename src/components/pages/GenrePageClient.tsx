'use client'

import { useState, useEffect } from 'react'
import { Film, Tv, Calendar, Star } from 'lucide-react'
import { SortBar } from '@/components/features/filters/SortBar'
import { MovieCard } from '@/components/features/media/MovieCard'

const SORT_OPTIONS = [
  { value: 'popularity', label: 'الأكثر شهرة' },
  { value: 'vote_average', label: 'الأعلى تقييماً' },
  { value: 'release_year', label: 'الأحدث' },
]

interface GenrePageClientProps {
  initialData: any
  slug: string
}

export function GenrePageClient({ initialData, slug }: GenrePageClientProps) {
  const [content, setContent] = useState(initialData.content || [])
  const [pagination, setPagination] = useState(initialData.pagination || {})
  const [loading, setLoading] = useState(false)
  
  const [contentType, setContentType] = useState<'all' | 'movie' | 'tv'>('all')
  const [sort, setSort] = useState('popularity')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')

  const genre = initialData.genre

  useEffect(() => {
    fetchContent()
  }, [contentType, sort, order, pagination.page])

  const fetchContent = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('type', contentType)
      params.set('page', (pagination.page || 1).toString())
      params.set('limit', '20')
      params.set('sort', sort)
      params.set('order', order)
      
      const response = await fetch(`/api/genres/${slug}?${params}`)
      const data = await response.json()
      
      setContent(data.content || [])
      setPagination(data.pagination || {})
    } catch (error) {
      console.error('Error fetching content:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSortChange = (newSort: string, newOrder: 'asc' | 'desc') => {
    setSort(newSort)
    setOrder(newOrder)
  }

  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-12">
      <div className="page-container">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-6xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
            {genre.name_ar}
          </h1>
          <p className="text-lg text-zinc-400">
            {genre.name_en && genre.name_en !== genre.name_ar && (
              <span>{genre.name_en} • </span>
            )}
            استكشف أفضل الأفلام والمسلسلات
          </p>
        </div>

        {/* Content Type Tabs */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => {
              setContentType('all')
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              contentType === 'all'
                ? 'bg-cyan-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => {
              setContentType('movie')
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
              contentType === 'movie'
                ? 'bg-cyan-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            <Film className="w-4 h-4" />
            أفلام
          </button>
          <button
            onClick={() => {
              setContentType('tv')
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
              contentType === 'tv'
                ? 'bg-cyan-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            <Tv className="w-4 h-4" />
            مسلسلات
          </button>
        </div>

        {/* Sort Bar */}
        <SortBar
          totalResults={pagination.total || 0}
          sortOptions={SORT_OPTIONS}
          currentSort={sort}
          currentOrder={order}
          onSortChange={handleSortChange}
          className="mb-6"
        />

        {/* Content Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        ) : content.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {content.map((item: any, index: number) => (
                <MovieCard key={item.id} movie={item} index={index} />
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
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
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
          </div>
        )}
      </div>
    </div>
  )
}
