/**
 * review-content.js - Content Review Tool (approve/reject)
 *
 * Usage:
 *   node scripts/review-content.js --list
 *   node scripts/review-content.js --details <tmdb_id>
 *   node scripts/review-content.js --approve <tmdb_id>
 *   node scripts/review-content.js --reject  <tmdb_id>
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') })

const { createClient } = require('@libsql/client')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

const localDb = require('./services/local-db')

function printTable(rows, columns) {
  if (rows.length === 0) {
    console.log('  (no results)')
    return
  }
  const widths = {}
  for (const col of columns) widths[col.key] = col.label.length
  for (const row of rows) {
    for (const col of columns) {
      const val = String(row[col.key] ?? '')
      if (val.length > widths[col.key]) widths[col.key] = val.length
    }
  }
  const header = columns.map(c => c.label.padEnd(widths[c.key])).join('  |  ')
  const sep    = columns.map(c => '-'.repeat(widths[c.key])).join('--+--')
  console.log('  ' + header)
  console.log('  ' + sep)
  for (const row of rows) {
    const line = columns.map(c => String(row[c.key] ?? '').padEnd(widths[c.key])).join('  |  ')
    console.log('  ' + line)
  }
}

async function cmdList() {
  console.log('\nFetching needs_review content from Turso...\n')

  const moviesRes = await turso.execute({
    sql: "SELECT tmdb_id, title_ar, title_en, vote_average FROM movies WHERE filter_status = 'needs_review' ORDER BY vote_average DESC",
    args: []
  })

  const seriesRes = await turso.execute({
    sql: "SELECT tmdb_id, name_ar AS title_ar, name_en AS title_en, vote_average FROM tv_series WHERE filter_status = 'needs_review' ORDER BY vote_average DESC",
    args: []
  })

  const movies = moviesRes.rows || []
  const series = seriesRes.rows || []

  const cols = [
    { key: 'tmdb_id',       label: 'TMDB ID'      },
    { key: 'title_ar',      label: 'Arabic Title'  },
    { key: 'title_en',      label: 'English Title' },
    { key: 'vote_average',  label: 'Rating'        },
  ]

  console.log('=== MOVIES needs_review (' + movies.length + ') ===')
  printTable(movies, cols)

  console.log('\n=== TV SERIES needs_review (' + series.length + ') ===')
  printTable(series, cols)

  console.log('\nTotal: ' + (movies.length + series.length) + ' items need review')
  console.log('  --details <id>  full details')
  console.log('  --approve <id>  set reviewed_approved')
  console.log('  --reject  <id>  set reviewed_rejected\n')
}

async function cmdDetails(tmdbId) {
  console.log('\nDetails for tmdb_id=' + tmdbId + ' from Turso...\n')

  const movieRes = await turso.execute({ sql: 'SELECT * FROM movies WHERE tmdb_id = ?', args: [tmdbId] })
  if (movieRes.rows && movieRes.rows.length > 0) {
    const m = movieRes.rows[0]
    console.log('Type: Movie\n' + '-'.repeat(60))
    ;[['tmdb_id',m.tmdb_id],['slug',m.slug],['title_ar',m.title_ar],['title_en',m.title_en],
      ['release_year',m.release_year],['vote_average',m.vote_average],['vote_count',m.vote_count],
      ['popularity',m.popularity],['runtime',m.runtime ? m.runtime+' min' : '-'],
      ['filter_status',m.filter_status],['filter_reason',m.filter_reason||'-'],
      ['overview_ar', m.overview_ar ? m.overview_ar.slice(0,150)+'...' : '-']
    ].forEach(([k,v]) => console.log('  '+k.padEnd(16)+': '+(v??'-')))
    console.log('-'.repeat(60))
    return
  }

  const seriesRes = await turso.execute({ sql: 'SELECT * FROM tv_series WHERE tmdb_id = ?', args: [tmdbId] })
  if (seriesRes.rows && seriesRes.rows.length > 0) {
    const s = seriesRes.rows[0]
    console.log('Type: TV Series\n' + '-'.repeat(60))
    ;[['tmdb_id',s.tmdb_id],['slug',s.slug],['name_ar',s.name_ar],['name_en',s.name_en],
      ['first_air_year',s.first_air_year],['vote_average',s.vote_average],['vote_count',s.vote_count],
      ['popularity',s.popularity],['number_of_seasons',s.number_of_seasons],
      ['filter_status',s.filter_status],['filter_reason',s.filter_reason||'-'],
      ['overview_ar', s.overview_ar ? s.overview_ar.slice(0,150)+'...' : '-']
    ].forEach(([k,v]) => console.log('  '+k.padEnd(20)+': '+(v??'-')))
    console.log('-'.repeat(60))
    return
  }

  console.log('ERROR: tmdb_id=' + tmdbId + ' not found in Turso')
}

async function cmdUpdateStatus(tmdbId, newStatus) {
  const label = newStatus === 'reviewed_approved' ? 'APPROVE' : 'REJECT'
  console.log('\n[' + label + '] tmdb_id=' + tmdbId + '\n')

  const movieRes  = await turso.execute({ sql: 'SELECT tmdb_id, title_ar, title_en, filter_status FROM movies WHERE tmdb_id = ?', args: [tmdbId] })
  const seriesRes = await turso.execute({ sql: 'SELECT tmdb_id, name_ar AS title_ar, name_en AS title_en, filter_status FROM tv_series WHERE tmdb_id = ?', args: [tmdbId] })

  let contentType = null, currentRow = null
  if (movieRes.rows && movieRes.rows.length > 0)       { contentType = 'movie';  currentRow = movieRes.rows[0] }
  else if (seriesRes.rows && seriesRes.rows.length > 0) { contentType = 'series'; currentRow = seriesRes.rows[0] }

  if (!currentRow) { console.error('ERROR: tmdb_id=' + tmdbId + ' not found in Turso'); process.exit(1) }

  console.log('  Title  : ' + (currentRow.title_ar || currentRow.title_en))
  console.log('  Type   : ' + (contentType === 'movie' ? 'Movie' : 'TV Series'))
  console.log('  Status : ' + currentRow.filter_status)

  if (currentRow.filter_status !== 'needs_review') {
    console.warn('  WARNING: status is \'' + currentRow.filter_status + '\' not \'needs_review\', updating anyway...\n')
  }

  const table  = contentType === 'movie' ? 'movies' : 'tv_series'
  const nowStr = new Date().toISOString().replace('T',' ').slice(0,19)

  // local.db
  console.log('  Updating local.db...')
  localDb.prepare('UPDATE '+table+' SET filter_status=?, updated_at=? WHERE tmdb_id=?').run(newStatus, nowStr, tmdbId)
  const localCheck = localDb.prepare('SELECT filter_status FROM '+table+' WHERE tmdb_id=?').get(tmdbId)
  if (localCheck) console.log('  local.db -> ' + localCheck.filter_status)
  else console.warn('  WARNING: tmdb_id not found in local.db (not synced yet)')

  // Turso
  console.log('  Updating Turso...')
  await turso.execute({ sql: 'UPDATE '+table+' SET filter_status=?, updated_at=? WHERE tmdb_id=?', args: [newStatus, nowStr, tmdbId] })

  const verifyRes = await turso.execute({ sql: 'SELECT filter_status FROM '+table+' WHERE tmdb_id=?', args: [tmdbId] })
  const confirmed = verifyRes.rows?.[0]?.filter_status
  if (confirmed === newStatus) {
    console.log('  Turso   -> ' + confirmed)
    console.log('\nDone! tmdb_id=' + tmdbId + ' is now \'' + newStatus + '\'')
    if (newStatus === 'reviewed_approved') console.log('Content will appear in API results\n')
    else console.log('Content rejected, will not appear in API\n')
  } else {
    console.error('ERROR: Turso update failed — actual: \'' + confirmed + '\'')
    process.exit(1)
  }
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('\nreview-content.js - Content Review Tool\n\nUsage:\n  node scripts/review-content.js --list\n  node scripts/review-content.js --details <tmdb_id>\n  node scripts/review-content.js --approve <tmdb_id>\n  node scripts/review-content.js --reject  <tmdb_id>\n\nfilter_status values:\n  clean              auto-approved\n  needs_review       flagged for manual review\n  reviewed_approved  manually approved (shown in API)\n  reviewed_rejected  manually rejected (hidden)\n  blocked            auto-blocked permanently\n')
    process.exit(0)
  }

  const cmd    = args[0]
  const tmdbId = args[1] ? parseInt(args[1], 10) : null

  if      (cmd === '--list')    await cmdList()
  else if (cmd === '--details') { if (!tmdbId||isNaN(tmdbId)){console.error('ERROR: --details <tmdb_id>');process.exit(1)} await cmdDetails(tmdbId) }
  else if (cmd === '--approve') { if (!tmdbId||isNaN(tmdbId)){console.error('ERROR: --approve <tmdb_id>');process.exit(1)} await cmdUpdateStatus(tmdbId,'reviewed_approved') }
  else if (cmd === '--reject')  { if (!tmdbId||isNaN(tmdbId)){console.error('ERROR: --reject <tmdb_id>'); process.exit(1)} await cmdUpdateStatus(tmdbId,'reviewed_rejected') }
  else { console.error('Unknown command: '+cmd+'. Run --help'); process.exit(1) }
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1) })
