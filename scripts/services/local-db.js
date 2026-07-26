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

// تشغيل الـ schema
const schemaPath = path.join(__dirname, '../../LOCAL-SCHEMA-CLEAN.sql')
const schema = fs.readFileSync(schemaPath, 'utf-8')
db.exec(schema)

console.log('✅ Database initialized successfully!')
console.log(`📊 Database: ${dbPath}`)

module.exports = db
console.log('✅ Database initialized successfully!')
console.log(`📊 Database: ${dbPath}`)

module.exports = db
