/**
 * src/components/profile/types.ts
 * أنواع مشتركة لصفحة البروفايل — كل البيانات القادمة من APIs الحقيقية فقط.
 */

export type ContentKind = 'movie' | 'tv';

export interface ProfileStats {
  favoritesCount: number;
  completedCount: number;
  reviewsCount: number;
  avgRating: number | null;
  watchEntries: number;
  completedEntries: number;
  totalSeconds: number;
  totalMinutes: number;
  totalHours: number;
  moviesCount: number;
  seriesCount: number;
  resumeCount: number;
  // توافق خلفي
  favorites?: number;
  user_reviews?: number;
  watch_history?: number;
  total_watch_duration_minutes?: number;
}

export interface LibraryItem {
  tmdb_id: number;
  content_type: ContentKind | string;
  media_type?: string;
  title?: string | null;
  title_ar?: string | null;
  title_en?: string | null;
  poster_path?: string | null;
  vote_average?: number | null;
  release_year?: number | null;
  overview_ar?: string | null;
  genres_json?: string | null;
  primary_genre?: string | null;
  slug?: string | null;
  added_at?: string | null;
}

export interface ResumeItem {
  tmdb_id: number;
  content_type: ContentKind | string;
  content_id?: number | null;
  title?: string | null;
  title_ar?: string | null;
  title_en?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number | null;
  slug?: string | null;
  progress?: number | null; // ثواني آخر موضع
  duration?: number | null;
  season?: number | null;
  episode?: number | null;
  updated_at?: string;
  meta?: {
    id: number;
    slug?: string | null;
    poster_path?: string | null;
    title?: string | null;
    name?: string | null;
    vote_average?: number | null;
    media_type?: string;
  } | null;
}

export interface ActivityItem {
  type: 'watch' | 'favorite' | 'review';
  tmdb_id: number;
  content_type: string;
  title: string | null;
  title_ar?: string | null;
  poster_path: string | null;
  vote_average?: number | null;
  slug?: string | null;
  date: string;
  data: Record<string, unknown>;
}

export interface MyReview {
  content_type: ContentKind | string;
  content_id?: number;
  tmdb_id: number;
  title?: string | null;
  title_ar?: string | null;
  title_en?: string | null;
  poster_path?: string | null;
  vote_average?: number | null;
  rating: number;
  review_text?: string | null;
  slug?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** أقسام البروفايل الخمسة — كل قسم له مصدر بيانات حقيقي مستقل */
export type ProfileTab = 'overview' | 'favorites' | 'watch' | 'reviews' | 'settings';

export const PROFILE_TABS: { id: ProfileTab; label: string }[] = [
  { id: 'overview', label: 'نظرة عامة' },
  { id: 'favorites', label: 'المفضلة' },
  { id: 'watch', label: 'سجل المشاهدة' },
  { id: 'reviews', label: 'التقييمات' },
  { id: 'settings', label: 'الإعدادات' },
];
