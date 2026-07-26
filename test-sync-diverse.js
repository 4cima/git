#!/usr/bin/env node
/**
 * ============================================
 * 🧪 اختبار المزامنة - عينة متنوعة (500 فيلم)
 * ============================================
 * - أفلام حديثة (2020+)
 * - أفلام قديمة (قبل 2000)
 * - تقييمات مختلفة
 * - أفلام مُحدثة مسبقاً (ON CONFLICT)
 * - أفلام جديدة (INSERT)
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

const TEST_LIMIT = 500;

const fs = require('fs');
const path = require('path');

const FAILURES_LOG = path.join(__dirname, 'sync-failures.log');

const stats = {
  movies: 0,
  errors: 0,
  new_movies: 0,
  updated_movies: 0,
  start: Date.now()
};

/**
 * تسجيل الفشل في ملف
 */
function logFailure(tmdb_id, table, error) {
  const entry = JSON.stringify({
    tmdb_id,
    table,
    error,
    timestamp: new Date().toISOString()
  }) + '\n';
  fs.appendFileSync(FAILURES_LOG, entry);
}

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
async function syncMovieToTurso(movieId, tmdbId, isNewInTurso) {
  try {
    const movie = prepareMovieForTurso(movieId);
    if (!movie) {
      const error = `Movie preparation failed for id=${movieId}`;
      logFailure(tmdbId, 'movies', error);
      return false;
    }

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

    db.prepare(`
      UPDATE movies 
      SET synced_to_turso = 1, synced_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(movieId);

    stats.movies++;
    if (isNewInTurso) {
      stats.new_movies++;
    } else {
      stats.updated_movies++;
    }
    
    if (stats.movies % 50 === 0) {
      console.log(`✅ ${stats.movies}/${TEST_LIMIT} (${(stats.movies/TEST_LIMIT*100).toFixed(1)}%)`);
    }
    
    return true;
  } catch (e) {
    console.error(`❌ خطأ في tmdb_id=${tmdbId}:`, e.message);
    logFailure(tmdbId, 'movies', e.message);
    stats.errors++;
    return false;
  }
}

/**
 * الدالة الرئيسية
 */
async function main() {
  console.log('🧪 اختبار المزامنة - عينة متنوعة');
  console.log('═'.repeat(70));
  console.log(`📊 الحد: ${TEST_LIMIT} فيلم\n`);

  // بناء عينة متنوعة
  console.log('🎲 بناء عينة متنوعة...\n');
  
  const queries = [
    // أفلام حديثة عالية التقييم
    { name: 'حديثة عالية', query: `
      SELECT id, tmdb_id FROM movies 
      WHERE is_complete = 1 AND is_filtered = 0
        AND release_year >= 2020 AND vote_average >= 7.0
      ORDER BY popularity DESC LIMIT 100
    `},
    // أفلام قديمة كلاسيكية
    { name: 'كلاسيكية', query: `
      SELECT id, tmdb_id FROM movies 
      WHERE is_complete = 1 AND is_filtered = 0
        AND release_year < 2000 AND vote_average >= 6.0
      ORDER BY vote_average DESC LIMIT 100
    `},
    // أفلام متوسطة التقييم
    { name: 'متوسطة', query: `
      SELECT id, tmdb_id FROM movies 
      WHERE is_complete = 1 AND is_filtered = 0
        AND vote_average BETWEEN 5.0 AND 6.5
      ORDER BY RANDOM() LIMIT 100
    `},
    // أفلام منخفضة التقييم
    { name: 'منخفضة', query: `
      SELECT id, tmdb_id FROM movies 
      WHERE is_complete = 1 AND is_filtered = 0
        AND vote_average < 5.0
      ORDER BY RANDOM() LIMIT 100
    `},
    // أفلام حديثة جداً
    { name: 'حديثة جداً', query: `
      SELECT id, tmdb_id FROM movies 
      WHERE is_complete = 1 AND is_filtered = 0
        AND release_year >= 2024
      ORDER BY release_date DESC LIMIT 100
    `}
  ];

  let allMovies = [];
  
  for (const { name, query } of queries) {
    const movies = db.prepare(query).all();
    console.log(`   ${name}: ${movies.length} فيلم`);
    allMovies = allMovies.concat(movies);
  }
  
  // إزالة التكرارات
  const uniqueMovies = Array.from(
    new Map(allMovies.map(m => [m.tmdb_id, m])).values()
  ).slice(0, TEST_LIMIT);
  
  console.log(`\n📦 إجمالي العينة: ${uniqueMovies.length} فيلم فريد\n`);

  if (uniqueMovies.length === 0) {
    console.log('⚠️  لا توجد أفلام مكتملة للمزامنة');
    process.exit(0);
  }

  // فحص أي منها موجود في Turso بالفعل
  console.log('🔍 فحص الأفلام الموجودة في Turso...\n');
  const tmdbIds = uniqueMovies.map(m => m.tmdb_id).join(',');
  const tursoExisting = await turso.execute(`
    SELECT id FROM movies WHERE id IN (${tmdbIds})
  `);
  const existingIds = new Set(tursoExisting.rows.map(r => r.id));
  
  console.log(`   موجود مسبقاً: ${existingIds.size}`);
  console.log(`   جديد: ${uniqueMovies.length - existingIds.size}\n`);

  console.log('🚀 بدء المزامنة...\n');
  
  // مزامنة بدفعات صغيرة
  const BATCH_SIZE = 10;
  for (let i = 0; i < uniqueMovies.length; i += BATCH_SIZE) {
    const batch = uniqueMovies.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(m => syncMovieToTurso(m.id, m.tmdb_id, !existingIds.has(m.tmdb_id)))
    );
    
    // تأخير صغير بين الدفعات
    if (i + BATCH_SIZE < uniqueMovies.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  const elapsed = (Date.now() - stats.start) / 1000;
  
  console.log('\n' + '═'.repeat(70));
  console.log('📊 النتائج النهائية:');
  console.log(`   ✅ نجح: ${stats.movies}`);
  console.log(`   🆕 جديد (INSERT): ${stats.new_movies}`);
  console.log(`   🔄 مُحدث (UPDATE): ${stats.updated_movies}`);
  console.log(`   ❌ فشل: ${stats.errors}`);
  console.log(`   ⏱️  الوقت: ${elapsed.toFixed(1)} ثانية`);
  console.log(`   ⚡ السرعة: ${(stats.movies / elapsed).toFixed(1)} فيلم/ثانية`);
  console.log('═'.repeat(70));

  process.exit(0);
}

main().catch(e => {
  console.error('❌ خطأ فادح:', e.message);
  process.exit(1);
});
