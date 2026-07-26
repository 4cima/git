#!/usr/bin/env node
/**
 * 🚀 ULTRA FAST TURSO SYNC - BATCH API (FIXED)
 * التعديلات:
 * 1. UPSERT على tmdb_id بدل id
 * 2. معالجة تصادم slug
 * 3. منع فقد الدفعات (fallback splitting)
 */

const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');
const db = require('./services/local-db');
const {
  prepareMovieForTurso,
  prepareTVSeriesForTurso
} = require('./prepare-content-for-turso');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const BATCH_SIZE = 100;
const CONCURRENT_BATCHES = 10;
const MAX_RETRIES = 3;
const FAILURES_LOG = path.join(__dirname, '..', 'turso-sync-failures.jsonl');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const stats = {
  movies: 0,
  series: 0,
  seasons: 0,
  episodes: 0,
  errors: 0,
  retries: 0,
  batches: 0,
  slugConflicts: 0,
  failures: 0
};

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
 * تسجيل الفشل في ملف
 */
function logFailure(tmdb_id, slug, error) {
  const entry = JSON.stringify({ tmdb_id, slug, error, timestamp: new Date().toISOString() }) + '\n';
  fs.appendFileSync(FAILURES_LOG, entry);
  stats.failures++;
}

/**
 * محاولة إدراج سجل واحد مع معالجة تصادم slug
 */
async function insertSingleMovie(movie, retryWithAltSlug = false) {
  const slug = retryWithAltSlug ? `${movie.slug}-${movie.tmdb_id}` : movie.slug;
  
  try {
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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(tmdb_id) DO UPDATE SET
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
        movie.id, movie.tmdb_id, slug,
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
    return true;
  } catch (e) {
    if (e.message.includes('UNIQUE') && e.message.includes('slug') && !retryWithAltSlug) {
      // محاولة مع slug بديل
      stats.slugConflicts++;
      return insertSingleMovie(movie, true);
    }
    throw e;
  }
}

/**
 * معالجة دفعة مع fallback splitting
 */
