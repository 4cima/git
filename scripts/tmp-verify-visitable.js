#!/usr/bin/env node
/** مؤقت — قراءة فقط: تحقق صحي من شرط visitable على D1 (بعد فحص الأيتام). */
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const ACCOUNT_ID = process.env.CF_ACCOUNT_ID || '834bca43d616c73db23cf95311cfe17e';
const DATABASE_ID = process.env.CF_DATABASE_ID || 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6';
const D1_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;
const TOKEN = process.env.CLOUDFLARE_D1_TOKEN;

async function d1(sql, attempt = 1) {
  const delays = [0, 5000, 10000, 20000];
  if (delays[attempt - 1]) await new Promise(r => setTimeout(r, delays[attempt - 1]));
  const res = await fetch(D1_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` }, body: JSON.stringify({ sql }) });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    if ((res.status === 429 || t.includes('7429') || t.includes('timeout')) && attempt < 4) return d1(sql, attempt + 1);
    throw new Error(`D1 ${res.status}: ${t.slice(0, 200)}`);
  }
  const j = await res.json();
  if (!j.success) {
    const m = (j.errors ?? []).map(e => `[${e.code}] ${e.message}`).join(', ');
    if ((m.includes('7429') || m.includes('timeout')) && attempt < 4) return d1(sql, attempt + 1);
    throw new Error(`D1 fail: ${m}`);
  }
  return j.result?.[0]?.results ?? [];
}

(async () => {
  console.log('=== التحقق الصحي: visitable على D1 ===');
  for (const [t, col] of [['movies', 'release_year'], ['tv_series', 'first_air_year']]) {
    const total = (await d1(`SELECT COUNT(*) c FROM ${t}`))[0].c;
    const visit = (await d1(`SELECT COUNT(*) c FROM ${t} WHERE is_complete=1 AND ${col} IS NOT NULL AND ${col}>=2000 AND (filter_status IN ('clean','reviewed_approved') OR filter_status IS NULL)`))[0].c;
    const blocked = (await d1(`SELECT COUNT(*) c FROM ${t} WHERE filter_status='blocked'`))[0].c;
    console.log(`${t}: الإجمالي=${total} | visitable=${visit} | غير-visitable=${total - visit} | blocked=${blocked}`);
  }
  // هل العمود tmdb_id NULLable في الجداول المستهدفة؟
  const nulls = await d1(`SELECT (SELECT COUNT(*) FROM movies WHERE tmdb_id IS NULL) AS mv, (SELECT COUNT(*) FROM tv_series WHERE tmdb_id IS NULL) AS tv, (SELECT COUNT(*) FROM list_movies_popular WHERE tmdb_id IS NULL) AS lp, (SELECT COUNT(*) FROM short_titles_lookup WHERE source_id IS NULL) AS st`);
  console.log('NULL tmdb_id:', JSON.stringify(nulls[0] ?? {}));
  // عينة وجود فعلية: tmdb_id من list_movies_popular → في movies visitable؟
  const check = await d1(`SELECT l.tmdb_id, l.slug, m.tmdb_id AS mt FROM list_movies_popular l LEFT JOIN movies m ON m.tmdb_id=l.tmdb_id AND m.is_complete=1 AND m.release_year>=2000 AND (m.filter_status IN ('clean','reviewed_approved') OR m.filter_status IS NULL) ORDER BY l.rank LIMIT 5`);
  for (const r of check) console.log(`تحقق list_movies_popular: tmdb=${r.tmdb_id} slug=${r.slug} → movies matched=${r.mt ?? 'NULL(مش visitable)'}`);
})().catch(e => { console.error('خطأ:', e.message); process.exit(1); });