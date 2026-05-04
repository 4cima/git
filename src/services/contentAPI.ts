/**
 * 🎬 Content API - Turso Integration
 * 
 * @description Helper functions for content management using Turso via Worker API
 * @author 4Cima Team
 * 
 * ⚠️ CRITICAL: ALL content operations go through Turso via Worker API
 * ⚠️ Supabase is ONLY for auth and user data
 */

import { CONFIG } from '../lib/constants'

const API_BASE = CONFIG.API_BASE || 'https://api.4cima.com'

async function fetchAPI(endpoint: string, options?: RequestInit) {
  const url = API_BASE ? `${API_BASE}${endpoint}` : endpoint
  const response = await fetch(url, options)

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`)
  }

  return response.json()
}

// ==========================================
// Series Management
// ==========================================

export async function getSeriesById(id: number) {
  try {
    const data = await fetchAPI(`/api/db/tv/${id}`)
    return data
  } catch {
    return null
  }
}

export async function getSeasons(seriesIdOrSlug: number | string) {
  const data = await fetchAPI(`/api/tv/${seriesIdOrSlug}/seasons`)
  return data.data || data as any[]
}

export async function getEpisodes(seriesSlug: string, seasonNumber: number) {
  const data = await fetchAPI(`/api/tv/${seriesSlug}/season/${seasonNumber}/episodes`)
  return data.data || data as any[]
}

// TypeScript interfaces for seasons and episodes
export interface Season {
  id: number  // bigint in DB = number in JS
  season_number: number
  name: string
  name_ar: string | null
  overview: string | null
  overview_ar: string | null
  episode_count: number
  air_date: string | null
  poster_path: string | null
}

export interface Episode {
  id: number  // bigint in DB = number in JS
  episode_number: number
  name: string
  name_ar: string | null
  overview: string | null
  overview_ar: string | null
  runtime: number | null
  air_date: string | null
  still_path: string | null
  vote_average: number | null
}

// ==========================================
// Content Mutations (Admin)
// ==========================================

export async function upsertSeries(row: Record<string, unknown>) {
  // This requires admin API endpoint - to be implemented
  throw new Error('Use admin API for content mutations')
}

export async function upsertSeason(row: Record<string, unknown>) {
  throw new Error('Use admin API for content mutations')
}

export async function deleteSeason(seasonId: number) {
  throw new Error('Use admin API for content mutations')
}

export async function upsertEpisode(row: Record<string, unknown>) {
  throw new Error('Use admin API for content mutations')
}

export async function deleteEpisode(episodeId: number) {
  throw new Error('Use admin API for content mutations')
}

// ==========================================
// Batch Content Lookup (Watchlist Migration)
// ==========================================

export interface BatchContentItem {
  id: string  // Now using TMDB ID directly
  content_type: 'movie' | 'tv' | 'game' | 'software'
}

export interface ContentDetails {
  id: string  // TMDB ID (bigint)
  slug: string
  title?: string
  name?: string
  title_ar?: string | null
  name_ar?: string | null
  poster_path: string | null
  backdrop_path?: string | null
  overview: string | null
  overview_ar?: string | null
  vote_average: number
  release_date?: string | null
  first_air_date?: string | null
  content_type: 'movie' | 'tv' | 'game' | 'software'
  [key: string]: any
}

/**
 * Fetch multiple content items by IDs in a single batch request
 * Used for watchlist/history display
 * 
 * @param items Array of {id, content_type}
 * @returns Array of content details (or null for missing content)
 */
export async function fetchBatchContent(items: BatchContentItem[]): Promise<(ContentDetails | null)[]> {
  if (!items || items.length === 0) {
    return []
  }

  try {
    const response = await fetch(`${API_BASE}/api/content/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ items })
    })

    if (!response.ok) {
      throw new Error(`Batch API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.results || []
  } catch (error: any) {
    console.error('Batch content lookup failed:', error)
    // Return array of nulls to maintain index alignment
    return items.map(() => null)
  }
}

export default {
  getSeriesById,
  getSeasons,
  getEpisodes,
  upsertSeries,
  upsertSeason,
  deleteSeason,
  upsertEpisode,
  deleteEpisode,
  fetchBatchContent
}
