#!/usr/bin/env node
/* فحص أولي (قراءة فقط) قبل تطبيق gap-apply:
   1) أعمدة جداول D1 المستهدفة بالمؤشر pragma_table_info.
   2) هل أي من المحميين ALLOWLIST/MANUAL داخل الفجوة no_runtime_low_votes محليًا؟
   3) حالة المحميين محليًا. */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env.local') });
const Database = require('better-sqlite3');
const path = require('path');

const ACCOUNT_ID = process.env.CF_ACCOUNT_ID || '834bca43d616c73db23cf95311cfe17e';
const DATABASE_ID = process.env.CF_DATABASE_ID || 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6';
const D1_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;
const TOKEN = process.env.CLOUDFLARE_D1_TOKEN;
if (!TOKEN) { console.error('NO_TOKEN'); process.exit(1); }

async function d1(sql) {
  const r = await fetch(D1_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` }, body: JSON.stringify({ sql }) });
  const j = await r.json();
  if (!j.success) throw new Error(JSON.stringify(j.errors));
  return j.result?.[0]?.results ?? [];
}

(async () => {
  console.log('=== 1) أعمدة D1 ===');
  for (const t of ['movies', 'list_movies_genre', 'list_movies_newest', 'list_movies_popular', 'list_movies_top_rated', 'movie_similar_cache', 'short_titles_lookup']) {
    const cols = await d1(`SELECT name FROM pragma_table_info('${t}') ORDER BY cid`);
    console.log(`${t} => ${cols.map(x => x.name).join(',')}`);
  }
  console.log('\n=== 2) المحميون داخل الفجوة محليًا ===');
  const db = new Database(path.join(__dirname, '../../data/4cima-local.db'), { readonly: true });
  const prot = new Set([398,1576,369885,1408,37135,37136,1266798,910571,250225,451955,10876,1006947,8653,1145810,156236,424762,179129,37432,544575,14428,675414,177248,67415,46086,1163263,304034,417975,362714,624480,289491,484328,874490,911719,32766,10488,202277,226674,39688,943315,269955,27]);
  const ph = [...prot].map(() => '?').join(',');
  const blocked = db.prepare(`SELECT tmdb_id, is_filtered, filter_status, filter_reason FROM movies WHERE is_filtered=1 AND filter_reason='no_runtime_low_votes' AND tmdb_id IN (${ph})`).all(...prot);
  console.log('المحميون ضمن is_filtered=1/no_runtime_low_votes: ' + blocked.length);
  for (const r of blocked) console.log(JSON.stringify(r));
  const vis = db.prepare(`SELECT tmdb_id, is_filtered, filter_status FROM movies WHERE tmdb_id IN (${ph})`).all(...prot);
  console.log('\n=== 3) حالة المحميين محليًا ===');
  for (const r of vis) console.log(`${r.tmdb_id} | is_filtered=${r.is_filtered} | filter_status=${r.filter_status ?? 'NULL'}`);
  db.close();
  console.log('\nقراءة فقط.');
})().catch(e => { console.error('خطأ:', e.message); process.exit(1); });