/**
 * migrate-content-to-d1.js
 *
 * Migrates production-ready content from Local DB + Turso → Cloudflare D1.
 *
 * Sources:
 *   - Base columns (36 movies / 39 tv_series): Local DB (data/4cima-local.db)
 *   - JSON columns (genres_json, cast_json, etc.): Turso, matched via tmdb_id
 *   - Reference data: Turso directly
 *
 * Filter: is_complete=1 AND filter_status IN ('clean','reviewed_approved')
 * Expected: ~267,145 movies | ~47,266 tv_series
 *
 * Auth: CLOUDFLARE_D1_TOKEN from .env.local (D1:Edit, never expires)
 *
 * Adaptive batch sizing:
 *   - Start at INITIAL_CHUNK (100) statements per D1 request
 *   - On SQLITE_TOOBIG: halve the chunk (50→25→12→6→3→1)
 *   - Single statement still TOOBIG: null out large JSON cols, retry
 *   - Still fails: record in batchFailed[], continue
 *
 * Progress: every 10,000 rows
 */

'use strict';

require('dotenv').config({ path: '.env.local' });

const Database         = require('better-sqlite3');
const { createClient } = require('@libsql/client');

const ACCOUNT_ID = '834bca43d616c73db23cf95311cfe17e';
const DB_ID      = 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6';
const D1_URL     = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DB_ID}/query`;

const LOCAL_DB_PATH   = 'data/4cima-local.db';
const ROWS_PER_FLUSH  = 500;    // rows accumulated before flushing to D1
const INITIAL_CHUNK   = 100;    // initial D1 statements per request
const LOG_EVERY       = 10000;

const CF_TOKEN = process.env.CLOUDFLARE_D1_TOKEN;
if (!CF_TOKEN) { console.error('CLOUDFLARE_D1_TOKEN not set in .env.local'); process.exit(1); }

// ── batchFailed log ───────────────────────────────────────────────────────────
const batchFailed = []; // { table, tmdb_id, slug, reason, stmtBytes }

// ── D1 HTTP API ───────────────────────────────────────────────────────────────

async function d1Exec(sql, retries = 6) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res  = await fetch(D1_URL, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sql }),
        signal:  AbortSignal.timeout(55000)
      });
      const data = await res.json();
      if (data.success) return data.result;

      const errCode = data.errors?.[0]?.code;
      const errMsg  = data.errors?.[0]?.message || JSON.stringify(data.errors);

      // TOOBIG is not retriable — caller handles it
      if (errMsg.includes('TOOBIG') || errMsg.includes('too long')) {
        throw Object.assign(new Error(errMsg), { code: 'TOOBIG' });
      }

      // Retriable: 429, 5xx, transient
      const retriable = res.status === 429 || res.status >= 500;
      if (retriable && attempt < retries) {
        await sleep(attempt * 2000);
      } else {
        throw new Error(`D1[${errCode}]: ${errMsg}`);
      }
    } catch (err) {
      if (err.code === 'TOOBIG') throw err; // propagate immediately
      if (attempt < retries) {
        await sleep(attempt * 3000);
      } else {
        throw err;
      }
    }
  }
}

/**
 * Adaptive insert: tries chunk sizes 100→50→25→12→6→3→1.
 * If single statement is still TOOBIG, nullifies large JSON cols and retries.
 * If still fails, records in batchFailed and moves on.
 */
async function adaptiveInsert(stmts, table) {
  await insertChunk(stmts, INITIAL_CHUNK, table);
}

async function insertChunk(stmts, chunkSize, table) {
  for (let i = 0; i < stmts.length; i += chunkSize) {
    const chunk = stmts.slice(i, i + chunkSize);
    const sql   = chunk.join(';\n') + ';';
    try {
      await d1Exec(sql);
    } catch (err) {
      if (err.code === 'TOOBIG') {
        if (chunkSize === 1) {
          // Single statement too big — try stripping large JSON cols
          await insertSingleWithFallback(chunk[0], table);
        } else {
          // Halve and retry
          const half = Math.max(1, Math.floor(chunkSize / 2));
          await insertChunk(chunk, half, table);
        }
      } else {
        throw err;
      }
    }
    if (stmts.length > 1) await sleep(20);
  }
}

// Large JSON cols that can cause TOOBIG — null them out as last resort
const LARGE_JSON_COLS = ['episodes_json', 'seasons_json', 'cast_json', 'keywords_json'];

async function insertSingleWithFallback(stmt, table) {
  // Try nullifying large JSON cols one by one
  let current = stmt;
  for (const col of LARGE_JSON_COLS) {
    // Replace col's value with NULL in the INSERT
    // Pattern: find col in column list and null its position in VALUES
    current = nullifyColInInsert(current, col);
    try {
      await d1Exec(current + ';');
      return; // success after nullification
    } catch (err) {
      if (err.code !== 'TOOBIG') throw err;
      // Still too big — continue nullifying more cols
    }
  }
  // All large cols nulled and still failing — record and skip
  const tmdbMatch  = stmt.match(/VALUES \('?(\d+)'?/);
  const slugMatch  = stmt.match(/'([^']+)'/g)?.[1] || '?';
  const tmdb_id    = tmdbMatch?.[1] || '?';
  batchFailed.push({
    table,
    tmdb_id,
    slug: slugMatch,
    reason: 'SQLITE_TOOBIG after all JSON cols nulled',
    stmtBytes: Buffer.byteLength(stmt, 'utf8')
  });
  process.stdout.write(`\n    ⚠ Skipped tmdb_id=${tmdb_id} (${Math.round(Buffer.byteLength(stmt,'utf8')/1024)}KB)\n`);
}

/**
 * Replace a specific column's value with NULL in an INSERT OR IGNORE statement.
 * INSERT OR IGNORE INTO t (col1,col2,...,targetCol,...) VALUES (v1,v2,...,vN,...)
 */
function nullifyColInInsert(stmt, colName) {
  // Extract column list
  const colMatch = stmt.match(/INTO \w+ \(([^)]+)\) VALUES/);
  if (!colMatch) return stmt;
  const cols = colMatch[1].split(',').map(c => c.trim());
  const idx  = cols.indexOf(colName);
  if (idx === -1) return stmt; // col not present

  // Extract VALUES part — find the matching closing paren
  const valStart = stmt.indexOf(') VALUES (') + ') VALUES ('.length;
  const valStr   = stmt.slice(valStart, -1); // strip trailing )

  // Parse values respecting SQLite string escaping ('...' with '' for quotes)
  const vals = parseSQLValues(valStr);
  if (vals.length !== cols.length) return stmt; // parse failed, leave as-is

  vals[idx] = 'NULL';
  const newVals = vals.join(',');
  return stmt.slice(0, valStart) + newVals + ')';
}

function parseSQLValues(str) {
  const vals = [];
  let i = 0;
  while (i < str.length) {
    // Skip whitespace
    while (i < str.length && str[i] === ' ') i++;
    if (i >= str.length) break;

    if (str[i] === "'") {
      // String literal — scan to closing quote, handling '' escapes
      let j = i + 1;
      while (j < str.length) {
        if (str[j] === "'") {
          if (str[j+1] === "'") { j += 2; continue; } // escaped quote
          break;
        }
        j++;
      }
      vals.push(str.slice(i, j + 1));
      i = j + 1;
    } else {
      // Non-string (NULL, number)
      let j = i;
      while (j < str.length && str[j] !== ',') j++;
      vals.push(str.slice(i, j).trim());
      i = j;
    }
    // Skip comma
    if (i < str.length && str[i] === ',') i++;
  }
  return vals;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number')  return isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  return `'${String(v).replace(/'/g, "''")}'`;
}

