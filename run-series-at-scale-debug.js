// Run INGEST-SERIES at scale with DEBUG=true to capture real errors
// 1000+ items with CONCURRENCY=1 (series-specific rate limit)

require('dotenv').config({ path: './.env.local' });
process.env.DEBUG = 'true';

const fs = require('fs');
const db = require('./scripts/services/local-db');
const { translateContent } = require('./scripts/services/translation-service-cjs');
const { shouldFilterContent, getFilterReason, pickDisplayCertification } = require('./scripts/services/content-filter');
const { generateCompleteSEO } = require('./scripts/services/seo-generator');
const pLimit = require('p-limit').default || require('p-limit');

const TMDB_KEY = process.env.TMDB_API_KEY_2 || '1298554bf3b09eee57972f0876ad096e';
const TMDB_URL = 'https://api.themoviedb.org/3';
const CONCURRENCY = 1; // Series-specific rate limit
const SEASON_CONCURRENCY = 10;
const LIMIT = 1000; // Large enough to see pattern

const seriesLimiter = pLimit(CONCURRENCY);
const seasonLimiter = pLimit(SEASON_CONCURRENCY);

const stats = { 
  series: 0, seasons: 0, episodes: 0,
  filtered: 0, not_found: 0, errors: 0, 
  start: Date.now() 
};
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

async function processSeries(tmdbId) {
  try {
    const series = await fetchTMDB(`/tv/${tmdbId}`, {
      append_to_response: 'credits,translations,keywords,videos,external_ids,content_ratings'
    });

    if (!series) {
      db.prepare(`UPDATE tv_series SET is_filtered=1, filter_reason='not_found_in_tmdb', is_complete=0 WHERE tmdb_id=?`).run(tmdbId);
      stats.not_found++;
      return;
    }

    if (shouldFilterContent(series)) {
      const reason = getFilterReason(series);
      db.prepare(`UPDATE tv_series SET is_filtered=1, filter_reason=?, is_complete=0 WHERE tmdb_id=?`).run(reason, tmdbId);
      stats.filtered++;
      return;
    }

    // Simplified enrichment (no full translation pipeline)
    const title_en = series.name || series.original_name;
    const first_air_year = series.first_air_date ? parseInt(series.first_air_date.split('-')[0]) : null;
    const slug = generateUniqueSlug(title_en, first_air_year, 'tv_series');
    
    const seoData = generateCompleteSEO({
      title_ar: title_en, title_en, title_original: series.original_name,
      overview_ar: null, first_air_year, primary_genre: series.genres?.[0]?.name,
      vote_average: series.vote_average, slug, content_type: 'series'
    });

    db.prepare(`
      UPDATE tv_series SET
        name_en = ?, slug = ?, overview_en = ?,
        poster_path = ?, first_air_year = ?,
        number_of_seasons = ?, number_of_episodes = ?,
        vote_average = ?, vote_count = ?, popularity = ?,
        is_fetched = 1, is_filtered = 0, filter_reason = NULL,
        is_complete = 1, canonical_url = ?,
        updated_at = datetime('now')
      WHERE tmdb_id = ?
    `).run(title_en, slug, series.overview, series.poster_path, first_air_year,
      series.number_of_seasons, series.number_of_episodes,
      series.vote_average, series.vote_count, series.popularity,
      seoData.canonical_url, tmdbId);

    // Process seasons (simplified - no episodes)
    const validSeasons = (series.seasons || []).filter(s => s.season_number > 0);
    const insertSeason = db.prepare(`
      INSERT OR IGNORE INTO seasons
      (series_tmdb_id, season_number, name_en, overview_en,
       poster_path, air_date, air_year, episode_count)
      VALUES (?,?,?,?,?,?,?,?)
    `);

    for (const season of validSeasons) {
      insertSeason.run(
        tmdbId, season.season_number,
        season.name, season.overview,
        season.poster_path, season.air_date,
        season.air_date ? parseInt(season.air_date.split('-')[0]) : null,
        season.episode_count || 0
      );
      stats.seasons++;
    }

    stats.series++;

  } catch (e) {
    if (e.message?.includes('404')) {
      db.prepare(`UPDATE tv_series SET is_filtered=1, filter_reason='not_found_in_tmdb', is_complete=0 WHERE tmdb_id=?`).run(tmdbId);
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
      console.error(`❌ مسلسل ${tmdbId}: ${e.message}`);
    }
  }
}

async function main() {
  console.log(`🔍 LARGE-SCALE SERIES DEBUG RUN - ${LIMIT} items, CONCURRENCY=${CONCURRENCY}\n`);

  const series = db.prepare(`
    SELECT tmdb_id FROM tv_series
    WHERE is_fetched=0 AND is_filtered=0 AND overview_en IS NULL
    ORDER BY tmdb_id
    LIMIT ?
  `).all(LIMIT);

  console.log(`Processing ${series.length} series...\n`);

  const batches = [];
  for (let i = 0; i < series.length; i += 100) {
    batches.push(series.slice(i, i + 100));
  }

  for (const batch of batches) {
    await Promise.all(batch.map(s => seriesLimiter(() => processSeries(s.tmdb_id))));
    const progress = Math.round((stats.series + stats.filtered + stats.not_found + stats.errors) / series.length * 100);
    console.log(`Progress: ${progress}% | Success: ${stats.series} (${stats.seasons} seasons) | Filtered: ${stats.filtered} | NotFound: ${stats.not_found} | Errors: ${stats.errors}`);
  }

  const mins = (Date.now() - stats.start) / 60000;

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 FINAL RESULTS:');
  console.log(`  ✅ Enriched: ${stats.series} series (${stats.seasons} seasons)`);
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
      console.log(`  Series ${e.tmdbId}: ${e.message}`);
    });

    // Save full error log
    fs.writeFileSync('error-log-series-scale.json', JSON.stringify(errorLog, null, 2));
    console.log(`\n📁 Full error log saved to: error-log-series-scale.json`);
  } else {
    console.log('\n✅ NO ERRORS OCCURRED - All items either enriched, filtered, or not found');
  }

  // Verify is_fetched was set
  const testIds = series.slice(0, 100).map(s => s.tmdb_id);
  if (testIds.length > 0) {
    const verification = db.prepare(`
      SELECT 
        SUM(CASE WHEN is_fetched=1 THEN 1 ELSE 0 END) as fetched,
        SUM(CASE WHEN is_fetched=0 THEN 1 ELSE 0 END) as unfetched
      FROM tv_series 
      WHERE tmdb_id IN (${testIds.join(',')})
    `).get();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 VERIFICATION (first 100 items):');
    console.log(`  is_fetched=1: ${verification.fetched}`);
    console.log(`  is_fetched=0: ${verification.unfetched}`);
  }
}

main().catch(e => {
  console.error('FATAL ERROR:', e);
  process.exit(1);
});
