/**
 * نوع المحتوى
 * Content Type
 */
export type ContentType = 'movies' | 'series' | 'anime' | 'gaming' | 'software'

/**
 * نوع الفلتر
 * Filter Type
 */
export type FilterType = 
  | 'all' 
  | 'trending' 
  | 'top-rated' 
  | 'latest' 
  | 'upcoming' 
  | 'classics' 
  | 'summaries' 
  | 'ramadan' 
  | 'animation_movies' 
  | 'cartoon_series'
  | 'arabic'
  | 'korean'
  | 'turkish'
  | 'chinese'
  | 'foreign'
  | 'pc'
  | 'playstation'
  | 'xbox'
  | 'nintendo'
  | 'mobile'
  | 'windows'
  | 'mac'
  | 'linux'
  | 'android'
  | 'ios'

/**
 * خيارات الترتيب
 * Sort Options
 */
export type SortOption = 'popularity' | 'vote_average' | 'release_date' | 'title'

/**
 * معاملات جلب المحتوى
 * Content Fetch Parameters
 */
export interface ContentFetchParams {
  contentType: ContentType
  activeFilter: FilterType
  genre?: string | null
  year?: number | string | null  // Support both number and string (for ranges like "1990-1999")
  rating?: number | null
  sortBy?: SortOption
  page?: number
  limit?: number
  language?: string | null
}

/**
 * استجابة API للمحتوى
 * Content API Response
 */
export interface ContentResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * عنصر محتوى موحد
 * Unified Content Item
 */
export interface UnifiedContentItem {
  id: number
  slug: string
  title?: string
  name?: string
  overview?: string
  poster_path?: string | null
  poster_url?: string | null
  backdrop_path?: string | null
  backdrop_url?: string | null
  release_date?: string | null
  first_air_date?: string | null
  vote_average?: number
  popularity?: number
  genre_ids?: number[]
  primary_genre?: string
  original_language?: string
  media_type?: string
  category?: string
  // Aggregate ratings
  aggregate_rating?: number | null
  rating_count?: number
  review_count?: number
}

/**
 * خيارات التصنيف
 * Genre Option
 */
export interface GenreOption {
  value: string
  label: string
}

/**
 * حالة الفلاتر
 * Filters State
 */
export interface FiltersState {
  genre: string | null
  year: number | string | null  // Support both number and string (for ranges)
  rating: number | null
  sortBy: SortOption
  page: number
}
