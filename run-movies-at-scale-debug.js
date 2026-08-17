// Run INGEST-MOVIES at scale with DEBUG=true to capture real errors
// Limit to 2000 items to match original scale but finish in reasonable time

require('dotenv').config({ path: './.env.local' });
process.env.DEBUG = 'true';

const fs = require('fs');
const db = require('./scripts/services/local-db');
const { translateContent } = require('./scripts/services/translation-service-cjs');
const { shouldFilterContent, getFilterReason, pickDisplayCertification } = require('./scripts/services/content-filter');
const { generateCompleteSEO } = require('./scripts/services/seo-generator');
const pLimit = require('p-limit').default || require('p-limit');

const TMDB_KEY = process.env.TMDB_API_KEY || 'afef094e7c0de13c1cac98227a61da4d';
const TMDB_URL = 'https://api.themoviedb.org/3';
const CONCURRENCY = 40; // Same as original
const LIMIT = 2000; // Large enough to see pattern

const limiter = pLimit(CONCURRENCY);
const stats = { movies: 0, filtered: 0, not_found: 0, errors: 0, start: Date.now() };
const errorLog = [];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchTMDB(endpoint, params = {}, retries = 3) {
  const url = new URL(`${TMDB_URL}${endpoint}`);
  url.searchParams.set('api_key', TMDB_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url.toString());
      if (res.status === 429) {
        const wait = (attempt + 1) * 10000;
        console.log(`⏳ Rate limit - waiting ${wait / 1000}s...`);
        await sleep(wait);
        continue;
      }
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`TMDB ${res.status}: ${endpoint}`);
      return res.json();
    } catch (e) {
      if (attempt === retries - 1) throw e;
      await sleep(2000 * (attempt + 1));
    }
  }
  return null;
}

function toSlug(text) {
  if (!text) return 'unknown';
  return text.toString().toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '').trim();
}

function generateUniqueSlug(titleEn, year, table) {
  const base = toSlug(titleEn);
  if (!base || base === 'unknown') return `unknown-${Date.now()}`;
  const checks = [base, year ? `${base}-${year}` : null].filter(Boolean);
  for (const slug of checks) {
    if (!db.prepare(`SELECT tmdb_id FROM ${table} WHERE slug = ?`).get(slug)) return slug;
  }
  return `${base}-${Date.now()}`;
}

async function processMovie(tmdbId) {
  try {
    const movie = await fetchTMDB(`/movie/${tmdbId}`, {
      append_to_response: 'credits,translations,keywords,videos,release_dates'
    });

    if (!movie) {
      db.prepare(`UPDATE movies SET is_filtered=1, filter_reason='not_found_in_tmdb', is_complete=0 WHERE tmdb_id=?`).run(tmdbId);
      stats.not_found++;
      return;
    }

    if (shouldFilterContent(movie)) {
      const reason = getFilterReason(movie);
      db.prepare(`UPDATE movies SET is_filtered=1, filter_reason=?, is_complete=0 WHERE tmdb_id=?`).run(reason, tmdbId);
      stats.filtered++;
      return;
    }

    // Simplified enrichment
    const title_en = movie.title || movie.original_title;
    const release_year = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : null;
    const slug = generateUniqueSlug(title_en, release_year, 'movies');
    
    const seoData = generateCompleteSEO({
      title_ar: title_en, title_en, title_original: movie.original_title,
      overview_ar: null, release_year, primary_genre: movie.genres?.[0]?.name,
      vote_average: movie.vote_average, slug, content_type: 'movie'
    });

    db.prepare(`
      UPDATE movies SET
        title_en = ?, slug = ?, overview_en = ?,
        poster_path = ?, release_year = ?,
        vote_average = ?, vote_count = ?, popularity = ?,
        is_fetched = 1, is_filtered = 0, filter_reason = NULL,
        is_complete = 1, canonical_url = ?,
        updated_at = datetime('now')
      WHERE tmdb_id = ?
    `).run(title_en, slug, movie.overview, movie.poster_path, release_year,
      movie.vote_average, movie.vote_count, movie.popularity,
      seoData.canonical_url, tmdbId);

    stats.movies++;

  } catch (e) {
    if (e.message?.includes('404')) {
      db.prepare(`UPDATE movies SET is_filtered=1, filter_reason='not_found_in_tmdb', is_complete=0 WHERE tmdb_id=?`).run(tmdbId);
      stats.not_found++;
    } else {
      stats.errors++;
      const errorInfo = {
        tmdbId,
        message: e.message,
        stack: e.stack,
        timestamp: new Date().toISOString()
      };
      errorLog.push(errorInfo);
      console.error(`❌ فيلم ${tmdbId}: ${e.message}`);
    }
  }
}

