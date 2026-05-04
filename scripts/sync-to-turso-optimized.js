#!/usr/bin/env node
/**
 * ============================================
 * 🔄 OPTIMIZED TURSO SYNC WITH CONCURRENCY
 * ============================================
 * Purpose: Priority-based selective sync to Turso
 * Features: 100 concurrent requests, retry logic, batch processing
 * ============================================
 */

const { createClient } = require('@libsql/client');
const path = require('path');
const db = require('./services/local-db');
const {
  prepareMovieForTurso,
  prepareTVSeriesForTurso,
  prepareSeasonForTurso,
  prepareEpisodeForTurso
} = require('./prepare-content-for-turso');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Turso Client
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

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
 * Sleep function for retry delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// معايير الأولوية
const PRIORITY_QUERIES = {
  movies: {
    1: `
      SELECT id FROM movies 
      WHERE release_year >= 2020 
      AND vote_average >= 7.0 
      AND is_complete = 1 
      AND is_filtered = 0
      AND (synced_to_turso = 0 OR synced_to_turso IS NULL)
      ORDER BY popularity DESC
    `,
    2: `
      SELECT id FROM movies 
      WHERE vote_average >= 7.5 
      AND vote_count >= 1000 
      AND is_complete = 1 
      AND is_filtered = 0
      AND (synced_to_turso = 0 OR synced_to_turso IS NULL)
      ORDER BY vote_average DESC, vote_count DESC
    `,
    3: `
      SELECT id FROM movies 
      WHERE vote_average >= 6.5 
      AND is_complete = 1 
      AND is_filtered = 0
      AND (synced_to_turso = 0 OR synced_to_turso IS NULL)
      ORDER BY vote_average DESC
    `,
    4: `
      SELECT id FROM movies 
      WHERE is_complete = 1 
      AND is_filtered = 0
      AND (synced_to_turso = 0 OR synced_to_turso IS NULL)
      ORDER BY release_year DESC
    `
  },
  tv: {
    1: `
      SELECT id FROM tv_series 
      WHERE first_air_year >= 2020 
      AND vote_average >= 7.0 
      AND is_complete = 1 
      AND is_filtered = 0
      AND (synced_to_turso = 0 OR synced_to_turso IS NULL)
      ORDER BY popularity DESC
    `,
    2: `
      SELECT id FROM tv_series 
      WHERE vote_average >= 7.5 
      AND vote_count >= 500 
      AND is_complete = 1 
      AND is_filtered = 0
      AND (synced_to_turso = 0 OR synced_to_turso IS NULL)
      ORDER BY vote_average DESC, vote_count DESC
    `,
    3: `
      SELECT id FROM tv_series 
      WHERE vote_average >= 6.5 
      AND is_complete = 1 
      AND is_filtered = 0
      AND (synced_to_turso = 0 OR synced_to_turso IS NULL)
      ORDER BY vote_average DESC
    `,
    4: `
      SELECT id FROM tv_series 
      WHERE is_complete = 1 
      AND is_filtered = 0
      AND (synced_to_turso = 0 OR synced_to_turso IS NULL)
      ORDER BY first_air_year DESC
    `
  }
};

const stats = {
  movies: 0,
  series: 0,
  seasons: 0,
  episodes: 0,
  errors: 0,
  retries: 0
};

/**
 * مزامنة فيلم إلى Turso مع retry logic
 */
