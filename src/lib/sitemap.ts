/**
 * src/lib/sitemap.ts
 *
 * Shared plumbing for sitemap Route Handlers (all sitemaps are raw XML route
 * handlers — never page.tsx, never Next metadata routes).
 *
 * Design contract:
 *   - Every DB failure THROWS. Route handlers convert it into a 503 XML response.
 *     An empty <urlset> with 200 is never acceptable.
 *   - No caching of failures. Handlers are force-dynamic; only success responses
 *     carry public Cache-Control so a CDN may cache them.
 *
 * DB resolution order (sitemapQuery):
 *   1. D1 binding via @opennextjs/cloudflare getCloudflareContext()
 *      (sync first, then { async: true } — covers request, build and
 *      ISR/background-regeneration execution contexts)
 *   2. D1 HTTP API using CLOUDFLARE_D1_TOKEN (Worker secret / .env.local)
 *   3. throws — never fabricates data
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { EXCLUDED_GENRE_IDS_LIST } from '@/utils/excludedGenres';

type SqlValue = string | number | boolean | null;

export const SITEMAP_BASE_URL = 'https://4cima.com';
export const SHARD_SIZE = 10000;
export const PRIORITY_PER_TYPE = 1000;

/**
 * المرحلة 3 — priority.xml يستعلم movies/tv_series مباشرة (بدون sitemap_urls):
 * أفضل 3,000 فيلم + 2,000 مسلسل حسب popularity، بشرط filter_status='clean'
 * + سنة ≥ 2000 + slug نظيف (نفس قواعد scripts/rebuild-sitemap-quality.js).
 */
export const PRIORITY_MOVIE_COUNT = 3000;
export const PRIORITY_SERIES_COUNT = 2000;
export const PRIORITY_MIN_YEAR = 2000;

/** Index cache: rebuilt often, tiny. Shards cache: big, stable. */
/* كاش الحافة: قائمة الشظايا (العدّ) لا تتغير كل 10 دقائق — يوم كامل.
   الأثر الفعلي على D1 يأتي من كاش ذاكرة الـWorker في مساري الفهرس والشظايا. */
export const INDEX_CACHE_CONTROL = 'public, s-maxage=86400, stale-while-revalidate=86400';
export const SHARD_CACHE_CONTROL = 'public, s-maxage=86400, stale-while-revalidate=86400';

/** مدة كاش ذاكرة الـWorker لنتائج السايت ماب (فهرس + شظايا) — 24 ساعة. */
export const SITEMAP_MEM_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** مدة كاش الـCache API (caches.default) لنتائج السايت ماب — 24 ساعة. */
export const SITEMAP_CACHE_TTL_S = 86400;

// ── Cache API فوق كاش ذاكرة الـWorker ────────────────────────────────────────
// caches.default يخزّن النتيجة على حافة Cloudflare — الطلبات من isolates
// مختلفة (وأعادات تشغيل الـWorker) تُخدم من الحافة دون لمس D1.
// الذاكرة أسرع فتُفحص أولًا؛ Cache API ثانيًا؛ D1 أخيرًا (miss فقط).
// الكاش هنا تسريع فقط: أي فشل فيه لا يفشل المسار (الرد يُحسب عاديًا).

export async function sitemapCacheMatch(request: Request): Promise<Response | null> {
  if (typeof caches === 'undefined') return null;
  /* caches.default خاص بعمال Cloudflare (غير موجود في أنواع DOM القياسية) */
  const edgeCache = (caches as any)?.default as Cache | undefined;
  if (!edgeCache) return null;
  try {
    const hit = await edgeCache.match(request);
    return hit ?? null;
  } catch {
    return null;
  }
}

export async function sitemapCachePut(request: Request, response: Response): Promise<void> {
  if (typeof caches === 'undefined') return;
  const edgeCache = (caches as any)?.default as Cache | undefined;
  if (!edgeCache) return;
  try {
    await edgeCache.put(request, response.clone());
  } catch {
    /* تجاهل — كاش الحافة تسريع فقط، ليست مصدر الحقيقة */
  }
}

