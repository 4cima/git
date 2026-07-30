#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@libsql/client')
const db = require('./scripts/services/local-db')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

async function main() {
  // Get all movies from Turso
  const tursoResult = await turso.execute('SELECT tmdb_id, title_ar, updated_at FROM movies ORDER BY tmdb_id')
  console.log('عدد الأفلام في Turso:', tursoResult.rows.length)
  
  // Check for suspicious dates (after initial batch 2026-07-24 23:54:30)
  const suspicious = tursoResult.rows.filter(row => row.updated_at > '2026-07-24 23:54:30')
  
  if (suspicious.length > 0) {
    console.log('\n⚠️ أفلام مشبوهة (updated_at > 2026-07-24 23:54:30):')
    suspicious.forEach(s => {
      console.log(`  tmdb_id=${s.tmdb_id}, title=${s.title_ar}, updated_at=${s.updated_at}`)
    })
  } else {
    console.log('\n✅ كل الأفلام updated_at <= 2026-07-24 23:54:30')
  }
  
  // Find date range
  const dates = tursoResult.rows.map(r => r.updated_at).sort()
  console.log('\nنطاق updated_at في Turso:')
  console.log('  الأقدم:', dates[0])
  console.log('  الأحدث:', dates[dates.length - 1])
  
  // Compare with local.db for the 483 original movies
  console.log('\n═══════════════════════════════════════════')
  console.log('مقارنة مع local.db:')
  console.log('═══════════════════════════════════════════')
  
  let newerInTurso = []
  let olderInTurso = []
  let same = 0
  let notInLocal = []
  
  for (const tursoMovie of tursoResult.rows) {
    const localMovie = db.prepare('SELECT updated_at FROM movies WHERE tmdb_id = ?').get(tursoMovie.tmdb_id)
    
    if (!localMovie) {
      notInLocal.push(tursoMovie.tmdb_id)
      continue
    }
    
    if (tursoMovie.updated_at > localMovie.updated_at) {
      newerInTurso.push({
        tmdb_id: tursoMovie.tmdb_id,
        title: tursoMovie.title_ar,
        turso: tursoMovie.updated_at,
        local: localMovie.updated_at
      })
    } else if (tursoMovie.updated_at < localMovie.updated_at) {
      olderInTurso.push({
        tmdb_id: tursoMovie.tmdb_id,
        title: tursoMovie.title_ar,
        turso: tursoMovie.updated_at,
        local: localMovie.updated_at
      })
    } else {
      same++
    }
  }
  
  console.log(`\n✅ متطابقة: ${same} فيلم`)
  console.log(`⬆️ أحدث في Turso: ${newerInTurso.length} فيلم`)
  console.log(`⬇️ أقدم في Turso: ${olderInTurso.length} فيلم`)
  console.log(`❓ مش موجودة في local.db: ${notInLocal.length} فيلم`)
  
  if (newerInTurso.length > 0) {
    console.log('\n⚠️ أفلام أحدث في Turso (محتمل تعديل يدوي):')
    newerInTurso.slice(0, 10).forEach(m => {
      console.log(`  ${m.tmdb_id} - ${m.title}`)
      console.log(`    Turso: ${m.turso}`)
      console.log(`    Local: ${m.local}`)
    })
    if (newerInTurso.length > 10) {
      console.log(`  ... و ${newerInTurso.length - 10} فيلم آخرين`)
    }
  }
  
  if (notInLocal.length > 0) {
    console.log('\n❓ أفلام في Turso لكن مش في local.db:')
    console.log(`  ${notInLocal.join(', ')}`)
  }
}

main().catch(console.error)
