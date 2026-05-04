/**
 * 🗄️ أنواع قاعدة البيانات - فور سيما
 * Database Types (Unified between Website & App)
 * 
 * @description أنواع موحدة لجميع جداول Supabase
 * @author 4Cima Team
 * @version 2.0.0
 * @updated 2026-03-15
 */

// ==========================================
// Movies Table - جدول الأفلام
// ==========================================
export interface Movie {
  id: number;
  tmdb_id: number;
  title: string;
  original_title?: string | null;
  tagline?: string | null;
  overview?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string | null | undefined;
  status?: string | null;
  vote_average?: number | null;
  vote_count?: number | null;
  popularity?: number | null;
  runtime?: number | null;
  budget?: number | null;
  revenue?: number | null;
  imdb_id?: string | null;
  imdb_rating?: number | null;
  imdb_votes?: number | null;
  original_language?: string | null;
  spoken_languages?: unknown | null;
  production_countries?: Array<{ iso_3166_1?: string; name?: string }> | unknown | null;
  production_companies?: unknown | null;
  genres?: unknown | null;
  keywords?: string[] | unknown | null;
  cast_data?: unknown | null;
  crew_data?: unknown | null;
  videos?: unknown | null;
  similar_content?: unknown | null;
  recommendations?: unknown | null;
  belongs_to_collection?: unknown | null;
  content_warnings?: string[] | null;
  age_rating?: string | null;
  homepage?: string | null;
  trailer_url?: string | null;
  quality_score?: number | null;
  popularity_score?: number | null;
  trending_score?: number | null;
  is_visible?: boolean;
  is_featured?: boolean;
  metadata_source?: string | null;
  metadata_version?: number | null;
  last_updated?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ==========================================
// TV Series Table - جدول المسلسلات
// ==========================================
export interface TVSeries {
  id: number;
  tmdb_id: number;
  name: string;
  original_name?: string | null;
  tagline?: string | null;
  overview?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  first_air_date?: string | null;
  last_air_date?: string | null;
  status?: string | null;
  type?: string | null;
  in_production?: boolean | null;
  vote_average?: number | null;
  vote_count?: number | null;
  popularity?: number | null;
  number_of_seasons?: number | null;
  number_of_episodes?: number | null;
  episode_run_time?: number[] | null;
  next_episode_to_air?: unknown | null;
  last_episode_to_air?: unknown | null;
  runtime?: number | null;
  budget?: number | null;
  imdb_id?: string | null;
  imdb_rating?: number | null;
  imdb_votes?: number | null;
  original_language?: string | null;
  spoken_languages?: unknown | null;
  production_countries?: unknown | null;
  production_companies?: unknown | null;
  origin_country?: string[] | null;
  networks?: unknown | null;
  created_by?: unknown | null;
  genres?: unknown | null;
  keywords?: unknown | null;
  cast_data?: unknown | null;
  crew_data?: unknown | null;
  videos?: unknown | null;
  similar_content?: unknown | null;
  recommendations?: unknown | null;
  content_warnings?: string[] | null;
  age_rating?: string | null;
  homepage?: string | null;
  trailer_url?: string | null;
  quality_score?: number | null;
  popularity_score?: number | null;
  trending_score?: number | null;
  is_visible?: boolean;
  is_featured?: boolean;
  metadata_source?: string | null;
  metadata_version?: number | null;
  last_updated?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ==========================================
// Seasons Table - جدول المواسم
// ==========================================
export interface Season {
  id: number;
  tv_series_id: number;
  tmdb_id?: number | null;
  season_number: number;
  name?: string | null;
  overview?: string | null;
  poster_path?: string | null;
  air_date?: string | null;
  episode_count?: number | null;
  created_at?: string;
  updated_at?: string;
}

// ==========================================
// Episodes Table - جدول الحلقات
// ==========================================
export interface Episode {
  id: number;
  tv_series_id: number;
  season_id: number;
  tmdb_id?: number | null;
  episode_number: number;
  season_number: number;
  name?: string | null;
  overview?: string | null;
  still_path?: string | null;
  air_date?: string | null;
  runtime?: number | null;
  vote_average?: number | null;
  vote_count?: number | null;
  crew?: unknown | null;
  guest_stars?: unknown | null;
  created_at?: string;
  updated_at?: string;
}

// ==========================================
// People Table - جدول الأشخاص
// ==========================================
export interface Person {
  id: number;
  tmdb_id: number;
  name: string;
  profile_path?: string | null;
  biography?: string | null;
  birthday?: string | null;
  deathday?: string | null;
  place_of_birth?: string | null;
  known_for_department?: string | null;
  gender?: number | null;
  also_known_as?: string[] | null;
  homepage?: string | null;
  popularity?: number | null;
  created_at?: string;
  updated_at?: string;
}

// ==========================================
// Content Cast Table - جدول طاقم المحتوى
// ==========================================
export interface ContentCast {
  id: number;
  content_id: number;
  content_type: 'movie' | 'tv';
  person_id: number;
  character_name?: string | null;
  cast_order?: number | null;
  created_at?: string;
}

// ==========================================
// Embed Links Table - جدول روابط التشغيل
// ==========================================
export interface EmbedLink {
  id: number;
  movie_id?: number | null;
  series_id?: number | null;
  season_number?: number | null;
  episode_number?: number | null;
  server_name: string;
  url: string;
  quality?: string | null;
  language?: string | null;
  is_active?: boolean;
  priority?: number | null;
  created_at?: string;
  updated_at?: string;
}

// ==========================================
// Content Health Table - جدول صحة المحتوى
// ==========================================
export interface ContentHealth {
  id: number;
  content_id: number;
  content_type: 'movie' | 'tv';
  has_poster: boolean;
  has_backdrop: boolean;
  has_overview: boolean;
  has_genres: boolean;
  has_cast: boolean;
  has_videos: boolean;
  has_embed_links: boolean;
  embed_links_count: number;
  health_score: number;
  is_visible: boolean;
  last_checked?: string;
  created_at?: string;
  updated_at?: string;
}

// ==========================================
// User Tables - جداول المستخدمين
// ==========================================
export interface Profile {
  id: string;
  username: string;
  avatar_url?: string | null;
  banner_url?: string | null;
  role: 'user' | 'admin' | 'supervisor';
  bio?: string | null;
  website?: string | null;
  twitter?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  avatar_decoration?: string | null;
  is_public: boolean;
  total_xp?: number;
  movies_watched?: number;
  reviews_written?: number;
  created_at?: string;
}

export interface Watchlist {
  id: string;
  user_id: string;
  content_id: number;
  content_type: 'movie' | 'tv';
  created_at?: string;
}

export interface ContinueWatching {
  id: string;
  user_id: string;
  content_id: number;
  content_type: 'movie' | 'tv';
  season_number?: number | null;
  episode_number?: number | null;
  progress_seconds: number;
  duration_seconds: number;
  updated_at?: string;
}

export interface History {
  id: string;
  user_id: string;
  content_id: number;
  content_type: 'movie' | 'tv';
  season_number?: number | null;
  episode_number?: number | null;
  watched_at?: string;
}

export interface Comment {
  id: string;
  user_id: string;
  content_id: number | string;
  content_type: 'movie' | 'tv' | 'anime' | 'game' | 'software';
  text: string;
  title?: string | null;
  rating?: number | null;
  created_at?: string;
}

// ==========================================
// Database Type - النوع الكامل لقاعدة البيانات
// ==========================================
export interface Database {
  public: {
    Tables: {
      movies: { Row: Movie; Insert: Omit<Movie, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Movie> };
      tv_series: { Row: TVSeries; Insert: Omit<TVSeries, 'id' | 'created_at' | 'updated_at'>; Update: Partial<TVSeries> };
      seasons: { Row: Season; Insert: Omit<Season, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Season> };
      episodes: { Row: Episode; Insert: Omit<Episode, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Episode> };
      people: { Row: Person; Insert: Omit<Person, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Person> };
      content_cast: { Row: ContentCast; Insert: Omit<ContentCast, 'id' | 'created_at'>; Update: Partial<ContentCast> };
      embed_links: { Row: EmbedLink; Insert: Omit<EmbedLink, 'id' | 'created_at' | 'updated_at'>; Update: Partial<EmbedLink> };
      content_health: { Row: ContentHealth; Insert: Omit<ContentHealth, 'id' | 'created_at' | 'updated_at'>; Update: Partial<ContentHealth> };
      profiles: { Row: Profile; Insert: Omit<Profile, 'created_at'>; Update: Partial<Profile> };
      watchlist: { Row: Watchlist; Insert: Omit<Watchlist, 'id' | 'created_at'>; Update: Partial<Watchlist> };
      continue_watching: { Row: ContinueWatching; Insert: Omit<ContinueWatching, 'id' | 'updated_at'>; Update: Partial<ContinueWatching> };
      history: { Row: History; Insert: Omit<History, 'id' | 'watched_at'>; Update: Partial<History> };
      comments: { Row: Comment; Insert: Omit<Comment, 'id' | 'created_at'>; Update: Partial<Comment> };
    };
  };
}

export default Database;