/** Shared "indexable catalog item" predicate (mirrors the listing queries). */
export const CLEAN_ITEM_SQL =
  "filter_status = 'clean' AND slug IS NOT NULL AND slug != '' AND tmdb_id IS NOT NULL";

// ── Detail-link filter (sitemap only — لا يمس استعلامات صفحات الموقع) ────────
//
// الشمول الكامل 100% (تعديل 2026-10-17 — قرار إسلام: إلغاء بوابة الاستبعاد):
// روابط التفاصيل في الخريطة = كل صف معتمد (clean — نفس بوابة الصفحات) بلا أي
// شرط على vote_count أو trailer_key أو overview_ar — مطابقة 1:1 مع الصفحات
// المفهرسة (index,follow).
//
// - حارس السنة (2000): الجدول المجمّع بُني ببوابة (clean/reviewed + سنة >= 2000 + tmdb)
//   وهي أضيق من شرط السايت ماب، فالصفوف داخلها تُفحص بـprobe على PK (رخيص)
//   والأقدم من 2000 تُفحص بـjson_each (الفرع الثالث) لتبقى الدلالات مطابقة
//   حرفيًا لـjson_each الخالص.
//   ⚠️ أي تعديل مستقبلي على بوابات build-genre-index.js يستلزم مراجعة الحارس هنا.
// - NULL مسموح (8210 مسلسل نظيف بلا genres_json كانوا سيُستبعدون خطأً بنمط NOT LIKE).
// - لا توجد أي عتبة أصوات/سنة إضافية (أُلغيت 2026-10-17 — شمول 100%).
//
// ── بوابة الجودة (المرحلة 2 بند 4) — مُلغاة 2026-10-17: SITEMAP_THIN_GATE_SQL
// فارغة وكل الصفحات index,follow — التفاصيل محفوظة في سجل القرارات فقط.
/* المرحلة 2 بند 4 (ملغاة 2026-10-17 — شمول 100%): بوابة الجودة أُلغيت —
   كل صف معتمد يدخل sitemap_urls. الثابتان محفوظان للتوافق فقط. */
export const SITEMAP_THIN_MAX_VOTES = 0;
export const SITEMAP_THIN_GATE_SQL = '';

/** فلتر روابط التفاصيل في السايت ماب لجدول محدد (عمود السنة يختلف بين الجدولين). */
export function sitemapDetailFilterSql(table: 'movies' | 'tv_series'): string {
  const yearColumn = table === 'movies' ? 'release_year' : 'first_air_year';
  const excludedIds = EXCLUDED_GENRE_IDS_LIST.join(', ');
  const excludedTable = table === 'movies' ? 'excluded_genre_movie_ids' : 'excluded_genre_series_ids';
  return (
    `(genres_json IS NULL ` +
    `OR (${yearColumn} >= 2000 AND NOT EXISTS (SELECT 1 FROM ${excludedTable} eg WHERE eg.tmdb_id = ${table}.tmdb_id)) ` +
    `OR NOT EXISTS (SELECT 1 FROM json_each(${table}.genres_json) ` +
    `WHERE json_extract(value, '$.tmdb_id') IN (${excludedIds}))) ` +
    `AND ${yearColumn} IS NOT NULL`
  );
}

// ── DB access ────────────────────────────────────────────────────────────────

const ACCOUNT_ID = '834bca43d616c73db23cf95311cfe17e';
const DATABASE_ID = 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6';
const D1_HTTP_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;

async function getD1Binding(): Promise<any | null> {
  // 1) sync context (normal request handling on the Worker)
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = (getCloudflareContext as () => any)();
    const db = ctx?.env?.DB;
    if (db) return db;
  } catch {
    /* context not initialized in this execution context */
  }
  // 2) async context (build / background regeneration)
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await (getCloudflareContext as (opts: unknown) => Promise<any>)({ async: true });
    const db = ctx?.env?.DB;
    if (db) return db;
  } catch {
    /* not available */
  }
  return null;
}

