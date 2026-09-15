/**
 * src/components/profile/types.ts
 * أنواع مشتركة لصفحة البروفايل — مطابقة لشكل استجابات الـAPIs الفعلية.
 */

export type MediaType = 'movie' | 'tv'

export type TabKey = 'overview' | 'favorites' | 'history' | 'reviews' | 'settings'

/** عنصر وسائط كما تعيده /api/user/favorites و /api/user/completed و /api/continue-watching */
export interface MediaItem {
  tmdb_id: number
  content_type: MediaType
  /** null = غير متوفر مؤقتاً (الـAPI يُرجع null للـslug الفاضي أو الرقمي) */
  slug: string | null
  title?: string | null
  title_ar?: string | null
  title_en?: string | null
  poster_path?: string | null
  backdrop_path?: string | null
  vote_average?: number | null
  release_year?: number | null
  overview_ar?: string | null
  added_at?: string
  updated_at?: string
  /** حقول continue-watching */
  season?: number | null
  episode?: number | null
  /** ثوانٍ مشاهدة فعلية (watch_duration) — لا توجد مدة كلية مخزنة */
  progress?: number | null
}

/** تقييم كما تعيده /api/user/reviews */
export interface ReviewItem {
  content_type: MediaType
  content_id: number
  tmdb_id: number
  title: string | null
  rating: number
  review_text: string | null
  created_at: string
  updated_at?: string | null
  slug: string | null
  title_ar?: string | null
  title_en?: string | null
  poster_path?: string | null
  vote_average?: number | null
}

/** نشاط كما يعيده /api/profile/activity */
export interface ActivityItem {
  type: 'watch' | 'favorite' | 'review'
  tmdb_id: number
  content_type: MediaType
  title: string | null
  poster_path: string | null
  vote_average: number | null
  slug: string | null
  date: string
}

/** إحصائيات كما تعيدها /api/profile/stats */
export interface ProfileStats {
  favoritesCount: number
  completedCount: number
  reviewsCount: number
  avgRating: number | null
  watchEntries: number
  completedEntries: number
  totalSeconds: number
  totalMinutes: number
  totalHours: number
  moviesCount: number
  seriesCount: number
  resumeCount: number
}

/** إعدادات الخصوصية — GET/PUT /api/profile/privacy */
export interface PrivacySettings {
  showWatchHistory: boolean
  showFavorites: boolean
}

/** إعدادات الإشعارات — GET/PUT /api/profile/notifications */
export interface NotificationSettings {
  emailNotifications: boolean
  newContentNotif: boolean
}