function buildInsert(table, cols, row) {
  const vals = cols.map(c => esc(row[c]));
  return `INSERT OR IGNORE INTO ${table} (${cols.join(',')}) VALUES (${vals.join(',')})`;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Turso with retry ──────────────────────────────────────────────────────────

async function tursoQuery(turso, sql, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await turso.execute({ sql, args: [] });
    } catch (err) {
      if (attempt < retries) {
        const wait = attempt * 3000;
        process.stdout.write(`\n    ⟳ Turso retry ${attempt} after ${wait}ms (${err.message}) ... `);
        await sleep(wait);
      } else throw err;
    }
  }
}

// ── Reference table migrator ──────────────────────────────────────────────────

async function migrateReferenceTable(turso, tableName, sql, cols) {
  const result = await tursoQuery(turso, sql);
  const rows   = result.rows;
  process.stdout.write(`  ${tableName}: ${rows.length} rows ... `);
  if (rows.length === 0) { console.log('(empty)'); return; }
  const stmts = rows.map(row => {
    const obj = {};
    cols.forEach(c => { obj[c] = row[c] ?? null; });
    return buildInsert(tableName, cols, obj);
  });
  await adaptiveInsert(stmts, tableName);
  console.log('✓');
}

// ── JSON map builder ──────────────────────────────────────────────────────────

