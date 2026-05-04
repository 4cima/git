// Global ambient types to ease TS compilation during refactor
declare type ReactNode = import('react').ReactNode;
declare type HTMLMotionProps<T> = import('framer-motion').HTMLMotionProps<T>;
declare type InputHTMLAttributes<T> = import('react').InputHTMLAttributes<T>;

// Define Media Types instead of any
declare interface Movie {
  id: number | string;
  title?: string;
  poster_path?: string;
  backdrop_path?: string;
  overview?: string;
  release_date?: string | null;
  vote_average?: number;
  media_type?: 'movie';
  [key: string]: unknown;
}

declare interface TV {
  id: number | string;
  name?: string;
  poster_path?: string;
  backdrop_path?: string;
  overview?: string;
  first_air_date?: string;
  vote_average?: number;
  media_type?: 'tv';
  [key: string]: unknown;
}

declare interface Game {
  title: string;
  rating: number;
  release_date: string;
  category: string;
  description: string;
  poster_url: string;
  backdrop_url: string;
  download_url: string;
  screenshots: string[];
  [key: string]: unknown;
}

declare interface Software {
  title: string;
  platform: 'pc' | 'android' | 'apple' | 'terminal' | 'other' | string;
  poster_url: string;
  rating: number;
  version: string;
  size: string;
  description: string;
  download_url: string;
  [key: string]: unknown;
}

declare interface TmdbMedia {
  id: number;
  slug?: string;
  title?: string;
  name?: string;
  media_type?: 'movie' | 'tv' | string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  [key: string]: unknown;
}

declare interface RecommendationItem {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  media_type?: string;
  vote_average?: number;
  [key: string]: unknown;
}

declare interface SeriesDetailsProps {
  id: string | number;
  slug?: string;
}

declare type Profile = import('../lib/supabase').Profile;
declare type Role = 'user' | 'admin' | 'supervisor';
declare type LeaderboardEntry = import('../lib/supabase').LeaderboardEntry;
declare type UserAchievement = import('../lib/supabase').UserAchievement;
declare type QuranReciter = {
  id: string;
  name: string;
  arabic_name: string;
  style: string;
  image_url?: string;
};
declare const ImageIcon: import('lucide-react').LucideIcon;
declare const ActivityIcon: import('lucide-react').LucideIcon;
declare const LinkIcon: import('lucide-react').LucideIcon;
declare const UserIcon: import('lucide-react').LucideIcon;
declare type ToastType = 'success' | 'error' | 'info' | 'warning';
declare type ProfileType = Profile;
declare const useRQ: typeof import('@tanstack/react-query').useQuery;

declare type LogArgs = unknown[];
declare type Logger = {
  log: (...args: LogArgs) => void;
  error: (...args: LogArgs) => void;
  warn: (...args: LogArgs) => void;
  info: (...args: LogArgs) => void;
  debug: (...args: LogArgs) => void;
};
declare const logger: Logger;

// Batch Content Item for API calls (matches contentAPI.ts but allows external_id)
declare interface BatchContentItem {
  id?: string;
  external_id?: string;
  content_type: 'movie' | 'tv' | 'game' | 'software';
  external_source?: string;
}

// Review type for review system
declare interface Review {
  id: string;
  user_id: string;
  external_id: string;
  external_source: string;
  content_type: 'movie' | 'tv' | 'game' | 'software';
  title?: string;
  review_text: string;
  rating?: number;
  language: 'ar' | 'en';
  contains_spoilers: boolean;
  is_verified: boolean;
  edit_count: number;
  created_at: string;
  updated_at: string;
  user?: Profile;
  helpful_count?: number;
  is_liked?: boolean;
}

// Actor Details type
declare interface ActorDetails {
  id: string;
  slug: string;
  name: string;
  name_ar?: string;
  name_en?: string;
  biography: string;
  biography_ar?: string | null;
  birthday: string | null;
  place_of_birth: string | null;
  profile_url: string | null;
  profile_path: string | null;
  known_for_department: string;
}

// TMDB Details type (extended with id property)
declare interface TmdbDetails {
  id?: number | string;
  title?: string;
  title_ar?: string;
  title_en?: string;
  original_title?: string;
  name?: string;
  name_ar?: string;
  name_en?: string;
  original_name?: string;
  original_language?: string;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  episode_run_time?: number[];
  vote_average?: number;
  vote_count?: number;
  genres?: Array<{ id: number; name: string }>;
  overview?: string;
  overview_ar?: string;
  overview_en?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  credits?: { cast?: any[]; crew?: any[] };
  videos?: { results: Array<{ key: string; type: string; site: string }> };
  external_ids?: { imdb_id?: string };
  external_id?: string;
  external_source?: string;
  seasons?: Array<{ season_number: number; episode_count: number; name: string }>;
  slug?: string;
}
