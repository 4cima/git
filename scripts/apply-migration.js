import { config } from 'dotenv'
import { createClient } from '@libsql/client'
import { readFileSync } from 'fs'

config({ path: '.env.local' })

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

const migrationFile = process.argv[2]
if (!migrationFile) {
  console.error('Usage: node scripts/apply-migration.js <migration-file>')
  process.exit(1)
}

const sql = readFileSync(migrationFile, 'utf-8')

console.log(`Applying migration: ${migrationFile}`)

try {
  await db.executeMultiple(sql)
  console.log('✅ Migration applied successfully')
} catch (error) {
  console.error('❌ Migration failed:', error)
  process.exit(1)
}

process.exit(0)
