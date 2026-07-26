#!/usr/bin/env node
/**
 * Quick Setup Test
 * Verifies everything is configured correctly
 */

require('dotenv').config({ path: './.env.local' })
const fs = require('fs')
const path = require('path')

console.log('🧪 Testing 4CIMA Setup...\n')

let allGood = true

// Test 1: Node version
console.log('1️⃣ Checking Node.js version...')
const nodeVersion = process.version
const major = parseInt(nodeVersion.slice(1).split('.')[0])
if (major >= 18) {
  console.log(`   ✅ Node.js ${nodeVersion} (OK)`)
} else {
  console.log(`   ❌ Node.js ${nodeVersion} (Need 18+)`)
  allGood = false
}

// Test 2: Environment variables
console.log('\n2️⃣ Checking environment variables...')
const requiredEnvVars = [
  'TURSO_DATABASE_URL',
  'TURSO_AUTH_TOKEN',
  'TMDB_API_KEY',
  'GROQ_API_KEY'
]

for (const envVar of requiredEnvVars) {
  if (process.env[envVar]) {
    const preview = process.env[envVar].substring(0, 20) + '...'
    console.log(`   ✅ ${envVar}: ${preview}`)
  } else {
    console.log(`   ❌ ${envVar}: Missing!`)
    allGood = false
  }
}

// Test 3: Folders
console.log('\n3️⃣ Checking folders...')
const folders = ['scripts', 'scripts/services', 'data']
for (const folder of folders) {
  if (fs.existsSync(folder)) {
    console.log(`   ✅ ${folder}/`)
  } else {
    console.log(`   ❌ ${folder}/ (Missing)`)
    allGood = false
  }
}

// Test 4: Script files
console.log('\n4️⃣ Checking script files...')
const scripts = [
  'scripts/0-download-ids.js',
  'scripts/1-fetch-and-enrich.js',
  'scripts/2-enrich-incomplete.js',
  'scripts/3-sync-to-turso.js'
]

for (const script of scripts) {
  if (fs.existsSync(script)) {
    console.log(`   ✅ ${path.basename(script)}`)
  } else {
    console.log(`   ❌ ${path.basename(script)} (Missing)`)
    allGood = false
  }
}

// Test 5: Service files
console.log('\n5️⃣ Checking service files...')
const services = [
  'scripts/services/local-db.js',
  'scripts/services/slug-generator.js',
  'scripts/services/tmdb-api.js',
  'scripts/services/translation-service.js',
  'scripts/services/content-filter.js'
]

for (const service of services) {
  if (fs.existsSync(service)) {
    console.log(`   ✅ ${path.basename(service)}`)
  } else {
    console.log(`   ❌ ${path.basename(service)} (Missing)`)
    allGood = false
  }
}

// Test 6: Dependencies
console.log('\n6️⃣ Checking dependencies...')
try {
  require('better-sqlite3')
  console.log('   ✅ better-sqlite3')
} catch {
  console.log('   ❌ better-sqlite3 (Run: npm install)')
  allGood = false
}

try {
  require('@libsql/client')
  console.log('   ✅ @libsql/client')
} catch {
  console.log('   ❌ @libsql/client (Run: npm install)')
  allGood = false
}

try {
  require('dotenv')
  console.log('   ✅ dotenv')
} catch {
  console.log('   ❌ dotenv (Run: npm install)')
  allGood = false
}

try {
  require('p-limit')
  console.log('   ✅ p-limit')
} catch {
  console.log('   ❌ p-limit (Run: npm install)')
  allGood = false
}

// Test 7: Database can be created
console.log('\n7️⃣ Testing database initialization...')
try {
  const Database = require('better-sqlite3')
  const testDbPath = path.join(__dirname, 'data', 'test.db')
  const testDb = new Database(testDbPath)
  testDb.close()
  fs.unlinkSync(testDbPath)
  console.log('   ✅ Database can be created')
} catch (error) {
  console.log(`   ❌ Database error: ${error.message}`)
  allGood = false
}

// Summary
console.log('\n' + '═'.repeat(50))
if (allGood) {
  console.log('✅ All tests passed! Setup is ready.')
  console.log('\n💡 Next step: npm run download-ids')
} else {
  console.log('❌ Some tests failed. Please fix the issues above.')
  console.log('\n💡 Common fixes:')
  console.log('   - Run: npm install')
  console.log('   - Check .env.local file')
  console.log('   - Ensure all script files exist')
}
console.log('═'.repeat(50))

process.exit(allGood ? 0 : 1)
