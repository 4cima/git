/**
 * Admin Content API
 *
 * Operations route directly to /api/admin/movies and /api/admin/series
 * which use the D1 database client (@/lib/db).
 *
 * All routes are protected by HTTP Basic Auth middleware.
 */

// ==========================================
// Movies
// ==========================================

export async function updateMovie(tmdb_id: number, fields: Record<string, unknown>) {
  const res = await fetch('/api/admin/movies', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tmdb_id, fields }),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error || 'Update failed')
  return data
}

export async function deleteMovie(tmdb_id: number) {
  const res = await fetch('/api/admin/movies', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tmdb_id }),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error || 'Delete failed')
  return data
}

// ==========================================
// Series
// ==========================================

export async function updateSeries(tmdb_id: number, fields: Record<string, unknown>) {
  const res = await fetch('/api/admin/series', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tmdb_id, fields }),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error || 'Update failed')
  return data
}

export async function deleteSeries(tmdb_id: number) {
  const res = await fetch('/api/admin/series', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tmdb_id }),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error || 'Delete failed')
  return data
}

// ==========================================
// Legacy stubs (season/episode management not yet implemented)
// ==========================================
export async function upsertSeason(_row: Record<string, unknown>) {
  throw new Error('Season management not yet implemented')
}
export async function deleteSeason(_seasonId: number) {
  throw new Error('Season management not yet implemented')
}
export async function upsertEpisode(_row: Record<string, unknown>) {
  throw new Error('Episode management not yet implemented')
}
export async function deleteEpisode(_episodeId: number) {
  throw new Error('Episode management not yet implemented')
}

export default { updateMovie, deleteMovie, updateSeries, deleteSeries }