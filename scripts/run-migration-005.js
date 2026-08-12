require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@libsql/client')
const fs = require('fs')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function runMigration() {
  try {
    console.log('📦 Running migration 005...')
    
    const sql = fs.readFileSync('migrations/005_create_user_settings_tables.sql', 'utf8')
    
    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)
    
    for (const statement of statements) {
      console.log('Executing:', statement.substring(0, 60) + '...')
      await turso.execute(statement)
    }
    
    console.log('✅ Migration 005 completed successfully!')
    
    // Verify tables
    const result = await turso.execute(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name IN ('user_privacy_settings', 'user_notification_settings')
    `)
    
    console.log('✅ Created tables:', result.rows.map(r => r.name).join(', '))
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

runMigration()
