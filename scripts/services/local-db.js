/**
 * SQLite Local Database - Clean Schema
 * tmdb_id as PRIMARY KEY (no separate id column)
 */

const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const dbPath = path.join(__dirname, '../../data/4cima-local.db')

// إنشاء فولدر data لو مش موجود
const dataDir = path.join(__dirname, '../../data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
db.pragma('busy_timeout = 30000')   // 30s — safe for concurrent writes
db.pragma('synchronous = NORMAL')   // faster than FULL, still crash-safe with WAL
db.pragma('cache_size = -32000')    // 32MB page cache

// تشغيل الـ schema
const schemaPath = path.join(__dirname, '../../LOCAL-SCHEMA-CLEAN.sql')
const schema = fs.readFileSync(schemaPath, 'utf-8')
db.exec(schema)

// جولة keywords: عمود التخزين الموحّد لكلمات TMDB ([[{"id":1,"name":"..."}]]) —
// موجود في LOCAL-SCHEMA-CLEAN.sql لكن القاعدة الفعلية أقدم من إضافته (CREATE TABLE
// IF NOT EXISTS لا يعدّل جدولاً قائماً) — ترقية idempotent بنفس أسلوب synced_to_d1 أعلاه
try { db.prepare('ALTER TABLE movies    ADD COLUMN keywords_json TEXT').run() } catch {}
try { db.prepare('ALTER TABLE tv_series ADD COLUMN keywords_json TEXT').run() } catch {}

console.log('✅ Database initialized successfully!')
console.log(`📊 Database: ${dbPath}`)

module.exports = db
