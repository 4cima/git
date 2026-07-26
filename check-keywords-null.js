#!/usr/bin/env node
/**
 * فحص عدد الأفلام بـ keywords_json = NULL
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env.local') });
const { createClient } = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  console.log('='.repeat(80));
  console.log('🔍 فحص keywords_json في Turso');
  console.log('='.repeat(80));
  
  const totalResult = await turso.execute({
    sql: 'SELECT COUNT(*) as total FROM movies',
    args: []
  });
  
  const nullResult = await turso.execute({
    sql: 'SELECT COUNT(*) as null_count FROM movies WHERE keywords_json IS NULL',
    args: []
  });
  
  const notNullResult = await turso.execute({
    sql: 'SELECT COUNT(*) as not_null_count FROM movies WHERE keywords_json IS NOT NULL',
    args: []
  });
  
  const total = totalResult.rows[0].total;
  const nullCount = nullResult.rows[0].null_count;
  const notNullCount = notNullResult.rows[0].not_null_count;
  
  console.log(`\n📊 إجمالي الأفلام: ${total}`);
  console.log(`❌ keywords_json IS NULL: ${nullCount}`);
  console.log(`✅ keywords_json IS NOT NULL: ${notNullCount}`);
  
  const nullPercentage = ((nullCount / total) * 100).toFixed(1);
  console.log(`\n📈 نسبة NULL: ${nullPercentage}%`);
  
  if (nullCount === total) {
    console.log('\n⚠️  كل الأفلام ليس لديها keywords_json!');
    console.log('   هذا يعني: السكريبت الذي كتب البيانات لم يكتب keywords_json');
  }
  
  // أمثلة على الأفلام التي لديها keywords
  if (notNullCount > 0) {
    console.log('\n📋 أمثلة على الأفلام التي لديها keywords_json:');
    const examples = await turso.execute({
      sql: 'SELECT tmdb_id, title_en, keywords_json FROM movies WHERE keywords_json IS NOT NULL LIMIT 5',
      args: []
    });
    
    examples.rows.forEach(row => {
      console.log(`   [${row.tmdb_id}] ${row.title_en}`);
      console.log(`      keywords: ${row.keywords_json.substring(0, 100)}...`);
    });
  }
}

main().catch(console.error);
