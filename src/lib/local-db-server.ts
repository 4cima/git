/**
 * src/lib/local-db-server.ts
 *
 * Server-only wrapper that opens better-sqlite3 directly,
 * bypassing local-db.js (which uses __dirname — broken under Turbopack).
 * Uses process.cwd() which resolves correctly in Next.js server context.
 */
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const dbPath     = path.join(process.cwd(), 'data', '4cima-local.db')
const schemaPath = path.join(process.cwd(), 'LOCAL-SCHEMA-CLEAN.sql')

const dataDir = path.dirname(dbPath)
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

const localDb = new Database(dbPath)
localDb.pragma('journal_mode = WAL')
localDb.pragma('foreign_keys = ON')

// Apply schema (CREATE TABLE IF NOT EXISTS — safe to run every time)
const schema = fs.readFileSync(schemaPath, 'utf-8')
localDb.exec(schema)

export default localDb