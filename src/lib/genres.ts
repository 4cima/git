/**
 * Shared genre utilities using precomputed genre_counts table
 * Used by both /api/genres route handler and /genres page
 *
 * NOTE: genre_counts table must be updated after ingestion runs.
 * Run populate-genre-counts.js after sync to keep counts accurate.
 */

import { executeAll } from '@/lib/db'

export async function getGenresWithCounts(type?: 'movie' | 'tv') {
  let query = `
    SELECT
      g.*,
      COALESCE(gc.movie_count, 0)  as movie_count,
      COALESCE(gc.series_count, 0) as series_count
    FROM genres g
    LEFT JOIN genre_counts gc ON gc.genre_id = g.tmdb_id
  `

  if (type === 'movie') {
    query += ` WHERE COALESCE(gc.movie_count, 0) > 0`
  } else if (type === 'tv') {
    query += ` WHERE COALESCE(gc.series_count, 0) > 0`
  }

  query += ` ORDER BY g.name_ar ASC`

  const rows = await executeAll(query, [])

  return rows.map(genre => ({
    ...genre,
    movie_count:  Number(genre.movie_count  || 0),
    series_count: Number(genre.series_count || 0),
    total_count:  Number(genre.movie_count  || 0) + Number(genre.series_count || 0)
  }))
}