async function buildJsonMap(turso, table, jsonCols) {
  process.stdout.write(`  Loading ${table} JSON ... `);
  const map  = new Map();
  let offset = 0;
  const PAGE = 2000;
  while (true) {
    const colList = ['tmdb_id', ...jsonCols].join(', ');
    const result  = await tursoQuery(turso,
      `SELECT ${colList} FROM ${table} LIMIT ${PAGE} OFFSET ${offset}`);
    const rows = result.rows;
    if (rows.length === 0) break;
    for (const row of rows) {
      const tmdbId = Number(row.tmdb_id);
      if (!tmdbId) continue;
      const entry = {};
      for (const col of jsonCols) entry[col] = row[col] ?? null;
      map.set(tmdbId, entry);
    }
    offset += rows.length;
    process.stdout.write('.');
    if (rows.length < PAGE) break;
  }
  console.log(` ${map.size.toLocaleString()} ✓`);
  return map;
}

// ── Content migrator ──────────────────────────────────────────────────────────

let _startTime;

async function migrateContent(table, cols, rowIterator, jsonMap, jsonCols, total) {
  let batch      = [];
  let migrated   = 0;
  let lastLog    = 0;
  let jsonHits   = 0;
  let jsonMisses = 0;

  for (const localRow of rowIterator) {
    const row = {};
    for (const col of cols) row[col] = localRow[col] ?? null;

    const jsonEntry = jsonMap.get(Number(localRow.tmdb_id));
    if (jsonEntry) {
      jsonHits++;
      for (const col of jsonCols) row[col] = jsonEntry[col] ?? null;
    } else {
      jsonMisses++;
      for (const col of jsonCols) row[col] = null;
    }

    batch.push(buildInsert(table, cols, row));

    if (batch.length >= ROWS_PER_FLUSH) {
      await adaptiveInsert(batch, table);
      migrated += batch.length;
      batch     = [];

      if (migrated - lastLog >= LOG_EVERY) {
        const pct    = ((migrated / total) * 100).toFixed(1);
        const elapsed = (Date.now() - _startTime) / 1000;
        const rate   = Math.round(migrated / elapsed);
        const etaMin = Math.round((total - migrated) / (migrated / elapsed) / 60);
        console.log(`  [${table}] ${migrated.toLocaleString()} / ${total.toLocaleString()} (${pct}%) — ${rate} rows/s — ETA ~${etaMin}min`);
        lastLog = migrated;
      }
    }
  }

  if (batch.length > 0) {
    await adaptiveInsert(batch, table);
    migrated += batch.length;
  }

  console.log(`  ✓ ${table}: ${migrated.toLocaleString()} rows (JSON: ${jsonHits.toLocaleString()} hits, ${jsonMisses.toLocaleString()} misses)`);
  return migrated;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  _startTime = Date.now();
  console.log('='.repeat(62));
  console.log('  4cima → Cloudflare D1 Migration (adaptive batch)');
  console.log('  Started:', new Date().toISOString());
  console.log('='.repeat(62));

  await d1Exec('SELECT 1 as ping');
  console.log('✓ D1 API reachable');

  const localDb = new Database(LOCAL_DB_PATH, { readonly: true });
  console.log('✓ Local DB opened');

  const turso = createClient({
    url:       process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });
  console.log('✓ Turso connected\n');

  // ── Phase 0: Reference tables ──────────────────────────────────────────────
  console.log('── Phase 0: Reference tables ──');

  await migrateReferenceTable(turso, 'genres',
    'SELECT id, tmdb_id, name_en, name_ar, slug FROM genres',
    ['id','tmdb_id','name_en','name_ar','slug']);

  await migrateReferenceTable(turso, 'genre_counts',
    'SELECT genre_id, movie_count, series_count, updated_at FROM genre_counts',
    ['genre_id','movie_count','series_count','updated_at']);

  await migrateReferenceTable(turso, 'short_titles_lookup',
    `SELECT id, source_id, media_type, title_ar, title_en, name_ar, name_en,
            poster_path, release_year, first_air_year, vote_average, popularity,
            filter_status, slug, title_length FROM short_titles_lookup`,
    ['id','source_id','media_type','title_ar','title_en','name_ar','name_en',
     'poster_path','release_year','first_air_year','vote_average','popularity',
     'filter_status','slug','title_length']);

  await migrateReferenceTable(turso, 'settings',
    'SELECT id, site_name, site_description, maintenance_mode, registration_open, updated_at FROM settings',
    ['id','site_name','site_description','maintenance_mode','registration_open','updated_at']);

  await migrateReferenceTable(turso, 'countries',
    'SELECT iso_3166_1, english_name, arabic_name FROM countries',
    ['iso_3166_1','english_name','arabic_name']);

  await migrateReferenceTable(turso, 'languages',
    'SELECT iso_639_1, english_name, arabic_name FROM languages',
    ['iso_639_1','english_name','arabic_name']);

  // ── Phase 1: JSON maps ─────────────────────────────────────────────────────
  console.log('\n── Phase 1: JSON maps from Turso ──');

  const movieJsonMap = await buildJsonMap(turso, 'movies',
    ['genres_json','cast_json','countries_json','keywords_json','companies_json']);

  // Turso tv_series has no companies_json column
  const seriesJsonMap = await buildJsonMap(turso, 'tv_series',
    ['genres_json','cast_json','countries_json','keywords_json',
     'networks_json','seasons_json','episodes_json']);

  // ── Phase 2: Movies ────────────────────────────────────────────────────────
  console.log('\n── Phase 2: Movies ──');
  const totalMovies = localDb.prepare(
    "SELECT COUNT(*) as n FROM movies WHERE is_complete=1 AND filter_status IN ('clean','reviewed_approved')"
  ).get().n;
  console.log(`  Total: ${totalMovies.toLocaleString()}`);

  const movieCols = [
    'tmdb_id','slug','title_en','title_ar','title_original',
    'overview_en','overview_ar','poster_path','backdrop_path',
    'release_date','release_year','runtime',
    'vote_average','vote_count','popularity',
    'trailer_key','imdb_id','original_language','country_of_origin',
    'primary_genre','age_rating','production_companies',
    'seo_title_ar','seo_description_ar','seo_keywords_json','canonical_url',
    'genres_json','cast_json','countries_json','keywords_json','companies_json',
    'is_fetched','is_filtered','filter_reason','is_complete',
    'filter_status','sync_priority','synced_to_turso','synced_at',
    'created_at','updated_at'
  ];

  await migrateContent(
    'movies', movieCols,
    localDb.prepare(`SELECT * FROM movies WHERE is_complete=1 AND filter_status IN ('clean','reviewed_approved') ORDER BY tmdb_id`).iterate(),
    movieJsonMap,
    ['genres_json','cast_json','countries_json','keywords_json','companies_json'],
    totalMovies
  );

  // ── Phase 3: TV Series ─────────────────────────────────────────────────────
  console.log('\n── Phase 3: TV Series ──');
  const totalSeries = localDb.prepare(
    "SELECT COUNT(*) as n FROM tv_series WHERE is_complete=1 AND filter_status IN ('clean','reviewed_approved')"
  ).get().n;
  console.log(`  Total: ${totalSeries.toLocaleString()}`);

  const seriesCols = [
    'tmdb_id','slug','name_en','name_ar','name_original',
    'overview_en','overview_ar','poster_path','backdrop_path',
    'first_air_date','first_air_year','last_air_date',
    'number_of_seasons','number_of_episodes','status',
    'vote_average','vote_count','popularity',
    'trailer_key','imdb_id','original_language','country_of_origin',
    'primary_genre','age_rating',
    'seo_title_ar','seo_description_ar','seo_keywords_json','canonical_url',
    'genres_json','cast_json','countries_json','keywords_json','companies_json',
    'networks_json','seasons_json','episodes_json',
    'is_fetched','is_filtered','filter_reason','is_complete',
    'filter_status','sync_priority','synced_to_turso','synced_at',
    'created_at','updated_at'
  ];

  await migrateContent(
    'tv_series', seriesCols,
    localDb.prepare(`SELECT * FROM tv_series WHERE is_complete=1 AND filter_status IN ('clean','reviewed_approved') ORDER BY tmdb_id`).iterate(),
    seriesJsonMap,
    // companies_json not in Turso tv_series — stays null in D1
    ['genres_json','cast_json','countries_json','keywords_json',
     'networks_json','seasons_json','episodes_json'],
    totalSeries
  );

  // ── Phase 4: Verification ──────────────────────────────────────────────────
  console.log('\n── Phase 4: Verification ──');

  const mCount     = await d1Exec('SELECT COUNT(*) as n FROM movies');
  const sCount     = await d1Exec('SELECT COUNT(*) as n FROM tv_series');
  const moviesInD1 = Number(mCount[0]?.results[0]?.n ?? 0);
  const seriesInD1 = Number(sCount[0]?.results[0]?.n ?? 0);

  const elapsed  = ((Date.now() - _startTime) / 60000).toFixed(1);
  const moviesOk = moviesInD1 === totalMovies;
  const seriesOk = seriesInD1 === totalSeries;

  console.log(`\n${'='.repeat(62)}`);
  console.log('  MIGRATION RESULTS');
  console.log(`  movies:    ${moviesInD1.toLocaleString().padStart(8)} / ${totalMovies.toLocaleString().padStart(8)}  ${moviesOk ? '✓' : '✗ MISMATCH'}`);
  console.log(`  tv_series: ${seriesInD1.toLocaleString().padStart(8)} / ${totalSeries.toLocaleString().padStart(8)}  ${seriesOk ? '✓' : '✗ MISMATCH'}`);
  console.log(`  batchFailed: ${batchFailed.length} rows`);

  if (batchFailed.length > 0) {
    console.log(`\n  Failed rows (first 3 examples):`);
    batchFailed.slice(0, 3).forEach(f => {
      console.log(`    table=${f.table} tmdb_id=${f.tmdb_id} size=${Math.round(f.stmtBytes/1024)}KB reason=${f.reason}`);
    });
  }

  console.log(`  Time: ${elapsed} minutes`);
  console.log('='.repeat(62));

  localDb.close();

  // Exit 0 even with some batchFailed (they are logged above)
  // Exit 1 only on real mismatch (many more than batchFailed)
  const missingMovies = totalMovies - moviesInD1;
  const missingSeries = totalSeries - seriesInD1;
  if (missingMovies > batchFailed.filter(f=>f.table==='movies').length ||
      missingSeries > batchFailed.filter(f=>f.table==='tv_series').length) {
    console.error('  ✗ Row count mismatch exceeds known failures — investigate');
    process.exit(1);
  }
}

main().catch(e => {
  console.error('\nFATAL ERROR:', e.message || e);
  process.exit(1);
});
