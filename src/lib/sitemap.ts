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

type SqlValue = string | number | boolean | null;

export const SITEMAP_BASE_URL = 'https://4cima.com';
export const SHARD_SIZE = 10000;
export const PRIORITY_PER_TYPE = 1000;

/** Index cache: rebuilt often, tiny. Shards cache: big, stable. */
export const INDEX_CACHE_CONTROL = 'public, s-maxage=600, stale-while-revalidate=3600';
export const SHARD_CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=86400';

/** Shared "indexable catalog item" predicate (mirrors the listing queries). */
export const CLEAN_ITEM_SQL =
  "filter_status = 'clean' AND slug IS NOT NULL AND slug != '' AND tmdb_id IS NOT NULL";

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

