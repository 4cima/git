// Add missing tables to Turso Database
import { createClient } from '@libsql/client/web'

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL || 'libsql://cinma-db-iaaelsadek.aws-eu-west-1.turso.io'
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY5MjI0NTIsImlkIjoiMDE5ZGE5N2YtY2QwMS03OTcwLTljYWItZDc2MDZmMzU3NGI1IiwicmlkIjoiYWE2ZjIzZWUtNDUwOS00ZjEyLWI3YzEtZWU4YjFmYTYyZmExIn0.-Ma3bNkYebX8vxLSYY-oVAU4K9KZAFj6DT7Pho_B1X_nVyC-RxfiJ-cGUeTp5S7mZF2OfqC1hcCrX_fnf3J-Dw'

async function addMissingTables() {
  console.log('🔄 Connecting to Turso database...')
  
  const db = createClient({
    url: TURSO_DATABASE_URL,
    authToken: TURSO_AUTH_TOKEN,
  })
  
  try {
    console.log('📝 Creating missing tables...')
    
    // Video Servers Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS video_servers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content_id INTEGER NOT NULL,
        content_type TEXT NOT NULL CHECK(content_type IN ('movie','episode')),
        server_name TEXT NOT NULL,
        server_url TEXT NOT NULL,
        quality TEXT DEFAULT 'HD',
        language TEXT DEFAULT 'ar',
        is_active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `)
    console.log('✅ video_servers table created')
    
    // Quran Reciters Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS quran_reciters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        image_url TEXT,
        description TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `)
    console.log('✅ quran_reciters table created')
    
    // Quran Content Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS quran_content (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reciter_id INTEGER,
        title TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('recitation','sermon','story')),
        audio_url TEXT,
        description TEXT,
        duration INTEGER,
        play_count INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (reciter_id) REFERENCES quran_reciters(id) ON DELETE SET NULL
      )
    `)
    console.log('✅ quran_content table created')
    
    // Software Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS software (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        name_ar TEXT,
        slug TEXT UNIQUE,
        description TEXT,
        description_ar TEXT,
        icon TEXT,
        category TEXT,
        version TEXT,
        size TEXT,
        developer TEXT,
        primary_platform TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `)
    console.log('✅ software table created')
    
    // Create indexes
    await db.execute('CREATE INDEX IF NOT EXISTS idx_video_servers_content ON video_servers(content_id, content_type)')
    await db.execute('CREATE INDEX IF NOT EXISTS idx_quran_reciters_slug ON quran_reciters(slug)')
    await db.execute('CREATE INDEX IF NOT EXISTS idx_quran_content_type ON quran_content(type)')
    await db.execute('CREATE INDEX IF NOT EXISTS idx_quran_content_reciter ON quran_content(reciter_id)')
    await db.execute('CREATE INDEX IF NOT EXISTS idx_software_slug ON software(slug)')
    await db.execute('CREATE INDEX IF NOT EXISTS idx_software_category ON software(category)')
    console.log('✅ Indexes created')
    
    // Verify
    const result = await db.execute("SELECT name FROM sqlite_master WHERE type='table'")
    console.log('\n📊 All tables:', result.rows.length)
    result.rows.forEach((row: any) => console.log('  -', row.name))
    
    console.log('\n✅ All missing tables added successfully!')
    
  } catch (error) {
    console.error('❌ Failed to add tables:', error)
    process.exit(1)
  }
}

addMissingTables()
