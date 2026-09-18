#!/usr/bin/env node
/**
 * scripts/tmp/fix-chinese-titles-2026-09-18.js
 *
 * إصلاح ترجمة المسلسلات الصينية/اليابانية ذات السلاج الرقمي (مشكلة بيانات — مهمة 18/9).
 * المتأثر: 47 صف في tv_series (26 ترجمة عربية قمامة من DeepLX قديم + 21 اسم CJK خام)
 * + صفان في short_titles_lookup (298527، 302293).
 *
 * المسار (بموافقة إسلام):
 *   1) backup إلزامي: chinese_titles_backup_20260918 + chinese_titles_stl_backup_20260918
 *   2) الترجمة عبر llama-3.3-70b (نفس الموديل المطلوب):
 *      ملاحظة 18/9: GROQ_API_KEY في .env.local بيرجع 401 (ملغي) رغم شكل السليم —
 *      فالترجمة عدّت على OpenRouter بنفس الموديل meta-llama/llama-3.3-70b-instruct
 *      (OPENROUTER_API_KEY_1 مع fallback للـ2/3).
 *      - المسلسلات اليابانية → من الاسم الياباني الأصلي (الاسم "الإنجليزي" عندهم رومانجة)
 *      - الباقي → من الاسم الإنجليزي من TMDB لو موجود، وإلا من الاسم الصيني الأصلي
 *   3) UPDATE tv_series.name_ar + short_titles_lookup.name_ar — التحقق بـSELECT (meta.changes مشله)
 *   4) purge محدد لصفحات التفاصيل (ممنوع purge_everything)
 *
 * قراءة/كتابة D1 عبر API — usage: node scripts/tmp/fix-chinese-titles-2026-09-18.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env.local') });

const ACCOUNT_ID = process.env.CF_ACCOUNT_ID || '834bca43d616c73db23cf95311cfe17e';
const DATABASE_ID = process.env.CF_DATABASE_ID || 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6';
const D1_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;
const TOKEN = process.env.CLOUDFLARE_D1_TOKEN;
const TMDB_KEYS = [process.env.TMDB_API_KEY, process.env.TMDB_API_KEY_2].filter(Boolean);
const LLM_KEYS = [process.env.OPENROUTER_API_KEY_1, process.env.OPENROUTER_API_KEY_2, process.env.OPENROUTER_API_KEY_3].filter(Boolean);
const LLM_URL = 'https://openrouter.ai/api/v1/chat/completions';
const LLM_MODEL = 'meta-llama/llama-3.3-70b-instruct';
const PURGE_TOKEN = process.env.CF_CACHE_PURGE_TOKEN;
const ZONE_ID = process.env.CF_ZONE_ID;
const BASE_URL = 'https://4cima.com';

if (!TOKEN || !LLM_KEYS.length || !PURGE_TOKEN || !ZONE_ID) {
  console.error('Missing env: CLOUDFLARE_D1_TOKEN / OPENROUTER_API_KEY_* / CF_CACHE_PURGE_TOKEN / CF_ZONE_ID');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CJK = /[\u2E80-\u9FFF\uF900-\uFAFF\u3040-\u30FF]/;
const hasArabic = (s) => /[\u0600-\u06FF]/.test(s || '');

async function d1(sql, params = []) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (attempt > 1) await sleep(3000 * attempt);
    try {
      const res = await fetch(D1_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, params }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(JSON.stringify(j.errors));
      return j.result[0];
    } catch (e) {
      if (attempt === 3) throw e;
      console.warn(`  d1 retry ${attempt}: ${e.message.slice(0, 120)}`);
    }
  }
}

async function tmdbEnglishName(tmdbId) {
  for (const key of TMDB_KEYS) {
    const res = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/translations?api_key=${key}`, { accept: 'application/json' });
    if (res.status === 401) continue;
    if (!res.ok) return null;
    const j = await res.json();
    const en = (j.translations || []).find((t) => t.iso_639_1 === 'en');
    const name = en?.data?.name || null;
    return name && !CJK.test(name) ? name : null;
  }
  return null;
}

let llmCalls = 0;
async function translateWithLLM(text) {
  const body = {
    model: LLM_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are a professional translator specializing in film and TV titles. ' +
          'Translate the given TV series title into natural, concise Arabic suitable as a title. ' +
          'Preserve the meaning, keep it short. Return ONLY the Arabic title — no quotes, no explanation, no notes.',
      },
      { role: 'user', content: text },
    ],
    temperature: 0.3,
    max_tokens: 120,
  };
  for (let attempt = 1; attempt <= 4; attempt++) {
    const key = LLM_KEYS[(attempt - 1) % LLM_KEYS.length];
    const res = await fetch(LLM_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    llmCalls++;
    if (res.status === 429) {
      const wait = 15000 * attempt;
      console.warn(`  LLM 429 — انتظار ${wait / 1000}s...`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) {
      console.warn(`  LLM HTTP ${res.status}: ${(await res.text()).slice(0, 150)}`);
      return null;
    }
    const j = await res.json();
    let out = (j.choices?.[0]?.message?.content || '').trim();
    out = out.replace(/^["«»„"]+|["«»„"]+$/g, '').replace(/\s+/g, ' ').trim();
    if (!out || !hasArabic(out) || out.length > 150 || CJK.test(out)) {
      console.warn(`  LLM rejected output: "${out.slice(0, 80)}"`);
      return null;
    }
    return out;
  }
  return null;
}

async function main() {
  /* 1) تحديد الصفوف المتأثرة — نفس منطق التحقيق */
  const rows = (await d1(`SELECT tmdb_id, slug, name_ar, name_en, original_language FROM tv_series WHERE slug NOT GLOB '*[^0-9]*'`)).results;
  const garbage = rows.filter((r) => hasArabic(r.name_ar) && CJK.test(r.name_en || ''));
  const untouched = rows.filter((r) => CJK.test(r.name_ar || ''));
  const seen = new Set();
  const affected = [...garbage, ...untouched].filter((r) => (seen.has(r.tmdb_id) ? false : (seen.add(r.tmdb_id), true)));
  console.log(`المتأثر: ${affected.length} صف (garbage=${garbage.length}, untouched=${untouched.length})`);
  if (affected.length !== 47) console.warn(`⚠️ المتوقع 47 واللقى ${affected.length} — راجع قبل الكتابة!`);

  const ids = affected.map((r) => r.tmdb_id);

  /* 2) backup إلزامي */
  const bakExists = (await d1(`SELECT name FROM sqlite_master WHERE name='chinese_titles_backup_20260918'`)).results.length > 0;
  if (!bakExists) {
    await d1(`CREATE TABLE chinese_titles_backup_20260918 AS
      SELECT tmdb_id, slug, name_ar, name_en, original_language FROM tv_series WHERE tmdb_id IN (${ids.join(',')})`);
    console.log('✅ backup tv_series: chinese_titles_backup_20260918');
  } else {
    console.log('ℹ️ backup tv_series موجود بالفعل — مش هيتكتب تاني');
  }
  const stlIds = ['298527', '302293'];
  const stlBakExists = (await d1(`SELECT name FROM sqlite_master WHERE name='chinese_titles_stl_backup_20260918'`)).results.length > 0;
  if (!stlBakExists) {
    await d1(`CREATE TABLE chinese_titles_stl_backup_20260918 AS
      SELECT id, source_id, media_type, name_ar, name_en, slug FROM short_titles_lookup WHERE source_id IN (${stlIds.join(',')}) AND media_type='tv'`);
    console.log('✅ backup short_titles_lookup: chinese_titles_stl_backup_20260918');
  }

  /* 3) الترجمة */
  const translations = [];
  for (const r of affected) {
    const enName = r.original_language === 'ja' ? null : await tmdbEnglishName(r.tmdb_id);
    const source = enName || r.name_en; // ja → الياباني الأصلي؛ الباقي إنجليزي لو موجود وإلا الصيني
    const srcLang = enName ? 'English title from TMDB' : (r.original_language === 'ja' ? 'Japanese original' : 'Chinese original');
    const ar = await translateWithLLM(source);
    translations.push({ ...r, source, srcLang, ar });
    console.log(`${enName ? 'EN' : (r.original_language === 'ja' ? 'JA' : 'ZH')} ${r.tmdb_id} "${source}" → "${ar ?? '❌ FAILED'}"`);
    await sleep(3200); // ~19 RPM — تحت حدود llama-3.3-70b المجانية على OpenRouter
  }

  const ok = translations.filter((t) => t.ar);
  const failed = translations.filter((t) => !t.ar);
  console.log(`\nترجمة ناجحة: ${ok.length} | فاشلة: ${failed.length}${failed.length ? ' → ' + failed.map((f) => f.tmdb_id).join(',') : ''}`);

  /* 4) UPDATE — صف صف + تحقق بـSELECT */
  let updated = 0;
  for (const t of ok) {
    await d1(`UPDATE tv_series SET name_ar = ? WHERE tmdb_id = ?`, [t.ar, t.tmdb_id]);
    updated++;
  }
  const stlRows = (await d1(`SELECT id, source_id, name_ar FROM chinese_titles_stl_backup_20260918`)).results;
  for (const s of stlRows) {
    const t = ok.find((x) => x.tmdb_id === s.source_id);
    if (t) await d1(`UPDATE short_titles_lookup SET name_ar = ? WHERE id = ?`, [t.ar, s.id]);
  }
  console.log(`\nUPDATE: ${updated} tv_series + ${stlRows.filter((s) => ok.find((x) => x.tmdb_id === s.source_id)).length} short_titles_lookup`);

  /* 5) تحقق بـSELECT — صف صف (meta.changes مشله على D1) */
  let verified = 0;
  for (const t of ok) {
    const row = (await d1(`SELECT name_ar FROM tv_series WHERE tmdb_id = ?`, [t.tmdb_id])).results[0];
    if (row && row.name_ar === t.ar) verified++;
    else console.error(`  ❌ تحقق فشل tmdb_id=${t.tmdb_id}: "${row?.name_ar}" != "${t.ar}"`);
  }
  console.log(`تحقق SELECT: ${verified}/${ok.length} مطابق`);

  /* 6) purge محدد — 30 رابط كحد أقصى للطلب */
  const urls = ok.map((t) => `${BASE_URL}/series/${t.slug}`);
  for (let i = 0; i < urls.length; i += 30) {
    const batch = urls.slice(i, i + 30);
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${PURGE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: batch }),
    });
    const j = await res.json();
    console.log(`purge دفعة ${Math.floor(i / 30) + 1}: ${batch.length} رابط → ${j.success ? '✅' : '❌ ' + JSON.stringify(j.errors)}`);
  }

  console.log(`\nالملخص: backup ✓ | ترجمة ${ok.length}/${affected.length} | تحقق ${verified}/${ok.length} | purge ${urls.length} رابط | llmCalls=${llmCalls}`);
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
