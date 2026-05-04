// fetch-missing-cast-genres.js
// محاولة سحب cast و genres الناقصة من TMDB و TVMaze

require('dotenv').config({ path: './.env.local' });
const db = require('./scripts/services/local-db');
const axios = require('axios');
const pLimit = require('p-limit').default || require('p-limit');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';
const limit = pLimit(5); // 5 طلبات متزامنة

let stats = {
  movies: { processed: 0, cast_added: 0, genres_added: 0, failed: 0 },
  series: { processed: 0, cast_added: 0, genres_added: 0, failed: 0 }
};

// ============================================================
// TMDB API Functions
// ============================================================
async function fetchTMDB(endpoint) {
  try {
    const response = await axios.get(`${TMDB_BASE}${endpoint}`, {
      params: { api_key: TMDB_API_KEY },
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    return null;
  }
}

// ============================================================
// Process Movie
// ============================================================
async function processMovie(id) {
  try {
    const movie = db.prepare('SELECT has_cast, has_genres FROM movies WHERE id = ?').get(id);
    if (!movie) return;

    let needsCast = !movie.has_cast;
    let needsGenres = !movie.has_genres;

    if (!needsCast && !needsGenres) return;

    // Fetch from TMDB
    const [details, credits] = await Promise.all([
      needsGenres ? fetchTMDB(`/movie/${id}`) : null,
      needsCast ? fetchTMDB(`/movie/${id}/credits`) : null
    ]);

    // Add cast
    if (needsCast && credits?.cast?.length > 0) {
      const insertCast = db.prepare(`
        INSERT OR IGNORE INTO cast_crew (content_id, content_type, role_type, person_id, name, character_name, profile_path, display_order)
        VALUES (?, 'movie', 'cast', ?, ?, ?, ?, ?)
      `);

      credits.cast.slice(0, 20).forEach((person, index) => {
        insertCast.run(id, person.id, person.name, person.character, person.profile_path, index);
      });

      db.prepare('UPDATE movies SET has_cast = 1 WHERE id = ?').run(id);
      stats.movies.cast_added++;
    }

    // Add genres
    if (needsGenres && details?.genres?.length > 0) {
      const genreNames = details.genres.map(g => g.name).join(', ');
      db.prepare('UPDATE movies SET primary_genre = ?, has_genres = 1 WHERE id = ?').run(genreNames, id);
      stats.movies.genres_added++;
    }

    stats.movies.processed++;
    if (stats.movies.processed % 100 === 0) {
      process.stdout.write(`\r🎬 أفلام: ${stats.movies.processed} | cast: ${stats.movies.cast_added} | genres: ${stats.movies.genres_added}`);
    }

  } catch (error) {
    stats.movies.failed++;
  }
}

// ============================================================
// Process Series
// ============================================================
async function processSeries(id) {
  try {
    const series = db.prepare('SELECT has_cast, has_genres FROM tv_series WHERE id = ?').get(id);
    if (!series) return;

    let needsCast = !series.has_cast;
    let needsGenres = !series.has_genres;

    if (!needsCast && !needsGenres) return;

    // Fetch from TMDB
    const [details, credits] = await Promise.all([
      needsGenres ? fetchTMDB(`/tv/${id}`) : null,
      needsCast ? fetchTMDB(`/tv/${id}/credits`) : null
    ]);

    // Add cast
    if (needsCast && credits?.cast?.length > 0) {
      const insertCast = db.prepare(`
        INSERT OR IGNORE INTO cast_crew (content_id, content_type, role_type, person_id, name, character_name, profile_path, display_order)
        VALUES (?, 'tv', 'cast', ?, ?, ?, ?, ?)
      `);

      credits.cast.slice(0, 20).forEach((person, index) => {
        insertCast.run(id, person.id, person.name, person.character, person.profile_path, index);
      });

      db.prepare('UPDATE tv_series SET has_cast = 1 WHERE id = ?').run(id);
      stats.series.cast_added++;
    }

    // Add genres
    if (needsGenres && details?.genres?.length > 0) {
      const genreNames = details.genres.map(g => g.name).join(', ');
      db.prepare('UPDATE tv_series SET primary_genre = ?, has_genres = 1 WHERE id = ?').run(genreNames, id);
      stats.series.genres_added++;
    }

    stats.series.processed++;
    if (stats.series.processed % 100 === 0) {
      process.stdout.write(`\r📺 مسلسلات: ${stats.series.processed} | cast: ${stats.series.cast_added} | genres: ${stats.series.genres_added}`);
    }

  } catch (error) {
    stats.series.failed++;
  }
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log('🚀 بدء سحب البيانات الناقصة من TMDB...\n');

  // Get incomplete movies needing cast or genres
  const movies = db.prepare(`
    SELECT id FROM movies
    WHERE overview_en IS NOT NULL 
      AND is_filtered = 0 
      AND is_complete = 0
      AND (has_cast = 0 OR has_genres = 0)
    ORDER BY vote_count DESC
    LIMIT 5000
  `).all();

  console.log(`📊 أفلام للمعالجة: ${movies.length.toLocaleString()}\n`);

  // Process movies
  await Promise.all(movies.map(m => limit(() => processMovie(m.id))));
  console.log('\n✅ انتهى معالجة الأفلام\n');

  // Get incomplete series needing cast or genres
  const series = db.prepare(`
    SELECT id FROM tv_series
    WHERE overview_en IS NOT NULL 
      AND is_filtered = 0 
      AND is_complete = 0
      AND (has_cast = 0 OR has_genres = 0)
    ORDER BY vote_count DESC
    LIMIT 5000
  `).all();

  console.log(`📊 مسلسلات للمعالجة: ${series.length.toLocaleString()}\n`);

  // Process series
  await Promise.all(series.map(s => limit(() => processSeries(s.id))));
  console.log('\n✅ انتهى معالجة المسلسلات\n');

  // Final stats
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 النتائج النهائية:\n');
  console.log('🎬 الأفلام:');
  console.log(`   معالج: ${stats.movies.processed.toLocaleString()}`);
  console.log(`   ✅ cast مضاف: ${stats.movies.cast_added.toLocaleString()}`);
  console.log(`   ✅ genres مضاف: ${stats.movies.genres_added.toLocaleString()}`);
  console.log(`   ❌ فشل: ${stats.movies.failed.toLocaleString()}\n`);

  console.log('📺 المسلسلات:');
  console.log(`   معالج: ${stats.series.processed.toLocaleString()}`);
  console.log(`   ✅ cast مضاف: ${stats.series.cast_added.toLocaleString()}`);
  console.log(`   ✅ genres مضاف: ${stats.series.genres_added.toLocaleString()}`);
  console.log(`   ❌ فشل: ${stats.series.failed.toLocaleString()}`);

  db.close();
}

main().catch(console.error);
