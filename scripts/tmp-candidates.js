// مؤقت: مرشحون جدد — SELECT فقط بلا أي DELETE/UPDATE — يُحذف بعد التشغيل
// يشغّل بوابات السلامة من content-filter.js على الصفوف visitable المخزونة (كلمات مخزنة)
// ويستبعد المحميين (ALLOWLIST + MANUAL_BLOCKED).
require('dotenv').config({ path: '.env.local' });
const db = require('./services/local-db');
const { isExplicitContent } = require('./services/content-filter');

const ACCOUNT_ID = process.env.CF_ACCOUNT_ID || '834bca43d616c73db23cf95311cfe17e';
const DATABASE_ID = process.env.CF_DATABASE_ID || 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6';
const D1_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;

async function d1(sql) {
  const res = await fetch(D1_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.CLOUDFLARE_D1_TOKEN}` },
    body: JSON.stringify({ sql })
  });
  const j = await res.json();
  if (!j.success) throw new Error('D1: ' + JSON.stringify(j.errors));
  return j.result[0].results;
}

const ALLOWLIST = new Set([
  '398', '1576', '369885', '1408', '37135', '37136',
  '1266798', '910571', '250225', '451955', '10876', '1006947', '8653', '1145810',
  '156236', '424762', '179129', '37432', '544575', '14428', '675414', '177248',
  '67415', '46086', '1163263', '304034', '417975', '362714', '624480', '289491',
  '484328', '874490', '911719', '32766', '10488', '202277',
].map(Number));
const MANUAL_M = new Set([226674, 39688, 943315, 269955, 27]);
const MANUAL_T = new Set([]);

function storedContent(row, mediaType) {
  let storedKeywords = [];
  if (row.keywords_json) {
    try { storedKeywords = JSON.parse(row.keywords_json) || [] } catch { storedKeywords = [] }
  }
  if (mediaType === 'tv') {
    return {
      id: row.tmdb_id, name: row.name_en, name_original: row.name_original,
      overview: row.overview_en || row.overview_ar || '',
      first_air_date: row.first_air_date, first_air_year: row.first_air_year,
      age_rating: row.age_rating, production_companies: row.production_companies,
      vote_count: row.vote_count, vote_average: row.vote_average,
      keywords: { results: storedKeywords },
    };
  }
  return {
    id: row.tmdb_id, title: row.title_en, title_original: row.title_original,
    overview: row.overview_en || row.overview_ar || '',
    release_date: row.release_date, release_year: row.release_year,
    runtime: row.runtime, age_rating: row.age_rating,
    production_companies: row.production_companies, vote_count: row.vote_count,
    vote_average: row.vote_average,
    keywords: { keywords: storedKeywords },
  };
}

(async () => {
  console.log('=== مرشحون جدد (SELECT فقط) — بوابات السلامة على الصفوف visitable ===');
  const out = [];
  for (const [table, mediaType, yearCol, titleCol, manual] of [
    ['movies', 'movie', 'release_year', 'title_en', MANUAL_M],
    ['tv_series', 'tv', 'first_air_year', 'name_en', MANUAL_T],
  ]) {
    const extraCols = mediaType === 'movie' ? 'runtime, release_date' : 'NULL AS runtime, first_air_date';
    const rows = db.prepare(`
      SELECT tmdb_id, ${yearCol} yr, ${titleCol} t, ${titleCol.replace('_en', '_ar')} t_ar, overview_en, overview_ar, age_rating, production_companies, keywords_json, vote_count, vote_average, ${extraCols}
      FROM ${table} WHERE is_complete=1 AND is_filtered=0 AND ${yearCol} IS NOT NULL AND ${yearCol}>=2000
    `).all();
    let candidates = 0;
    for (const row of rows) {
      if (ALLOWLIST.has(row.tmdb_id) || manual.has(row.tmdb_id)) continue;
      const content = storedContent(row, mediaType);
      if (typeof content.production_companies === 'string') {
        try { content.production_companies = JSON.parse(content.production_companies) } catch { content.production_companies = [] }
      }
      const explicit = isExplicitContent(content, { mediaType, mode: 'audit' });
      if (explicit.blocked) {
        candidates++;
        out.push({ id: row.tmdb_id, نوع: mediaType === 'movie' ? 'فيلم' : 'مسلسل', سنة: row.yr, عنوان: row.t, سبب: explicit.reason });
      }
    }
    console.log(`${table}: فُحص ${rows.length} → مرشحون ${candidates}`);
  }
  console.log(`\n=== جدول المرشحين (${out.length}) ===`);
  for (const c of out) console.log(`${c.id} | ${c.نوع} | ${c.سنة} | ${c.عنوان} | ${c.سبب}`);
  if (out.length === 0) console.log('صفر');

  // عدّ visitable محلي مقابل D1
  console.log('\n=== عدّ visitable ===');
  const lm = db.prepare(`SELECT COUNT(*) c FROM movies WHERE is_complete=1 AND is_filtered=0 AND release_year IS NOT NULL AND release_year>=2000`).get().c;
  const lt = db.prepare(`SELECT COUNT(*) c FROM tv_series WHERE is_complete=1 AND is_filtered=0 AND first_air_year IS NOT NULL AND first_air_year>=2000`).get().c;
  console.log(`محلي: أفلام=${lm} | مسلسلات=${lt}`);
  const dm = await d1(`SELECT COUNT(*) c FROM movies WHERE is_complete=1 AND (filter_status IN ('clean','reviewed_approved') OR filter_status IS NULL) AND release_year IS NOT NULL AND release_year>=2000`);
  const dt = await d1(`SELECT COUNT(*) c FROM tv_series WHERE is_complete=1 AND (filter_status IN ('clean','reviewed_approved') OR filter_status IS NULL) AND first_air_year IS NOT NULL AND first_air_year>=2000`);
  console.log(`D1: أفلام=${dm[0].c} | مسلسلات=${dt[0].c}`);
})().catch(e => { console.error('خطأ:', e.message); process.exit(1); });
