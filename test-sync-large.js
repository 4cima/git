#!/usr/bin/env node
/**
 * ============================================
 * 🧪 اختبار المزامنة الواسع - 7000 عينة
 * ============================================
 * - 5000 فيلم متنوع
 * - 2000 مسلسل متنوع
 * - تسجيل كل الأخطاء في sync-failures.log
 * ============================================
 */

const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');
const db = require('./scripts/services/local-db');
const {
  prepareMovieForTurso,
  prepareTVSeriesForTurso
} = require('./scripts/prepare-content-for-turso');

require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const FAILURES_LOG = path.join(__dirname, 'sync-failures.log');

const stats = {
  movies: { success: 0, errors: 0, new: 0, updated: 0 },
  series: { success: 0, errors: 0, new: 0, updated: 0 },
  start: Date.now()
};

// مسح ملف الأخطاء القديم
if (fs.existsSync(FAILURES_LOG)) {
  fs.unlinkSync(FAILURES_LOG);
}

function logFailure(tmdb_id, table, error) {
  const entry = JSON.stringify({
    tmdb_id,
    table,
    error,
    timestamp: new Date().toISOString()
  }) + '\n';
  fs.appendFileSync(FAILURES_LOG, entry);
}

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

async function syncMovieToTurso(movieId, tmdbId, isNew) {
  try {
    const movie = prepareMovieForTurso(movieId);
    if (!movie) {
      logFailure(tmdbId, 'movies', 'Movie preparation failed');
      stats.movies.errors++;
      return false;
    }

    await turso.execute({
      sql: `
        INSERT INTO movies (
          id, tmdb_id, slug,
          title_en, title_ar, overview_ar, poster_path,
          release_date, release_year, vote_average, trailer_key,
          genres_json, cast_json, countries_json, keywords_json, companies_json,
          seo_title_ar, seo_description_ar, seo_keywords_json, canonical_url,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          tmdb_id = excluded.tmdb_id, slug = excluded.slug,
          title_en = excluded.title_en, title_ar = excluded.title_ar,
          overview_ar = excluded.overview_ar, poster_path = excluded.poster_path,
          release_date = excluded.release_date, release_year = excluded.release_year,
          vote_average = excluded.vote_average, trailer_key = excluded.trailer_key,
          genres_json = excluded.genres_json, cast_json = excluded.cast_json,
          countries_json = excluded.countries_json, keywords_json = excluded.keywords_json,
          companies_json = excluded.companies_json, seo_title_ar = excluded.seo_title_ar,
          seo_description_ar = excluded.seo_description_ar, seo_keywords_json = excluded.seo_keywords_json,
          canonical_url = excluded.canonical_url, updated_at = excluded.updated_at
      `,
      args: [
        movie.tmdb_id, movie.tmdb_id, movie.slug,
        movie.title_en, movie.title_ar, movie.overview_ar, movie.poster_path,
        movie.release_date, movie.release_year, movie.vote_average, movie.trailer_key,
        movie.genres_json, movie.cast_json ? limitCastJSON(movie.cast_json, 10) : null,
        movie.countries_json, movie.keywords_json, movie.companies_json,
        movie.seo_title_ar, movie.seo_description_ar, movie.seo_keywords_json, movie.canonical_url,
        movie.created_at, movie.updated_at
      ]
    });

    stats.movies.success++;
    isNew ? stats.movies.new++ : stats.movies.updated++;
    
    if (stats.movies.success % 100 === 0) {
      console.log(`🎬 ${stats.movies.success}/5000`);
    }
    
    return true;
  } catch (e) {
    logFailure(tmdbId, 'movies', e.message);
    stats.movies.errors++;
    return false;
  }
}

async function syncSeriesToTurso(seriesId, tmdbId, isNew) {
  try {
    const series = prepareTVSeriesForTurso(seriesId);
    if (!series) {
      logFailure(tmdbId, 'tv_series', 'Series preparation failed');
      stats.series.errors++;
      return false;
    }

    await turso.execute({
      sql: `
        INSERT INTO tv_series (
          id, tmdb_id, slug,
          name_en, name_ar, overview_ar, poster_path,
          first_air_date, first_air_year, vote_average,
          number_of_seasons, number_of_episodes,
          genres_json, cast_json,
          seo_title_ar, seo_description_ar, seo_keywords_json, canonical_url,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          tmdb_id = excluded.tmdb_id, slug = excluded.slug,
          name_en = excluded.name_en, name_ar = excluded.name_ar,
          overview_ar = excluded.overview_ar, poster_path = excluded.poster_path,
          first_air_date = excluded.first_air_date, first_air_year = excluded.first_air_year,
          vote_average = excluded.vote_average,
          number_of_seasons = excluded.number_of_seasons,
          number_of_episodes = excluded.number_of_episodes,
          genres_json = excluded.genres_json, cast_json = excluded.cast_json,
          seo_title_ar = excluded.seo_title_ar, seo_description_ar = excluded.seo_description_ar,
          seo_keywords_json = excluded.seo_keywords_json, canonical_url = excluded.canonical_url,
          updated_at = excluded.updated_at
      `,
      args: [
        series.tmdb_id, series.tmdb_id, series.slug,
        series.name_en, series.name_ar, series.overview_ar, series.poster_path,
        series.first_air_date, series.first_air_year, series.vote_average,
        series.number_of_seasons, series.number_of_episodes,
        series.genres_json, series.cast_json ? limitCastJSON(series.cast_json, 10) : null,
        series.seo_title_ar, series.seo_description_ar, series.seo_keywords_json, series.canonical_url,
        series.created_at, series.updated_at
      ]
    });

    stats.series.success++;
    isNew ? stats.series.new++ : stats.series.updated++;
    
    if (stats.series.success % 100 === 0) {
      console.log(`📺 ${stats.series.success}/2000`);
    }
    
    return true;
  } catch (e) {
    logFailure(tmdbId, 'tv_series', e.message);
    stats.series.errors++;
    return false;
  }
}

