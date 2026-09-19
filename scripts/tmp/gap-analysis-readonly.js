#!/usr/bin/env node
/**
 * قراءة فقط — تحليل فجوة no_runtime_low_votes (SELECT فقط، لا كتابة إطلاقًا).
 * D1 عبر REST API (مثل tmp-candidates.js / backup-d1.js) بلا wrangler.
 * المحلي: better-sqlite3 بوضع readonly.
 *
 * يحسب:
 *   D1_VISITABLE − LOCAL_VISITABLE (فجوة)
 *   NEW_REJECT  = vote_count<20 AND (runtime==0 OR runtime IS NULL) AND vote_average<5 AND popularity<5
 *   ACCEPTED_BY_NEW = فجوة − NEW_REJECT
 *   STILL_REJECTED  = فجوة ∩ NEW_REJECT
 *
 * لا DELETE. لا UPDATE. لا sync. في الذاكرة فقط.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env.local') });
const Database = require('better-sqlite3');
const path = require('path');

const ACCOUNT_ID = process.env.CF_ACCOUNT_ID || '834bca43d616c73db23cf95311cfe17e';
const DATABASE_ID = process.env.CF_DATABASE_ID || 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6';
const D1_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;
const TOKEN = process.env.CLOUDFLARE_D1_TOKEN;

if (!TOKEN) {
  console.error('خطأ: CLOUDFLARE_D1_TOKEN غير موجود في .env.local');
  process.exit(1);
}

/* ── D1 (SELECT فقط، مع إعادة محاولة وترحيل) ─────────────────────────────── */
async function d1(sql, params) {
  const delays = [0, 3000, 8000, 15000];
  for (let attempt = 1; attempt <= 4; attempt++) {
    if (delays[attempt - 1]) await new Promise(r => setTimeout(r, delays[attempt - 1]));
    try {
      const res = await fetch(D1_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify(params ? { sql, params } : { sql }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        if ((res.status === 429 || t.includes('7429') || t.includes('timeout')) && attempt < 4) continue;
        throw new Error(`D1 HTTP ${res.status}: ${t.slice(0, 200)}`);
      }
      const j = await res.json();
      if (!j.success) {
        const m = (j.errors ?? []).map(e => `[${e.code}] ${e.message}`).join(', ');
        if ((m.includes('7429') || m.includes('timeout')) && attempt < 4) continue;
        throw new Error(`D1 fail: ${m}`);
      }
      return j.result?.[0]?.results ?? [];
    } catch (e) {
      if (attempt === 4) throw e;
    }
  }
  throw new Error('D1: فشلت كل المحاولات');
}

async function d1Count(sql) {
  return Number((await d1(sql))[0].c);
}

/* ── محلي (readonly) ─────────────────────────────────────────────────────── */
const localPath = path.join(__dirname, '../../data/4cima-local.db');
const db = new Database(localPath, { readonly: true });
db.pragma('busy_timeout = 30000');

const CHUNK = 900;

(async () => {
  console.log('═'.repeat(72));
  console.log('تحليل فجوة no_runtime_low_votes — قراءة فقط');
  console.log('═'.repeat(72));

  /* 1) D1_VISITABLE — keyset بـNOT INDEXED (id = rowid alias): صيغة الـOR تمنع
     فهارس filter_status الجزئية فيختار المخطط TEMP B-TREE (290K صف/نداء) —
     المسح المتسلسل على PK هو المثالي (~2K/نداء). التكافؤ اتأكد مقابل OFFSET. */
  console.log('\n[1] جلب D1_VISITABLE (SELECT فقط)...');
  const d1VisCount = await d1Count(`SELECT COUNT(*) c FROM movies WHERE is_complete=1 AND release_year>=2000 AND (filter_status IN ('clean','reviewed_approved') OR filter_status IS NULL)`);
  const d1VisSql = `SELECT id, tmdb_id FROM movies NOT INDEXED WHERE is_complete=1 AND release_year>=2000 AND (filter_status IN ('clean','reviewed_approved') OR filter_status IS NULL) AND id > ? ORDER BY id LIMIT ?`;
  const d1Vis = new Set();
  const BATCH = 2000;
  let lastId = 0;
  for (;;) {
    const rows = await d1(d1VisSql, [lastId, BATCH]);
    for (const r of rows) if (r.tmdb_id != null) d1Vis.add(Number(r.tmdb_id));
    if (rows.length < BATCH) break;
    lastId = rows[rows.length - 1].id;
  }
  console.log(`D1_VISITABLE = ${d1Vis.size.toLocaleString('en-US')} (COUNT(*) مرجعي = ${d1VisCount.toLocaleString('en-US')})`);

  /* 2) LOCAL_VISITABLE */
  console.log('[2] قراءة LOCAL_VISITABLE محليًا (readonly)...');
  const localVis = new Set(
    db.prepare(`SELECT tmdb_id FROM movies WHERE is_complete=1 AND is_filtered=0 AND release_year>=2000`).all().map(r => Number(r.tmdb_id))
  );
  console.log(`LOCAL_VISITABLE = ${localVis.size.toLocaleString('en-US')}`);

  /* 3) الفجوة = D1_VISITABLE − LOCAL_VISITABLE */
  const gap = new Set([...d1Vis].filter(id => !localVis.has(id)));
  console.log(`\n[3] الفجوة = D1_VISITABLE − LOCAL_VISITABLE = ${gap.size.toLocaleString('en-US')}`);

  /* تفاصيل صفوف الفجوة من المحلي */
  const gapArr = [...gap].sort((a, b) => a - b);
  const localRowsByGap = new Map();
  for (let i = 0; i < gapArr.length; i += CHUNK) {
    const chunk = gapArr.slice(i, i + CHUNK);
    const ph = chunk.map(() => '?').join(',');
    const rows = db.prepare(
      `SELECT tmdb_id, release_year, title_en, vote_average, vote_count, popularity, runtime, filter_reason, is_filtered, is_complete, filter_status
       FROM movies WHERE tmdb_id IN (${ph})`
    ).all(...chunk);
    for (const r of rows) localRowsByGap.set(Number(r.tmdb_id), r);
  }
  const found = gapArr.filter(id => localRowsByGap.has(id));
  const missing = gapArr.filter(id => !localRowsByGap.has(id));

  /* 4+5) القاعدة الجديدة في الذاكرة — مطابقة content-filter.js */
  const classify = (r) => {
    const voteCount = Number(r.vote_count || 0);
    const noRuntime = r.runtime == null || Number(r.runtime) === 0;
    const voteAverage = Number(r.vote_average || 0);
    const popularity = Number(r.popularity || 0);
    return voteCount < 20 && noRuntime && voteAverage < 5 && popularity < 5;
  };
  const applicable = found.map(id => localRowsByGap.get(id));
  const stillRejected = applicable.filter(classify);
  const acceptedByNew = applicable.filter(r => !classify(r));

  /* ── التقرير ─────────────────────────────────────────────────────────── */
  console.log('\n' + '═'.repeat(72));
  console.log('التقرير');
  console.log('═'.repeat(72));
  console.log(`إجمالي الفجوة               = ${gap.size.toLocaleString('en-US')}`);
  console.log(`  └ موجود محليًا (فُحصل عليه): ${found.length.toLocaleString('en-US')}`);
  console.log(`  └ غير موجود محليًا          : ${missing.length.toLocaleString('en-US')}`);

  const hist = new Map();
  for (const r of applicable) {
    const k = r.is_filtered === 1 ? `is_filtered=1 (سبب: ${r.filter_reason ?? 'NULL'})`
      : r.is_filtered === 0 ? 'is_filtered=0 (غير مفلتر — لا يفترض وقوعه!)'
      : `is_filtered=${r.is_filtered}`;
    hist.set(k, (hist.get(k) || 0) + 1);
  }
  console.log('توزيع الحالة المحلية داخل الفجوة:');
  for (const [k, v] of [...hist.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${k} → ${v.toLocaleString('en-US')}`);

  console.log(`\nACCEPTED_BY_NEW (gap − NEW_REJECT) = ${acceptedByNew.length.toLocaleString('en-US')}`);
  console.log(`STILL_REJECTED (gap ∩ NEW_REJECT) = ${stillRejected.length.toLocaleString('en-US')}`);

  /* لمحة: أسباب القبول داخل ACCEPTED (غير حصرية) */
  const accQualify = (r) => ({
    vc: Number(r.vote_count || 0) >= 20,
    rt: !(r.runtime == null || Number(r.runtime) === 0),
    va: Number(r.vote_average || 0) >= 5,
    pop: Number(r.popularity || 0) >= 5,
  });
  const b = { vc: 0, rt: 0, va: 0, pop: 0 };
  for (const r of acceptedByNew) {
    const q = accQualify(r);
    if (q.vc) b.vc++;
    if (q.rt) b.rt++;
    if (q.va) b.va++;
    if (q.pop) b.pop++;
  }
  console.log(`أسباب القبول داخل ACCEPTED (غير حصرية): votes>=20=${b.vc.toLocaleString('en-US')} | runtime>0=${b.rt.toLocaleString('en-US')} | rate>=5=${b.va.toLocaleString('en-US')} | pop>=5=${b.pop.toLocaleString('en-US')}`);

  const fmt = (r) => `${r.title_en ?? '(بلا عنوان)'} | ${r.release_year ?? '؟'} | ⭐${r.vote_average ?? '∅'}/10 | pop=${r.popularity ?? '∅'} | votes=${r.vote_count ?? '∅'} | rt=${r.runtime ?? '∅'} | [${r.filter_reason ?? ''}]`;

  console.log('\n— عيّنة 20 من ACCEPTED_BY_NEW (مرتبة tmdb_id) —');
  for (const r of acceptedByNew.slice(0, 20)) console.log(`  ${r.tmdb_id} | ${fmt(r)}`);

  console.log('\n— عيّنة 20 من STILL_REJECTED (مرتبة tmdb_id) —');
  for (const r of stillRejected.slice(0, 20)) console.log(`  ${r.tmdb_id} | ${fmt(r)}`);

  console.log('\nقراءة فقط. لا حذف. في انتظار قرارك.');

  db.close();
})().catch(e => {
  console.error('خطأ:', e.message);
  try { db.close(); } catch {}
  process.exit(1);
});