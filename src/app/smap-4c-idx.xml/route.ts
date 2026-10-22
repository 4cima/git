/**
 * /smap-4c-idx.xml — sitemap index Route Handler (raw XML) — المرحلة 2 بند 4.
 *
 * الاسم متعمّدًا غير قياسي ("smap-4c-idx") — لا يُعلن في robots.txt ولا يُقدَّم
 * عند /sitemap-index.xml أو /sitemap.xml (حُذفا؛ يرجعان 404) — مخفي عن ماسحات
 * البصمة الأجنبية، والوصول إليه فقط بمعرفة المسار.
 *
 * الفهرس يدرج شظايا الكتالوج كاملة بعد بوابة الجودة المشدّدة:
 *   /sitemap/static.xml   (الصفحات الثابتة + صفحات الهبوط للتصنيفات)
 *   /sitemap/priority.xml (أفضل 3,000 فيلم + 2,000 مسلسل حسب popularity)
 *   /sitemap/movies-0..N.xml + /sitemap/series-0..M.xml (شظايا 10,000)
 *
 * الشظايا بعد إعادة بناء sitemap_urls (vote_count >= 150 + تريلر + قصة عربية
 * = المدرج فقط) تحتوي الروابط الأهيلة فقط.
 *
 * Any database failure → 503 XML (never an empty or partial index with 200).
 */

import {
  SITEMAP_BASE_URL,
  INDEX_CACHE_CONTROL,
  sitemapindexXml,
  xmlSuccessResponse,
  xmlUnavailableResponse,
  sitemapCacheMatch,
  sitemapCachePut,
  sitemapQuery,
} from '@/lib/sitemap'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SHARD_COUNTS_SQL =
  `SELECT (SELECT MAX(shard) + 1 FROM sitemap_urls WHERE media_type = 'movie')  AS movie_shards, ` +
  `(SELECT MAX(shard) + 1 FROM sitemap_urls WHERE media_type = 'series') AS series_shards`

type ShardCounts = { movie_shards?: number | null; series_shards?: number | null }

export async function GET(request: Request) {
  try {
    /* كاش الحافة أولاً */
    const edgeHit = await sitemapCacheMatch(request)
    if (edgeHit) return edgeHit

    const rows = await sitemapQuery<ShardCounts>(SHARD_COUNTS_SQL)
    const movieShards = Math.max(0, Number(rows[0]?.movie_shards) || 0)
    const seriesShards = Math.max(0, Number(rows[0]?.series_shards) || 0)

    const locs: string[] = [
      `${SITEMAP_BASE_URL}/sitemap/static.xml`,
    ]

    // أضف priority.xml فقط إذا كانت هناك روابط أولوية مؤهلة (تطابق منطق buildPriority)
    const priorityCheck = await sitemapQuery<{ c: number }>(`
      SELECT COUNT(*) c FROM (
        SELECT 1 FROM movies WHERE filter_status = 'clean' AND release_year >= 2000
          AND slug IS NOT NULL AND slug != '' AND LENGTH(slug) > 1
          AND slug NOT LIKE '-%' AND slug NOT LIKE '%-' AND slug NOT LIKE '%--%' LIMIT 1
        UNION ALL
        SELECT 1 FROM tv_series WHERE filter_status = 'clean' AND first_air_year >= 2000
          AND slug IS NOT NULL AND slug != '' AND LENGTH(slug) > 1
          AND slug NOT LIKE '-%' AND slug NOT LIKE '%-' AND slug NOT LIKE '%--%' LIMIT 1
      )
    `)
    const hasPriority = Number(priorityCheck[0]?.c || 0) > 0
    if (hasPriority) {
      locs.push(`${SITEMAP_BASE_URL}/sitemap/priority.xml`)
    }

    for (let i = 0; i < movieShards; i++) locs.push(`${SITEMAP_BASE_URL}/sitemap/movies-${i}.xml`)
    for (let i = 0; i < seriesShards; i++) locs.push(`${SITEMAP_BASE_URL}/sitemap/series-${i}.xml`)

    const response = xmlSuccessResponse(sitemapindexXml(locs), INDEX_CACHE_CONTROL)
    await sitemapCachePut(request, response)
    return response
  } catch (error) {
    return xmlUnavailableResponse(error)
  }
}