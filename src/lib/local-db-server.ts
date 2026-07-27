/**
 * src/lib/local-db-server.ts
 *
 * Server-only wrapper for better-sqlite3.
 * Returns null when local.db is not present (e.g. on Koyeb/production)
 * so API routes degrade gracefully instead of crashing.
 *
 * local.db only exists on the developer machine — it is the ingestion
 * staging database, excluded from git and from Koyeb intentionally.
 */
import path from 'path'
import fs   from 'fs'

const dbPath     = path.join(process.cwd(), 'data', '4cima-local.db')
const schemaPath = path.join(process.cwd(), 'LOCAL-SCHEMA-CLEAN.sql')

// Returns null when local.db absent — callers must guard with: if (localDb)
let localDb: import('better-sqlite3').Database | null = null

if (fs.existsSync(dbPath) && fs.existsSync(schemaPath)) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3')
  const db = new Database(dbPath) as import('better-sqlite3').Database
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 30000')
  db.pragma('synchronous = NORMAL')
  db.pragma('cache_size = -32000')
  const schema = fs.readFileSync(schemaPath, 'utf-8')
  db.exec(schema)
  localDb = db
}

export default localDb