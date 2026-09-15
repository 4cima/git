/**
 * src/components/profile/api.ts
 * طبقة الوصول للبيانات — فقط الـendpoints الحقيقية الموجودة في المشروع. صفر mock، صفر اختراع.
 */
import type {
  ActivityItem,
  MediaItem,
  NotificationSettings,
  PrivacySettings,
  ProfileStats,
  ReviewItem,
} from './types'

const JSON_HEADERS: HeadersInit = { Accept: 'application/json' }

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: JSON_HEADERS, cache: 'no-store' })
  if (!res.ok) throw new Error(`فشل الطلب (${res.status})`)
  return (await res.json()) as T
}

async function sendJson<T>(url: string, method: 'PUT' | 'DELETE' | 'POST', body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { ...JSON_HEADERS, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null
  if (!res.ok) throw new Error(data?.error || `فشل الطلب (${res.status})`)
  return data as T
}

/* ── بيانات البروفايل (الـendpoints المعتمدة فقط) ─────────────────────────── */

export const fetchStats = () =>
  getJson<{ ok: boolean; stats: ProfileStats }>('/api/profile/stats')

export const fetchFavorites = () =>
  getJson<{ ok: boolean; items: MediaItem[] }>('/api/user/favorites')

export const fetchCompleted = () =>
  getJson<{ ok: boolean; items: MediaItem[] }>('/api/user/completed')

export const fetchReviews = () =>
  getJson<{ ok: boolean; items: ReviewItem[] }>('/api/user/reviews')

export const fetchContinueWatching = () =>
  getJson<{ ok: boolean; items: MediaItem[] }>('/api/continue-watching')

export const fetchActivity = (limit = 12) =>
  getJson<{ ok: boolean; activities: ActivityItem[] }>(`/api/profile/activity?limit=${limit}`)

/* ── عمليات (endpoints حقيقية موجودة فعلاً — ليست اختراعاً) ───────────────── */

/** إزالة من المفضلة — DELETE /api/user/favorites */
export const removeFavorite = (tmdbId: number) =>
  sendJson<{ ok: boolean }>(`/api/user/favorites?tmdb_id=${tmdbId}`, 'DELETE')

/** حذف تقييم — DELETE /api/user/reviews */
export const removeReview = (tmdbId: number) =>
  sendJson<{ ok: boolean }>(`/api/user/reviews?tmdb_id=${tmdbId}`, 'DELETE')

/** إزالة من أكمل المشاهدة — DELETE /api/continue-watching */
export const removeContinueItem = (tmdbId: number, season?: number | null, episode?: number | null) => {
  const q = new URLSearchParams({ tmdb_id: String(tmdbId) })
  if (season != null) q.set('season', String(season))
  if (episode != null) q.set('episode', String(episode))
  return sendJson<{ ok: boolean }>(`/api/continue-watching?${q.toString()}`, 'DELETE')
}

/** تحديث المعلومات الشخصية — PUT /api/profile/update */
export const updateProfileInfo = (username: string, avatarUrl: string | null) =>
  sendJson<{ ok: boolean }>('/api/profile/update', 'PUT', { username, avatar_url: avatarUrl })

/** قراءة/تحديث الخصوصية — GET/PUT /api/profile/privacy */
export const fetchPrivacy = () => getJson<PrivacySettings>('/api/profile/privacy')
export const updatePrivacy = (s: PrivacySettings) =>
  sendJson<{ ok: boolean }>('/api/profile/privacy', 'PUT', s)

/** قراءة/تحديث الإشعارات — GET/PUT /api/profile/notifications */
export const fetchNotificationSettings = () => getJson<NotificationSettings>('/api/profile/notifications')
export const updateNotificationSettings = (s: NotificationSettings) =>
  sendJson<{ ok: boolean }>('/api/profile/notifications', 'PUT', s)

/** حذف الحساب نهائياً — DELETE /api/profile/delete */
export const deleteAccount = () => sendJson<{ ok: boolean; deleted: boolean }>('/api/profile/delete', 'DELETE')
