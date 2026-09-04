#!/usr/bin/env node
/**
 * scripts/3-sync-to-d1.js
 *
 * Syncs production-ready content from Local DB → Cloudflare D1.
 *
 * Source:  data/4cima-local.db  (normalized tables: movies, tv_series,
 *          genres, content_genres, cast_crew, people, seasons, episodes)
 * Target:  Cloudflare D1 (database_id b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6)
 *
 * Filter:  is_complete = 1
 *          AND filter_status IN ('clean', 'reviewed_approved')
 *          AND synced_to_d1 = 0   (tracks D1 sync — separate from legacy synced_to_turso column)
 *
 * Auth:    CLOUDFLARE_D1_TOKEN from .env.local (D1:Edit, never expires)
 *
 * Adaptive batch sizing (inherited from migrate-content-to-d1.js):
 *   - Start at CHUNK (100) statements per D1 request
 *   - On SQLITE_TOOBIG: halve the chunk (50→25→12→6→3→1)
 *   - Single statement still TOOBIG: null out large JSON cols, retry
 *   - Still fails: record in failed[], continue
 *
 * Usage:
 *   node scripts/3-sync-to-d1.js
 *   node scripts/3-sync-to-d1.js --all   # re-sync all, ignore synced_to_d1 flag
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const Database    = require('better-sqlite3');
const cliProgress = require('cli-progress');
const path        = require('path');

// ── Config ────────────────────────────────────────────────────────────────────

const ACCOUNT_ID    = process.env.CF_ACCOUNT_ID || '834bca43d616c73db23cf95311cfe17e';
const DATABASE_ID   = process.env.CF_DATABASE_ID || 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6';
const D1_QUERY_URL  = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;

const LOCAL_DB_PATH = path.join(__dirname, '../data/4cima-local.db');
const CHUNK_INIT    = 100;    // statements per D1 request
const MOVIE_BATCH   = 200;    // rows pulled from local.db at a time
const SERIES_BATCH  = 50;     // smaller — episodes_json can be large
const FORCE_ALL     = process.argv.includes('--all');
const TEST_LIMIT    = process.argv.find(a => a.startsWith('--limit'));
const LIMIT_COUNT   = TEST_LIMIT ? parseInt(TEST_LIMIT.split('=')[1], 10) : null;

const CF_TOKEN = process.env.CLOUDFLARE_D1_TOKEN;
if (!CF_TOKEN) {
  console.error('❌  CLOUDFLARE_D1_TOKEN not set in .env.local');
  process.exit(1);
}

// ── Local DB ──────────────────────────────────────────────────────────────────

const localDb = new Database(LOCAL_DB_PATH, { readonly: false });

// Add synced_to_d1 column if it doesn't exist yet (idempotent)
try { localDb.prepare('ALTER TABLE movies    ADD COLUMN synced_to_d1 INTEGER DEFAULT 0').run(); } catch {}
try { localDb.prepare('ALTER TABLE tv_series ADD COLUMN synced_to_d1 INTEGER DEFAULT 0').run(); } catch {}

// ── D1 HTTP helpers ───────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function d1Query(sql, retries = 6) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    let res;
    try {
      res = await fetch(D1_QUERY_URL, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sql }),
        signal:  AbortSignal.timeout(60000),
      });
      const data = await res.json();
      if (data.success) return data.result;
      const errMsg = data.errors?.[0]?.message || JSON.stringify(data.errors);
      if (errMsg.includes('TOOBIG') || errMsg.includes('too long')) {
        throw Object.assign(new Error(errMsg), { code: 'TOOBIG' });
      }
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        await sleep(attempt * 2000);
        continue;
      }
      throw new Error(`D1[${res.status}]: ${errMsg}`);
    } catch (err) {
      if (err.code === 'TOOBIG') throw err;
      if (attempt < retries) { await sleep(attempt * 3000); continue; }
      throw err;
    }
  }
}

// ── Adaptive insert ───────────────────────────────────────────────────────────

const LARGE_JSON_COLS = ['episodes_json', 'seasons_json', 'cast_json', 'keywords_json'];
const failed = [];

function esc(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  return "'" + String(v).replace(/'/g, "''") + "'";
}

async function adaptiveInsert(stmts, table, tmdbIds) {
  await insertChunk(stmts, CHUNK_INIT, table, tmdbIds);
}

async function insertChunk(stmts, chunkSize, table, tmdbIds) {
  for (let i = 0; i < stmts.length; i += chunkSize) {
    const chunk   = stmts.slice(i, i + chunkSize);
    const ids     = tmdbIds.slice(i, i + chunkSize);
    const sql     = chunk.join(';\n') + ';';
    try {
      await d1Query(sql);
      // mark synced in local DB
      const ph = ids.map(() => '?').join(',');
      if (table === 'movies') {
        localDb.prepare(`UPDATE movies    SET synced_to_d1 = 1, synced_at = datetime('now') WHERE tmdb_id IN (${ph})`).run(...ids);
      } else {
        localDb.prepare(`UPDATE tv_series SET synced_to_d1 = 1, synced_at = datetime('now') WHERE tmdb_id IN (${ph})`).run(...ids);
      }
    } catch (err) {
      if (err.code === 'TOOBIG') {
        if (chunkSize === 1) {
          await insertSingleWithFallback(chunk[0], ids[0], table);
        } else {
          const half = Math.max(1, Math.floor(chunkSize / 2));
          await insertChunk(chunk, half, table, ids);
        }
      } else {
        throw err;
      }
    }
    if (stmts.length > 1) await sleep(20);
  }
}

async function insertSingleWithFallback(stmt, tmdb_id, table) {
  // Try with all large JSON cols nullified at once
  let current = stmt;
  for (const col of LARGE_JSON_COLS) {
    current = nullifyCol(current, col);
  }
  
  try {
    await d1Query(current + ';');
    if (table === 'movies') {
      localDb.prepare(`UPDATE movies    SET synced_to_d1 = 1, synced_at = datetime('now') WHERE tmdb_id = ?`).run(tmdb_id);
    } else {
      localDb.prepare(`UPDATE tv_series SET synced_to_d1 = 1, synced_at = datetime('now') WHERE tmdb_id = ?`).run(tmdb_id);
    }
    return;
  } catch (err) {
    if (err.code === 'TOOBIG') {
      failed.push({ table, tmdb_id, reason: 'TOOBIG after all JSON cols nulled' });
      process.stdout.write(`\n    ⚠ Skipped tmdb_id=${tmdb_id} (TOOBIG)\n`);
      return;
    }
    throw err;
  }
}

function nullifyCol(stmt, colName) {
  const colMatch = stmt.match(/INTO \w+ \(([^)]+)\) VALUES/);
  if (!colMatch) return stmt;
  const cols = colMatch[1].split(',').map(c => c.trim());
  const idx  = cols.findIndex(c => c === colName);
  if (idx === -1) return stmt;

  const valMatch = stmt.match(/VALUES \((.+)\)$/s);
  if (!valMatch) return stmt;
  const vals = parseValues(valMatch[1]);
  if (idx >= vals.length) return stmt;
  vals[idx] = 'NULL';
  const newVals = vals.join(', ');
  return stmt.replace(/VALUES \((.+)\)$/s, `VALUES (${newVals})`);
}

function parseValues(str) {
  const vals = [];
  let depth = 0, inStr = false, cur = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "'" && str[i - 1] !== '\\') inStr = !inStr;
    if (!inStr) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (ch === ',' && depth === 0) { vals.push(cur.trim()); cur = ''; continue; }
    }
    cur += ch;
  }
  if (cur.trim()) vals.push(cur.trim());
  return vals;
}

// ── Build INSERT statements ───────────────────────────────────────────────────

function toJ(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') {
    try { JSON.parse(v); return v; } catch { return null; }
  }
  return JSON.stringify(v);
}

function buildMovieInsert(tmdb_id) {
  const movie = localDb.prepare('SELECT * FROM movies WHERE tmdb_id = ?').get(tmdb_id);
  if (!movie) return null;

  const genres = localDb.prepare(`
    SELECT g.tmdb_id, g.name_en, g.name_ar, g.slug
    FROM genres g JOIN content_genres cg ON g.tmdb_id = cg.genre_tmdb_id
    WHERE cg.content_tmdb_id = ? AND cg.content_type = 'movie'
  `).all(tmdb_id);

  const cast = localDb.prepare(`
    SELECT p.tmdb_id, p.name_en, p.name_ar, p.profile_path,
           cc.character_name, cc.cast_order
    FROM people p JOIN cast_crew cc ON p.tmdb_id = cc.person_tmdb_id
    WHERE cc.content_tmdb_id = ? AND cc.content_type = 'movie' AND cc.role_type = 'cast'
    ORDER BY cc.cast_order LIMIT 10
  `).all(tmdb_id);

  const countries = movie.country_of_origin ? [{ name: movie.country_of_origin }] : [];

  const cols = [
    'id','tmdb_id','slug',
    'title_en','title_ar','title_original',
    'overview_en','overview_ar',
    'poster_path','backdrop_path',
    'release_date','release_year',
    'vote_average','vote_count','popularity','runtime',
    'trailer_key','imdb_id','original_language','country_of_origin',
    'primary_genre','age_rating',
    'genres_json','cast_json','countries_json',
    'keywords_json','companies_json',
    'seo_title_ar','seo_description_ar','seo_keywords_json','canonical_url',
    'production_companies',
    'is_fetched','is_filtered','is_complete','filter_status',
    'created_at','updated_at',
  ];

  const vals = [
    movie.tmdb_id, movie.tmdb_id, movie.slug,
    movie.title_en, movie.title_ar, movie.title_original,
    movie.overview_en, movie.overview_ar,
    movie.poster_path, movie.backdrop_path,
    movie.release_date, movie.release_year,
    movie.vote_average, movie.vote_count, movie.popularity, movie.runtime,
    movie.trailer_key, movie.imdb_id, movie.original_language, movie.country_of_origin,
    movie.primary_genre, movie.age_rating,
    JSON.stringify(genres), JSON.stringify(cast), JSON.stringify(countries),
    toJ(movie.keywords_json), toJ(movie.companies_json),
    movie.seo_title_ar, movie.seo_description_ar, toJ(movie.seo_keywords_json), movie.canonical_url,
    movie.production_companies,
    movie.is_fetched, movie.is_filtered, movie.is_complete, movie.filter_status,
    movie.created_at, movie.updated_at,
  ];

  const upsertCols = cols.filter(c => !['id','tmdb_id'].includes(c));

  return `INSERT INTO movies (${cols.join(',')}) VALUES (${vals.map(esc).join(',')})
ON CONFLICT(tmdb_id) DO UPDATE SET ${upsertCols.map(c => `${c}=excluded.${c}`).join(',')}`;
}

function buildSeriesInsert(tmdb_id) {
  const series = localDb.prepare('SELECT * FROM tv_series WHERE tmdb_id = ?').get(tmdb_id);
  if (!series) return null;

  const genres = localDb.prepare(`
    SELECT g.tmdb_id, g.name_en, g.name_ar, g.slug
    FROM genres g JOIN content_genres cg ON g.tmdb_id = cg.genre_tmdb_id
    WHERE cg.content_tmdb_id = ? AND cg.content_type = 'tv'
  `).all(tmdb_id);

  const cast = localDb.prepare(`
    SELECT p.tmdb_id, p.name_en, p.name_ar, p.profile_path,
           cc.character_name, cc.cast_order
    FROM people p JOIN cast_crew cc ON p.tmdb_id = cc.person_tmdb_id
    WHERE cc.content_tmdb_id = ? AND cc.content_type = 'tv' AND cc.role_type = 'cast'
    ORDER BY cc.cast_order LIMIT 10
  `).all(tmdb_id);

  const seasons = localDb.prepare(`
    SELECT season_number, name_en, episode_count, air_date, poster_path
    FROM seasons WHERE series_tmdb_id = ? ORDER BY season_number
  `).all(tmdb_id);

  const episodes = localDb.prepare(`
    SELECT season_number, episode_number, name_en, overview_en,
           still_path, air_date, runtime, vote_average
    FROM episodes WHERE series_tmdb_id = ? ORDER BY season_number, episode_number
  `).all(tmdb_id);

  const cols = [
    'id','tmdb_id','slug',
    'name_en','name_ar',
    'overview_en','overview_ar',
    'poster_path','backdrop_path',
    'first_air_date','first_air_year',
    'number_of_seasons','number_of_episodes','status',
    'vote_average','vote_count','popularity',
    'trailer_key','original_language',
    'primary_genre','age_rating',
    'genres_json','cast_json','seasons_json','episodes_json',
    'seo_title_ar','seo_description_ar','seo_keywords_json','canonical_url',
    'is_fetched','is_filtered','is_complete','filter_status',
    'created_at','updated_at',
  ];

  const vals = [
    series.tmdb_id, series.tmdb_id, series.slug,
    series.name_en, series.name_ar,
    series.overview_en, series.overview_ar,
    series.poster_path, series.backdrop_path,
    series.first_air_date, series.first_air_year,
    series.number_of_seasons, series.number_of_episodes, series.status,
    series.vote_average, series.vote_count, series.popularity,
    series.trailer_key, series.original_language,
    series.primary_genre, series.age_rating,
    JSON.stringify(genres), JSON.stringify(cast), JSON.stringify(seasons), JSON.stringify(episodes),
    series.seo_title_ar, series.seo_description_ar, toJ(series.seo_keywords_json), series.canonical_url,
    series.is_fetched, series.is_filtered, series.is_complete, series.filter_status,
    series.created_at, series.updated_at,
  ];

  const upsertCols = cols.filter(c => !['id','tmdb_id'].includes(c));

  return `INSERT INTO tv_series (${cols.join(',')}) VALUES (${vals.map(esc).join(',')})
ON CONFLICT(tmdb_id) DO UPDATE SET ${upsertCols.map(c => `${c}=excluded.${c}`).join(',')}`;
}

// ── short_titles_lookup rebuild (1-2 char search lists) ───────────────────────

async function rebuildShortTitles() {
  console.log('\n📋 إعادة بناء short_titles_lookup ...');

  // Pull short-title rows (length 1-2, any language) from the authoritative D1 copy
  const pull = (sql) => d1Query(sql).then(r => (Array.isArray(r) ? r[0]?.results : []) || []);

  const moviesShort = await pull(`
    SELECT tmdb_id, 'movie' AS media_type, slug, title_ar, title_en,
           poster_path, release_year, vote_average, popularity, filter_status,
           MIN(LENGTH(title_ar), LENGTH(title_en)) AS len_ar_en
    FROM movies
    WHERE (LENGTH(title_ar) BETWEEN 1 AND 2 OR LENGTH(title_en) BETWEEN 1 AND 2)
      AND (filter_status IN ('clean','reviewed_approved') OR filter_status IS NULL)
  `).catch(() => []);

  const seriesShort = await pull(`
    SELECT tmdb_id, 'tv' AS media_type, slug, name_ar, name_en,
           poster_path, first_air_year, vote_average, popularity, filter_status,
           MIN(LENGTH(name_ar), LENGTH(name_en)) AS len_ar_en
    FROM tv_series
    WHERE (LENGTH(name_ar) BETWEEN 1 AND 2 OR LENGTH(name_en) BETWEEN 1 AND 2)
      AND (filter_status IN ('clean','reviewed_approved') OR filter_status IS NULL)
  `).catch(() => []);

  // Normalize to lookup-table columns (title_* for both media types, source_id = tmdb_id)
  const toRow = (r) => {
    const titleAr = r.media_type === 'movie' ? r.title_ar : r.name_ar;
    const titleEn = r.media_type === 'movie' ? r.title_en : r.name_en;
    const titleLength = Math.min(
      ...[titleAr, titleEn].filter(t => t && t.length > 0).map(t => t.length),
      2
    );
    return `(${r.tmdb_id}, '${r.media_type}', ${esc(titleAr)}, ${esc(titleEn)}, ${esc(titleAr)}, ${esc(titleEn)}, ${esc(r.poster_path)}, ${r.release_year ?? 'NULL'}, ${r.first_air_year ?? 'NULL'}, ${r.vote_average ?? 'NULL'}, ${r.popularity ?? 'NULL'}, ${esc(r.filter_status)}, ${esc(r.slug)}, ${titleLength})`;
  };

  const values = [...moviesShort, ...seriesShort].filter(r => r.slug).map(toRow);
  if (values.length === 0) {
    console.log('   ⚠ لا توجد عناوين قصيرة — تخطي');
    return;
  }

  await d1Query('DELETE FROM short_titles_lookup');
  // Insert in chunks to stay under D1 statement limits
  for (let i = 0; i < values.length; i += 100) {
    await d1Query(`INSERT INTO short_titles_lookup (source_id, media_type, title_ar, title_en, name_ar, name_en, poster_path, release_year, first_air_year, vote_average, popularity, filter_status, slug, title_length) VALUES ${values.slice(i, i + 100).join(',')}`);
  }
  console.log(`   ✅ ${values.length} صف (قوائم الحرف والحرفين محدثة)`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Standalone mode: rebuild short-title search lists only, no content sync
  if (process.argv.includes('--rebuild-short-titles')) {
    await rebuildShortTitles();
    localDb.close();
    return;
  }

  console.log('🚀 بدء المزامنة من Local DB → Cloudflare D1\n');

  const syncFilter = FORCE_ALL ? '' : 'AND synced_to_d1 = 0';

  // Get eligible IDs upfront if limit is specified
  let movieIds = null, seriesIds = null;
  if (LIMIT_COUNT) {
    movieIds = localDb.prepare(`
      SELECT tmdb_id FROM movies
      WHERE is_complete = 1 AND filter_status IN ('clean', 'reviewed_approved') ${syncFilter}
      LIMIT ?
    `).all(LIMIT_COUNT).map(r => r.tmdb_id);
    
    seriesIds = localDb.prepare(`
      SELECT tmdb_id FROM tv_series
      WHERE is_complete = 1 AND filter_status IN ('clean', 'reviewed_approved')
        AND slug IS NOT NULL AND slug != '' ${syncFilter}
      LIMIT ?
    `).all(LIMIT_COUNT).map(r => r.tmdb_id);
  }

  const totalMovies = movieIds ? movieIds.length : localDb.prepare(`
    SELECT COUNT(*) as c FROM movies
    WHERE is_complete = 1 AND filter_status IN ('clean', 'reviewed_approved') ${syncFilter}
  `).get().c;

  const totalSeries = seriesIds ? seriesIds.length : localDb.prepare(`
    SELECT COUNT(*) as c FROM tv_series
    WHERE is_complete = 1 AND filter_status IN ('clean', 'reviewed_approved')
      AND slug IS NOT NULL AND slug != '' ${syncFilter}
  `).get().c;

  console.log(`📊 أفلام جديدة: ${totalMovies.toLocaleString('en-US')}`);
  console.log(`📊 مسلسلات جديدة: ${totalSeries.toLocaleString('en-US')}`);
  if (totalMovies + totalSeries === 0) {
    console.log('\n✅ لا يوجد محتوى جديد للمزامنة.');
    localDb.close();
    return;
  }
  console.log('');

  const stats = { movies: 0, series: 0 };

  // ── Movies ──
  if (totalMovies > 0) {
    console.log('🎬 مزامنة الأفلام...');
    const bar = new cliProgress.SingleBar({
      format: '   {bar} | {percentage}% | {value}/{total}',
      barCompleteChar: '█', barIncompleteChar: '░', hideCursor: true,
    });
    bar.start(totalMovies, 0);

    while (true) {
      let rows;
      if (movieIds) {
        // Use pre-selected IDs (for --limit mode)
        rows = movieIds.splice(0, MOVIE_BATCH);
        if (rows.length === 0) break;
      } else {
        // Normal mode: fetch batch from DB
        rows = localDb.prepare(`
          SELECT tmdb_id FROM movies
          WHERE is_complete = 1 AND filter_status IN ('clean', 'reviewed_approved') ${syncFilter}
          LIMIT ?
        `).all(MOVIE_BATCH).map(r => r.tmdb_id);
        if (rows.length === 0) break;
      }

      const stmts = rows.map(id => buildMovieInsert(id)).filter(Boolean);
      if (stmts.length > 0) await adaptiveInsert(stmts, 'movies', rows);
      stats.movies += rows.length;
      bar.update(stats.movies);
    }
    bar.stop();
    console.log(`   ✅ ${stats.movies.toLocaleString('en-US')} فيلم\n`);
  }

  // ── Series ──
  if (totalSeries > 0) {
    console.log('📺 مزامنة المسلسلات...');
    const bar = new cliProgress.SingleBar({
      format: '   {bar} | {percentage}% | {value}/{total}',
      barCompleteChar: '█', barIncompleteChar: '░', hideCursor: true,
    });
    bar.start(totalSeries, 0);

    while (true) {
      let rows;
      if (seriesIds) {
        // Use pre-selected IDs (for --limit mode)
        rows = seriesIds.splice(0, SERIES_BATCH);
        if (rows.length === 0) break;
      } else {
        // Normal mode: fetch batch from DB
        rows = localDb.prepare(`
          SELECT tmdb_id FROM tv_series
          WHERE is_complete = 1 AND filter_status IN ('clean', 'reviewed_approved')
            AND slug IS NOT NULL AND slug != '' ${syncFilter}
          LIMIT ?
        `).all(SERIES_BATCH).map(r => r.tmdb_id);
        if (rows.length === 0) break;
      }

      const stmts = rows.map(id => buildSeriesInsert(id)).filter(Boolean);
      if (stmts.length > 0) await adaptiveInsert(stmts, 'tv_series', rows);
      stats.series += rows.length;
      bar.update(stats.series);
    }
    bar.stop();
    console.log(`   ✅ ${stats.series.toLocaleString('en-US')} مسلسل\n`);
  }

  // ── Summary ──
  console.log('═══════════════════════════════════════════');
  console.log(`✅ اكتملت المزامنة!`);
  console.log(`   أفلام: ${stats.movies.toLocaleString('en-US')}`);
  console.log(`   مسلسلات: ${stats.series.toLocaleString('en-US')}`);
  if (failed.length > 0) {
    console.log(`   ⚠  فشل: ${failed.length} صف (TOOBIG)`);
    failed.slice(0, 5).forEach(f => console.log(`      ${f.table} tmdb_id=${f.tmdb_id}`));
  }
  console.log('═══════════════════════════════════════════');

  // Rebuild short-title search lists so 1-2 char searches stay in sync with the catalog
  await rebuildShortTitles();

  localDb.close();
}

main().catch(err => {
  console.error('❌ Fatal:', err.message);
  localDb.close();
  process.exit(1);
});
