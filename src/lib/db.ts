/**
 * src/lib/db.ts
 *
 * Unified database client for 4cima.
 *
 * Runtime detection:
 *   1. Cloudflare Workers / OpenNext: uses getCloudflareContext().env.DB (D1 binding)
 *      Detected via: typeof caches !== 'undefined' (Workers global)
 *   2. Local dev / Node.js: uses better-sqlite3 on data/4cima-local.db
 *
 * API:
 *   executeAll<T>(sql, args?)   → Promise<T[]>
 *   executeFirst<T>(sql, args?) → Promise<T | null>
 *
 * All errors are thrown explicitly — no silent swallowing.
 */

const ACCOUNT_ID  = '834bca43d616c73db23cf95311cfe17e';
const DATABASE_ID = 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6';

// ── Types ─────────────────────────────────────────────────────────────────────

type SqlValue = string | number | boolean | null;

// D1Database is a Cloudflare Workers runtime type — not available in Node.js types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type D1Binding = any;

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
 */
async function getD1Binding(): Promise<D1Binding | null> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = getCloudflareContext();
    return (ctx?.env as { DB?: D1Binding })?.DB ?? null;
  } catch {
    return null;
  }
}

// ── D1 Binding executor (Workers runtime) ─────────────────────────────────────

async function execViaBinding<T>(
  db: D1Binding,
  sql: string,
  args: SqlValue[]
): Promise<T[]> {
  const stmt   = db.prepare(sql);
  const bound  = args.length > 0 ? stmt.bind(...args) : stmt;
  const result = await bound.all();
  if (result.error) {
    throw new Error(`D1 binding error: ${result.error}`);
  }
  return (result.results ?? []) as T[];
}

// ── Local SQLite executor (Node.js dev) ───────────────────────────────────────

let localDb: any = null;

async function execViaLocalFile<T>(sql: string, args: SqlValue[]): Promise<T[]> {
  if (!localDb) {
    const Database = require('better-sqlite3');
    const path = require('path');
    const dbPath = path.resolve(process.cwd(), 'data/4cima-local.db');
    localDb = new Database(dbPath, { readonly: false });
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
    throw new Error(
      'D1: running in Cloudflare Workers but DB binding not found. ' +
      'Check wrangler.jsonc has d1_databases with binding="DB".'
    );
  }
  // Node.js / local dev - use local SQLite file
  return execViaLocalFile<T>(sql, args);
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