async function main() {
  console.log(`🔍 LARGE-SCALE DEBUG RUN - ${LIMIT} items, CONCURRENCY=${CONCURRENCY}\n`);

  const movies = db.prepare(`
    SELECT tmdb_id FROM movies
    WHERE is_fetched=0 AND is_filtered=0 AND overview_en IS NULL
    ORDER BY tmdb_id
    LIMIT ?
  `).all(LIMIT);

  console.log(`Processing ${movies.length} movies...\n`);

  const batches = [];
  for (let i = 0; i < movies.length; i += 200) {
    batches.push(movies.slice(i, i + 200));
  }

  for (const batch of batches) {
    await Promise.all(batch.map(m => limiter(() => processMovie(m.tmdb_id))));
    const progress = Math.round((stats.movies + stats.filtered + stats.not_found + stats.errors) / movies.length * 100);
    console.log(`Progress: ${progress}% | Success: ${stats.movies} | Filtered: ${stats.filtered} | NotFound: ${stats.not_found} | Errors: ${stats.errors}`);
  }

  const mins = (Date.now() - stats.start) / 60000;

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 FINAL RESULTS:');
  console.log(`  ✅ Enriched: ${stats.movies}`);
  console.log(`  🚫 Filtered: ${stats.filtered}`);
  console.log(`  ❌ Not found: ${stats.not_found}`);
  console.log(`  💥 ERRORS: ${stats.errors}`);
  console.log(`  ⏱️  Time: ${mins.toFixed(1)} minutes`);

  if (stats.errors > 0) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 ERROR ANALYSIS:');
    
    // Group by error type
    const errorTypes = {};
    errorLog.forEach(e => {
      const type = e.message.split(':')[0] || 'Unknown';
      errorTypes[type] = (errorTypes[type] || 0) + 1;
    });

    console.log('\nError types:');
    Object.entries(errorTypes).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    console.log('\nFirst 10 errors with details:');
    errorLog.slice(0, 10).forEach(e => {
      console.log(`  Movie ${e.tmdbId}: ${e.message}`);
    });

    // Save full error log
    fs.writeFileSync('error-log-movies-scale.json', JSON.stringify(errorLog, null, 2));
    console.log(`\n📁 Full error log saved to: error-log-movies-scale.json`);
  } else {
    console.log('\n✅ NO ERRORS OCCURRED - All items either enriched, filtered, or not found');
  }

  // Verify is_fetched was set
  const testIds = movies.slice(0, 100).map(m => m.tmdb_id);
  const verification = db.prepare(`
    SELECT 
      SUM(CASE WHEN is_fetched=1 THEN 1 ELSE 0 END) as fetched,
      SUM(CASE WHEN is_fetched=0 THEN 1 ELSE 0 END) as unfetched
    FROM movies 
    WHERE tmdb_id IN (${testIds.join(',')})
  `).get();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 VERIFICATION (first 100 items):');
  console.log(`  is_fetched=1: ${verification.fetched}`);
  console.log(`  is_fetched=0: ${verification.unfetched}`);
}

main().catch(e => {
  console.error('FATAL ERROR:', e);
  process.exit(1);
});
