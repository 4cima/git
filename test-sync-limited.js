#!/usr/bin/env node
/**
 * ============================================
 * 🧪 اختبار المزامنة المحدود (50 فيلم فقط)
 * ============================================
 */

const { createClient } = require('@libsql/client');
const path = require('path');
const db = require('./scripts/services/local-db');
const {
  prepareMovieForTurso,
} = require('./scripts/prepare-content-for-turso');

require('dotenv').config({ path: path.join(__dirname, '.env.local') });

// Turso Client
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const TEST_LIMIT = 50; // 50 فيلم فقط للاختبار

const stats = {
  movies: 0,
  errors: 0,
  start: Date.now()
};

/**
 * تقليل عدد الممثلين في JSON
 */
function limitCastJSON(castJson, limit = 10) {
  try {
    const cast = typeof castJson === 'string' ? JSON.parse(castJson) : castJson;
    if (Array.isArray(cast) && cast.length > limit) {
      return JSON.stringify(cast.slice(0, limit));
    }
    return typeof castJson === 'string' ? castJson : JSON.stringify(castJson);
  } catch (e) {
    return castJson;
  }
}

/**
 * مزامنة فيلم واحد
 */
async function syncMovieToTurso(movieId) {
  try {
    const movie = prepareMovieForTurso(movieId);
    if (!movie) {
      console.log(`⚠️  الفيلم ${movieId} غير جاهز للمزامنة`);
      return false;
    }

    console.log(`🔄 مزامنة: ${movie.title_ar || movie.title_en} (tmdb_id=${movie.tmdb_id})`);

    await turso.execute({
      sql: `
        INSERT INTO movies (
          id, tmdb_id, slug,
          title_en, title_ar,
          overview_ar,
          poster_path,
          release_date, release_year,
          vote_average,
          trailer_key,
          genres_json, cast_json,
          countries_json, keywords_json, companies_json,
          seo_title_ar, seo_description_ar, seo_keywords_json, canonical_url,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?,
          ?, ?,
          ?,
          ?,
          ?, ?,
          ?,
          ?,
          ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          tmdb_id = excluded.tmdb_id,
          slug = excluded.slug,
          title_en = excluded.title_en,
          title_ar = excluded.title_ar,
          overview_ar = excluded.overview_ar,
          poster_path = excluded.poster_path,
          release_date = excluded.release_date,
          release_year = excluded.release_year,
          vote_average = excluded.vote_average,
          trailer_key = excluded.trailer_key,
          genres_json = excluded.genres_json,
          cast_json = excluded.cast_json,
          countries_json = excluded.countries_json,
          keywords_json = excluded.keywords_json,
          companies_json = excluded.companies_json,
          seo_title_ar = excluded.seo_title_ar,
          seo_description_ar = excluded.seo_description_ar,
          seo_keywords_json = excluded.seo_keywords_json,
          canonical_url = excluded.canonical_url,
          updated_at = excluded.updated_at
      `,
      args: [
        movie.tmdb_id, movie.tmdb_id, movie.slug,
        movie.title_en, movie.title_ar,
        movie.overview_ar,
        movie.poster_path,
        movie.release_date, movie.release_year,
        movie.vote_average,
        movie.trailer_key,
        movie.genres_json,
        movie.cast_json ? limitCastJSON(movie.cast_json, 10) : null,
        movie.countries_json, movie.keywords_json, movie.companies_json,
        movie.seo_title_ar, movie.seo_description_ar, movie.seo_keywords_json, movie.canonical_url,
        movie.created_at, movie.updated_at
      ]
    });

    // تحديث حالة المزامنة في القاعدة المحلية
    db.prepare(`
      UPDATE movies 
      SET synced_to_turso = 1, synced_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(movieId);

    stats.movies++;
    console.log(`✅ تمت المزامنة (${stats.movies}/${TEST_LIMIT})`);
    return true;
  } catch (e) {
    console.error(`❌ خطأ في الفيلم ${movieId}:`, e.message);
    stats.errors++;
    return false;
  }
}

/**
 * الدالة الرئيسية
 */
async function main() {
  console.log('🧪 اختبار المزامنة المحدود');
  console.log('═'.repeat(70));
  console.log(`📊 الحد: ${TEST_LIMIT} فيلم مكتمل\n`);

  // جلب 50 فيلم مكتمل
  const movies = db.prepare(`
    SELECT id, tmdb_id, title_ar
    FROM movies 
    WHERE is_complete = 1 
      AND is_filtered = 0
    ORDER BY updated_at DESC
    LIMIT ?
  `).all(TEST_LIMIT);

  console.log(`📦 عدد الأفلام الجاهزة: ${movies.length}\n`);

  if (movies.length === 0) {
    console.log('⚠️  لا توجد أفلام مكتملة للمزامنة');
    process.exit(0);
  }

  // مزامنة واحد تلو الآخر (للوضوح)
  for (const movie of movies) {
    await syncMovieToTurso(movie.id);
    // تأخير صغير لتجنب الضغط
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const elapsed = (Date.now() - stats.start) / 1000;
  
  console.log('\n' + '═'.repeat(70));
  console.log('📊 النتائج:');
  console.log(`   ✅ نجح: ${stats.movies}`);
  console.log(`   ❌ فشل: ${stats.errors}`);
  console.log(`   ⏱️  الوقت: ${elapsed.toFixed(1)} ثانية`);
  console.log('═'.repeat(70));

  process.exit(0);
}

main().catch(e => {
  console.error('❌ خطأ فادح:', e.message);
  process.exit(1);
});
