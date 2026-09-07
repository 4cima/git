import {
  SITEMAP_BASE_URL,
  SHARD_SIZE,
  INDEX_CACHE_CONTROL,
  CLEAN_ITEM_SQL,
  sitemapDetailFilterSql,
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
 * استعلاما COUNT(*) مع json_each يمسحان الجدولين كاملين (~314 ألف صف) —
 * يُدفعان مرة واحدة كل 24 ساعة لكل isolate بدل كل طلب. نتيجة القائمة
 * (12 ملفًا) لا تتغير إلا عند تجاوز عدد مجموعة B حدّ شظية جديدة.
 */
const INDEX_TTL_MS = 24 * 60 * 60 * 1000
let cachedIndex: { at: number; locs: string[] } | null = null

/**
 * /sitemap-index.xml — sitemap index Route Handler (raw XML).
 *
 * Lists ONLY shards that contain links:
 *   /sitemap/static.xml            (static + genre landing pages)
 *   /sitemap/priority.xml          (top 2000 fresh items — indexing fuel)
 *   /sitemap/movies-0.xml …N       (10000 per shard, sequential from 0)
 *   /sitemap/series-0.xml …N       (10000 per shard, sequential from 0)
 *
 * العدّ بنفس فلتر روابط التفاصيل (مجموعة B) حتى يتطابق عدد الـshards
 * مع ما تُنتجه فعليًا — لا ملفات فارغة، والـshards الزائدة القديمة 404 نظيف.
 * طبقتا كاش (كلاهما 24 ساعة): ذاكرة الـisolate أولًا، ثم Cache API (الحافة) —
 * لا COUNT حي عند وجود نتيجة كاش في أيٍّ منهما. الحساب نفسه يُدفع مرة
 * كل 24 ساعة لكل isolate.
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

    const rows = await sitemapQuery<{ movies: number; series: number }>(
      `SELECT
        (SELECT COUNT(*) FROM movies WHERE ${CLEAN_ITEM_SQL}
           AND ${sitemapDetailFilterSql('movies')}) AS movies,
        (SELECT COUNT(*) FROM tv_series WHERE ${CLEAN_ITEM_SQL}
           AND ${sitemapDetailFilterSql('tv_series')}) AS series`
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

    cachedIndex = { at: Date.now(), locs }
    const response = xmlSuccessResponse(sitemapindexXml(locs), INDEX_CACHE_CONTROL)
    await sitemapCachePut(request, response)
    return response
  } catch (error) {
    return xmlUnavailableResponse(error)
  }
}
