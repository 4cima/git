#!/usr/bin/env node

/**
 * 🔄 Fetch Remaining Works
 * 
 * سحب الأعمال المتبقية التي لم تُسحب ولم تُفلتر
 */

import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const db = new Database('./data/4cima-local.db');

const stats = {
  movies: { total: 0, fetched: 0, filtered: 0, failed: 0 },
  series: { total: 0, fetched: 0, filtered: 0, failed: 0 },
  startTime: Date.now()
};

/**
 * Sleep function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * سحب بيانات فيلم من TMDB
 */
async function fetchMovie(id) {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${id}?api_key=${process.env.TMDB_API_KEY}&language=en-US&append_to_response=credits,keywords,videos,images,translations`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { filtered: true, reason: 'not_found' };
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // فحص البيانات الأساسية
    if (!data.title || !data.overview) {
      return { filtered: true, reason: 'no_overview' };
    }

    if (!data.poster_path) {
      return { filtered: true, reason: 'no_poster' };
    }

    // الحصول على الترجمة العربية
    const arTranslation = data.translations?.translations?.find(t => t.iso_639_1 === 'ar');
    const title_ar = arTranslation?.data?.title || data.title;
    const overview_ar = arTranslation?.data?.overview || data.overview;

    // تحديث قاعدة البيانات
    db.prepare(`
      UPDATE movies SET
        title_en = ?,
        title_ar = ?,
        overview_en = ?,
        overview_ar = ?,
        poster_path = ?,
        backdrop_path = ?,
        release_date = ?,
        vote_average = ?,
        vote_count = ?,
        popularity = ?,
        runtime = ?,
        budget = ?,
        revenue = ?,
        status = ?,
        tagline = ?,
        is_complete = 1,
        is_filtered = 0,
        filter_reason = NULL
      WHERE id = ?
    `).run(
      data.title,
      title_ar,
      data.overview,
      overview_ar,
      data.poster_path,
      data.backdrop_path,
      data.release_date || null,
      data.vote_average || 0,
      data.vote_count || 0,
      data.popularity || 0,
      data.runtime || null,
      data.budget || 0,
      data.revenue || 0,
      data.status || 'Released',
      data.tagline || null,
      id
    );

    return { success: true };
  } catch (error) {
    return { failed: true, error: error.message };
  }
}

/**
 * سحب بيانات مسلسل من TMDB
 */
async function fetchSeries(id) {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/tv/${id}?api_key=${process.env.TMDB_API_KEY}&language=en-US&append_to_response=credits,keywords,videos,images,translations`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { filtered: true, reason: 'not_found' };
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // فحص البيانات الأساسية
    if (!data.name || !data.overview) {
      return { filtered: true, reason: 'no_overview' };
    }

    if (!data.poster_path) {
      return { filtered: true, reason: 'no_poster' };
    }

    // الحصول على الترجمة العربية
    const arTranslation = data.translations?.translations?.find(t => t.iso_639_1 === 'ar');
    const title_ar = arTranslation?.data?.name || data.name;
    const overview_ar = arTranslation?.data?.overview || data.overview;

    // تحديث قاعدة البيانات
    db.prepare(`
      UPDATE tv_series SET
        title_en = ?,
        title_ar = ?,
        overview_en = ?,
        overview_ar = ?,
        poster_path = ?,
        backdrop_path = ?,
        first_air_date = ?,
        vote_average = ?,
        vote_count = ?,
        popularity = ?,
        number_of_seasons = ?,
        number_of_episodes = ?,
        status = ?,
        type = ?,
        is_complete = 1,
        is_filtered = 0,
        filter_reason = NULL
      WHERE id = ?
    `).run(
      data.name,
      title_ar,
      data.overview,
      overview_ar,
      data.poster_path,
      data.backdrop_path,
      data.first_air_date || null,
      data.vote_average || 0,
      data.vote_count || 0,
      data.popularity || 0,
      data.number_of_seasons || 0,
      data.number_of_episodes || 0,
      data.status || 'Ended',
      data.type || 'Scripted',
      id
    );

    return { success: true };
  } catch (error) {
    return { failed: true, error: error.message };
  }
}

/**
 * عرض التقدم
 */
