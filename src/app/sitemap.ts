import type { MetadataRoute } from 'next'
import { executeAll, executeFirst } from '@/lib/db'

export const revalidate = 86400

const CHUNK_SIZE = 15000
const BASE_URL = 'https://4cima.com'
const SERIES_ID_OFFSET = 1000
const FALLBACK_MOVIE_PARTS = 25 // 0..24
const FALLBACK_SERIES_PARTS = 8 // 1000..1007

/**
 * Count clean movies with slugs and tmdb_ids.
 */
async function countMovies(): Promise<number> {
  const result = await executeFirst<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM movies 
     WHERE filter_status = 'clean' AND slug IS NOT NULL AND tmdb_id IS NOT NULL`,
    []
  )
  return result?.cnt ?? 0
}

/**
 * Count clean series with slugs and tmdb_ids.
 */
async function countSeries(): Promise<number> {
  const result = await executeFirst<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM tv_series 
     WHERE filter_status = 'clean' AND slug IS NOT NULL AND tmdb_id IS NOT NULL`,
    []
  )
  return result?.cnt ?? 0
}

/**
 * Generate the list of sitemap chunk IDs.
 * Movies: id 0..N-1
 * Series: id 1000..1000+N-1
 */
export async function generateSitemaps(): Promise<{ id: number }[]> {
  try {
    const movieCount = await countMovies()
    const seriesCount = await countSeries()
    const movieParts = Math.ceil(movieCount / CHUNK_SIZE)
    const seriesParts = Math.ceil(seriesCount / CHUNK_SIZE)

    const ids: { id: number }[] = []

    // If both are zero, return a single empty sitemap to keep index valid
    if (movieParts === 0 && seriesParts === 0) {
      return [{ id: 0 }]
    }

    // Movie parts: id 0..movieParts-1
    for (let i = 0; i < movieParts; i++) {
      ids.push({ id: i })
    }

    // Series parts: id 1000..1000+seriesParts-1
    for (let i = 0; i < seriesParts; i++) {
      ids.push({ id: SERIES_ID_OFFSET + i })
    }

    return ids
  } catch (error) {
    console.error('Sitemap count error:', error)
    // Fallback: return safe upper bound of parts (more is acceptable, less is not)
    const ids: { id: number }[] = []
    for (let i = 0; i < FALLBACK_MOVIE_PARTS; i++) {
      ids.push({ id: i })
    }
    for (let i = 0; i < FALLBACK_SERIES_PARTS; i++) {
      ids.push({ id: SERIES_ID_OFFSET + i })
    }
    return ids
  }
}

/**
 * Return URLs for a specific sitemap chunk.
 */
export default async function sitemap({
  id,
}: {
  id: number | string
}): Promise<MetadataRoute.Sitemap> {
  const chunkId = Number(id)
  if (!Number.isFinite(chunkId)) {
    return []
  }

  try {
    // Static routes only on chunkId 0 (first movie chunk)
    const staticRoutes: MetadataRoute.Sitemap =
      chunkId === 0
        ? [
            { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
            { url: `${BASE_URL}/movies`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
            { url: `${BASE_URL}/series`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
          ]
        : []

    // Series chunk
    if (chunkId >= SERIES_ID_OFFSET) {
      const localIndex = chunkId - SERIES_ID_OFFSET
      const rows = await executeAll<{ slug: string }>(
        `SELECT slug FROM tv_series 
         WHERE filter_status = 'clean' AND slug IS NOT NULL AND tmdb_id IS NOT NULL
         ORDER BY tmdb_id ASC 
         LIMIT ? OFFSET ?`,
        [CHUNK_SIZE, localIndex * CHUNK_SIZE]
      )
      const seriesRoutes: MetadataRoute.Sitemap = rows.map((row) => ({
        url: `${BASE_URL}/series/${row.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      }))
      return [...staticRoutes, ...seriesRoutes]
    }

    // Movie chunk
    const rows = await executeAll<{ slug: string }>(
      `SELECT slug FROM movies 
       WHERE filter_status = 'clean' AND slug IS NOT NULL AND tmdb_id IS NOT NULL
       ORDER BY tmdb_id ASC 
       LIMIT ? OFFSET ?`,
      [CHUNK_SIZE, chunkId * CHUNK_SIZE]
    )
    const movieRoutes: MetadataRoute.Sitemap = rows.map((row) => ({
      url: `${BASE_URL}/movies/${row.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }))
    return [...staticRoutes, ...movieRoutes]
  } catch (error) {
    console.error(`Sitemap chunk ${chunkId} error:`, error)
    return []
  }
}