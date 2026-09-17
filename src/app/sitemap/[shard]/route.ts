import { NextResponse } from 'next/server'
import {
  SITEMAP_BASE_URL,
  SHARD_SIZE,
  PRIORITY_MOVIE_COUNT,
  PRIORITY_SERIES_COUNT,
  PRIORITY_MIN_YEAR,
  SHARD_CACHE_CONTROL,
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

/*
 * روابط التفاصيل (شظايا الأفلام/المسلسلات والأولوية) تُقرأ من جدول
 * sitemap_urls المُبنى مسبقًا بـ scripts/build-sitemap-urls.js:
 *   shard    → بحث نطاقي مغطّى (media_type, shard) ⇒ 10,000 صفًا مقروءًا
 *   priority → فهرس مغطٍّ (media_type, updated_at DESC) ⇒ 1,000 صفًا
 * بدل مسح movies/tv_series كاملًا لكل شظية (332,090 / 100,236 صفًا).
 * ⚠️ الجدول مطلوب قبل نشر هذا الكود — بدونه تُرجع المسارات 503 (لا بيانات وهمية).
 */

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
  { path: '/movies/lang/ar', priority: SECTION_PRIORITY },
  { path: '/series/lang/ar', priority: SECTION_PRIORITY },
  { path: '/genres', priority: SECTION_PRIORITY },
  { path: '/genres/arabic', priority: SECTION_PRIORITY },
  { path: '/contact', priority: '0.5' },
  { path: '/dmca', priority: '0.3' },
  { path: '/privacy', priority: '0.3' },
  { path: '/terms', priority: '0.3' },
  { path: '/copyright', priority: '0.3' },
]

type SlugRow = { slug: string; updated_at?: string | null }

/**
 * كاش ذاكرة الـWorker (isolate) لنتائج الشظايا — 24 ساعة.
 * بعد جدول sitemap_urls أصبح بناء الشظية بحثًا نطاقيًا مغطّى (10,000 صف مقروء
 * و~50ms محليًا) بدل مسح movies/tv_series وتفكيك genres_json لكل شظية.
 * الكاش يبقى مفيدًا: نتيجة الشظية ثابتة 24 ساعة (الجدول يُبنى دفعة واحدة).
 * المفتاح: "static" | "priority" | "movies:0" | "series:2" …
 * النتيجة الفارغة (شظية خارج النطاق) تُكاش أيضًا — الفهرس هو من يحدد
 * الشظايا الموجودة، ولا يُدرج شظية جديدة إلا بعد إعادة بناء الجدول.
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

/**
 * المرحلة 3 — أفضل 3,000 فيلم + 2,000 مسلسل حسب popularity، مستعلمة مباشرة
 * من movies/tv_series (بدون sitemap_urls) ⇒ روابط فريدة من قمة الفهرس الشعبي.
 * قد تتداخل مع شظايا movies-N/series-N عن قصد — الهدف منحها أولوية زحف.
 * الفلتر: filter_status='clean' + سنة ≥ 2000 + slug نظيف (قواعد
 * scripts/rebuild-sitemap-quality.js — بلا slugs تبدأ/تنتهي بـ'-' أو رقمية فقط).
 * LIMIT يقلع من idx_movies_popularity / idx_tv_popularity (popularity DESC)
 * ⇒ قراءة محدودة، والكاش (ذاكرة 24h + Cache API) يجعل الدفع مرة كل 24 ساعة.
 */
async function buildPriority(): Promise<string[]> {
  const out: string[] = []
  const slugQuality =
    `slug IS NOT NULL AND slug != '' AND LENGTH(slug) > 1 ` +
    `AND slug NOT LIKE '-%' AND slug NOT LIKE '%-' AND slug NOT LIKE '%--%' ` +
    `AND slug GLOB '*[^0-9]*'`
  const sources = [
    { table: 'movies', yearCol: 'release_year', limit: PRIORITY_MOVIE_COUNT, prefix: '/movies/' },
    { table: 'tv_series', yearCol: 'first_air_year', limit: PRIORITY_SERIES_COUNT, prefix: '/series/' },
  ] as const
  for (const s of sources) {
    const rows = await sitemapQuery<SlugRow>(
      `SELECT slug, updated_at FROM ${s.table}
        WHERE filter_status = 'clean' AND tmdb_id IS NOT NULL
          AND ${s.yearCol} >= ${PRIORITY_MIN_YEAR}
          AND ${slugQuality}
       ORDER BY popularity DESC
        LIMIT ${s.limit}`
    )
    out.push(
      ...rows.map((r) => urlEntry(`${SITEMAP_BASE_URL}${s.prefix}${r.slug}`, r.updated_at, ITEM_PRIORITY))
    )
  }
  return out
}

/**
 * Catalog shard: shard*10000 → (shard+1)*10000 في جدول sitemap_urls المُبنى مسبقًا.
 *
 * idx_sitemap_shard (media_type, shard, seq, slug, updated_at) فهرس مغطٍّ:
 * البحث (media_type, shard) يخرج مرتّبًا بـ seq ⇒ rows_read = 10,000 بالضبط
 * (بدل مسح الجدول: 332,090 للأفلام و100,236 للمسلسلات). ترتيب seq =
 * نفس ترتيب tmdb_id ASC القديم (مثبّت في scripts/build-sitemap-urls.js).
 */
async function buildCatalog(
  type: 'movies' | 'series',
  page: number
): Promise<string[]> {
  const mediaType = type === 'movies' ? 'movie' : 'series'
  const prefix = type === 'movies' ? '/movies/' : '/series/'
  const rows = await sitemapQuery<SlugRow>(
    `SELECT slug, updated_at FROM sitemap_urls
      WHERE media_type = ? AND shard = ?
     ORDER BY seq LIMIT ${SHARD_SIZE}`,
    [mediaType, page]
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
