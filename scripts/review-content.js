#!/usr/bin/env node
/**
 * review-content.js — Content Review Tool (approve/reject) via Cloudflare D1
 *
 * Usage:
 *   node scripts/review-content.js --list
 *   node scripts/review-content.js --details <tmdb_id>
 *   node scripts/review-content.js --approve <tmdb_id>
 *   node scripts/review-content.js --reject  <tmdb_id>
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const localDb = require('./services/local-db');

const ACCOUNT_ID  = '834bca43d616c73db23cf95311cfe17e';
const DATABASE_ID = 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6';
const D1_URL      = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;
const TOKEN       = process.env.CLOUDFLARE_D1_TOKEN;

if (!TOKEN) { console.error('CLOUDFLARE_D1_TOKEN not set in .env.local'); process.exit(1); }

// ── D1 helper ─────────────────────────────────────────────────────────────────

async function d1(sql, params = []) {
  const body = params.length ? { sql, params } : { sql };
  const r = await fetch(D1_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (!d.success) throw new Error(d.errors?.[0]?.message || JSON.stringify(d.errors));
  return d.result[0].results ?? [];
}

// ── Print helper ──────────────────────────────────────────────────────────────

function printTable(rows, columns) {
  if (rows.length === 0) { console.log('  (no results)'); return; }
  const widths = {};
  for (const col of columns) widths[col.key] = col.label.length;
  for (const row of rows) {
    for (const col of columns) {
      const val = String(row[col.key] ?? '');
      if (val.length > widths[col.key]) widths[col.key] = Math.min(val.length, 50);
    }
  }
  const header = columns.map(c => c.label.padEnd(widths[c.key])).join('  |  ');
  const sep    = columns.map(c => '-'.repeat(widths[c.key])).join('--+--');
  console.log('  ' + header);
  console.log('  ' + sep);
  for (const row of rows) {
    const line = columns.map(c => String(row[c.key] ?? '').substring(0, widths[c.key]).padEnd(widths[c.key])).join('  |  ');
    console.log('  ' + line);
  }
}

// ── Commands ──────────────────────────────────────────────────────────────────

async function cmdList() {
  console.log('\nFetching needs_review content from D1...\n');

  const movies = await d1("SELECT tmdb_id, title_ar, title_en, vote_average FROM movies WHERE filter_status = 'needs_review' ORDER BY vote_average DESC");
  const series = await d1("SELECT tmdb_id, name_ar AS title_ar, name_en AS title_en, vote_average FROM tv_series WHERE filter_status = 'needs_review' ORDER BY vote_average DESC");

  const cols = [
    { key: 'tmdb_id',      label: 'TMDB ID'      },
    { key: 'title_ar',     label: 'Arabic Title'  },
    { key: 'title_en',     label: 'English Title' },
    { key: 'vote_average', label: 'Rating'        },
  ];

  console.log('=== MOVIES needs_review (' + movies.length + ') ===');
  printTable(movies, cols);
  console.log('\n=== TV SERIES needs_review (' + series.length + ') ===');
  printTable(series, cols);
  console.log('\nTotal: ' + (movies.length + series.length) + ' items need review');
  console.log('  --details <id>  full details');
  console.log('  --approve <id>  set reviewed_approved');
  console.log('  --reject  <id>  set reviewed_rejected\n');
}

async function cmdDetails(tmdbId) {
  console.log('\nDetails for tmdb_id=' + tmdbId + ' from D1...\n');

  const movies = await d1('SELECT * FROM movies WHERE tmdb_id = ?', [tmdbId]);
  if (movies.length > 0) {
    const m = movies[0];
    console.log('Type: Movie\n' + '-'.repeat(60));
    [['tmdb_id',m.tmdb_id],['slug',m.slug],['title_ar',m.title_ar],['title_en',m.title_en],
     ['release_year',m.release_year],['vote_average',m.vote_average],['vote_count',m.vote_count],
     ['popularity',m.popularity],['runtime',m.runtime ? m.runtime+' min' : '-'],
     ['filter_status',m.filter_status],
     ['overview_ar', m.overview_ar ? m.overview_ar.slice(0,150)+'...' : '-'],
    ].forEach(([k,v]) => console.log('  '+String(k).padEnd(16)+': '+(v??'-')));
    console.log('-'.repeat(60));
    return;
  }

  const series = await d1('SELECT * FROM tv_series WHERE tmdb_id = ?', [tmdbId]);
  if (series.length > 0) {
    const s = series[0];
    console.log('Type: TV Series\n' + '-'.repeat(60));
    [['tmdb_id',s.tmdb_id],['slug',s.slug],['name_ar',s.name_ar],['name_en',s.name_en],
     ['first_air_year',s.first_air_year],['vote_average',s.vote_average],['vote_count',s.vote_count],
     ['number_of_seasons',s.number_of_seasons],['filter_status',s.filter_status],
     ['overview_ar', s.overview_ar ? s.overview_ar.slice(0,150)+'...' : '-'],
    ].forEach(([k,v]) => console.log('  '+String(k).padEnd(20)+': '+(v??'-')));
    console.log('-'.repeat(60));
    return;
  }

  console.log('ERROR: tmdb_id=' + tmdbId + ' not found in D1');
}

async function cmdUpdateStatus(tmdbId, newStatus) {
  const label = newStatus === 'reviewed_approved' ? 'APPROVE' : 'REJECT';
  console.log('\n[' + label + '] tmdb_id=' + tmdbId + '\n');

  const movies = await d1('SELECT tmdb_id, title_ar, title_en, filter_status FROM movies WHERE tmdb_id = ?', [tmdbId]);
  const series = await d1('SELECT tmdb_id, name_ar AS title_ar, name_en AS title_en, filter_status FROM tv_series WHERE tmdb_id = ?', [tmdbId]);

  let contentType = null, currentRow = null;
  if (movies.length > 0)       { contentType = 'movie';  currentRow = movies[0]; }
  else if (series.length > 0)  { contentType = 'series'; currentRow = series[0]; }

  if (!currentRow) { console.error('ERROR: tmdb_id=' + tmdbId + ' not found in D1'); process.exit(1); }

  console.log('  Title  : ' + (currentRow.title_ar || currentRow.title_en));
  console.log('  Type   : ' + (contentType === 'movie' ? 'Movie' : 'TV Series'));
  console.log('  Status : ' + currentRow.filter_status);

  if (currentRow.filter_status !== 'needs_review') {
    console.warn('  WARNING: status is \'' + currentRow.filter_status + '\', updating anyway...');
  }

  const table  = contentType === 'movie' ? 'movies' : 'tv_series';
  const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

  // Update local.db
  console.log('\n  Updating local.db...');
  try {
    const info = localDb.prepare('UPDATE '+table+' SET filter_status=?, updated_at=? WHERE tmdb_id=?').run(newStatus, nowStr, tmdbId);
    if (info.changes > 0) console.log('  local.db -> ' + newStatus);
    else console.warn('  WARNING: tmdb_id not found in local.db');
  } catch (e) {
    console.warn('  local.db unavailable: ' + e.message);
  }

  // Update D1
  console.log('  Updating D1...');
  await d1('UPDATE '+table+' SET filter_status=?, updated_at=? WHERE tmdb_id=?', [newStatus, nowStr, tmdbId]);

  const verify = await d1('SELECT filter_status FROM '+table+' WHERE tmdb_id=?', [tmdbId]);
  if (verify[0]?.filter_status === newStatus) {
    console.log('  D1      -> ' + newStatus);
    console.log('\n✅ Done! tmdb_id=' + tmdbId + ' is now \'' + newStatus + '\'');
    if (newStatus === 'reviewed_approved') console.log('Content will appear in API results\n');
    else console.log('Content rejected, hidden from API\n');
  } else {
    console.error('ERROR: D1 update failed — got: \'' + verify[0]?.filter_status + '\'');
    process.exit(1);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('\nreview-content.js — Content Review Tool\n\nUsage:\n  node scripts/review-content.js --list\n  node scripts/review-content.js --details <tmdb_id>\n  node scripts/review-content.js --approve <tmdb_id>\n  node scripts/review-content.js --reject  <tmdb_id>\n');
    process.exit(0);
  }

  const cmd    = args[0];
  const tmdbId = args[1] ? parseInt(args[1], 10) : null;

  if      (cmd === '--list')    await cmdList();
  else if (cmd === '--details') { if (!tmdbId||isNaN(tmdbId)){console.error('--details <tmdb_id>');process.exit(1);} await cmdDetails(tmdbId); }
  else if (cmd === '--approve') { if (!tmdbId||isNaN(tmdbId)){console.error('--approve <tmdb_id>');process.exit(1);} await cmdUpdateStatus(tmdbId,'reviewed_approved'); }
  else if (cmd === '--reject')  { if (!tmdbId||isNaN(tmdbId)){console.error('--reject <tmdb_id>'); process.exit(1);} await cmdUpdateStatus(tmdbId,'reviewed_rejected'); }
  else { console.error('Unknown command: '+cmd); process.exit(1); }
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
