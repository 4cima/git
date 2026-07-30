#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@libsql/client')
const db = require('./scripts/services/local-db')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

async function main() {
  console.log('═══════════════════════════════════════════')
  console.log('📊 Schema Comparison: local.db vs Turso')
  console.log('═══════════════════════════════════════════\n')
  
  // Get local schema
  const localSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='movies'").get()
  
  // Get Turso schema  
  const tursoSchema = await turso.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='movies'")
  
  console.log('📋 Local Schema (movies):\n')
  console.log(localSchema.sql)
  console.log('\n═══════════════════════════════════════════\n')
  console.log('📋 Turso Schema (movies):\n')
  console.log(tursoSchema.rows[0].sql)
  
  // Extract columns
  const localCols = localSchema.sql.match(/`?\w+`?\s+\w+/g) || []
  const tursoCols = tursoSchema.rows[0].sql.match(/`?\w+`?\s+\w+/g) || []
  
  console.log('\n═══════════════════════════════════════════')
  console.log('📊 Column Comparison:')
  console.log('═══════════════════════════════════════════\n')
  
  const localColNames = localCols.map(c => c.split(/\s+/)[0].replace(/`/g, ''))
  const tursoColNames = tursoCols.map(c => c.split(/\s+/)[0].replace(/`/g, ''))
  
  const inLocalOnly = localColNames.filter(c => !tursoColNames.includes(c))
  const inTursoOnly = tursoColNames.filter(c => !localColNames.includes(c))
  const inBoth = localColNames.filter(c => tursoColNames.includes(c))
  
  console.log(`✅ في الاتنين: ${inBoth.length} عمود`)
  console.log(`⚠️ في local فقط: ${inLocalOnly.length} عمود`)
  if (inLocalOnly.length > 0) {
    inLocalOnly.forEach(c => console.log(`   - ${c}`))
  }
  console.log(`⚠️ في Turso فقط: ${inTursoOnly.length} عمود`)
  if (inTursoOnly.length > 0) {
    inTursoOnly.forEach(c => console.log(`   - ${c}`))
  }
}

main().catch(console.error)
