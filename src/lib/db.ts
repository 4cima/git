/**
 * src/lib/db.ts
 *
 * Unified D1 database client for 4cima.
 *
 * Runtime detection:
 *   1. Cloudflare Workers / OpenNext: uses getCloudflareContext().env.DB (D1 binding)
 *      Detected via: typeof caches !== 'undefined' (Workers global)
 *      Access via:   import('@opennextjs/cloudflare').getCloudflareContext()
 *   2. Local dev / Node.js: D1 HTTP API via CLOUDFLARE_D1_TOKEN in .env.local
 *
 * API:
 *   executeAll<T>(sql, args?)   → Promise<T[]>
 *   executeFirst<T>(sql, args?) → Promise<T | null>
 *
 * All errors are thrown explicitly — no silent swallowing.
 */

const ACCOUNT_ID  = '834bca43d616c73db23cf95311cfe17e';
const DATABASE_ID = 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6';
const D1_HTTP_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;

// ── Types ─────────────────────────────────────────────────────────────────────

type SqlValue = string | number | boolean | null;

// ── Runtime detection ─────────────────────────────────────────────────────────

/**
 * True when running inside Cloudflare Workers runtime.
 * `caches` is a Workers global that does not exist in Node.js.
 */
function isCloudflareRuntime(): boolean {
  return typeof caches !== 'undefined';
}

/**
 * Get the D1 binding from OpenNext Cloudflare context.
 * Only called when isCloudflareRuntime() is true.
 * Uses dynamic import() — works in Workers, not bundled at build time.
 */
async function getD1Binding(): Promise<D1Database | null> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = getCloudflareContext();
    return (ctx?.env as { DB?: D1Database })?.DB ?? null;
  } catch {
    // @opennextjs/cloudflare not available or context not set up
    return null;
  }
}

// ── D1 Binding executor ───────────────────────────────────────────────────────

async function execViaBinding<T>(
  db: D1Database,
  sql: string,
  args: SqlValue[]
): Promise<T[]> {
  const stmt   = db.prepare(sql);
  const bound  = args.length > 0 ? stmt.bind(...args) : stmt;
  const result = await bound.all<T>();
  if (result.error) {
    throw new Error(`D1 binding error: ${result.error}`);
  }
  return result.results ?? [];
}

// ── D1 HTTP API executor (local dev / Node.js fallback) ───────────────────────

async function execViaHttp<T>(sql: string, args: SqlValue[]): Promise<T[]> {
  const token = process.env.CLOUDFLARE_D1_TOKEN;
  if (!token) {
    throw new Error(
      'D1: no runtime binding found and CLOUDFLARE_D1_TOKEN is not set in .env.local. ' +
      'Set CLOUDFLARE_D1_TOKEN for local development, or deploy to Cloudflare Workers.'
    );
  }

  const body: { sql: string; params?: SqlValue[] } = { sql };
  if (args.length > 0) body.params = args;

  const res = await fetch(D1_HTTP_URL, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '(unreadable)');
    throw new Error(`D1 HTTP ${res.status} ${res.statusText}: ${text}`);
  }

  const data = await res.json() as {
    success: boolean;
    errors:  { code: number; message: string }[];
    result:  { results: T[] }[];
  };

  if (!data.success) {
    const msg = (data.errors ?? []).map(e => `[${e.code}] ${e.message}`).join(', ');
    throw new Error(`D1 HTTP query failed: ${msg || 'unknown error'}`);
  }

  return data.result?.[0]?.results ?? [];
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Execute a SQL query and return all matching rows.
 *
 * @example
 * const rows = await executeAll<{ slug: string }>(
 *   'SELECT slug FROM movies WHERE filter_status = ? LIMIT ?',
 *   ['clean', 20]
 * );
 */
export async function executeAll<T = Record<string, SqlValue>>(
  sql:  string,
  args: SqlValue[] = []
): Promise<T[]> {
  if (isCloudflareRuntime()) {
    const binding = await getD1Binding();
    if (binding) return execViaBinding<T>(binding, sql, args);
    // Workers runtime but binding missing — fail loudly
    throw new Error(
      'D1: running in Cloudflare Workers but DB binding not found. ' +
      'Check wrangler.jsonc has d1_databases with binding="DB".'
    );
  }
  // Node.js / local dev
  return execViaHttp<T>(sql, args);
}

/**
 * Execute a SQL query and return the first row, or null if no match.
 *
 * @example
 * const movie = await executeFirst<Movie>(
 *   'SELECT * FROM movies WHERE slug = ? LIMIT 1',
 *   [slug]
 * );
 * if (!movie) notFound();
 */
export async function executeFirst<T = Record<string, SqlValue>>(
  sql:  string,
  args: SqlValue[] = []
): Promise<T | null> {
  const rows = await executeAll<T>(sql, args);
  return rows[0] ?? null;
}
