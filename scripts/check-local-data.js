#!/usr/bin/env node
const db = require('./services/local-db');

console.log('🔍 فحص البيانات الثابتة في القاعدة المحلية\n');
console.log('═'.repeat(60));

const tables = [
  'genres',
  'countries', 
  'languages',
  'global_keywords',
  'production_companies',
  'networks',
  'actors',
  'cast_members',
  'movies',
  'tv_series',
  'seasons',
  'episodes'
];

tables.forEach(table => {
  try {
    const result = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
    console.log(`\n📊 ${table}: ${result.count} سجل`);
  } catch (e) {
    console.log(`\n❌ ${table}: الجدول غير موجود`);
  }
});

console.log('\n' + '═'.repeat(60));
