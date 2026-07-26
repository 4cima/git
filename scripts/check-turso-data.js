#!/usr/bin/env node
const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  console.log('🔍 فحص البيانات في Turso\n');
  console.log('═'.repeat(60));

  try {
    // Check all tables
    const tables = ['movies', 'tv_series', 'tv_seasons', 'tv_episodes', 'genres', 'countries', 'languages'];
    
    for (const table of tables) {
      try {
        const result = await turso.execute(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`\n📊 ${table}: ${result.rows[0].count} سجل`);
        
        // Show sample data for static tables
        if (['genres', 'countries', 'languages'].includes(table)) {
          const sample = await turso.execute(`SELECT * FROM ${table} LIMIT 5`);
          console.log(`   عينة من البيانات:`);
          sample.rows.forEach((row, i) => {
            console.log(`   ${i+1}. ${JSON.stringify(row)}`);
          });
        }
      } catch (e) {
        console.log(`\n❌ ${table}: خطأ - ${e.message}`);
      }
    }

    console.log('\n' + '═'.repeat(60));

  } catch (error) {
    console.error('\n❌ خطأ:', error.message);
  }
}

main();
