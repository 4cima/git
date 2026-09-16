import {
  SITEMAP_BASE_URL,
  INDEX_CACHE_CONTROL,
  sitemapQuery,
  sitemapindexXml,
  xmlSuccessResponse,
  xmlUnavailableResponse,
  sitemapCacheMatch,
  sitemapCachePut,
} from '@/lib/sitemap'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * كاش ذاكرة الـWorker (isolate) لقائمة الشظايا — 24 ساعة.
 * العدّ الآن MAX(shard) على جدول sitemap_urls (فهرس مغطٍّ): كل استعلام فرعي
 * يقرأ صفًا واحدًا تقريبًا (~2 صفوف للإجمالي) بدل COUNT(*) الذي كان يمسح
 * movies/tv_series كاملًا (345,153 صفًا مقروءًا). يُدفع مرة كل 24 ساعة لكل
 * isolate على أي حال. عدد الشظايا = MAX(shard)+1 (الشظايا متّصلة من 0).
 */
const INDEX_TTL_MS = 24 * 60 * 60 * 1000
let cachedIndex: { at: number; locs: string[] } | null = null

/** MAX(shard)+1 من D1، مع تحويل NULL (جدول فارغ) إلى 0. */
function shardCount(value: unknown): number {
  const n = Number(value ?? 0)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

/**
 * /sitemap-index.xml — sitemap index Route Handler (raw XML).
 *
 * Lists ONLY shards that contain links:
 *   /sitemap/static.xml            (static + genre landing pages)
 *   /sitemap/priority.xml          (top 2000 fresh items — indexing fuel)
 *   /sitemap/movies-0.xml …N       (10000 per shard, sequential from 0)
 *   /sitemap/series-0.xml …N       (10000 per shard, sequential from 0)
 *
 * العدّ من جدول sitemap_urls (نفس مصدر الروابط — لا انحراف ممكن): عدد الشظايا
 * = MAX(shard)+1، فلا ملفات فارغة ولا shards زائدة (404 نظيف للقديم).
 * ⚠️ يتطلب أن يكون sitemap_urls مبنيًا (scripts/build-sitemap-urls.js) — بدونه
 * الاستعلام يفشل ⇒ 503 (بلا بيانات وهمية)، لذا يُبنى الجدول قبل نشر هذا الكود.
 * طبقتا كاش (كلاهما 24 ساعة): ذاكرة الـisolate أولًا، ثم Cache API (الحافة) —
 * لا استعلام حي عند وجود نتيجة كاش في أيٍّ منهما.
 *
 * Any database failure → 503 XML (never an empty or partial index with 200).
 */
export async function GET(request: Request) {
  try {
    if (cachedIndex && Date.now() - cachedIndex.at < INDEX_TTL_MS) {
      return xmlSuccessResponse(sitemapindexXml(cachedIndex.locs), INDEX_CACHE_CONTROL)
    }

    /* miss من الذاكرة → جرب كاش الحافة قبل أي استعلام */
    const edgeHit = await sitemapCacheMatch(request)
    if (edgeHit) return edgeHit

    const rows = await sitemapQuery<{ movie_shards: number | null; series_shards: number | null }>(
      `SELECT
        (SELECT MAX(shard) + 1 FROM sitemap_urls WHERE media_type = 'movie')  AS movie_shards,
        (SELECT MAX(shard) + 1 FROM sitemap_urls WHERE media_type = 'series') AS series_shards`
    )

    const movieParts = shardCount(rows[0]?.movie_shards)
    const seriesParts = shardCount(rows[0]?.series_shards)

    const locs: string[] = [`${SITEMAP_BASE_URL}/sitemap/static.xml`]

    if (movieParts > 0 || seriesParts > 0) {
      locs.push(`${SITEMAP_BASE_URL}/sitemap/priority.xml`)
    }

    for (let i = 0; i < movieParts; i++) {
      locs.push(`${SITEMAP_BASE_URL}/sitemap/movies-${i}.xml`)
    }

    for (let i = 0; i < seriesParts; i++) {
      locs.push(`${SITEMAP_BASE_URL}/sitemap/series-${i}.xml`)
    }

    cachedIndex = { at: Date.now(), locs }
    const response = xmlSuccessResponse(sitemapindexXml(locs), INDEX_CACHE_CONTROL)
    await sitemapCachePut(request, response)
    return response
  } catch (error) {
    return xmlUnavailableResponse(error)
  }
}
