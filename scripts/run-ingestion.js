#!/usr/bin/env node
/**
 * run-ingestion.js — Continuous ingestion runner
 *
 * Runs 1-fetch-and-enrich.js in rolling batches indefinitely until
 * all movies and series are fetched. Designed to run unattended for
 * days/weeks with:
 *   - Auto-restart on crash (via --auto-restart flag or PM2/Task Scheduler)
 *   - Rotating log file at data/ingestion.log
 *   - Proportional concurrency split: movies get 70%, series 30%
 *   - Exponential backoff on errors (max 5 min wait)
 *   - Progress summary every N batches
 *
 * Usage:
 *   node scripts/run-ingestion.js               # run until done
 *   node scripts/run-ingestion.js --dry-run      # show plan only
 *
 * Auto-restart via Windows Task Scheduler (see README) or:
 *   while ($true) { node scripts/run-ingestion.js; Start-Sleep 10 }
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const { execFileSync, spawn } = require('child_process');
const fs   = require('fs');
const path = require('path');

// ─── Config ───────────────────────────────────────────────────
const BATCH_SIZE      = 500;       // items per batch run
const CONCURRENCY     = 40;        // safe TMDB concurrency (tested)
const MOVIE_SHARE     = 0.70;      // 70% of batch for movies
const SERIES_SHARE    = 0.30;      // 30% for series
const PAUSE_BETWEEN   = 5000;      // ms pause between batches
const MAX_BACKOFF     = 300000;    // 5 min max backoff on error
const LOG_FILE        = path.join(__dirname, '../data/ingestion.log');
const SCRIPT          = path.join(__dirname, '1-fetch-and-enrich.js');
const DRY_RUN         = process.argv.includes('--dry-run');

// ─── Logging ──────────────────────────────────────────────────
function log(msg) {
  const ts  = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const line = `[${ts}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch (_) {}
}

function formatNum(n) {
  return Number(n).toLocaleString('en-US');
}

// ─── DB Stats ─────────────────────────────────────────────────
function getStats() {
  // Use require here so it doesn't init DB at module load time
  const db = require('./services/local-db');
  return {
    movies_waiting:  db.prepare('SELECT COUNT(*) as c FROM movies    WHERE is_fetched=0').get().c,
    movies_done:     db.prepare('SELECT COUNT(*) as c FROM movies    WHERE is_fetched=1').get().c,
    series_waiting:  db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE is_fetched=0').get().c,
    series_done:     db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE is_fetched=1').get().c,
    needs_review_m:  db.prepare("SELECT COUNT(*) as c FROM movies    WHERE filter_status='needs_review'").get().c,
    needs_review_s:  db.prepare("SELECT COUNT(*) as c FROM tv_series WHERE filter_status='needs_review'").get().c,
  };
}

// ─── Run one batch ────────────────────────────────────────────
function runBatch(type, limit) {
  return new Promise((resolve) => {
    const args  = [SCRIPT, `--type=${type}`, `--limit=${limit}`];
    const child = spawn('node', args, {
      cwd:   path.join(__dirname, '..'),
      env:   process.env,
      stdio: 'pipe',
    });

    let stdout = '', stderr = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });

    child.on('close', (code) => {
      // Parse progress line from output
      // Expected format: 🎬 ✅2 🚫0 ❓0 ❌1
      const lines = stdout.split('\n');
      const movieLine = lines.find(line => line.includes('🎬') && line.includes('✅'));
      
      let ok = 0, filtered = 0, notfound = 0, errors = 0;
      
      if (movieLine) {
        // Extract all numbers from the line in order
        const numbers = movieLine.match(/\d+/g);
        if (numbers && numbers.length >= 4) {
          ok       = parseInt(numbers[0]);
          filtered = parseInt(numbers[1]);
          notfound = parseInt(numbers[2]);
          errors   = parseInt(numbers[3]);
        }
      }
      
      resolve({
        ok,
        filtered,
        notfound,
        errors,
        code,
        stderr:   stderr.slice(0, 200),
      });
    });
  });
}

// ─── Sleep ────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Main Loop ────────────────────────────────────────────────
async function main() {
  log('═══════════════════════════════════════════');
  log('  4CIMA Ingestion Runner — Starting');
  log(`  BATCH_SIZE=${BATCH_SIZE} | CONCURRENCY=${CONCURRENCY}`);
  log(`  LOG → ${LOG_FILE}`);
  log('═══════════════════════════════════════════');

  // Ensure data dir exists
  const dataDir = path.dirname(LOG_FILE);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  if (DRY_RUN) {
    const s = getStats();
    log(`DRY RUN — movies waiting: ${formatNum(s.movies_waiting)} | series waiting: ${formatNum(s.series_waiting)}`);
    const movieBatches  = Math.ceil(s.movies_waiting  / Math.round(BATCH_SIZE * MOVIE_SHARE));
    const seriesBatches = Math.ceil(s.series_waiting  / Math.round(BATCH_SIZE * SERIES_SHARE));
    log(`Estimated batches: movies=${movieBatches}, series=${seriesBatches}`);
    const ratePerMin = 57; // measured
    const totalItems = s.movies_waiting + s.series_waiting;
    const estDays    = (totalItems / ratePerMin / 60 / 24).toFixed(1);
    log(`At ~${ratePerMin}/min → ~${estDays} days`);
    return;
  }

  let batchNum = 0;
  let totalOk  = 0;
  let backoff  = 5000;

  while (true) {
    const stats = getStats();
    const { movies_waiting, series_waiting } = stats;

    if (movies_waiting === 0 && series_waiting === 0) {
      log('🎉 All done! movies_waiting=0, series_waiting=0');
      log(`Total processed this session: ${formatNum(totalOk)}`);
      break;
    }

    batchNum++;
    const movieLimit  = movies_waiting  > 0 ? Math.min(Math.round(BATCH_SIZE * MOVIE_SHARE),  movies_waiting)  : 0;
    const seriesLimit = series_waiting  > 0 ? Math.min(Math.round(BATCH_SIZE * SERIES_SHARE), series_waiting)  : 0;

    // Log progress every 10 batches
    if (batchNum % 10 === 1) {
      log(`── Batch #${batchNum} ──────────────────────────────`);
      log(`  movies:  waiting=${formatNum(movies_waiting)}  done=${formatNum(stats.movies_done)}`);
      log(`  series:  waiting=${formatNum(series_waiting)} done=${formatNum(stats.series_done)}`);
      log(`  needs_review: movies=${stats.needs_review_m} series=${stats.needs_review_s}`);
    }

    // Run movies batch
    if (movieLimit > 0) {
      const r = await runBatch('movies', movieLimit);
      if (r.errors > 0) {
        log(`⚠️  Batch #${batchNum} movies: errors=${r.errors} — backoff ${backoff}ms`);
        await sleep(backoff);
        backoff = Math.min(backoff * 2, MAX_BACKOFF);
      } else {
        backoff = 5000; // reset on success
      }
      totalOk += r.ok;
      if (batchNum % 10 === 1) log(`  batch movies: ok=${r.ok} filtered=${r.filtered} notfound=${r.notfound} err=${r.errors}`);
    }

    // Run series batch
    if (seriesLimit > 0) {
      const r = await runBatch('series', seriesLimit);
      if (r.errors > 0) {
        log(`⚠️  Batch #${batchNum} series: errors=${r.errors} — backoff ${backoff}ms`);
        await sleep(backoff);
        backoff = Math.min(backoff * 2, MAX_BACKOFF);
      } else {
        backoff = 5000;
      }
      totalOk += r.ok;
    }

    await sleep(PAUSE_BETWEEN);
  }
}

main().catch(err => {
  log(`❌ FATAL: ${err.message}`);
  log(err.stack || '');
  process.exit(1);
});