async function main() {
  console.log('🧪 اختبار المزامنة الواسع');
  console.log('═'.repeat(70));
  console.log('📊 الهدف: 5000 فيلم (المسلسلات لاحقاً)\n');

  // 1. الأفلام
  console.log('🎬 جلب عينة الأفلام المتنوعة...\n');
  
  const movieQueries = [
    { name: 'حديثة عالية', limit: 1000, query: `
      SELECT id, tmdb_id FROM movies 
      WHERE is_complete = 1 AND is_filtered = 0
        AND release_year >= 2020 AND vote_average >= 7.0
      ORDER BY popularity DESC LIMIT 1000
    `},
    { name: 'كلاسيكية', limit: 1000, query: `
      SELECT id, tmdb_id FROM movies 
      WHERE is_complete = 1 AND is_filtered = 0
        AND release_year < 2000 AND vote_average >= 6.0
      ORDER BY vote_average DESC LIMIT 1000
    `},
    { name: 'متوسطة', limit: 1000, query: `
      SELECT id, tmdb_id FROM movies 
      WHERE is_complete = 1 AND is_filtered = 0
        AND vote_average BETWEEN 5.0 AND 6.5
      ORDER BY RANDOM() LIMIT 1000
    `},
    { name: 'منخفضة', limit: 1000, query: `
      SELECT id, tmdb_id FROM movies 
      WHERE is_complete = 1 AND is_filtered = 0
        AND vote_average < 5.0
      ORDER BY RANDOM() LIMIT 1000
    `},
    { name: 'حديثة جداً', limit: 1000, query: `
      SELECT id, tmdb_id FROM movies 
      WHERE is_complete = 1 AND is_filtered = 0
        AND release_year >= 2024
      ORDER BY release_date DESC LIMIT 1000
    `}
  ];

  let allMovies = [];
  for (const { name, query } of movieQueries) {
    const movies = db.prepare(query).all();
    console.log(`   ${name}: ${movies.length}`);
    allMovies = allMovies.concat(movies);
  }
  
  const uniqueMovies = Array.from(
    new Map(allMovies.map(m => [m.tmdb_id, m])).values()
  ).slice(0, 5000);
  
  console.log(`\n📦 عينة الأفلام: ${uniqueMovies.length}\n`);

  console.log('🔍 فحص البيانات الموجودة في Turso...\n');
  
  const movieIds = uniqueMovies.map(m => m.tmdb_id).join(',');
  const tursoMovies = await turso.execute(`SELECT id FROM movies WHERE id IN (${movieIds})`);
  const existingMovieIds = new Set(tursoMovies.rows.map(r => r.id));
  
  console.log(`   أفلام موجودة: ${existingMovieIds.size}`);
  console.log(`   أفلام جديدة: ${uniqueMovies.length - existingMovieIds.size}\n`);

  console.log('🚀 بدء المزامنة...\n');
  
  // 4. مزامنة الأفلام
  console.log('🎬 الأفلام:');
  const BATCH_SIZE = 10;
  for (let i = 0; i < uniqueMovies.length; i += BATCH_SIZE) {
    const batch = uniqueMovies.slice(i, i + BATCH_SIZE);
    
    try {
      await Promise.all(
        batch.map(m => syncMovieToTurso(m.id, m.tmdb_id, !existingMovieIds.has(m.tmdb_id)))
      );
    } catch (e) {
      console.error(`❌ خطأ في الدفعة ${i}-${i+BATCH_SIZE}:`, e.message);
      // استمر رغم الخطأ
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  const elapsed = (Date.now() - stats.start) / 1000;
  
  console.log('\n' + '═'.repeat(70));
  console.log('📊 النتائج النهائية:\n');
  
  console.log('🎬 الأفلام:');
  console.log(`   ✅ نجح: ${stats.movies.success}`);
  console.log(`   🆕 جديد: ${stats.movies.new}`);
  console.log(`   🔄 مُحدث: ${stats.movies.updated}`);
  console.log(`   ❌ فشل: ${stats.movies.errors}`);
  
  const totalSuccess = stats.movies.success;
  const totalErrors = stats.movies.errors;
  const total = totalSuccess + totalErrors;
  const successRate = (totalSuccess / total * 100).toFixed(2);
  
  console.log('\n📊 الإجمالي:');
  console.log(`   ✅ نجح: ${totalSuccess}/${total} (${successRate}%)`);
  console.log(`   ❌ فشل: ${totalErrors}/${total}`);
  console.log(`   ⏱️  الوقت: ${elapsed.toFixed(1)} ثانية`);
  console.log(`   ⚡ السرعة: ${(totalSuccess / elapsed).toFixed(1)} عنصر/ثانية`);
  
  if (totalErrors > 0) {
    console.log(`\n📝 تم تسجيل ${totalErrors} خطأ في: sync-failures.log`);
  }
  
  console.log('═'.repeat(70));

  process.exit(0);
}

main().catch(e => {
  console.error('❌ خطأ فادح:', e.message);
  process.exit(1);
});
