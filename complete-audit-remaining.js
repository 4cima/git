#!/usr/bin/env node
/**
 * إكمال التدقيق للـ34 فيلم المتبقية (450→484)
 */

const { createClient } = require('@libsql/client');
const { isExplicitContent } = require('./scripts/services/content-filter');
require('dotenv').config({ path: '.env.local' });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function completeAudit() {
  console.log('\n🔍 إكمال التدقيق للـ34 فيلم المتبقية (450→484)...\n');
  
  const result = await turso.execute('SELECT id, tmdb_id, title_en FROM movies ORDER BY tmdb_id');
  const movies = result.rows;
  
  // نبدأ من الفيلم رقم 450 (index-based)
  const remaining = movies.slice(450);
  
  console.log(`📊 الأفلام المتبقية: ${remaining.length}\n`);
  
  const flagged = [];
  let processed = 0;
  
  for (const movie of remaining) {
    const fresh = await fetchTMDBFull(movie.tmdb_id);
    await sleep(250);
    
    if (!fresh) {
      console.log(`   ⚠️ [${movie.tmdb_id}] فشل السحب من TMDB`);
      processed++;
      continue;
    }
    
    const check = isExplicitContent(fresh);
    processed++;
    
    if (check.blocked) {
      flagged.push({
        id: movie.id,
        tmdb_id: movie.tmdb_id,
        title: movie.title_en,
        reason: check.reason
      });
      console.log(`   🚫 [${movie.tmdb_id}] ${movie.title_en}`);
      console.log(`      السبب: ${check.reason}\n`);
    }
    
    if (processed % 10 === 0) {
      console.log(`   ... ${450 + processed}/${movies.length} (معلّم جديد: ${flagged.length})\n`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 ملخص الـ34 فيلم المتبقية:');
  console.log('='.repeat(80));
  console.log(`إجمالي: ${remaining.length} فيلم`);
  console.log(`مفلترة: ${flagged.length} فيلم`);
  console.log(`نظيفة: ${remaining.length - flagged.length} فيلم\n`);
  
  if (flagged.length > 0) {
    console.log('🚨 الأفلام المفلترة الجديدة:');
    console.log('─'.repeat(80));
    flagged.forEach(m => {
      console.log(`${m.tmdb_id}: ${m.title} (${m.reason})`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 الإحصائيات الكاملة (450 السابقة + 34 الجديدة):');
  console.log('='.repeat(80));
  console.log('السابق: 42 فيلم مفلتر من أصل 450');
  console.log(`الجديد: ${flagged.length} فيلم مفلتر من أصل 34`);
  console.log(`الإجمالي النهائي: ${42 + flagged.length} فيلم مفلتر من أصل 484`);
}

completeAudit().catch(console.error);
