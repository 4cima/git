/**
 * ReviewFilters Component
 * 
 * Filter and sort controls for review lists.
 * Supports language filtering, rating filtering, and sorting options.
 * 
 * Task 13.3: Create ReviewFilters component
 * Requirements: 7.1, 7.5, 33.1, 33.5
 */

import { SortAsc, Filter } from 'lucide-react'

interface ReviewFiltersProps {
  sort: 'most_helpful' | 'newest' | 'highest_rating' | 'lowest_rating'
  onSortChange: (sort: 'most_helpful' | 'newest' | 'highest_rating' | 'lowest_rating') => void
  language: 'all' | 'ar' | 'en'
  onLanguageChange: (language: 'all' | 'ar' | 'en') => void
  ratingFilter: 'all' | 'positive' | 'mixed' | 'negative'
  onRatingFilterChange: (filter: 'all' | 'positive' | 'mixed' | 'negative') => void
  className?: string
}

export const ReviewFilters = ({
  sort,
  onSortChange,
  language,
  onLanguageChange,
  ratingFilter,
  onRatingFilterChange,
  className = ''
}: ReviewFiltersProps) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Sort Options */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <SortAsc size={16} />
          <span>الترتيب / Sort</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onSortChange('most_helpful')}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
              sort === 'most_helpful'
                ? 'bg-lumen-gold text-black'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            الأكثر فائدة
          </button>
          <button
            onClick={() => onSortChange('newest')}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
              sort === 'newest'
                ? 'bg-lumen-gold text-black'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            الأحدث
          </button>
          <button
            onClick={() => onSortChange('highest_rating')}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
              sort === 'highest_rating'
                ? 'bg-lumen-gold text-black'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            أعلى تقييم
          </button>
          <button
            onClick={() => onSortChange('lowest_rating')}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
              sort === 'lowest_rating'
                ? 'bg-lumen-gold text-black'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            أقل تقييم
          </button>
        </div>
      </div>

      {/* Language Filter */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <Filter size={16} />
          <span>اللغة / Language</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onLanguageChange('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
              language === 'all'
                ? 'bg-lumen-gold text-black'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            الكل / All
          </button>
          <button
            onClick={() => onLanguageChange('ar')}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
              language === 'ar'
                ? 'bg-lumen-gold text-black'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            🇸🇦 العربية
          </button>
          <button
            onClick={() => onLanguageChange('en')}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
              language === 'en'
                ? 'bg-lumen-gold text-black'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            🇬🇧 English
          </button>
        </div>
      </div>

      {/* Rating Filter */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <Filter size={16} />
          <span>التقييم / Rating</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onRatingFilterChange('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
              ratingFilter === 'all'
                ? 'bg-lumen-gold text-black'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => onRatingFilterChange('positive')}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
              ratingFilter === 'positive'
                ? 'bg-green-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            إيجابي (7-10)
          </button>
          <button
            onClick={() => onRatingFilterChange('mixed')}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
              ratingFilter === 'mixed'
                ? 'bg-yellow-500 text-black'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            متوسط (4-6)
          </button>
          <button
            onClick={() => onRatingFilterChange('negative')}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
              ratingFilter === 'negative'
                ? 'bg-red-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            سلبي (1-3)
          </button>
        </div>
      </div>
    </div>
  )
}
