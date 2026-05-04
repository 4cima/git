// TypeScript Types for 4CIMA V2

export interface Movie {
  id: number
  title: string
  title_ar: string | null
  title_original: string | null
  overview: string | null
  overview_ar: string | null
  poster_path: string | null
  backdrop_path: string | null
  release_date: string | null
  runtime: number | null
  vote_average: number | null
  vote_count: number | null
  popularity: number | null
  genres: string | null // JSON string
  original_language: string | null
  slug: string | null
  primary_genre: string | null
  keywords: string | null // JSON string
  created_at: string
  updated_at: string
}

export interface Series {
  id: number
  name: string
  name_ar: string | null
  name_original: string | null
  overview: string | null
  overview_ar: string | null
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string | null
  last_air_date: string | null
  number_of_seasons: number | null
  number_of_episodes: number | null
  vote_average: number | null
  vote_count: number | null
  popularity: number | null
  genres: string | null // JSON string
  language: string | null
  original_language: string | null
  slug: string | null
  primary_genre: string | null
  category: string | null
  target_audience: string | null
  keywords: string | null // JSON string
  created_at: string
  updated_at: string
}

export interface Season {
  id: number
  series_id: number
  season_number: number
  name: string | null
  name_ar: string | null
  overview: string | null
  overview_ar: string | null
  poster_path: string | null
  air_date: string | null
  episode_count: number | null
  created_at: string
}

export interface Episode {
  id: number
  season_id: number
  series_id: number
  episode_number: number
  name: string | null
  name_ar: string | null
  overview: string | null
  overview_ar: string | null
  still_path: string | null
  air_date: string | null
  runtime: number | null
  vote_average: number | null
  vote_count: number | null
  created_at: string
}

export interface Actor {
  id: number
  name: string
  name_ar: string | null
  biography: string | null
  biography_ar: string | null
  profile_path: string | null
  birthday: string | null
  place_of_birth: string | null
  popularity: number | null
  slug: string | null
  created_at: string
  updated_at: string
}

export interface VideoServer {
  id: number
  content_id: number
  content_type: 'movie' | 'episode'
  server_name: string
  server_url: string
  quality: string
  language: string
  is_active: number
  sort_order: number
  created_at: string
}

export interface QuranReciter {
  id: number
  name: string
  slug: string
  image_url: string | null
  description: string | null
  is_active: number
  created_at: string
}

export interface QuranContent {
  id: number
  reciter_id: number | null
  title: string
  type: 'recitation' | 'sermon' | 'story'
  audio_url: string | null
  description: string | null
  duration: number | null
  play_count: number
  is_active: number
  created_at: string
}

export interface Software {
  id: number
  name: string
  name_ar: string | null
  slug: string | null
  description: string | null
  description_ar: string | null
  icon: string | null
  category: string | null
  version: string | null
  size: string | null
  developer: string | null
  primary_platform: string | null
  created_at: string
}

export interface Env {
  TURSO_DATABASE_URL: string
  TURSO_AUTH_TOKEN: string
  TMDB_API_KEY: string
  GROQ_API_KEY: string
  MISTRAL_API_KEY: string
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
}
