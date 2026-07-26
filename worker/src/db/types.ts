export interface Movie {
  id: number
  tmdb_id: number
  imdb_id?: string
  slug: string
  title_ar: string
  title_en: string
  title_original?: string
  overview_ar?: string
  overview_en?: string
  tagline_ar?: string
  primary_genre?: string
  keywords?: string
  global_keywords?: string
  poster_path?: string
  backdrop_path?: string
  trailer_key?: string
  release_date?: string
  release_year?: number
  runtime?: number
  original_language?: string
  content_language?: string
  country_of_origin?: string
  production_companies?: string
  vote_average: number
  vote_count: number
  popularity: number
  content_type: 'movie' | 'anime_movie'
  quality?: 'CAM' | 'HD' | 'FHD' | '4K'
  age_rating?: string
  has_arabic_title: number
  has_arabic_overview: number
  has_trailer: number
  has_servers: number
  has_cast: number
  has_genres: number
  has_keywords: number
  is_complete: number
  source?: string
  backed_up_at?: string
  backup_version?: number
  is_active: number
  is_featured: number
  view_count: number
  download_count: number
  created_at: string
  updated_at: string
}

export interface TVSeries {
  id: number
  tmdb_id: number
  slug: string
  title_ar: string
  title_en: string
  title_original?: string
  overview_ar?: string
  overview_en?: string
  primary_genre?: string
  keywords?: string
  global_keywords?: string
  poster_path?: string
  backdrop_path?: string
  trailer_key?: string
  first_air_date?: string
  last_air_date?: string
  first_air_year?: number
  original_language?: string
  content_language?: string
  country_of_origin?: string
  production_companies?: string
  number_of_seasons: number
  number_of_episodes: number
  status: 'ongoing' | 'ended' | 'cancelled' | 'upcoming'
  vote_average: number
  vote_count: number
  popularity: number
  content_type: 'series' | 'anime' | 'play'
  quality?: string
  age_rating?: string
  has_arabic_title: number
  has_arabic_overview: number
  has_trailer: number
  has_cast: number
  has_genres: number
  has_keywords: number
  is_complete: number
  source?: string
  backed_up_at?: string
  backup_version?: number
  is_active: number
  is_featured: number
  view_count: number
  created_at: string
  updated_at: string
}

export interface Season {
  id: number
  series_id: number
  tmdb_id?: number
  season_number: number
  title_ar?: string
  title_en?: string
  overview_ar?: string
  overview_en?: string
  poster_path?: string
  air_date?: string
  air_year?: number
  episode_count: number
  is_active: number
  created_at: string
}

export interface Episode {
  id: number
  series_id: number
  season_id: number
  tmdb_id?: number
  episode_number: number
  season_number: number
  title_ar?: string
  title_en?: string
  overview_ar?: string
  overview_en?: string
  still_path?: string
  air_date?: string
  runtime?: number
  vote_average: number
  has_servers: number
  is_active: number
  view_count: number
  source?: string
  backed_up_at?: string
  created_at: string
}

export interface Actor {
  id: number
  tmdb_id: number
  slug: string
  name_ar?: string
  name_en: string
  biography_ar?: string
  biography_en?: string
  profile_path?: string
  birthday?: string
  birthplace?: string
  nationality?: string
  popularity: number
  is_active: number
  created_at: string
}

export interface CastMember {
  id: number
  content_id: number
  content_type: 'movie' | 'series'
  actor_id: number
  character_name?: string
  cast_order: number
}

export interface VideoServer {
  id: number
  content_id: number
  content_type: 'movie' | 'episode'
  server_name: string
  server_url: string
  quality: 'CAM' | 'HD' | 'FHD' | '4K'
  language: 'ar' | 'en' | 'dubbed' | 'subtitled'
  is_active: number
  sort_order: number
  added_by?: string
  created_at: string
}

export interface Genre {
  id: number
  tmdb_id?: number
  name_ar: string
  name_en: string
  slug: string
  applies_to: 'all' | 'movie' | 'series' | 'anime'
}

export interface GlobalKeyword {
  id: number
  keyword_ar: string
  keyword_en?: string
  slug: string
  usage_count: number
  created_at: string
}

export interface ContentKeyword {
  id: number
  content_id: number
  content_type: 'movie' | 'series'
  keyword_id: number
}

export interface Env {
  TURSO_DATABASE_URL: string
  TURSO_AUTH_TOKEN: string
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  TMDB_API_KEY: string
  GROQ_API_KEY: string
  MISTRAL_API_KEY: string
}
