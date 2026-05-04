/**
 * 🔧 Admin Content API - Turso Integration
 * 
 * @description Admin operations for content management using Turso via Worker API
 * @author 4Cima Team
 * 
 * ⚠️ CRITICAL: ALL admin content operations go through Turso via Worker API
 * ⚠️ This file is for ADMIN operations only (create, update, delete)
 */

import { CONFIG } from '../lib/constants'

const API_BASE = CONFIG.API_BASE || 'https://api.4cima.com'

async function fetchAPI(endpoint: string, options?: RequestInit) {
  const url = API_BASE ? `${API_BASE}${endpoint}` : endpoint
  const response = await fetch(url, options)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(error.error || response.statusText)
  }

  return response.json()
}

// ==========================================
// Series Management
// ==========================================

export async function upsertSeries(row: Record<string, unknown>) {
  // For now, use direct DB query endpoint
  const { id, ...data } = row

  const query = id
    ? `UPDATE tv_series SET ${Object.keys(data).map((k, i) => `${k} = $${i + 2}`).join(', ')} WHERE id = $1`
    : `INSERT INTO tv_series (${Object.keys(row).join(', ')}) VALUES (${Object.keys(row).map((_, i) => `$${i + 1}`).join(', ')})`

  const params = id ? [id, ...Object.values(data)] : Object.values(row)

  return fetchAPI('/api/db/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, params })
  })
}

export async function deleteSeries(seriesId: number) {
  return fetchAPI('/api/db/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'DELETE FROM tv_series WHERE id = $1',
      params: [seriesId]
    })
  })
}

// ==========================================
// Season Management
// ==========================================

export async function upsertSeason(row: Record<string, unknown>) {
  const { id, ...data } = row

  const query = id
    ? `UPDATE seasons SET ${Object.keys(data).map((k, i) => `${k} = $${i + 2}`).join(', ')} WHERE id = $1`
    : `INSERT INTO seasons (${Object.keys(row).join(', ')}) VALUES (${Object.keys(row).map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`

  const params = id ? [id, ...Object.values(data)] : Object.values(row)

  return fetchAPI('/api/db/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, params })
  })
}

export async function deleteSeason(seasonId: number) {
  return fetchAPI('/api/db/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'DELETE FROM seasons WHERE id = $1',
      params: [seasonId]
    })
  })
}

// ==========================================
// Episode Management
// ==========================================

export async function upsertEpisode(row: Record<string, unknown>) {
  const { id, ...data } = row

  const query = id
    ? `UPDATE episodes SET ${Object.keys(data).map((k, i) => `${k} = $${i + 2}`).join(', ')} WHERE id = $1`
    : `INSERT INTO episodes (${Object.keys(row).join(', ')}) VALUES (${Object.keys(row).map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`

  const params = id ? [id, ...Object.values(data)] : Object.values(row)

  return fetchAPI('/api/db/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, params })
  })
}

export async function deleteEpisode(episodeId: number) {
  return fetchAPI('/api/db/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'DELETE FROM episodes WHERE id = $1',
      params: [episodeId]
    })
  })
}

export default {
  upsertSeries,
  deleteSeries,
  upsertSeason,
  deleteSeason,
  upsertEpisode,
  deleteEpisode
}
