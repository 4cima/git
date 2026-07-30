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
  console.log('📊 Column-by-Column Comparison')
  console.log('═══════════════════════════════════════════\n')
  
  const localCols = db.prepare('PRAGMA table_info(movies)').all()
  const tursoCols = (await turso.execute('PRAGMA table_info(movies)')).rows
  
  console.log('📋 Local columns:', localCols.length)
  localCols.forEach(c => console.log(`  ${c.name}: ${c.type}`))
  
  console.log('\n📋 Turso columns:', tursoCols.length)
  tursoCols.forEach(c => console.log(`  ${c.name}: ${c.type}`))
  
  // Find differences
  const localNames = new Set(localCols.map(c => c.name))
  const tursoNames = new Set(tursoCols.map(c => c.name))
  
  const inLocalOnly = localCols.filter(c => !tursoNames.has(c.name))
  const inTursoOnly = tursoCols.filter(c => !localNames.has(c.name))
  
  console.log('\n═══════════════════════════════════════════')
  console.log('⚠️ في local.db فقط:', inLocalOnly.length)
  inLocalOnly.forEach(c => console.log(`  - ${c.name} (${c.type})`))
  
  console.log('\n⚠️ في Turso فقط:', inTursoOnly.length)
  inTursoOnly.forEach(c => console.log(`  - ${c.name} (${c.type})`))
}

main().catch(console.error)
