#!/usr/bin/env node
/**
 * استكمال التحقيق - الأجزاء المتبقية
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env.local') });
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const TMDB_KEY = process.env.TMDB_API_KEY || 'afef094e7c0de13c1cac98227a61da4d';

async function fetchTMDBFull(tmdbId) {
  try {
    const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_KEY}&append_to_response=keywords,release_dates,credits`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function main() {
  console.log('=' .repeat(80));
  console.log('1️⃣  mtime للملف المحظور');
  console.log('=' .repeat(80));
  
  const backupPath = path.join(__dirname, 'BACKUP', 'scripts', 'sync-to-turso-optimized.js.backup');
  const stats = fs.statSync(backupPath);
  
  console.log(`\n📁 ${backupPath}`);
  console.log(`📅 mtime: ${stats.mtime.toISOString()}`);
  console.log(`📅 birthtime: ${stats.birthtime.toISOString()}`);
  
  console.log('\n=' .repeat(80));
  console.log('3️⃣  فحص Taxi Driver من TMDB مباشرة');
  console.log('=' .repeat(80));
  
  console.log('\n⏳ جاري السحب من TMDB...');
  const taxiDriver = await fetchTMDBFull(103);
  
  if (taxiDriver) {
    console.log(`\n🎬 ${taxiDriver.title} (${taxiDriver.id})`);
    console.log(`⭐ التقييم: ${taxiDriver.vote_average}`);
    console.log(`📅 الإصدار: ${taxiDriver.release_date}`);
    
    console.log('\n📋 Keywords من TMDB:');
    if (taxiDriver.keywords && taxiDriver.keywords.keywords) {
      taxiDriver.keywords.keywords.forEach((kw, i) => {
        const flag = (kw.name && kw.name.toLowerCase().includes('porn')) ? '🚫' : '  ';
        console.log(`  ${flag} [${i}] ${kw.name} (id: ${kw.id})`);
      });
    } else {
      console.log('  ❌ لا توجد keywords');
    }
    
    console.log('\n🔍 Release Dates (certifications):');
    if (taxiDriver.release_dates && taxiDriver.release_dates.results) {
      taxiDriver.release_dates.results.forEach(country => {
        if (country.release_dates && country.release_dates.length > 0) {
          country.release_dates.forEach(rd => {
            if (rd.certification) {
              console.log(`  ${country.iso_3166_1}: ${rd.certification}`);
            }
          });
        }
      });
    }
  } else {
    console.log('\n❌ فشل السحب من TMDB');
  }
  
  console.log('\n=' .repeat(80));
  console.log('🔍 فحص keywords_json المخزن في Turso لـ Taxi Driver');
  console.log('=' .repeat(80));
  
  const taxiTurso = await turso.execute({
    sql: 'SELECT tmdb_id, title_en, keywords_json FROM movies WHERE tmdb_id = 103',
    args: []
  });
  
  if (taxiTurso.rows.length > 0) {
    const row = taxiTurso.rows[0];
    console.log(`\n🗄️  Turso: ${row.title_en} (${row.tmdb_id})`);
    console.log(`keywords_json: ${row.keywords_json || 'NULL'}`);
  }
}

main().catch(console.error);