async function syncMoviesBatchWithFallback(movieIds, depth = 0) {
  if (movieIds.length === 0) return 0;
  
  // إذا وصلنا لسجل واحد، نحاول إدراجه مباشرة
  if (movieIds.length === 1) {
    const movie = prepareMovieForTurso(movieIds[0]);
    if (!movie) return 0;
    
    try {
      await insertSingleMovie(movie);
      
      // تحديث حالة المزامنة
      db.prepare(`UPDATE movies SET synced_to_turso = 1, synced_at = CURRENT_TIMESTAMP WHERE id = ?`).run(movieIds[0]);
      
      stats.movies++;
      return 1;
    } catch (e) {
      logFailure(movie.tmdb_id, movie.slug, e.message);
      stats.errors++;
      return 0;
    }
  }
  
  // محاولة الدفعة كاملة
  try {
    const statements = [];
    const successIds = [];
    const moviesData = [];

    for (const movieId of movieIds) {
      const movie = prepareMovieForTurso(movieId);
      if (!movie) continue;

      statements.push({
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
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(tmdb_id) DO UPDATE SET
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
          movie.id, movie.tmdb_id, movie.slug,
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
      successIds.push(movieId);
      moviesData.push(movie);
    }

    if (statements.length === 0) return 0;

    // محاولة batch
    await turso.batch(statements, 'write');

    // نجحت الدفعة - تحديث الحالة
    const placeholders = successIds.map(() => '?').join(',');
    db.prepare(`
      UPDATE movies 
      SET synced_to_turso = 1, synced_at = CURRENT_TIMESTAMP 
      WHERE id IN (${placeholders})
    `).run(...successIds);

    stats.movies += successIds.length;
    stats.batches++;
    return successIds.length;

  } catch (e) {
    // فشلت الدفعة - نقسمها نصفين
    if (depth < 10) { // حد أقصى للعمق لتجنب infinite recursion
      const mid = Math.floor(movieIds.length / 2);
      const first = movieIds.slice(0, mid);
      const second = movieIds.slice(mid);
      
      const count1 = await syncMoviesBatchWithFallback(first, depth + 1);
      const count2 = await syncMoviesBatchWithFallback(second, depth + 1);
      
      return count1 + count2;
    } else {
      // وصلنا للحد الأقصى - نسجل الفشل
      for (const movieId of movieIds) {
        const movie = prepareMovieForTurso(movieId);
        if (movie) {
          logFailure(movie.tmdb_id, movie.slug, 'Max depth reached');
        }
      }
      stats.errors += movieIds.length;
      return 0;
    }
  }
}

/**
 * مزامنة دفعة من المسلسلات (نفس المنطق)
 */
async function syncSeriesBatchWithFallback(seriesIds, depth = 0) {
  if (seriesIds.length === 0) return { count: 0, seasons: 0, episodes: 0 };
  
  if (seriesIds.length === 1) {
    const series = prepareTVSeriesForTurso(seriesIds[0]);
    if (!series) return { count: 0, seasons: 0, episodes: 0 };
    
    const seasonsCount = JSON.parse(series.seasons_json).length;
    const episodesCount = JSON.parse(series.episodes_json).length;
    
    try {
      await turso.execute({
        sql: `
          INSERT INTO tv_series (
            id, tmdb_id, slug,
            name_en, name_ar,
            overview_ar,
            poster_path,
            first_air_date, first_air_year,
            number_of_seasons, number_of_episodes,
            status,
            vote_average,
            trailer_key,
            genres_json, cast_json,
            countries_json, keywords_json, networks_json,
            seasons_json, episodes_json,
            seo_title_ar, seo_description_ar, seo_keywords_json, canonical_url,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(tmdb_id) DO UPDATE SET
            slug = excluded.slug,
            name_en = excluded.name_en,
            name_ar = excluded.name_ar,
            overview_ar = excluded.overview_ar,
            poster_path = excluded.poster_path,
            first_air_date = excluded.first_air_date,
            first_air_year = excluded.first_air_year,
            number_of_seasons = excluded.number_of_seasons,
            number_of_episodes = excluded.number_of_episodes,
            status = excluded.status,
            vote_average = excluded.vote_average,
            trailer_key = excluded.trailer_key,
            genres_json = excluded.genres_json,
            cast_json = excluded.cast_json,
            countries_json = excluded.countries_json,
            keywords_json = excluded.keywords_json,
            networks_json = excluded.networks_json,
            seasons_json = excluded.seasons_json,
            episodes_json = excluded.episodes_json,
            seo_title_ar = excluded.seo_title_ar,
            seo_description_ar = excluded.seo_description_ar,
            seo_keywords_json = excluded.seo_keywords_json,
            canonical_url = excluded.canonical_url,
            updated_at = excluded.updated_at
        `,
        args: [
          series.id, series.tmdb_id, series.slug,
          series.name_en, series.name_ar,
          series.overview_ar,
          series.poster_path,
          series.first_air_date, series.first_air_year,
          series.number_of_seasons, series.number_of_episodes,
          series.status,
          series.vote_average,
          series.trailer_key,
          series.genres_json,
          series.cast_json ? limitCastJSON(series.cast_json, 10) : null,
          series.countries_json, series.keywords_json, series.networks_json,
          series.seasons_json, series.episodes_json,
          series.seo_title_ar, series.seo_description_ar, series.seo_keywords_json, series.canonical_url,
          series.created_at, series.updated_at
        ]
      });
      
      db.prepare(`UPDATE tv_series SET synced_to_turso = 1, synced_at = CURRENT_TIMESTAMP WHERE id = ?`).run(seriesIds[0]);
      
      stats.series++;
      stats.seasons += seasonsCount;
      stats.episodes += episodesCount;
      return { count: 1, seasons: seasonsCount, episodes: episodesCount };
    } catch (e) {
      logFailure(series.tmdb_id, series.slug, e.message);
      stats.errors++;
      return { count: 0, seasons: 0, episodes: 0 };
    }
  }
  
  // محاولة الدفعة كاملة
  try {
    const statements = [];
    const successIds = [];
    let totalSeasons = 0;
    let totalEpisodes = 0;

    for (const seriesId of seriesIds) {
      const series = prepareTVSeriesForTurso(seriesId);
      if (!series) continue;

      const seasonsCount = JSON.parse(series.seasons_json).length;
      const episodesCount = JSON.parse(series.episodes_json).length;
      totalSeasons += seasonsCount;
      totalEpisodes += episodesCount;

      statements.push({
        sql: `
          INSERT INTO tv_series (
            id, tmdb_id, slug,
            name_en, name_ar,
            overview_ar,
            poster_path,
            first_air_date, first_air_year,
            number_of_seasons, number_of_episodes,
            status,
            vote_average,
            trailer_key,
            genres_json, cast_json,
            countries_json, keywords_json, networks_json,
            seasons_json, episodes_json,
            seo_title_ar, seo_description_ar, seo_keywords_json, canonical_url,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(tmdb_id) DO UPDATE SET
            slug = excluded.slug,
            name_en = excluded.name_en,
            name_ar = excluded.name_ar,
            overview_ar = excluded.overview_ar,
            poster_path = excluded.poster_path,
            first_air_date = excluded.first_air_date,
            first_air_year = excluded.first_air_year,
            number_of_seasons = excluded.number_of_seasons,
            number_of_episodes = excluded.number_of_episodes,
            status = excluded.status,
            vote_average = excluded.vote_average,
            trailer_key = excluded.trailer_key,
            genres_json = excluded.genres_json,
            cast_json = excluded.cast_json,
            countries_json = excluded.countries_json,
            keywords_json = excluded.keywords_json,
            networks_json = excluded.networks_json,
            seasons_json = excluded.seasons_json,
            episodes_json = excluded.episodes_json,
            seo_title_ar = excluded.seo_title_ar,
            seo_description_ar = excluded.seo_description_ar,
            seo_keywords_json = excluded.seo_keywords_json,
            canonical_url = excluded.canonical_url,
            updated_at = excluded.updated_at
        `,
        args: [
          series.id, series.tmdb_id, series.slug,
          series.name_en, series.name_ar,
          series.overview_ar,
          series.poster_path,
          series.first_air_date, series.first_air_year,
          series.number_of_seasons, series.number_of_episodes,
          series.status,
          series.vote_average,
          series.trailer_key,
          series.genres_json,
          series.cast_json ? limitCastJSON(series.cast_json, 10) : null,
          series.countries_json, series.keywords_json, series.networks_json,
          series.seasons_json, series.episodes_json,
          series.seo_title_ar, series.seo_description_ar, series.seo_keywords_json, series.canonical_url,
          series.created_at, series.updated_at
        ]
      });
      successIds.push(seriesId);
    }

    if (statements.length === 0) return { count: 0, seasons: 0, episodes: 0 };

    await turso.batch(statements, 'write');

    const placeholders = successIds.map(() => '?').join(',');
    db.prepare(`
      UPDATE tv_series 
      SET synced_to_turso = 1, synced_at = CURRENT_TIMESTAMP 
      WHERE id IN (${placeholders})
    `).run(...successIds);

    stats.series += successIds.length;
    stats.seasons += totalSeasons;
    stats.episodes += totalEpisodes;
    stats.batches++;

    return { count: successIds.length, seasons: totalSeasons, episodes: totalEpisodes };

  } catch (e) {
    if (depth < 10) {
      const mid = Math.floor(seriesIds.length / 2);
      const first = seriesIds.slice(0, mid);
      const second = seriesIds.slice(mid);
      
      const result1 = await syncSeriesBatchWithFallback(first, depth + 1);
      const result2 = await syncSeriesBatchWithFallback(second, depth + 1);
      
      return {
        count: result1.count + result2.count,
        seasons: result1.seasons + result2.seasons,
        episodes: result1.episodes + result2.episodes
      };
    } else {
      for (const seriesId of seriesIds) {
        const series = prepareTVSeriesForTurso(seriesId);
        if (series) {
          logFailure(series.tmdb_id, series.slug, 'Max depth reached');
        }
      }
      stats.errors += seriesIds.length;
      return { count: 0, seasons: 0, episodes: 0 };
    }
  }
}

/**
 * معالجة متوازية للدفعات
 */
async function processConcurrentBatches(allIds, type, totalCount) {
  const startTime = Date.now();
  let processed = 0;

  const batches = [];
  for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
    batches.push(allIds.slice(i, i + BATCH_SIZE));
  }

  console.log(`   📦 إجمالي الدفعات: ${batches.length.toLocaleString()}`);
  console.log(`   ⚡ دفعات متزامنة: ${CONCURRENT_BATCHES}\n`);

  for (let i = 0; i < batches.length; i += CONCURRENT_BATCHES) {
    const currentBatches = batches.slice(i, i + CONCURRENT_BATCHES);
    
    const results = await Promise.all(
      currentBatches.map(batch => 
        type === 'movie' ? syncMoviesBatchWithFallback(batch) : syncSeriesBatchWithFallback(batch)
      )
    );

    if (type === 'movie') {
      processed += results.reduce((sum, count) => sum + count, 0);
    } else {
      processed += results.reduce((sum, r) => sum + r.count, 0);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const rate = (processed / elapsed * 60).toFixed(0);
    const percent = ((processed / totalCount) * 100).toFixed(1);
    const eta = ((totalCount - processed) / (processed / elapsed) / 60).toFixed(0);
    
    process.stdout.write(`\r   ⏳ ${processed.toLocaleString()} / ${totalCount.toLocaleString()} (${percent}%) | ${rate}/دقيقة | ETA: ${eta} دقيقة`);
  }

  console.log('');
}

async function main() {
  console.log('🚀 مزامنة Turso فائقة السرعة - FIXED VERSION\n');
  console.log('═'.repeat(80));
  console.log(`⚡ حجم الدفعة: ${BATCH_SIZE}`);
  console.log(`🔥 دفعات متزامنة: ${CONCURRENT_BATCHES}`);
  console.log(`🛡️  معالجة تصادم slug: نعم`);
  console.log(`🔄 Fallback splitting: نعم`);
  console.log(`📝 ملف الفشل: ${FAILURES_LOG}\n`);
  console.log('═'.repeat(80));

  const startTime = Date.now();

  try {
    // مزامنة الأفلام
    console.log('\n🎬 مزامنة الأفلام...');
    const movies = db.prepare(`
      SELECT id FROM movies 
      WHERE is_complete = 1 AND is_filtered = 0 
      AND (synced_to_turso = 0 OR synced_to_turso IS NULL)
      ORDER BY release_year DESC
    `).all();
    
    console.log(`   📊 إجمالي: ${movies.length.toLocaleString()}`);

    if (movies.length > 0) {
      await processConcurrentBatches(movies.map(m => m.id), 'movie', movies.length);
    }

    // مزامنة المسلسلات
    console.log('\n\n📺 مزامنة المسلسلات...');
    const series = db.prepare(`
      SELECT id FROM tv_series 
      WHERE is_complete = 1 AND is_filtered = 0 
      AND (synced_to_turso = 0 OR synced_to_turso IS NULL)
      ORDER BY first_air_year DESC
    `).all();
    
    console.log(`   📊 إجمالي: ${series.length.toLocaleString()}`);

    if (series.length > 0) {
      await processConcurrentBatches(series.map(s => s.id), 'series', series.length);
    }

    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

    console.log('\n' + '═'.repeat(80));
    console.log('✅ اكتملت المزامنة!');
    console.log('═'.repeat(80));
    console.log(`\n📊 الإحصائيات:`);
    console.log(`   🎬 الأفلام: ${stats.movies.toLocaleString()}`);
    console.log(`   📺 المسلسلات: ${stats.series.toLocaleString()}`);
    console.log(`   📅 المواسم: ${stats.seasons.toLocaleString()}`);
    console.log(`   📼 الحلقات: ${stats.episodes.toLocaleString()}`);
    console.log(`   📦 الدفعات: ${stats.batches.toLocaleString()}`);
    console.log(`   🔄 تصادم slug: ${stats.slugConflicts.toLocaleString()}`);
    console.log(`   ❌ الأخطاء: ${stats.errors.toLocaleString()}`);
    console.log(`   📝 الفشل المسجل: ${stats.failures.toLocaleString()}`);
    console.log(`   ⏱️  الوقت: ${totalTime} دقيقة`);
    console.log(`   ⚡ السرعة: ${((stats.movies + stats.series) / totalTime).toFixed(0)} عمل/دقيقة\n`);

  } catch (e) {
    console.error('\n❌ خطأ:', e.message);
    process.exit(1);
  }
}

main();
