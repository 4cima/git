export interface MediaItem {
  id: number
  slug: string
  title_ar: string
  title_en?: string
  name_ar?: string
  name_en?: string
  poster_path: string
  backdrop_path?: string
  vote_average: number
  release_year?: number
  first_air_year?: number
  year?: number
  primary_genre?: string
  genres_json?: string
  overview_ar?: string
  overview_en?: string
  media_type: 'movie' | 'tv'
  popularity?: number
}

export interface MovieCardData {
  id: number
  slug: string
  title_ar: string
  title_en?: string
  poster_path: string
  vote_average: number
  year?: number
  primary_genre?: string
  overview_ar?: string
  media_type: 'movie' | 'tv'
}
