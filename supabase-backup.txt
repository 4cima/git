/**
 * 🔐 Supabase Client - Auth & User Data ONLY
 * 
 * ⚠️ CRITICAL RULES:
 * 1. Supabase is ONLY for authentication and user-related data
 * 2. ALL content queries (movies, tv_series, episodes, etc.) use CockroachDB via API
 * 3. Use src/services/contentQueries.ts for content operations
 * 4. Use src/services/contentAPI.ts for series/seasons/episodes operations
 * 
 * Allowed Supabase tables:
 * - profiles, follows, watchlist, continue_watching, history
 * - activity_feed, activity_likes, activity_comments, activity_reactions
 * - challenges, user_challenges, achievements, user_achievements
 * - playlists, playlist_items, notifications, user_rankings
 * 
 * FORBIDDEN Supabase tables (use CockroachDB API instead):
 * - movies, tv_series, seasons, episodes, anime, games, software, actors
 */

import { createClient } from '@supabase/supabase-js'
import { CONFIG } from './constants'
import { errorLogger } from '../services/errorLogging'
import { logger } from './logger'

// Fallback to prevent crash if env vars are missing
const sbUrl = CONFIG.SUPABASE_URL || 'https://placeholder.supabase.co'
const sbKey = CONFIG.SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(sbUrl, sbKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: '4cima-auth-v3' // مفتاح فريد لضمان عدم تعارض الجلسات
  },
  db: {
    schema: 'public'
  }
})

interface FetchOptions extends RequestInit {
  timeout?: number;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: string) {
  return uuidPattern.test(value)
}

/**
 * Validate external_id input
 * @throws Error if external_id is invalid
 */
function validateExternalId(external_id: string | undefined | null, fieldName = 'external_id'): void {
  if (!external_id || typeof external_id !== 'string' || !external_id.trim()) {
    throw new Error(`${fieldName} is required and must be a non-empty string`)
  }
}

/**
 * Validate content_type input
 * @throws Error if content_type is invalid
 */
function validateContentType(content_type: string | undefined | null): void {
  const validTypes = ['movie', 'tv', 'game', 'software', 'actor']
  if (!content_type || !validTypes.includes(content_type)) {
    throw new Error(`content_type must be one of: ${validTypes.join(', ')}`)
  }
}

async function fetchWithTimeout(resource: RequestInfo | URL, options: FetchOptions = {}) {
  // Increased default timeout to 60s to ensure data loads even on slow connections
  const { timeout = 60000, ...fetchOptions } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(resource, {
      ...fetchOptions,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      logger.warn('[Supabase] Request timed out:', resource)
    }
    throw error;
  }
}

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  banner_url?: string | null;
  role: 'user' | 'admin' | 'supervisor';
  bio?: string;
  website?: string;
  twitter?: string;
  instagram?: string;
  facebook?: string;
  avatar_decoration?: string;
  is_public: boolean;
  created_at?: string;
  total_xp?: number;
  movies_watched?: number;
  reviews_written?: number;
}

export interface Challenge {
  id: string;
  title: string;
  title_en: string;
  description: string;
  description_en: string;
  type: 'watch_count' | 'review_count' | 'follow_count' | 'social_share';
  target_count: number;
  reward_xp: number;
  icon: string;
  is_active: boolean;
}

export interface UserChallenge {
  id: string;
  user_id: string;
  challenge_id: string;
  current_count: number;
  is_completed: boolean;
  completed_at: string | null;
  updated_at: string;
  challenge: Challenge;
}

export async function getUserChallenges(userId: string) {
  const { data, error } = await supabase
    .from('user_challenges')
    .select('*, challenge:challenges(*)')
    .eq('user_id', userId)

  if (error) throw error
  return data as UserChallenge[]
}

export async function getAvailableChallenges() {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('is_active', true)

  if (error) throw error
  return data as Challenge[]
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  avatar_url: string | null;
  total_xp: number;
  movies_watched: number;
  reviews_written: number;
  rank: number;
}

export async function getLeaderboard(limit = 100) {
  const { data, error } = await supabase
    .from('user_rankings')
    .select('*')
    .order('total_xp', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as LeaderboardEntry[]
}

export async function getProfileByUsername(username: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle()

  if (error) throw error
  return data as Profile | null
}

export async function getProfile(userId: string) {
  if (!isUuid(userId)) {
    throw new Error('Invalid user id')
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (data && !error) {
    return data as Profile | null
  }

  // If error (RLS/Network) OR no data (RLS silent failure), try proxy
  if (error || !data) {
    try {
      // Use relative path by default to leverage Vite proxy in dev, or API_BASE if set
      const apiBase = CONFIG.API_BASE || ''
      const url = apiBase ? `${apiBase}/api/profile/${encodeURIComponent(userId)}` : `/api/profile/${encodeURIComponent(userId)}`

      // Get current session token for authentication
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const authUserId = session?.user?.id
      if (!token || authUserId !== userId) {
        if (error) throw error
        return null
      }
      const headers: Record<string, string> = {}
      headers['Authorization'] = `Bearer ${token}`

      const res = await fetchWithTimeout(url, { headers, timeout: 3000 })
      if (res.ok) {
        const proxyData = await res.json()
        if (proxyData) {
          return proxyData as Profile | null
        }
      }
    } catch (e: any) {
      // Only log proxy errors if we also had a direct error, to avoid noise on simple "not found"
      if (error) {
        errorLogger.logError({
          message: 'Proxy fetch failed after direct fetch error',
          severity: 'medium',
          category: 'network',
          context: { error: e, originalError: error }
        })
      }
    }

    // If direct fetch had an error and proxy failed, throw original error
    if (error) throw error

    // If direct fetch was null (silent RLS or not found) and proxy failed/null, return null
    return null
  }

  return null
}

export async function ensureProfile(userId: string, email?: string | null) {
  const existing = await getProfile(userId)
  if (existing) return existing
  const username = email?.split('@')[0] || 'user'
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: userId, username, role: 'user', is_public: true })
    .select('*')
    .single()

  if (error) {
    // If profile already exists (race condition or trigger), try fetching it again
    if (error.code === '23505') {
      const retry = await getProfile(userId)
      if (retry) return retry
    }
    throw error
  }
  return data
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
  if (error) throw error
}

