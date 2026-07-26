// Initialize Turso Database with Schema
import { createClient } from '@libsql/client/web'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL || 'libsql://cinma-db-iaaelsadek.aws-eu-west-1.turso.io'
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY5MjI0NTIsImlkIjoiMDE5ZGE5N2YtY2QwMS03OTcwLTljYWItZDc2MDZmMzU3NGI1IiwicmlkIjoiYWE2ZjIzZWUtNDUwOS00ZjEyLWI3YzEtZWU4YjFmYTYyZmExIn0.-Ma3bNkYebX8vxLSYY-oVAU4K9KZAFj6DT7Pho_B1X_nVyC-RxfiJ-cGUeTp5S7mZF2OfqC1hcCrX_fnf3J-Dw'

async function initDatabase() {
  console.log('🔄 Connecting to Turso database...')
  
  const db = createClient({
    url: TURSO_DATABASE_URL,
    authToken: TURSO_AUTH_TOKEN,
  })
  
  try {
    // Read schema file
    const schemaPath = join(__dirname, 'schema.sql')
    const schema = readFileSync(schemaPath, 'utf-8')
    
    console.log('📝 Executing schema...')
    
    // Split by semicolons and execute each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    for (const statement of statements) {
      try {
        await db.execute(statement)
        console.log('✅', statement.substring(0, 50) + '...')
      } catch (error: any) {
        if (!error.message.includes('already exists')) {
          console.error('❌ Error:', error.message)
        }
      }
    }
    
    console.log('\n✅ Database schema initialized successfully!')
    
    // Test query
    console.log('\n🔍 Testing database connection...')
    const result = await db.execute("SELECT name FROM sqlite_master WHERE type='table'")
    console.log('📊 Tables found:', result.rows.length)
    result.rows.forEach((row: any) => console.log('  -', row.name))
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    process.exit(1)
  }
}

initDatabase()
