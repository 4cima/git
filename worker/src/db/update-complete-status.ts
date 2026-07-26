import { createClient } from '@libsql/client'
import { config } from 'dotenv'

config({ path: '.dev.vars' })

async function updateCompleteStatus() {
  console.log('🔄 Connecting to Turso database...')
  
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  })
  
  try {
    console.log('📝 Updating complete status (WITHOUT rating requirement)...')
    
    // Reset all to incomplete first
    await db.execute('UPDATE movies SET is_complete = 0')
    await db.execute('UPDATE tv_series SET is_complete = 0')
    console.log('✅ Reset all to incomplete')
    
    // Mark as complete - STRICT REQUIREMENTS (Arabic overview required)
    await db.execute(`
      UPDATE movies 
      SET is_complete = 1 
      WHERE 
        id IS NOT NULL AND
        title IS NOT NULL AND title != '' AND
        title_ar IS NOT NULL AND title_ar != '' AND
        overview_ar IS NOT NULL AND overview_ar != '' AND
        release_date IS NOT NULL AND
        poster_path IS NOT NULL AND
        slug IS NOT NULL AND slug != '' AND
        primary_genre IS NOT NULL AND primary_genre != ''
    `)
    
    await db.execute(`
      UPDATE tv_series 
      SET is_complete = 1 
      WHERE 
        id IS NOT NULL AND
        name IS NOT NULL AND name != '' AND
        name_ar IS NOT NULL AND name_ar != '' AND
        overview_ar IS NOT NULL AND overview_ar != '' AND
        first_air_date IS NOT NULL AND
        poster_path IS NOT NULL AND
        slug IS NOT NULL AND slug != '' AND
        primary_genre IS NOT NULL AND primary_genre != ''
    `)
    
    // Get stats
    const movieStats = await db.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_complete = 1 THEN 1 ELSE 0 END) as complete,
        SUM(CASE WHEN is_complete = 0 THEN 1 ELSE 0 END) as incomplete
      FROM movies
    `)
    
    const tvStats = await db.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_complete = 1 THEN 1 ELSE 0 END) as complete,
        SUM(CASE WHEN is_complete = 0 THEN 1 ELSE 0 END) as incomplete
      FROM tv_series
    `)
    
    console.log('\n📊 Movies Stats:')
    console.log('  Total:', (movieStats.rows[0] as any).total)
    console.log('  Complete:', (movieStats.rows[0] as any).complete)
    console.log('  Incomplete:', (movieStats.rows[0] as any).incomplete)
    
    console.log('\n📊 TV Series Stats:')
    console.log('  Total:', (tvStats.rows[0] as any).total)
    console.log('  Complete:', (tvStats.rows[0] as any).complete)
    console.log('  Incomplete:', (tvStats.rows[0] as any).incomplete)
    
    console.log('\n✅ Complete status updated successfully!')
    
  } catch (error) {
    console.error('❌ Failed to update:', error)
    process.exit(1)
  }
}

updateCompleteStatus()