async function execViaBinding<T>(db: any, sql: string, args: SqlValue[]): Promise<T[]> {
  const stmt = db.prepare(sql);
  const bound = args.length > 0 ? stmt.bind(...args) : stmt;
  const result = await bound.all();
  if (result.error) throw new Error(`D1 binding error: ${result.error}`);
  return (result.results ?? []) as T[];
}

async function execViaHttp<T>(sql: string, args: SqlValue[]): Promise<T[]> {
  const token = process.env.CLOUDFLARE_D1_TOKEN;
  if (!token) {
    throw new Error('D1: no runtime binding and CLOUDFLARE_D1_TOKEN is not set');
  }
  const body: { sql: string; params?: SqlValue[] } = { sql };
  if (args.length > 0) body.params = args;

  const res = await fetch(D1_HTTP_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '(unreadable)');
    throw new Error(`D1 HTTP ${res.status} ${res.statusText}: ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    success: boolean;
    errors?: { code: number; message: string }[];
    result?: { results: T[] }[];
  };
  if (!data.success) {
    const msg = (data.errors ?? []).map((e) => e.message).join(', ') || 'unknown error';
    throw new Error(`D1 HTTP query failed: ${msg}`);
  }
  return data.result?.[0]?.results ?? [];
}

export async function sitemapQuery<T = Record<string, unknown>>(
  sql: string,
  args: SqlValue[] = []
): Promise<T[]> {
  if (typeof caches !== 'undefined') {
    const db = await getD1Binding();
    if (db) return execViaBinding<T>(db, sql, args);
  }
  return execViaHttp<T>(sql, args);
}

// ── XML helpers ──────────────────────────────────────────────────────────────

export function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * D1 timestamps are 'YYYY-MM-DD HH:MM:SS' (UTC) → ISO-8601 (W3C sitemap format).
 * Returns null for missing/invalid values so <lastmod> is simply omitted.
 */
export function toIsoLastmod(value: unknown): string | null {
  if (value == null || value === '') return null;
  const s = String(value).trim().replace(' ', 'T');
  const withZone = /Z$|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s}Z`;
  const d = new Date(withZone);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/** One <url> element — absolute https loc, real lastmod, no changefreq. */
export function urlEntry(loc: string, lastmod: unknown, priority: string): string {
  const lm = toIsoLastmod(lastmod);
  return `<url><loc>${escapeXml(loc)}</loc>${lm ? `<lastmod>${lm}</lastmod>` : ''}<priority>${priority}</priority></url>`;
}

export function urlset(entries: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries
    .map((e) => `  ${e}`)
    .join('\n')}\n</urlset>\n`;
}

export function sitemapindexXml(locs: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${locs
    .map((loc) => `  <sitemap><loc>${escapeXml(loc)}</loc></sitemap>`)
    .join('\n')}\n</sitemapindex>\n`;
}

// ── Response helpers (import NextResponse in the route files) ───────────────

export const XML_HEADERS: Record<string, string> = {
  'Content-Type': 'application/xml; charset=utf-8',
  // Explicit: sitemaps are plain XML, never RSC-negotiated documents.
  'Vary': 'Accept-Encoding',
};

export function xmlSuccessResponse(xml: string, cacheControl: string) {
  return new Response(xml, {
    status: 200,
    headers: { ...XML_HEADERS, 'Cache-Control': cacheControl },
  });
}

/** DB/query failure → 503. Never an empty <urlset>, never a 200. */
export function xmlUnavailableResponse(error: unknown): Response {
  console.error('[sitemap] database/query failure:', error);
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<!-- sitemap temporarily unavailable: upstream database error -->\n`,
    {
      status: 503,
      headers: { ...XML_HEADERS, 'Cache-Control': 'no-store, max-age=0' },
    }
  );
}

/** Unknown/legacy shard with no replacement → clean 404, cacheable. */
export function xmlNotFoundResponse(reason: string): Response {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<!-- ${escapeXml(reason)} -->\n`, {
    status: 404,
    headers: { ...XML_HEADERS, 'Cache-Control': 'public, max-age=86400' },
  });
}