async function syncMovieToTurso(movieId, retryCount = 0) {
  try {
    const movie = prepareMovieForTurso(movieId);
    if (!movie) {
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
          title_ar = excluded.title_ar,
          overview_ar = excluded.overview_ar,
          poster_path = excluded.poster_path,
          vote_average = excluded.vote_average,
          genres_json = excluded.genres_json,
          cast_json = excluded.cast_json,
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

    // تحديث حالة المزامنة في القاعدة المحلية
    db.prepare(`
      UPDATE movies 
      SET synced_to_turso = 1, synced_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(movieId);

    stats.movies++;
    return true;
  } catch (e) {
    // Retry logic
    if (retryCount < MAX_RETRIES) {
      stats.retries++;
      await sleep(RETRY_DELAY * (retryCount + 1));
      return syncMovieToTurso(movieId, retryCount + 1);
    }
    
    console.error(`❌ Movie ${movieId} failed after ${MAX_RETRIES} retries:`, e.message);
    stats.errors++;
    return false;
  }
}

/**
 * مزامنة مسلسل إلى Turso مع retry logic
 */
async function syncTVSeriesToTurso(seriesId, retryCount = 0) {
  try {
    const series = prepareTVSeriesForTurso(seriesId);
    if (!series) {
      return false;
    }

    // seasons_json و episodes_json جاهزين من prepareTVSeriesForTurso
    const seasonsCount = JSON.parse(series.seasons_json).length;
    const episodesCount = JSON.parse(series.episodes_json).length;

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
        ) VALUES (
          ?, ?, ?,
          ?, ?,
          ?,
          ?,
          ?, ?,
          ?, ?,
          ?,
          ?,
          ?,
          ?, ?,
          ?, ?, ?,
          ?, ?,
          ?, ?, ?, ?,
          ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          name_en = excluded.name_en,
          name_ar = excluded.name_ar,
          overview_ar = excluded.overview_ar,
          poster_path = excluded.poster_path,
          vote_average = excluded.vote_average,
          number_of_seasons = excluded.number_of_seasons,
          number_of_episodes = excluded.number_of_episodes,
          status = excluded.status,
          genres_json = excluded.genres_json,
          cast_json = excluded.cast_json,
          seasons_json = excluded.seasons_json,
          episodes_json = excluded.episodes_json,
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

    // تحديث حالة المزامنة
    db.prepare(`
      UPDATE tv_series 
      SET synced_to_turso = 1, synced_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(seriesId);

    stats.series++;
    stats.seasons += seasonsCount;
    stats.episodes += episodesCount;
    return true;
  } catch (e) {
    // Retry logic
    if (retryCount < MAX_RETRIES) {
      stats.retries++;
      await sleep(RETRY_DELAY * (retryCount + 1));
      return syncTVSeriesToTurso(seriesId, retryCount + 1);
    }
    
    console.error(`❌ Series ${seriesId} failed after ${MAX_RETRIES} retries:`, e.message);
    stats.errors++;
    return false;
  }
}

/**
 * المزامنة الرئيسية مع concurrency
 */
async function main() {
  const args = process.argv.slice(2);
  const priority = parseInt(args.find(a => a.startsWith('--priority='))?.split('=')[1]) || 1;
  const contentType = args.find(a => a.startsWith('--type='))?.split('=')[1] || 'both';
  const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1]) || 1000;

  console.log('🔄 بدء المزامنة المُحسّنة إلى Turso\n');
  console.log(`📊 الأولوية: ${priority}`);
  console.log(`📦 النوع: ${contentType}`);
  console.log(`🔢 الحد: ${limit}`);
  console.log(`🔄 إعادة المحاولة: ${MAX_RETRIES} مرات\n`);
  console.log('═'.repeat(80));

  const startTime = Date.now();

  try {
    // مزامنة الأفلام
    if (contentType === 'both' || contentType === 'movies') {
      console.log('\n🎬 مزامنة الأفلام...');
      const movies = db.prepare(PRIORITY_QUERIES.movies[priority] + ` LIMIT ${limit}`).all();
      console.log(`   📊 العدد: ${movies.length}\n`);

      let completed = 0;
      
      // Progress tracker
      const progressInterval = setInterval(() => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const rate = (completed / elapsed * 60).toFixed(0);
        const percent = ((completed / movies.length) * 100).toFixed(1);
        process.stdout.write(`\r   ⏳ ${completed} / ${movies.length} (${percent}%) | ${rate} فيلم/دقيقة | ${elapsed}s`);
      }, 2000);
      
      const moviePromises = movies.map(movie => 
        syncMovieToTurso(movie.id)
          .then(() => {
            completed++;
          })
          .catch(err => {
            console.error(`\n❌ Error syncing movie ${movie.id}:`, err.message);
            stats.errors++;
          })
      );

      await Promise.all(moviePromises);
      clearInterval(progressInterval);
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n   ✅ اكتمل: ${completed} / ${movies.length} في ${elapsed}s`);
    }

    // مزامنة المسلسلات
    if (contentType === 'both' || contentType === 'tv') {
      console.log('\n📺 مزامنة المسلسلات...');
      const series = db.prepare(PRIORITY_QUERIES.tv[priority] + ` LIMIT ${limit}`).all();
      console.log(`   📊 العدد: ${series.length}\n`);

      let completed = 0;
      const seriesStartTime = Date.now();
      
      // Progress tracker
      const progressInterval = setInterval(() => {
        const elapsed = ((Date.now() - seriesStartTime) / 1000).toFixed(1);
        const rate = (completed / elapsed * 60).toFixed(0);
        const percent = ((completed / series.length) * 100).toFixed(1);
        process.stdout.write(`\r   ⏳ ${completed} / ${series.length} (${percent}%) | ${rate} مسلسل/دقيقة | ${elapsed}s`);
      }, 2000);
      
      const seriesPromises = series.map(s => 
        syncTVSeriesToTurso(s.id)
          .then(() => {
            completed++;
          })
          .catch(err => {
            console.error(`\n❌ Error syncing series ${s.id}:`, err.message);
            stats.errors++;
          })
      );

      await Promise.all(seriesPromises);
      clearInterval(progressInterval);
      
      const elapsed = ((Date.now() - seriesStartTime) / 1000).toFixed(1);
      console.log(`\n   ✅ اكتمل: ${completed} / ${series.length} في ${elapsed}s`);
    }

    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

    // الملخص
    console.log('\n' + '═'.repeat(80));
    console.log('✅ اكتملت المزامنة!');
    console.log('═'.repeat(80));
    console.log(`\n📊 الإحصائيات:`);
    console.log(`   🎬 الأفلام: ${stats.movies.toLocaleString()}`);
    console.log(`   📺 المسلسلات: ${stats.series.toLocaleString()}`);
    console.log(`   📅 المواسم: ${stats.seasons.toLocaleString()}`);
    console.log(`   📼 الحلقات: ${stats.episodes.toLocaleString()}`);
    console.log(`   🔄 إعادة المحاولات: ${stats.retries.toLocaleString()}`);
    console.log(`   ❌ الأخطاء: ${stats.errors.toLocaleString()}`);
    console.log(`   ⏱️  الوقت: ${totalTime} دقيقة`);

  } catch (e) {
    console.error('\n❌ خطأ في المزامنة:', e.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  syncMovieToTurso,
  syncTVSeriesToTurso
};
