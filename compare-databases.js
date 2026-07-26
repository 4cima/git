// مقارنة شاملة بين قاعدة البيانات المحلية و Turso
require('dotenv').config({ path: '.env.local' })
const Database = require('better-sqlite3')
const { createClient } = require('@libsql/client')

// قاعدة البيانات المحلية
const localDb = new Database('./data/4cima-local.db')

// قاعدة بيانات Turso
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

function printHeader(text) {
  console.log('\n╔' + '═'.repeat(78) + '╗')
  console.log('║' + text.padStart(40 + text.length / 2).padEnd(78) + '║')
  console.log('╚' + '═'.repeat(78) + '╝\n')
}

function printSection(text) {
  console.log('\n┌' + '─'.repeat(78) + '┐')
  console.log('│ ' + text.padEnd(77) + '│')
  console.log('└' + '─'.repeat(78) + '┘\n')
}

async function compareStructure() {
  printHeader('مقارنة بنية قاعدة البيانات')

  // 1. Local Database Structure
  printSection('1️⃣  قاعدة البيانات المحلية (SQLite)')
  
  console.log('📂 الموقع: ./data/4cima-local.db\n')
  
  const localTables = localDb.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    ORDER BY name
  `).all()

  console.log('الجداول:')
  const localTableDetails = {}
  
  for (const table of localTables) {
    const name = table.name
    const count = localDb.prepare(`SELECT COUNT(*) as cnt FROM ${name}`).get().cnt
    const cols = localDb.prepare(`PRAGMA table_info(${name})`).all()
    
    localTableDetails[name] = {
      count,
      columns: cols.map(c => ({
        name: c.name,
        type: c.type,
        notnull: c.notnull === 1,
        pk: c.pk > 0
      }))
    }
    
    console.log(`  📊 ${name.padEnd(25)} ${String(count).padStart(10)} صف`)
  }

  // 2. Turso Database Structure
  printSection('2️⃣  قاعدة البيانات السحابية (Turso)')
  
  console.log('🌐 النوع: Turso (SQLite Cloud)\n')
  
  const tursoTables = await turso.execute({
    sql: "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    args: []
  })

  console.log('الجداول:')
  const tursoTableDetails = {}
  
  for (const table of tursoTables.rows) {
    const name = table.name
    const countResult = await turso.execute({
      sql: `SELECT COUNT(*) as cnt FROM ${name}`,
      args: []
    })
    const count = countResult.rows[0].cnt
    
    const colsResult = await turso.execute({
      sql: `PRAGMA table_info(${name})`,
      args: []
    })
    
    tursoTableDetails[name] = {
      count,
      columns: colsResult.rows.map(c => ({
        name: c.name,
        type: c.type,
        notnull: c.notnull === 1,
        pk: c.pk > 0
      }))
    }
    
    console.log(`  📊 ${name.padEnd(25)} ${String(count).padStart(10)} صف`)
  }

  // 3. Comparison
  printHeader('المقارنة التفصيلية')

  // Compare table existence
  printSection('📋 مقارنة الجداول')
  
  const localTableNames = new Set(Object.keys(localTableDetails))
  const tursoTableNames = new Set(Object.keys(tursoTableDetails))
  
  const commonTables = [...localTableNames].filter(t => tursoTableNames.has(t))
  const localOnly = [...localTableNames].filter(t => !tursoTableNames.has(t))
  const tursoOnly = [...tursoTableNames].filter(t => !localTableNames.has(t))
  
  console.log('الجداول المشتركة:', commonTables.length)
  commonTables.forEach(t => console.log(`  ✓ ${t}`))
  
  if (localOnly.length > 0) {
    console.log('\nموجود في Local فقط:', localOnly.length)
    localOnly.forEach(t => console.log(`  ⚠ ${t} (${localTableDetails[t].count} صف)`))
  }
  
  if (tursoOnly.length > 0) {
    console.log('\nموجود في Turso فقط:', tursoOnly.length)
    tursoOnly.forEach(t => console.log(`  ⚠ ${t} (${tursoTableDetails[t].count} صف)`))
  }

  // Compare common tables in detail
  printSection('🔍 المقارنة التفصيلية للجداول المشتركة')
  
  for (const tableName of commonTables) {
    const local = localTableDetails[tableName]
    const turso = tursoTableDetails[tableName]
    
    console.log(`\n━━━ ${tableName} ━━━`)
    console.log(`  عدد الصفوف:`)
    console.log(`    Local: ${String(local.count).padStart(10)}`)
    console.log(`    Turso: ${String(turso.count).padStart(10)}`)
    
    const diff = local.count - turso.count
    if (diff !== 0) {
      console.log(`    الفرق: ${diff > 0 ? '+' : ''}${diff}`)
    }
    
    // Compare columns
    const localCols = new Set(local.columns.map(c => c.name))
    const tursoCols = new Set(turso.columns.map(c => c.name))
    
    const commonCols = [...localCols].filter(c => tursoCols.has(c))
    const localOnlyCols = [...localCols].filter(c => !tursoCols.has(c))
    const tursoOnlyCols = [...tursoCols].filter(c => !localCols.has(c))
    
    console.log(`  الأعمدة المشتركة: ${commonCols.length}`)
    
    if (localOnlyCols.length > 0) {
      console.log(`  ⚠  أعمدة في Local فقط: ${localOnlyCols.join(', ')}`)
    }
    
    if (tursoOnlyCols.length > 0) {
      console.log(`  ⚠  أعمدة في Turso فقط: ${tursoOnlyCols.join(', ')}`)
    }
  }

  // Detailed comparison for movies table
  printHeader('تفاصيل جدول movies')
  
  if (localTableDetails.movies && tursoTableDetails.movies) {
    console.log('الأعمدة في Local:')
    localTableDetails.movies.columns.forEach(col => {
      const pk = col.pk ? ' [PK]' : ''
      const nn = col.notnull ? ' NOT NULL' : ''
      console.log(`  • ${col.name.padEnd(25)} ${col.type.padEnd(15)}${nn}${pk}`)
    })
    
    console.log('\n\nالأعمدة في Turso:')
    tursoTableDetails.movies.columns.forEach(col => {
      const pk = col.pk ? ' [PK]' : ''
      const nn = col.notnull ? ' NOT NULL' : ''
      console.log(`  • ${col.name.padEnd(25)} ${col.type.padEnd(15)}${nn}${pk}`)
    })
  }

  // Data quality comparison
  printHeader('مقارنة جودة البيانات')
  
  printSection('فحص genres_json')
  
  // Local
  const localMoviesWithGenres = localDb.prepare(
    'SELECT COUNT(*) as cnt FROM movies WHERE genres_json IS NOT NULL'
  ).get().cnt
  const localMoviesTotal = localDb.prepare(
    'SELECT COUNT(*) as cnt FROM movies'
  ).get().cnt
  
  // Turso
  const tursoMoviesWithGenresRes = await turso.execute({
    sql: 'SELECT COUNT(*) as cnt FROM movies WHERE genres_json IS NOT NULL',
    args: []
  })
  const tursoMoviesWithGenres = tursoMoviesWithGenresRes.rows[0].cnt
  
  const tursoMoviesTotalRes = await turso.execute({
    sql: 'SELECT COUNT(*) as cnt FROM movies',
    args: []
  })
  const tursoMoviesTotal = tursoMoviesTotalRes.rows[0].cnt
  
  console.log('الأفلام التي تحتوي على تصنيفات (genres_json):')
  console.log(`  Local: ${localMoviesWithGenres.toLocaleString()} / ${localMoviesTotal.toLocaleString()} (${((localMoviesWithGenres / localMoviesTotal) * 100).toFixed(1)}%)`)
  console.log(`  Turso: ${tursoMoviesWithGenres.toLocaleString()} / ${tursoMoviesTotal.toLocaleString()} (${((tursoMoviesWithGenres / tursoMoviesTotal) * 100).toFixed(1)}%)`)

  // Sample data comparison
  printSection('مقارنة بيانات عينة من الأفلام')
  
  const localSample = localDb.prepare(
    'SELECT id, slug, title_ar, genres_json FROM movies WHERE id IN (2, 3, 5, 6, 11) ORDER BY id'
  ).all()
  
  const tursoSampleRes = await turso.execute({
    sql: 'SELECT id, slug, title_ar, genres_json FROM movies WHERE id IN (2, 3, 5, 6, 11) ORDER BY id',
    args: []
  })
  const tursoSample = tursoSampleRes.rows
  
  console.log('مقارنة 5 أفلام:\n')
  
  for (let i = 0; i < Math.max(localSample.length, tursoSample.length); i++) {
    const local = localSample[i]
    const turso = tursoSample[i]
    
    if (local && turso) {
      console.log(`ID ${local.id} - ${local.title_ar}`)
      console.log(`  Slug: ${local.slug === turso.slug ? '✓ متطابق' : '✗ مختلف'}`)
      console.log(`  Title: ${local.title_ar === turso.title_ar ? '✓ متطابق' : '✗ مختلف'}`)
      
      const localHasGenres = local.genres_json !== null
      const tursoHasGenres = turso.genres_json !== null
      
      if (localHasGenres && tursoHasGenres) {
        console.log(`  Genres: ✓ موجود في كليهما`)
      } else if (localHasGenres && !tursoHasGenres) {
        console.log(`  Genres: ⚠ موجود في Local فقط`)
      } else if (!localHasGenres && tursoHasGenres) {
        console.log(`  Genres: ⚠ موجود في Turso فقط`)
      } else {
        console.log(`  Genres: ✗ غير موجود في كليهما`)
      }
      console.log()
    }
  }

  // Summary
  printHeader('الخلاصة')
  
  console.log('📊 الإحصائيات:\n')
  console.log('  قاعدة البيانات المحلية:')
  console.log(`    • عدد الجداول: ${localTableNames.size}`)
  console.log(`    • عدد الأفلام: ${localMoviesTotal.toLocaleString()}`)
  console.log(`    • أفلام بها تصنيفات: ${localMoviesWithGenres.toLocaleString()} (${((localMoviesWithGenres / localMoviesTotal) * 100).toFixed(1)}%)`)
  
  console.log('\n  قاعدة بيانات Turso:')
  console.log(`    • عدد الجداول: ${tursoTableNames.size}`)
  console.log(`    • عدد الأفلام: ${tursoMoviesTotal.toLocaleString()}`)
  console.log(`    • أفلام بها تصنيفات: ${tursoMoviesWithGenres.toLocaleString()} (${((tursoMoviesWithGenres / tursoMoviesTotal) * 100).toFixed(1)}%)`)
  
  console.log('\n🔄 التزامن:')
  if (localMoviesTotal === tursoMoviesTotal) {
    console.log('  ✓ عدد الأفلام متطابق')
  } else {
    console.log(`  ⚠ فرق في عدد الأفلام: ${Math.abs(localMoviesTotal - tursoMoviesTotal).toLocaleString()}`)
  }
  
  if (localMoviesWithGenres === tursoMoviesWithGenres) {
    console.log('  ✓ عدد الأفلام بالتصنيفات متطابق')
  } else {
    console.log(`  ⚠ فرق في الأفلام بالتصنيفات: ${Math.abs(localMoviesWithGenres - tursoMoviesWithGenres).toLocaleString()}`)
  }

  console.log('\n')
  localDb.close()
}

compareStructure().catch(err => {
  console.error('❌ خطأ:', err)
  localDb.close()
  process.exit(1)
})
