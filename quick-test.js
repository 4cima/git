#!/usr/bin/env node
/**
 * Quick System Test
 * يتحقق من جاهزية النظام قبل البدء
 */

console.log('🧪 اختبار سريع للنظام...\n')

const fs = require('fs')
let passed = 0
let failed = 0

// Test 1: Dependencies
console.log('1️⃣  فحص المكتبات...')
try {
  require('better-sqlite3')
  require('@libsql/client')
  require('dotenv')
  require('p-limit')
  console.log('   ✅ كل المكتبات موجودة\n')
  passed++
} catch (err) {
  console.log('   ❌ مكتبة ناقصة:', err.message)
  console.log('   → قم بتشغيل: npm install\n')
  failed++
}

// Test 2: .env.local
console.log('2️⃣  فحص ملف البيئة...')
require('dotenv').config({ path: '.env.local' })
const requiredEnv = ['TMDB_API_KEY', 'GROQ_API_KEY', 'TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN']
const missing = requiredEnv.filter(key => !process.env[key])
if (missing.length === 0) {
  console.log('   ✅ كل المتغيرات موجودة\n')
  passed++
} else {
  console.log('   ❌ متغيرات ناقصة:', missing.join(', '))
  console.log('   → تحقق من ملف .env.local\n')
  failed++
}

// Test 3: Schema file
console.log('3️⃣  فحص ملف الـ Schema...')
if (fs.existsSync('LOCAL-SCHEMA-CLEAN.sql')) {
  const schema = fs.readFileSync('LOCAL-SCHEMA-CLEAN.sql', 'utf-8')
  if (schema.includes('CREATE TABLE') && 
      schema.includes('movies') && 
      schema.includes('tv_series') &&
      schema.includes('tmdb_id')) {
    console.log('   ✅ ملف Schema صحيح\n')
    passed++
  } else {
    console.log('   ❌ Schema غير مكتمل\n')
    failed++
  }
} else {
  console.log('   ❌ ملف LOCAL-SCHEMA-CLEAN.sql غير موجود\n')
  failed++
}

// Test 4: Scripts
console.log('4️⃣  فحص السكريبتات...')
const scripts = [
  'scripts/0-download-ids.js',
  'scripts/1-fetch-and-enrich.js',
  'scripts/2-enrich-incomplete.js',
  'scripts/3-sync-to-turso.js',
  'scripts/services/local-db.js',
  'scripts/services/slug-generator.js',
  'scripts/services/tmdb-api.js',
  'scripts/services/translation-service.js',
  'scripts/services/content-filter.js'
]
const missingScripts = scripts.filter(s => !fs.existsSync(s))
if (missingScripts.length === 0) {
  console.log('   ✅ كل السكريبتات موجودة\n')
  passed++
} else {
  console.log('   ❌ سكريبتات ناقصة:', missingScripts.join(', '), '\n')
  failed++
}

// Test 5: Database initialization
console.log('5️⃣  فحص قاعدة البيانات المحلية...')
try {
  const Database = require('better-sqlite3')
  const path = require('path')
  const dbPath = path.join(__dirname, 'data', '4cima-local.db')
  
  if (!fs.existsSync(dbPath)) {
    console.log('   ⚠️  قاعدة البيانات غير موجودة - سيتم إنشاؤها عند أول تشغيل\n')
    passed++
  } else {
    const db = new Database(dbPath, { readonly: true })
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('movies', 'tv_series', 'genres', 'people')
    `).all()
    db.close()
    
    if (tables.length >= 4) {
      console.log('   ✅ قاعدة البيانات جاهزة\n')
      passed++
    } else {
      console.log('   ❌ جداول ناقصة في قاعدة البيانات\n')
      failed++
    }
  }
} catch (err) {
  console.log('   ❌ خطأ في قاعدة البيانات:', err.message, '\n')
  failed++
}

// Summary
console.log('═══════════════════════════════════════')
console.log(`✅ نجح: ${passed}/5`)
console.log(`❌ فشل: ${failed}/5`)
console.log('═══════════════════════════════════════\n')

if (failed === 0) {
  console.log('🎉 النظام جاهز تماماً!')
  console.log('\n📖 اقرأ WORKFLOW-GUIDE.md لبدء العمل')
  console.log('\n🚀 للبدء: npm run full-workflow')
  process.exit(0)
} else {
  console.log('⚠️  يرجى إصلاح المشاكل أولاً')
  process.exit(1)
}