export async function updateUsername(userId: string, username: string) {
  return updateProfile(userId, { username })
}

// Follow Functions
export async function followUser(followerId: string, followingId: string) {
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: followerId, following_id: followingId })
  if (error) throw error

  // Add activity
  await addActivity({
    user_id: followerId,
    type: 'follow',
    content_id: followingId,
    content_type: 'user',
    metadata: {}
  })
}

export async function unfollowUser(followerId: string, followingId: string) {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
  if (error) throw error
}

export async function removeFollower(userId: string, followerId: string) {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', userId)
  if (error) throw error
}

export async function isFollowing(followerId: string, followingId: string) {
  const { data, error } = await supabase
    .from('follows')
    .select('*')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle()
  if (error) throw error
  return !!data
}

export async function getFollowers(userId: string, limit = 20, offset = 0) {
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id, profiles!follower_id(*)')
    .eq('following_id', userId)
    .range(offset, offset + limit - 1)
  if (error) throw error
  return data.map(d => d.profiles).filter(Boolean) as unknown as Profile[]
}

export async function getFollowing(userId: string, limit = 20, offset = 0) {
  const { data, error } = await supabase
    .from('follows')
    .select('following_id, profiles!following_id(*)')
    .eq('follower_id', userId)
    .range(offset, offset + limit - 1)
  if (error) throw error
  return data.map(d => d.profiles).filter(Boolean) as unknown as Profile[]
}

// Activity Feed Functions
export type Activity = {
  id: string
  user_id: string
  type: 'watch' | 'review' | 'achievement' | 'follow' | 'playlist_created'
  content_id: string // Deprecated: Use metadata.external_id instead
  content_type: string
  metadata?: {
    external_id?: string // TMDB ID for content-related activities
    external_source?: string // Default: 'tmdb'
    [key: string]: any
  }
  created_at: string
  user?: Profile
  likes_count?: number
  comments_count?: number
  is_liked?: boolean
}

