import { NextResponse } from 'next/server'
import {
  SITEMAP_BASE_URL,
  SHARD_SIZE,
  PRIORITY_PER_TYPE,
  SHARD_CACHE_CONTROL,
  CLEAN_ITEM_SQL,
  sitemapDetailFilterSql,
  sitemapQuery,
  urlset,
  urlEntry,
  xmlSuccessResponse,
  xmlUnavailableResponse,
  xmlNotFoundResponse,
  sitemapCacheMatch,
  sitemapCachePut,
} from '@/lib/sitemap'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ITEM_PRIORITY = '0.6'
const SECTION_PRIORITY = '0.8'
const GENRE_PRIORITY = '0.7'

/** Same exclusion list as src/lib/genres.ts (hidden/no-content genres). */
const EXCLUDED_GENRE_TMDB_IDS = new Set([10767, 10768, 99, 36])

/**
 * Hardcoded real pages (all verified 200 in production). No /admin, /api,
 * /login, /register, /profile, /search or any query-string URL here.
 */
const STATIC_ROUTES: { path: string; priority: string }[] = [
  { path: '/', priority: '1.0' },
  { path: '/movies', priority: SECTION_PRIORITY },
  { path: '/series', priority: SECTION_PRIORITY },
  { path: '/movies/arabic', priority: SECTION_PRIORITY },
  { path: '/series/arabic', priority: SECTION_PRIORITY },
  { path: '/genres', priority: SECTION_PRIORITY },
  { path: '/genres/arabic', priority: SECTION_PRIORITY },
  { path: '/anime', priority: SECTION_PRIORITY },
  { path: '/contact', priority: '0.5' },
  { path: '/dmca', priority: '0.3' },
  { path: '/privacy', priority: '0.3' },
  { path: '/terms', priority: '0.3' },
  { path: '/copyright', priority: '0.3' },
]

type SlugRow = { slug: string; updated_at?: string | null }

/**
 * كاش ذاكرة الـWorker (isolate) لنتائج الشظايا — 24 ساعة.
 * استعلام الشظية يمسح الفهرس ويحلّل JSON لكل صف مرشّح (حتى ~267 ألف صف
 * للشظايا الأخيرة) — يُدفع مرة كل 24 ساعة لكل isolate بدل كل طلب زحف.
 * المفتاح: "static" | "priority" | "movies:0" | "series:2" …
 * النتيجة الفارغة (شظية خارج النطاق) تُكاش أيضًا — الفهرس هو من يحدد
 * الشظايا الموجودة، ولا يُدرج شظية جديدة إلا بعد تجاوز العدد الحد.
 * فوق الذاكرة: Cache API (caches.default) بنفس المدة — الـisolates الأخرى
 * تُخدم من الحافة دون لمس D1. ترتيب الفحص: ذاكرة → حافة → D1 (miss فقط).
 */
const SHARD_TTL_MS = 24 * 60 * 60 * 1000
const shardCache = new Map<string, { at: number; urls: string[] }>()

type CachedShard = { urls: string[]; edgeResponse: Response | null }

async function cachedEntries(request: Request, key: string, build: () => Promise<string[]>): Promise<CachedShard> {
  const hit = shardCache.get(key)
  if (hit && Date.now() - hit.at < SHARD_TTL_MS) return { urls: hit.urls, edgeResponse: null }

  const edgeHit = await sitemapCacheMatch(request)
  if (edgeHit) return { urls: [], edgeResponse: edgeHit }

  const urls = await build()
  shardCache.set(key, { at: Date.now(), urls })
  return { urls, edgeResponse: null }
}

/** Static pages + every genre landing page that actually has content. */
async function buildStatic(): Promise<string[]> {
  const entries = STATIC_ROUTES.map((r) => urlEntry(`${SITEMAP_BASE_URL}${r.path}`, null, r.priority))

  const rows = await sitemapQuery<{
    slug: string
    tmdb_id: number
    movie_count: number
    series_count: number
  }>(
    `SELECT g.slug, g.tmdb_id,
            COALESCE(gc.movie_count, 0)  AS movie_count,
            COALESCE(gc.series_count, 0) AS series_count
     FROM genres g
     LEFT JOIN genre_counts gc ON gc.genre_id = g.tmdb_id`
  )

  for (const g of rows) {
    const slug = String(g.slug ?? '')
    if (!slug || EXCLUDED_GENRE_TMDB_IDS.has(Number(g.tmdb_id))) continue
    if (Number(g.movie_count) > 0) {
      entries.push(urlEntry(`${SITEMAP_BASE_URL}/movies/genres/${slug}`, null, GENRE_PRIORITY))
    }
    if (Number(g.series_count) > 0) {
      entries.push(urlEntry(`${SITEMAP_BASE_URL}/series/genres/${slug}`, null, GENRE_PRIORITY))
    }
  }

  return entries
}

/** Top 2000 items by real updated_at (DESC) — 1000 newest movies + 1000 newest series.
 *  نفس فلتر روابط التفاصيل (كل روابط التفاصيل في الخريطة = مجموعة B). */
