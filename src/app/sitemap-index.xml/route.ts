import {
  SITEMAP_BASE_URL,
  SHARD_SIZE,
  INDEX_CACHE_CONTROL,
  CLEAN_ITEM_SQL,
  sitemapQuery,
  sitemapindexXml,
  xmlSuccessResponse,
  xmlUnavailableResponse,
} from '@/lib/sitemap'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * /sitemap-index.xml — sitemap index Route Handler (raw XML).
 *
 * Lists ONLY shards that contain links:
 *   /sitemap/static.xml            (static + genre landing pages)
 *   /sitemap/priority.xml          (top 2000 fresh items — indexing fuel)
 *   /sitemap/movies-0.xml …N       (10000 per shard, sequential from 0)
 *   /sitemap/series-0.xml …N       (10000 per shard, sequential from 0)
 *
 * Any database failure → 503 XML (never an empty or partial index with 200).
 */
export async function GET() {
  try {
    const rows = await sitemapQuery<{ movies: number; series: number }>(
      `SELECT
        (SELECT COUNT(*) FROM movies    WHERE ${CLEAN_ITEM_SQL}) AS movies,
        (SELECT COUNT(*) FROM tv_series WHERE ${CLEAN_ITEM_SQL}) AS series`
    )

    const movies = Number(rows[0]?.movies ?? 0)
    const series = Number(rows[0]?.series ?? 0)

    const locs: string[] = [`${SITEMAP_BASE_URL}/sitemap/static.xml`]

    if (movies > 0 || series > 0) {
      locs.push(`${SITEMAP_BASE_URL}/sitemap/priority.xml`)
    }

    const movieParts = Math.ceil(movies / SHARD_SIZE)
    for (let i = 0; i < movieParts; i++) {
      locs.push(`${SITEMAP_BASE_URL}/sitemap/movies-${i}.xml`)
    }

    const seriesParts = Math.ceil(series / SHARD_SIZE)
    for (let i = 0; i < seriesParts; i++) {
      locs.push(`${SITEMAP_BASE_URL}/sitemap/series-${i}.xml`)
    }

    return xmlSuccessResponse(sitemapindexXml(locs), INDEX_CACHE_CONTROL)
  } catch (error) {
    return xmlUnavailableResponse(error)
  }
}