function showProgress() {
  const elapsed = (Date.now() - stats.startTime) / 1000;
  const totalProcessed = stats.movies.fetched + stats.movies.filtered + stats.movies.failed +
                         stats.series.fetched + stats.series.filtered + stats.series.failed;
  const totalWorks = stats.movies.total + stats.series.total;
  const rate = totalProcessed / elapsed;
  const remaining = totalWorks - totalProcessed;
  const eta = remaining / rate;

  console.log(`\n📊 Progress: ${totalProcessed}/${totalWorks} (${((totalProcessed / totalWorks) * 100).toFixed(1)}%)`);
  console.log(`🎬 Movies: ✅ ${stats.movies.fetched} | 🚫 ${stats.movies.filtered} | ❌ ${stats.movies.failed}`);
  console.log(`📺 Series: ✅ ${stats.series.fetched} | 🚫 ${stats.series.filtered} | ❌ ${stats.series.failed}`);
  console.log(`⚡ Rate: ${rate.toFixed(1)} works/sec`);
  console.log(`⏱️  ETA: ${(eta / 60).toFixed(1)} minutes`);
}

/**
 * Main function
 */
async function main() {
  console.log('🔄 Fetch Remaining Works');
  console.log('=========================\n');

  // جلب الأعمال المتبقية
  const movies = db.prepare(`
    SELECT id, title_en 
    FROM movies 
    WHERE overview_en IS NULL 
    AND is_filtered = 0
  `).all();

  const series = db.prepare(`
    SELECT id, title_en 
    FROM tv_series 
    WHERE overview_ar IS NULL 
    AND is_filtered = 0
  `).all();

  stats.movies.total = movies.length;
  stats.series.total = series.length;

  console.log(`📊 Found ${stats.movies.total} movies + ${stats.series.total} series = ${stats.movies.total + stats.series.total} total\n`);

  if (stats.movies.total === 0 && stats.series.total === 0) {
    console.log('✅ No remaining works to fetch!');
    db.close();
    return;
  }

  console.log('🚀 Starting fetch...\n');

  // معالجة الأفلام
  for (const movie of movies) {
    const result = await fetchMovie(movie.id);

    if (result.success) {
      stats.movies.fetched++;
      console.log(`✅ [${stats.movies.fetched}] Movie ${movie.id}: ${movie.title_en || 'NO TITLE'}`);
    } else if (result.filtered) {
      db.prepare(`
        UPDATE movies 
        SET is_filtered = 1, 
            filter_reason = ?
        WHERE id = ?
      `).run(result.reason, movie.id);
      stats.movies.filtered++;
      console.log(`🚫 [${stats.movies.filtered}] Movie ${movie.id}: Filtered (${result.reason})`);
    } else {
      stats.movies.failed++;
      console.log(`❌ [${stats.movies.failed}] Movie ${movie.id}: Failed (${result.error})`);
    }

    // عرض التقدم كل 10 أعمال
    if ((stats.movies.fetched + stats.movies.filtered + stats.movies.failed) % 10 === 0) {
      showProgress();
    }

    // انتظار قصير لتجنب rate limiting
    await sleep(250);
  }

  // معالجة المسلسلات
  for (const s of series) {
    const result = await fetchSeries(s.id);

    if (result.success) {
      stats.series.fetched++;
      console.log(`✅ [${stats.series.fetched}] Series ${s.id}: ${s.title_en || 'NO TITLE'}`);
    } else if (result.filtered) {
      db.prepare(`
        UPDATE tv_series 
        SET is_filtered = 1, 
            filter_reason = ?
        WHERE id = ?
      `).run(result.reason, s.id);
      stats.series.filtered++;
      console.log(`🚫 [${stats.series.filtered}] Series ${s.id}: Filtered (${result.reason})`);
    } else {
      stats.series.failed++;
      console.log(`❌ [${stats.series.failed}] Series ${s.id}: Failed (${result.error})`);
    }

    // عرض التقدم كل 10 أعمال
    if ((stats.series.fetched + stats.series.filtered + stats.series.failed) % 10 === 0) {
      showProgress();
    }

    // انتظار قصير لتجنب rate limiting
    await sleep(250);
  }

  // النتائج النهائية
  const elapsed = (Date.now() - stats.startTime) / 1000;
  console.log('\n\n✅ Fetch Complete!');
  console.log('==================\n');
  
  console.log('🎬 Movies:');
  console.log(`   Total: ${stats.movies.total}`);
  console.log(`   ✅ Fetched: ${stats.movies.fetched}`);
  console.log(`   🚫 Filtered: ${stats.movies.filtered}`);
  console.log(`   ❌ Failed: ${stats.movies.failed}`);
  
  console.log('\n📺 Series:');
  console.log(`   Total: ${stats.series.total}`);
  console.log(`   ✅ Fetched: ${stats.series.fetched}`);
  console.log(`   🚫 Filtered: ${stats.series.filtered}`);
  console.log(`   ❌ Failed: ${stats.series.failed}`);
  
  console.log(`\n⏱️  Time: ${(elapsed / 60).toFixed(1)} minutes`);
  console.log(`⚡ Rate: ${((stats.movies.total + stats.series.total) / elapsed).toFixed(1)} works/sec`);

  db.close();
}

main().catch(console.error);