async function buildPriority(): Promise<string[]> {
  const movies = await sitemapQuery<SlugRow>(
    `SELECT slug, updated_at FROM movies WHERE ${CLEAN_ITEM_SQL}
      AND ${sitemapDetailFilterSql('movies')}
     ORDER BY updated_at DESC LIMIT ${PRIORITY_PER_TYPE}`
  )
  const series = await sitemapQuery<SlugRow>(
    `SELECT slug, updated_at FROM tv_series WHERE ${CLEAN_ITEM_SQL}
      AND ${sitemapDetailFilterSql('tv_series')}
     ORDER BY updated_at DESC LIMIT ${PRIORITY_PER_TYPE}`
  )
  return [
    ...movies.map((r) => urlEntry(`${SITEMAP_BASE_URL}/movies/${r.slug}`, r.updated_at, ITEM_PRIORITY)),
    ...series.map((r) => urlEntry(`${SITEMAP_BASE_URL}/series/${r.slug}`, r.updated_at, ITEM_PRIORITY)),
  ]
}

/** Catalog shard: page*10000 → (page+1)*10000, stable order by tmdb_id.
 *  فلتر روابط التفاصيل (مجموعة B) — لا يمس استعلامات صفحات الموقع. */
async function buildCatalog(
  type: 'movies' | 'series',
  page: number
): Promise<string[]> {
  const table = type === 'movies' ? 'movies' : 'tv_series'
  const prefix = type === 'movies' ? '/movies/' : '/series/'
  const rows = await sitemapQuery<SlugRow>(
    `SELECT slug, updated_at FROM ${table} WHERE ${CLEAN_ITEM_SQL}
      AND ${sitemapDetailFilterSql(table)}
     ORDER BY tmdb_id ASC LIMIT ${SHARD_SIZE} OFFSET ?`,
    [page * SHARD_SIZE]
  )
  return rows.map((r) => urlEntry(`${SITEMAP_BASE_URL}${prefix}${r.slug}`, r.updated_at, ITEM_PRIORITY))
}

/** Old numbered shards (0.xml…24.xml, 1000.xml…1007.xml) → permanent 301. */
function legacyRedirect(destination: string): Response {
  const res = NextResponse.redirect(`${SITEMAP_BASE_URL}${destination}`, 301)
  res.headers.set('Cache-Control', 'public, max-age=86400')
  return res
}

export async function GET(request: Request, { params }: { params: Promise<{ shard: string }> }) {
  const shard = (await params).shard.toLowerCase()

  // Legacy numbered shards from the old generateSitemaps scheme.
  const legacy = shard.match(/^(\d+)\.xml$/)
  if (legacy) {
    const n = parseInt(legacy[1], 10)
    if (n >= 1000 && n < 2000) return legacyRedirect(`/sitemap/series-${n - 1000}.xml`)
    if (n >= 0 && n < 1000) return legacyRedirect(`/sitemap/movies-${n}.xml`)
    return xmlNotFoundResponse('unknown legacy sitemap shard')
  }

  try {
    if (shard === 'static.xml') {
      const { urls, edgeResponse } = await cachedEntries(request, 'static', buildStatic)
      if (edgeResponse) return edgeResponse
      const response = xmlSuccessResponse(urlset(urls), SHARD_CACHE_CONTROL)
      await sitemapCachePut(request, response)
      return response
    }

    if (shard === 'priority.xml') {
      const { urls, edgeResponse } = await cachedEntries(request, 'priority', buildPriority)
      if (edgeResponse) return edgeResponse
      if (urls.length === 0) return xmlNotFoundResponse('no priority urls') /* 404 يُكاش في الحافة (max-age=86400) */
      const response = xmlSuccessResponse(urlset(urls), SHARD_CACHE_CONTROL)
      await sitemapCachePut(request, response)
      return response
    }

    const moviesShard = shard.match(/^movies-(\d+)\.xml$/)
    if (moviesShard) {
      const page = parseInt(moviesShard[1], 10)
      const { urls, edgeResponse } = await cachedEntries(request, `movies:${page}`, () => buildCatalog('movies', page))
      if (edgeResponse) return edgeResponse
      if (urls.length === 0) return xmlNotFoundResponse(`movies shard ${page} out of range`) /* 404 يُكاش أيضًا */
      const response = xmlSuccessResponse(urlset(urls), SHARD_CACHE_CONTROL)
      await sitemapCachePut(request, response)
      return response
    }

    const seriesShard = shard.match(/^series-(\d+)\.xml$/)
    if (seriesShard) {
      const page = parseInt(seriesShard[1], 10)
      const { urls, edgeResponse } = await cachedEntries(request, `series:${page}`, () => buildCatalog('series', page))
      if (edgeResponse) return edgeResponse
      if (urls.length === 0) return xmlNotFoundResponse(`series shard ${page} out of range`) /* 404 يُكاش أيضًا */
      const response = xmlSuccessResponse(urlset(urls), SHARD_CACHE_CONTROL)
      await sitemapCachePut(request, response)
      return response
    }

    return xmlNotFoundResponse('unknown sitemap shard')
  } catch (error) {
    return xmlUnavailableResponse(error)
  }
}
