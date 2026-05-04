/**
 * Genre Types and Interfaces
 * Used for dynamic genre filtering from Turso
 */

export type ContentType = 'movie' | 'tv' | 'anime' | 'play'

export interface GenreOption {
  value: string      // Arabic value stored in DB
  labelAr: string    // Arabic display label
  labelEn: string    // English display label
}

export interface GenreResponse {
  genres: GenreOption[]
  contentType: string
  count: number
}

export type GenreMapping = Record<string, string>
export type CategorySlugMapping = Record<string, string>

export interface FilterState {
  genre: string | null
  year: number | null
  rating: number | null
  sortBy: string | null
  page: number
}

export interface ContentFetchParams {
  contentType: string
  filterType?: string
  genre?: string | null
  category?: string | null
  year?: number | null
  rating?: number | null
  sortBy?: string | null
  page?: number
  limit?: number
}

// Filter tab types - "upcoming" removed intentionally
export type BaseFilterType = 'all' | 'trending' | 'top_rated' | 'latest'
export type MovieFilterType = BaseFilterType | 'classics' | 'summaries'
export type SeriesFilterType = BaseFilterType | 'ramadan'
export type PlayFilterType = BaseFilterType | 'masrah_masr' | 'adel_imam' | 'gulf' | 'classics'
export type AnimeFilterType = BaseFilterType | 'animation_movies' | 'cartoon_series'
export type FilterType = MovieFilterType | SeriesFilterType | PlayFilterType | AnimeFilterType
