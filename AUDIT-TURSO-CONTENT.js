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

async function auditTursoMovies() {
  console.log('\n🔍 فحص الـ484 فيلم في Turso بالفلتر الجديد...\n');
  
  const result = await turso.execute('SELECT id, tmdb_id, title_en FROM movies ORDER BY tmdb_id');
  const movies = result.rows;
  
  console.log(`إجمالي الأفلام: ${movies.length}\n`);
  console.log('⏳ جاري السحب من TMDB وفحص كل فيلم...\n');
  
  const flagged = [];
  let processed = 0;
  
  for (const movie of movies) {
    const fresh = await fetchTMDBFull(movie.tmdb_id);
    await sleep(250); // rate limit
    
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
    
    if (processed % 50 === 0) {
      console.log(`   ... ${processed}/${movies.length} (معلّم: ${flagged.length})\n`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 الملخص النهائي:');
  console.log('='.repeat(80));
  console.log(`إجمالي: ${movies.length} فيلم`);
  console.log(`مفلترة: ${flagged.length} فيلم`);
  console.log(`نظيفة: ${movies.length - flagged.length} فيلم\n`);
  
  if (flagged.length > 0) {
    console.log('🚨 الأفلام المفلترة (يجب حذفها من Turso):');
    console.log('─'.repeat(80));
    flagged.forEach(m => {
      console.log(`${m.tmdb_id}: ${m.title} (${m.reason})`);
    });
    
    // Generate SQL
    const sql = flagged.map(m => `DELETE FROM movies WHERE tmdb_id = ${m.tmdb_id};`).join('\n');
    require('fs').writeFileSync('REMOVE-EXPLICIT-FROM-TURSO.sql', sql);
    console.log('\n📄 تم إنشاء: REMOVE-EXPLICIT-FROM-TURSO.sql');
  } else {
    console.log('✅ جميع الأفلام نظيفة - لا يوجد محتوى صريح!');
  }
}

auditTursoMovies().catch(console.error);