export async function getActivityFeed(userId: string, limit = 20, offset = 0) {
  const { data, error } = await supabase
    .from('activity_feed')
    .select('*, user:profiles(*)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) throw error
  return data as unknown as Activity[]
}

export async function addActivity(activity: Omit<Activity, 'id' | 'created_at'>) {
  // For content-related activities ('watch', 'review'), ensure external_id is in metadata
  if ((activity.type === 'watch' || activity.type === 'review') && activity.content_id) {
    activity.metadata = {
      ...activity.metadata,
      external_id: activity.content_id,
      external_source: activity.metadata?.external_source || 'tmdb'
    }
  }

  const { error } = await supabase
    .from('activity_feed')
    .insert(activity)
  if (error) throw error
}

// Activity Interactions Functions
export async function likeActivity(activityId: string, userId: string) {
  const { error } = await supabase
    .from('activity_likes')
    .insert({ activity_id: activityId, user_id: userId })
  if (error) throw error
}

export async function unlikeActivity(activityId: string, userId: string) {
  const { error } = await supabase
    .from('activity_likes')
    .delete()
    .eq('activity_id', activityId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function isActivityLiked(activityId: string, userId: string) {
  const { data, error } = await supabase
    .from('activity_likes')
    .select('*')
    .eq('activity_id', activityId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return !!data
}

export async function getActivityLikesCount(activityId: string) {
  const { count, error } = await supabase
    .from('activity_likes')
    .select('*', { count: 'exact', head: true })
    .eq('activity_id', activityId)
  if (error) throw error
  return count || 0
}

export type ActivityComment = {
  id: string
  activity_id: string
  user_id: string
  text: string
  created_at: string
  user?: Profile
}

export async function addActivityComment(activityId: string, userId: string, text: string) {
  const { data, error } = await supabase
    .from('activity_comments')
    .insert({ activity_id: activityId, user_id: userId, text })
    .select('*, user:profiles(*)')
    .single()
  if (error) throw error
  return data as ActivityComment
}

export async function getActivityComments(activityId: string) {
  const { data, error } = await supabase
    .from('activity_comments')
    .select('*, user:profiles(*)')
    .eq('activity_id', activityId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as ActivityComment[]
}

export async function deleteActivityComment(commentId: string, userId: string) {
  const { error } = await supabase
    .from('activity_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId)
  if (error) throw error
}

// Activity Reaction Functions
export type ActivityReaction = {
  id: string
  activity_id: string
  user_id: string
  type: string
  created_at: string
}

export async function addActivityReaction(activityId: string, userId: string, type: string) {
  const { error } = await supabase
    .from('activity_reactions')
    .upsert({ activity_id: activityId, user_id: userId, type }, { onConflict: 'activity_id,user_id' })
  if (error) throw error
}

export async function removeActivityReaction(activityId: string, userId: string) {
  const { error } = await supabase
    .from('activity_reactions')
    .delete()
    .eq('activity_id', activityId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function getActivityReactions(activityId: string) {
  const { data, error } = await supabase
    .from('activity_reactions')
    .select('type, user_id')
    .eq('activity_id', activityId)
  if (error) throw error
  return data as { type: string, user_id: string }[]
}

// Activity Comment Reply Functions
export type ActivityCommentReply = {
  id: string
  comment_id: string
  user_id: string
  text: string
  created_at: string
  user?: Profile
}

export async function addActivityCommentReply(commentId: string, userId: string, text: string) {
  const { data, error } = await supabase
    .from('activity_comment_replies')
    .insert({ comment_id: commentId, user_id: userId, text })
    .select('*, user:profiles(*)')
    .single()
  if (error) throw error
  return data as ActivityCommentReply
}

export async function getActivityCommentReplies(commentId: string) {
  const { data, error } = await supabase
    .from('activity_comment_replies')
    .select('*, user:profiles(*)')
    .eq('comment_id', commentId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as ActivityCommentReply[]
}

export async function deleteActivityCommentReply(replyId: string, userId: string) {
  const { error } = await supabase
    .from('activity_comment_replies')
    .delete()
    .eq('id', replyId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function uploadAvatar(file: File, userId: string) {
  if (!isUuid(userId)) {
    throw new Error('Invalid user id')
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token || session.user.id !== userId) {
    throw new Error('Unauthorized profile update')
  }

  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${userId}/${Date.now()}.${ext}`
  const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
    upsert: true,
    cacheControl: '3600',
    contentType: file.type
  })
  if (upErr) throw upErr
  const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
  const publicUrl = pub.publicUrl

  const { error: updErr } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId)
  if (updErr) {
    errorLogger.logError({
      message: 'Direct avatar update failed, trying proxy',
      severity: 'low',
      category: 'database',
      context: { error: updErr, userId }
    })
    const apiBase = CONFIG.API_BASE || ''
    const endpoint = apiBase ? `${apiBase}/api/profile/${encodeURIComponent(userId)}` : `/api/profile/${encodeURIComponent(userId)}`
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ avatar_url: publicUrl })
    })
    if (!res.ok) throw updErr
  }
  return publicUrl
}

export async function isInWatchlist(userId: string, externalId: string, contentType: 'movie' | 'tv') {
  // Validate external_id
  if (!externalId || externalId.trim() === '') {
    throw new Error('external_id is required and cannot be empty')
  }

  // Convert to integer for database query
  const externalIdInt = parseInt(externalId, 10)
  if (isNaN(externalIdInt)) {
    throw new Error('external_id must be a valid number')
  }

  const { data, error } = await supabase
    .from('watchlist')
    .select('id')
    .eq('user_id', userId)
    .eq('external_id', externalIdInt)
    .eq('content_type', contentType)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') throw error
  return !!data
}

export async function addToWatchlist(userId: string, externalId: string, contentType: 'movie' | 'tv') {
  // Validate inputs
  validateExternalId(externalId, 'externalId')
  validateContentType(contentType)

  // Convert to integer
  const externalIdInt = parseInt(externalId, 10)
  if (isNaN(externalIdInt)) {
    throw new Error('external_id must be a valid number')
  }

  try {
    const { error } = await supabase.from('watchlist').insert({
      user_id: userId,
      external_id: externalIdInt,
      external_source: 'tmdb',
      content_type: contentType
    })

    // Handle duplicate entry errors gracefully (23505 = unique constraint violation)
    if (error) {
      if (error.code === '23505' || String(error.message || '').includes('duplicate')) {
        // Silently ignore - item already in watchlist
        return
      }
      logger.error('Failed to add to watchlist', { userId, externalId, contentType, error: error.message })
      throw error
    }
  } catch (err: any) {
    logger.error('Error in addToWatchlist', { userId, externalId, contentType, error: err })
    throw err
  }
}

export async function removeFromWatchlist(userId: string, externalId: string, contentType: 'movie' | 'tv') {
  // Validate inputs
  validateExternalId(externalId, 'externalId')
  validateContentType(contentType)

  // Convert to integer
  const externalIdInt = parseInt(externalId, 10)
  if (isNaN(externalIdInt)) {
    throw new Error('external_id must be a valid number')
  }

  try {
    const { error } = await supabase
      .from('watchlist')
      .delete()
      .eq('user_id', userId)
      .eq('external_id', externalIdInt)
      .eq('content_type', contentType)
    if (error) {
      logger.error('Failed to remove from watchlist', { userId, externalId, contentType, error: error.message })
      throw error
    }
  } catch (err: any) {
    logger.error('Error in removeFromWatchlist', { userId, externalId, contentType, error: err })
    throw err
  }
}

export async function getWatchlist(userId: string) {
  const { data, error } = await supabase
    .from('watchlist')
    .select('external_id, external_source, content_type, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Array<{ external_id: string; external_source: string; content_type: 'movie' | 'tv'; created_at: string }>
}

export async function getProgress(userId: string, externalId: string, contentType: 'movie' | 'tv') {
  // Validate external_id
  if (!externalId || externalId.trim() === '') {
    throw new Error('external_id is required and cannot be empty')
  }

  const { data, error } = await supabase
    .from('continue_watching')
    .select('id, progress_seconds, duration_seconds, season_number, episode_number')
    .eq('user_id', userId)
    .eq('external_id', externalId)
    .eq('content_type', contentType)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') throw error
  return data as { id: string; progress_seconds: number; duration_seconds: number; season_number: number | null; episode_number: number | null } | null
}

export async function upsertProgress(args: {
  userId: string
  externalId: string
  contentType: 'movie' | 'tv'
  season?: number | null
  episode?: number | null
  progressSeconds: number
  durationSeconds?: number
}) {
  // Validate external_id
  if (!args.externalId || args.externalId.trim() === '') {
    throw new Error('external_id is required and cannot be empty')
  }

  const payload = {
    user_id: args.userId,
    external_id: args.externalId,
    external_source: 'tmdb',
    content_type: args.contentType,
    season_number: args.season ?? null,
    episode_number: args.episode ?? null,
    progress_seconds: args.progressSeconds,
    duration_seconds: args.durationSeconds ?? 0,
    updated_at: new Date().toISOString()
  }
  const { error } = await supabase.from('continue_watching').upsert(payload, { onConflict: 'user_id,external_id,content_type' })
  if (error) throw error
}

export async function getContinueWatching(userId: string) {
  const { data, error } = await supabase
    .from('continue_watching')
    .select('external_id, external_source, content_type, season_number, episode_number, progress_seconds, duration_seconds, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data as Array<{
    external_id: string
    external_source: string
    content_type: 'movie' | 'tv'
    season_number: number | null
    episode_number: number | null
    progress_seconds: number
    duration_seconds: number
    updated_at: string
  }>
}

export async function addHistory(args: {
  userId: string
  externalId: string
  contentType: 'movie' | 'tv'
  season?: number | null
  episode?: number | null
  watchedAt?: string
}) {
  // Validate external_id
  if (!args.externalId || args.externalId.trim() === '') {
    throw new Error('external_id is required and cannot be empty')
  }

  const payload = {
    user_id: args.userId,
    external_id: args.externalId,
    external_source: 'tmdb',
    content_type: args.contentType,
    season_number: args.season ?? null,
    episode_number: args.episode ?? null,
    watched_at: args.watchedAt ?? new Date().toISOString()
  }
  const { error } = await supabase.from('history').insert(payload)
  if (error) throw error
}

export async function getHistory(userId: string) {
  const { data, error } = await supabase
    .from('history')
    .select('external_id, external_source, content_type, season_number, episode_number, watched_at')
    .eq('user_id', userId)
    .order('watched_at', { ascending: false })
  if (error) throw error
  return data as Array<{
    external_id: string
    external_source: string
    content_type: 'movie' | 'tv'
    season_number: number | null
    episode_number: number | null
    watched_at: string
  }>
}

export type CommentRow = {
  id: string
  user_id: string
  content_id: number | string
  content_type: 'movie' | 'tv' | 'anime' | 'game' | 'software'
  text: string
  title?: string
  rating?: number
  created_at: string
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  category: string
  points: number
  created_at: string
}

export interface UserAchievement {
  user_id: string
  achievement_id: string
  earned_at: string
  achievement?: Achievement
}

// Achievements Functions
export async function getUserAchievements(userId: string) {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('*, achievement:achievements(*)')
    .eq('user_id', userId)
  if (error) throw error
  return data as UserAchievement[]
}

export async function grantAchievement(userId: string, achievementId: string) {
  // Check if already has it
  const { data: existing } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId)
    .eq('achievement_id', achievementId)
    .maybeSingle()

  if (existing) return false

  const { error } = await supabase
    .from('user_achievements')
    .insert({ user_id: userId, achievement_id: achievementId })

  if (error) throw error

  // Add activity
  await addActivity({
    user_id: userId,
    type: 'achievement',
    content_id: achievementId,
    content_type: 'achievement',
    metadata: {}
  })

  return true
}

export async function getAllAchievements() {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
  if (error) throw error
  return data as Achievement[]
}

// Playlists Functions
export type Playlist = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  is_ai_generated: boolean;
  created_at: string;
};

export type PlaylistItem = {
  id: string;
  playlist_id: string;
  content_id: number;
  content_type: 'movie' | 'tv';
  added_at: string;
};

export async function getUserPlaylists(userId: string) {
  const { data, error } = await supabase
    .from('playlists')
    .select('*, items:playlist_items(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as (Playlist & { items: PlaylistItem[] })[];
}

export async function getPublicAiPlaylists() {
  const { data, error } = await supabase
    .from('playlists')
    .select('*, items:playlist_items(*)')
    .eq('is_ai_generated', true)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;
  return data as (Playlist & { items: PlaylistItem[] })[];
}

export async function createPlaylist(args: {
  userId: string;
  title: string;
  description?: string;
  isPublic?: boolean;
  isAiGenerated?: boolean;
}) {
  const { data, error } = await supabase
    .from('playlists')
    .insert({
      user_id: args.userId,
      title: args.title,
      description: args.description || null,
      is_public: args.isPublic ?? true,
      is_ai_generated: args.isAiGenerated ?? false
    })
    .select()
    .single();
  if (error) throw error;
  return data as Playlist;
}

export async function addPlaylistItem(playlistId: string, externalId: string, contentType: 'movie' | 'tv', externalSource: string = 'tmdb') {
  // Validate external_id
  if (!externalId || externalId.trim() === '') {
    throw new Error('external_id cannot be null or empty');
  }

  const { error } = await supabase
    .from('playlist_items')
    .upsert({
      playlist_id: playlistId,
      external_id: externalId,
      content_type: contentType,
      external_source: externalSource
    });
  if (error) throw error;
}

// Notifications Functions
export type Notification = {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error' | 'recommendation'
  is_read: boolean
  data: any
  created_at: string
}

export async function getUserNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Notification[]
}

export async function markNotificationAsRead(id: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
  if (error) throw error
}

export async function markAllNotificationsAsRead(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
  if (error) throw error
}

export async function deleteNotification(id: string) {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function createNotification(args: {
  userId: string
  title: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error' | 'recommendation'
  data?: any
}) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: args.userId,
      title: args.title,
      message: args.message,
      type: args.type || 'info',
      data: args.data || {}
    })
    .select()
    .single()
  if (error) throw error
  return data as Notification
}

export async function getComments(contentId: number | string, contentType: string) {
  const { data, error } = await supabase
    .from('comments')
    .select('id,user_id,content_id,content_type,text,title,rating,created_at')
    .eq('content_id', contentId)
    .eq('content_type', contentType)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as CommentRow[]
}

export async function addComment(args: {
  userId: string,
  contentId: number | string,
  contentType: string,
  text: string,
  title?: string,
  rating?: number
}) {
  const { data, error } = await supabase.from('comments').insert({
    user_id: args.userId,
    content_id: args.contentId,
    content_type: args.contentType,
    text: args.text,
    title: args.title,
    rating: args.rating
  }).select().single()

  if (error) throw error

  // Add activity
  await addActivity({
    user_id: args.userId,
    type: 'review',
    content_id: data.id,
    content_type: 'review',
    metadata: {
      content_id: args.contentId,
      content_type: args.contentType,
      rating: args.rating,
      title: args.title
    }
  })
}

export async function getAverageRating(contentId: number | string, contentType: string) {
  const { data, error } = await supabase
    .from('comments')
    .select('rating')
    .eq('content_id', contentId)
    .eq('content_type', contentType)
    .not('rating', 'is', null)

  if (error) throw error
  if (!data || data.length === 0) return 0

  const sum = data.reduce((acc, curr) => acc + (curr.rating || 0), 0)
  return parseFloat((sum / data.length).toFixed(1))
}

export async function updateComment(commentId: string, text: string) {
  const { error } = await supabase.from('comments').update({ text }).eq('id', commentId)
  if (error) throw error
}

export async function deleteComment(commentId: string) {
  const { error } = await supabase.from('comments').delete().eq('id', commentId)
  if (error) throw error
}

export async function incrementClicks(table: 'movies' | 'games' | 'software', id: number | string) {
  const numericId = Number(id)
  if (!Number.isFinite(numericId)) {
    throw new Error('Invalid content id for incrementClicks')
  }
  const { error } = await supabase.rpc('increment_content_clicks', {
    target_table: table,
    target_id: numericId
  })
  if (error) throw error
}

// ------------------------------------------------------------------
// Recommendation System Data Collector
// ------------------------------------------------------------------

export type UserPreferenceData = {
  history: Array<{ external_id: string; content_type: 'movie' | 'tv' }>
  watchlist: Array<{ external_id: string; content_type: 'movie' | 'tv' }>
}

export async function getUserPreferences(userId: string): Promise<UserPreferenceData> {
  // Fetch history (limit to last 50 items to keep it relevant)
  const { data: history, error: historyError } = await supabase
    .from('history')
    .select('external_id, content_type')
    .eq('user_id', userId)
    .order('watched_at', { ascending: false })
    .limit(50)

  if (historyError) {
    errorLogger.logError({
      message: 'Failed to fetch user history for recommendations',
      severity: 'low',
      category: 'database',
      context: { error: historyError, userId }
    })
  }

  // Fetch watchlist
  const { data: watchlist, error: watchlistError } = await supabase
    .from('watchlist')
    .select('external_id, content_type')
    .eq('user_id', userId)

  if (watchlistError) {
    errorLogger.logError({
      message: 'Failed to fetch user watchlist for recommendations',
      severity: 'low',
      category: 'database',
      context: { error: watchlistError, userId }
    })
  }

  // Filter out entries with null external_id (for safety during migration)
  const filteredHistory = (history || []).filter(item => item.external_id != null)
  const filteredWatchlist = (watchlist || []).filter(item => item.external_id != null)

  return {
    history: filteredHistory as any[],
    watchlist: filteredWatchlist as any[]
  }
}

// Moderation & Blocking Functions
export async function reportActivityComment(commentId: string, reporterId: string, reason: string) {
  const { error } = await supabase
    .from('activity_comment_reports')
    .insert({ comment_id: commentId, reporter_id: reporterId, reason })
  if (error) throw error
}

export async function blockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase
    .from('user_blocks')
    .insert({ blocker_id: blockerId, blocked_id: blockedId })
  if (error) throw error
}

export async function unblockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId)
  if (error) throw error
}

export async function getBlockedUsers(userId: string) {
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocked_id, profiles!blocked_id(*)')
    .eq('blocker_id', userId)
  if (error) throw error
  return data.map(d => d.profiles).filter(Boolean) as unknown as Profile[]
}

export async function isUserBlocked(blockerId: string, blockedId: string) {
  const { data, error } = await supabase
    .from('user_blocks')
    .select('id')
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId)
    .maybeSingle()
  if (error) throw error
  return !!data
}

// Review Voting Functions
export async function voteReview(commentId: string, userId: string, voteType: 'up' | 'down') {
  const { error } = await supabase
    .from('review_votes')
    .upsert({ comment_id: commentId, user_id: userId, vote_type: voteType }, { onConflict: 'comment_id,user_id' })
  if (error) throw error
}

export async function removeReviewVote(commentId: string, userId: string) {
  const { error } = await supabase
    .from('review_votes')
    .delete()
    .eq('comment_id', commentId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function getReviewVotes(commentId: string) {
  const { data, error } = await supabase
    .from('review_votes')
    .select('vote_type, user_id')
    .eq('comment_id', commentId)
  if (error) throw error
  return data as { vote_type: 'up' | 'down', user_id: string }[]
}

// User List Functions
export async function createUserList(userId: string, title: string, description?: string, isPublic: boolean = true) {
  const { data, error } = await supabase
    .from('user_lists')
    .insert({ user_id: userId, title, description, is_public: isPublic })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getUserLists(userId: string) {
  const { data, error } = await supabase
    .from('user_lists')
    .select('*, items:user_list_items(count)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getPublicUserLists(userId: string) {
  const { data, error } = await supabase
    .from('user_lists')
    .select('*, items:user_list_items(count)')
    .eq('user_id', userId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addItemToList(listId: string, externalId: string, contentType: 'movie' | 'tv', externalSource: string = 'tmdb') {
  // Validate external_id
  if (!externalId || externalId.trim() === '') {
    throw new Error('external_id cannot be null or empty');
  }

  const { error } = await supabase
    .from('user_list_items')
    .insert({
      list_id: listId,
      external_id: externalId,
      content_type: contentType,
      external_source: externalSource
    })
  if (error) throw error
}

export async function removeItemFromList(listId: string, externalId: string, contentType: 'movie' | 'tv') {
  // Validate inputs
  validateExternalId(externalId, 'externalId')
  validateContentType(contentType)

  try {
    const { error } = await supabase
      .from('user_list_items')
      .delete()
      .eq('list_id', listId)
      .eq('external_id', externalId)
      .eq('content_type', contentType)
    if (error) {
      logger.error('Failed to remove item from list', { listId, externalId, contentType, error: error.message })
      throw error
    }
  } catch (err: any) {
    logger.error('Error in removeItemFromList', { listId, externalId, contentType, error: err })
    throw err
  }
}

export async function getListItems(listId: string) {
  const { data, error } = await supabase
    .from('user_list_items')
    .select('*')
    .eq('list_id', listId)
  if (error) throw error
  return data
}

export async function deleteUserList(listId: string) {
  const { error } = await supabase
    .from('user_lists')
    .delete()
    .eq('id', listId)
  if (error) throw error
}


// ============================================================================
// RATINGS AND REVIEWS SYSTEM
// ============================================================================

/**
 * Rating and Review Types
 */
export type Rating = {
  id: string
  user_id: string
  external_id: string
  external_source: string
  content_type: 'movie' | 'tv' | 'game' | 'software'
  rating_value: number
  created_at: string
  updated_at: string
}

export type Review = {
  id: string
  user_id: string
  external_id: string
  external_source: string
  content_type: 'movie' | 'tv' | 'game' | 'software'
  title: string | null
  review_text: string
  rating: number | null
  language: 'ar' | 'en'
  contains_spoilers: boolean
  is_hidden: boolean
  is_verified: boolean
  edit_count: number
  created_at: string
  updated_at: string
  user?: Profile
  helpful_count?: number
  is_liked?: boolean
  view_count?: number
  helpful_percentage?: number
}

export type ReviewDraft = {
  id: string
  user_id: string
  external_id: string
  external_source: string
  content_type: 'movie' | 'tv' | 'game' | 'software'
  title: string | null
  review_text: string | null
  rating: number | null
  language: 'ar' | 'en' | null
  contains_spoilers: boolean
  updated_at: string
}

/**
 * Rating Functions
 */

export async function submitRating(
  userId: string,
  externalId: string,
  contentType: 'movie' | 'tv' | 'game' | 'software',
  ratingValue: number
): Promise<void> {
  validateExternalId(externalId, 'externalId')
  validateContentType(contentType)

  if (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 10) {
    throw new Error('Rating must be an integer between 1 and 10')
  }

  const { error } = await supabase
    .from('ratings')
    .upsert({
      user_id: userId,
      external_id: externalId,
      external_source: 'tmdb',
      content_type: contentType,
      rating_value: ratingValue,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,external_id,content_type' })

  if (error) {
    logger.error('Failed to submit rating', { userId, externalId, contentType, ratingValue, error: error.message })
    throw error
  }
}

export async function getUserRating(
  userId: string,
  externalId: string,
  contentType: 'movie' | 'tv' | 'game' | 'software'
): Promise<{ rating_value: number; created_at: string } | null> {
  validateExternalId(externalId, 'externalId')
  validateContentType(contentType)

  const { data, error } = await supabase
    .from('ratings')
    .select('rating_value, created_at')
    .eq('user_id', userId)
    .eq('external_id', externalId)
    .eq('content_type', contentType)
    .maybeSingle()

  if (error) {
    logger.error('Failed to get user rating', { userId, externalId, contentType, error: error.message })
    throw error
  }

  return data
}

export async function deleteRating(
  userId: string,
  externalId: string,
  contentType: 'movie' | 'tv' | 'game' | 'software'
): Promise<void> {
  validateExternalId(externalId, 'externalId')
  validateContentType(contentType)

  const { error } = await supabase
    .from('ratings')
    .delete()
    .eq('user_id', userId)
    .eq('external_id', externalId)
    .eq('content_type', contentType)

  if (error) {
    logger.error('Failed to delete rating', { userId, externalId, contentType, error: error.message })
    throw error
  }
}

/**
 * Review Functions
 */

export async function submitReview(args: {
  userId: string
  externalId: string
  contentType: 'movie' | 'tv' | 'game' | 'software'
  reviewText: string
  title?: string
  rating?: number
  language: 'ar' | 'en'
  containsSpoilers?: boolean
}): Promise<{ id: string }> {
  validateExternalId(args.externalId, 'externalId')
  validateContentType(args.contentType)

  if (!args.reviewText || args.reviewText.length < 10 || args.reviewText.length > 5000) {
    throw new Error('Review text must be between 10 and 5000 characters')
  }

  if (args.title && args.title.length > 200) {
    throw new Error('Title must not exceed 200 characters')
  }

  if (args.rating !== undefined && args.rating !== null) {
    if (!Number.isInteger(args.rating) || args.rating < 1 || args.rating > 10) {
      throw new Error('Rating must be an integer between 1 and 10')
    }
  }

  if (!['ar', 'en'].includes(args.language)) {
    throw new Error('Language must be "ar" or "en"')
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      user_id: args.userId,
      external_id: args.externalId,
      external_source: 'tmdb',
      content_type: args.contentType,
      title: args.title || null,
      review_text: args.reviewText,
      rating: args.rating || null,
      language: args.language,
      contains_spoilers: args.containsSpoilers || false
    })
    .select('id')
    .single()

  if (error) {
    logger.error('Failed to submit review', { ...args, error: error.message })
    throw error
  }

  return data
}

export async function updateReview(
  reviewId: string,
  userId: string,
  updates: {
    reviewText?: string
    title?: string
    rating?: number
    containsSpoilers?: boolean
  }
): Promise<void> {
  const updateData: any = {
    updated_at: new Date().toISOString()
  }

  if (updates.reviewText !== undefined) {
    if (updates.reviewText.length < 10 || updates.reviewText.length > 5000) {
      throw new Error('Review text must be between 10 and 5000 characters')
    }
    updateData.review_text = updates.reviewText
  }

  if (updates.title !== undefined) {
    if (updates.title && updates.title.length > 200) {
      throw new Error('Title must not exceed 200 characters')
    }
    updateData.title = updates.title || null
  }

  if (updates.rating !== undefined && updates.rating !== null) {
    if (!Number.isInteger(updates.rating) || updates.rating < 1 || updates.rating > 10) {
      throw new Error('Rating must be an integer between 1 and 10')
    }
    updateData.rating = updates.rating
  }

  if (updates.containsSpoilers !== undefined) {
    updateData.contains_spoilers = updates.containsSpoilers
  }

  const { error } = await supabase
    .from('reviews')
    .update(updateData)
    .eq('id', reviewId)
    .eq('user_id', userId)

  if (error) {
    logger.error('Failed to update review', { reviewId, userId, error: error.message })
    throw error
  }
}

export async function deleteReview(
  reviewId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId)
    .eq('user_id', userId)

  if (error) {
    logger.error('Failed to delete review', { reviewId, userId, error: error.message })
    throw error
  }
}

export async function getReviews(
  externalId: string,
  contentType: 'movie' | 'tv' | 'game' | 'software',
  options?: {
    sort?: 'most_helpful' | 'newest' | 'highest_rating' | 'lowest_rating'
    language?: 'ar' | 'en' | 'all'
    ratingFilter?: 'all' | 'positive' | 'mixed' | 'negative'
    limit?: number
    offset?: number
  }
): Promise<Array<Review>> {
  validateExternalId(externalId, 'externalId')
  validateContentType(contentType)

  const limit = Math.min(options?.limit || 20, 100)
  const offset = options?.offset || 0

  let query = supabase
    .from('reviews')
    .select('*, user:profiles(id, username, avatar_url, role)')
    .eq('external_id', externalId)
    .eq('content_type', contentType)
    .eq('is_hidden', false)

  if (options?.language && options.language !== 'all') {
    query = query.eq('language', options.language)
  }

  if (options?.ratingFilter === 'positive') {
    query = query.gte('rating', 7)
  } else if (options?.ratingFilter === 'mixed') {
    query = query.gte('rating', 4).lte('rating', 6)
  } else if (options?.ratingFilter === 'negative') {
    query = query.lte('rating', 3)
  }

  if (options?.sort === 'newest') {
    query = query.order('created_at', { ascending: false })
  } else if (options?.sort === 'highest_rating') {
    query = query.order('rating', { ascending: false, nullsFirst: false })
  } else if (options?.sort === 'lowest_rating') {
    query = query.order('rating', { ascending: true, nullsFirst: false })
  }

  query = query.range(offset, offset + limit - 1)

  const { data, error } = await query

  if (error) {
    logger.error('Failed to get reviews', { externalId, contentType, error: error.message })
    throw error
  }

  return data as Review[]
}

export async function getUserReview(
  userId: string,
  externalId: string,
  contentType: 'movie' | 'tv' | 'game' | 'software'
): Promise<Review | null> {
  validateExternalId(externalId, 'externalId')
  validateContentType(contentType)

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('user_id', userId)
    .eq('external_id', externalId)
    .eq('content_type', contentType)
    .maybeSingle()

  if (error) {
    logger.error('Failed to get user review', { userId, externalId, contentType, error: error.message })
    throw error
  }

  return data
}

export async function searchReviews(
  query: string,
  options?: {
    limit?: number
    offset?: number
  }
): Promise<Array<Review>> {
  const limit = Math.min(options?.limit || 20, 100)
  const offset = options?.offset || 0

  const { data, error } = await supabase
    .from('reviews')
    .select('*, user:profiles(id, username, avatar_url, role)')
    .textSearch('review_text', query, { type: 'websearch' })
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    logger.error('Failed to search reviews', { query, error: error.message })
    throw error
  }

  return data as Review[]
}

/**
 * Review Like Functions
 */

export async function likeReview(
  reviewId: string,
  userId: string
): Promise<{ liked: boolean; likeCount: number }> {
  // Check if already liked
  const { data: existing } = await supabase
    .from('review_likes')
    .select('id')
    .eq('review_id', reviewId)
    .eq('user_id', userId)
    .maybeSingle()

  let liked = false

  if (existing) {
    // Unlike
    const { error } = await supabase
      .from('review_likes')
      .delete()
      .eq('id', existing.id)

    if (error) throw error
    liked = false
  } else {
    // Like
    const { error } = await supabase
      .from('review_likes')
      .insert({ review_id: reviewId, user_id: userId })

    if (error) throw error
    liked = true
  }

  // Get updated count
  const { count } = await supabase
    .from('review_likes')
    .select('*', { count: 'exact', head: true })
    .eq('review_id', reviewId)

  return { liked, likeCount: count || 0 }
}

export async function getReviewLikeStatus(
  reviewId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('review_likes')
    .select('id')
    .eq('review_id', reviewId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return !!data
}

export async function getReviewLikeCount(
  reviewId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('review_likes')
    .select('*', { count: 'exact', head: true })
    .eq('review_id', reviewId)

  if (error) throw error
  return count || 0
}

/**
 * Review Report Functions
 */

export async function reportReview(
  reviewId: string,
  reporterUserId: string,
  reason: string
): Promise<void> {
  if (!reason || reason.length < 10 || reason.length > 500) {
    throw new Error('Reason must be between 10 and 500 characters')
  }

  const { error } = await supabase
    .from('review_reports')
    .insert({
      review_id: reviewId,
      reporter_user_id: reporterUserId,
      reason,
      status: 'pending'
    })

  if (error) {
    logger.error('Failed to report review', { reviewId, reporterUserId, error: error.message })
    throw error
  }
}

/**
 * Review Draft Functions
 */

export async function saveReviewDraft(args: {
  userId: string
  externalId: string
  contentType: 'movie' | 'tv' | 'game' | 'software'
  title?: string
  reviewText?: string
  rating?: number
  language?: 'ar' | 'en'
  containsSpoilers?: boolean
}): Promise<void> {
  validateExternalId(args.externalId, 'externalId')
  validateContentType(args.contentType)

  const { error } = await supabase
    .from('review_drafts')
    .upsert({
      user_id: args.userId,
      external_id: args.externalId,
      external_source: 'tmdb',
      content_type: args.contentType,
      title: args.title || null,
      review_text: args.reviewText || null,
      rating: args.rating || null,
      language: args.language || null,
      contains_spoilers: args.containsSpoilers || false,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,external_id,content_type' })

  if (error) {
    logger.error('Failed to save review draft', { ...args, error: error.message })
    throw error
  }
}

export async function getReviewDraft(
  userId: string,
  externalId: string,
  contentType: 'movie' | 'tv' | 'game' | 'software'
): Promise<ReviewDraft | null> {
  validateExternalId(externalId, 'externalId')
  validateContentType(contentType)

  const { data, error } = await supabase
    .from('review_drafts')
    .select('*')
    .eq('user_id', userId)
    .eq('external_id', externalId)
    .eq('content_type', contentType)
    .maybeSingle()

  if (error) {
    logger.error('Failed to get review draft', { userId, externalId, contentType, error: error.message })
    throw error
  }

  return data
}

export async function deleteReviewDraft(
  userId: string,
  externalId: string,
  contentType: 'movie' | 'tv' | 'game' | 'software'
): Promise<void> {
  validateExternalId(externalId, 'externalId')
  validateContentType(contentType)

  const { error } = await supabase
    .from('review_drafts')
    .delete()
    .eq('user_id', userId)
    .eq('external_id', externalId)
    .eq('content_type', contentType)

  if (error) {
    logger.error('Failed to delete review draft', { userId, externalId, contentType, error: error.message })
    throw error
  }
}

/**
 * Review View Tracking
 */

export async function trackReviewView(
  reviewId: string,
  userId: string | null
): Promise<void> {
  const { error } = await supabase
    .from('review_views')
    .insert({
      review_id: reviewId,
      user_id: userId
    })

  if (error) {
    logger.error('Failed to track review view', { reviewId, userId, error: error.message })
    // Don't throw - view tracking is non-critical
  }
}

export async function getReviewViewCount(
  reviewId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('review_views')
    .select('*', { count: 'exact', head: true })
    .eq('review_id', reviewId)

  if (error) {
    logger.error('Failed to get review view count', { reviewId, error: error.message })
    return 0
  }

  return count || 0
}

/**
 * User Review Statistics
 */

export async function getUserReviewStats(
  userId: string
): Promise<{
  totalReviews: number
  totalHelpfulVotes: number
  averageRating: number
}> {
  // Get total reviews
  const { count: totalReviews } = await supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_hidden', false)

  // Get user's review IDs
  const { data: userReviews } = await supabase
    .from('reviews')
    .select('id, rating')
    .eq('user_id', userId)
    .eq('is_hidden', false)

  const reviewIds = userReviews?.map(r => r.id) || []

  // Get total helpful votes
  let totalHelpfulVotes = 0
  if (reviewIds.length > 0) {
    const { count } = await supabase
      .from('review_likes')
      .select('*', { count: 'exact', head: true })
      .in('review_id', reviewIds)

    totalHelpfulVotes = count || 0
  }

  // Calculate average rating
  let averageRating = 0
  if (userReviews && userReviews.length > 0) {
    const ratingsWithValues = userReviews.filter(r => r.rating !== null)
    if (ratingsWithValues.length > 0) {
      const sum = ratingsWithValues.reduce((acc, r) => acc + (r.rating || 0), 0)
      averageRating = Math.round((sum / ratingsWithValues.length) * 10) / 10
    }
  }

  return {
    totalReviews: totalReviews || 0,
    totalHelpfulVotes,
    averageRating
  }
}
