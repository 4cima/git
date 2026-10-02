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

/**
 * /sitemap-index.xml — sitemap index Route Handler (raw XML).
 *
 * (قرار 4 — 2/10/2026) الفهرس بيرجع يدرج شظايا الكتالوج كاملة بعد بوابة الضعف:
 *   /sitemap/static.xml   (الصفحات الثابتة + صفحات الهبوط للتصنيفات)
 *   /sitemap/priority.xml (أفضل 3,000 فيلم + 2,000 مسلسل حسب popularity)
 *   /sitemap/movies-0..N.xml + /sitemap/series-0..M.xml (شظايا 10,000)
 *
 * الشظايا بعد إعادة بناء sitemap_urls ببوابة الضعف (vote_count<50 بلا تريلر
 * = غير مدرج) تحتوي الروابط الأهيلة فقط — ومتزامنة مع noindex صفحات التفاصيل
 * الضعيفة، فالسايت ماب كله قابل للفهرسة بلا تعارض.
 *
 * عدّ الشظايا: استعلام واحد رخيص (MAX على الفهرس — صفّان) بكاش حافة 24 ساعة
 * + كاش ذاكرة الـWorker في shardCache — لا مسح جداول ولا COUNT.
 *
 * ⚠️ بعد أي نشر يلمس هذا الملف: CI بيعمل purge_everything تلقائيًا (الكاش يوم كامل).
 *
 * Any database failure → 503 XML (never an empty or partial index with 200).
 */

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
      `${SITEMAP_BASE_URL}/sitemap/priority.xml`,
    ]
    for (let i = 0; i < movieShards; i++) locs.push(`${SITEMAP_BASE_URL}/sitemap/movies-${i}.xml`)
    for (let i = 0; i < seriesShards; i++) locs.push(`${SITEMAP_BASE_URL}/sitemap/series-${i}.xml`)

    const response = xmlSuccessResponse(sitemapindexXml(locs), INDEX_CACHE_CONTROL)
    await sitemapCachePut(request, response)
    return response
  } catch (error) {
    return xmlUnavailableResponse(error)
  }
}
