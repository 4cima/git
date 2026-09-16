require('dotenv').config({ path: '.env.local' });
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const KEYS = [process.env.TMDB_API_KEY, process.env.TMDB_API_KEY_2 || process.env.TMDB_API_KEY_BACKUP].filter(Boolean);
if (KEYS.length === 0) { console.error('NO TMDB KEY'); process.exit(2); }
let ki = 0;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchKeywords(tmdbId) {
  const url = 'https://api.themoviedb.org/3/movie/' + tmdbId + '/keywords?api_key=' + KEYS[ki];
  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    return { status: 'network_error', http: 0, detail: String(e.message || e) };
  }
  if (res.status === 404) return { status: 'http_404', http: 404 };
  if (res.status === 429) {
    const ra = parseInt(res.headers.get('retry-after') || '2', 10);
    await sleep(Math.max(ra, 2) * 1000);
    if (KEYS.length > 1) { ki = (ki + 1) % KEYS.length; return fetchKeywords(tmdbId); }
    return { status: 'http_429', http: 429 };
  }
  if (!res.ok) return { status: 'http_' + res.status, http: res.status };
  let j;
  try { j = await res.json(); } catch (e) { return { status: 'parse_error', http: 200 }; }
  const kws = j.keywords || [];
  if (kws.length > 0) return { status: 'has_keywords', http: 200, count: kws.length, names: kws.map(k => k.name) };
  return { status: 'empty', http: 200, count: 0 };
}

(async () => {
  const db = new Database(path.join(__dirname, '../../data/4cima-local.db'), { readonly: true });
  db.pragma('busy_timeout = 30000');
  const rows = db.prepare("SELECT tmdb_id FROM movies WHERE is_complete=1 AND (filter_status='clean' OR filter_status='reviewed_approved') AND release_year>=2000 AND (keywords_json IS NULL OR keywords_json='' OR keywords_json='[]') ORDER BY RANDOM() LIMIT 500").all();
  db.close();
  console.log('sample size=' + rows.length);
  fs.writeFileSync(path.join(__dirname, '../../data/backups/gap-apply-2026-09-11/kw-sample-500.json'), JSON.stringify(rows.map(r => r.tmdb_id)), 'utf8');

  let has = 0, empty = 0, err404 = 0, err429 = 0, errNet = 0, errOther = 0;
  const hasSample = [], emptySample = [], errSample = [];
  let i = 0;
  for (const r of rows) {
    i++;
    const out = await fetchKeywords(r.tmdb_id);
    if (out.status === 'has_keywords') { has++; if (hasSample.length < 10) hasSample.push({ id: r.tmdb_id, n: out.count, kws: out.names.slice(0, 8) }); }
    else if (out.status === 'empty') { empty++; if (emptySample.length < 10) emptySample.push({ id: r.tmdb_id }); }
    else {
      if (out.status === 'http_404') err404++;
      else if (out.status === 'http_429') err429++;
      else if (out.status === 'network_error') errNet++;
      else errOther++;
      if (errSample.length < 10) errSample.push({ id: r.tmdb_id, st: out.status });
    }
    if (i % 25 === 0) console.log('progress ' + i + '/500 has=' + has + ' empty=' + empty + ' err=' + (err404 + err429 + errNet + errOther));
    await sleep(260);
  }
  const totalErr = err404 + err429 + errNet + errOther;
  console.log('==== RESULT ====');
  console.log('has_keywords=' + has + '/500 (' + (has * 100 / 500).toFixed(1) + '%)');
  console.log('empty_on_tmdb=' + empty + '/500 (' + (empty * 100 / 500).toFixed(1) + '%)');
  console.log('errors total=' + totalErr + ' (404=' + err404 + ' 429=' + err429 + ' net=' + errNet + ' other=' + errOther + ')');
  console.log('sample HAS 10: ' + JSON.stringify(hasSample, null, 1));
  console.log('sample EMPTY 10: ' + JSON.stringify(emptySample));
  console.log('sample ERR 10: ' + JSON.stringify(errSample));
  fs.writeFileSync(path.join(__dirname, '../../data/backups/gap-apply-2026-09-11/kw-feasibility-500.json'), JSON.stringify({ n: 500, has, empty, err404, err429, errNet, errOther, hasSample, emptySample, errSample }, null, 2), 'utf8');
  console.log('saved kw-feasibility-500.json READONLY (no DB writes) DONE');
})();
