#!/usr/bin/env node
/**
 * scripts/cleanup-kv-graveyard.js
 *
 * تنظيف "مقبرة" كاش ISR في KV (NEXT_INC_CACHE_KV).
 *
 * المشكلة: كتابة ISR في KV ميتة على الخطة المجانية (حد 1,000 كتابة/يوم) — فالـnamespace
 * بيبقى مقبرة لمفاتيح من بيلدات قديمة (اتجردت فعليًا 2026-09-18: 8,780 مفتاح / 275 بيلد،
 * أحدث كتابة فيها 2026-09-05 رغم أكتر من 10 نشرات بعدها = البيلدات الجديدة بتكتب صفر مفاتيح).
 *
 * قواعد الأمان:
 *   1) حذف بحد أقصى DAILY_CAP مفتاح في التشغيلة (الخطة المجانية: 1,000 حذف/يوم).
 *   2) حماية تلقائية: أي prefix (بيلد) فيه كتابة أحدث من PROTECT_DAYS يوم بيتستبعد كله —
 *      لو الكتابة رجعت يومًا (R2/مدفوع)، البيلد الشغال هيحمي نفسه لوحده.
 *   3) --keep-prefix=XXX يستبعد prefix إضافي يدويًا (مضاعف معلمة "أ").
 *   4) فشل أي عملية بيتسجل وبيكمّل — السكربت مابيرميش exception قاتلة.
 *
 * التشغيل: node scripts/cleanup-kv-graveyard.js [--limit=N] [--keep-prefix=XXX] [--dry]
 *   --dry = تحليل وطباعة من غير حذف فعلي.
 *
 * ملاحظة نشر: GitHub Actions schedule بيشتغل بس للـworkflows الموجودة على الفرع الافتراضي
 * (main) — سير العمل kv-cleanup.yml مش هيشتغل تلقائيًا غير بعد ما يوصل main.
 */

const fs = require('fs');
const path = require('path');

// ── الإعدادات ─────────────────────────────────────────────────────────────────
const ACCOUNT_ID = '834bca43d616c73db23cf95311cfe17e';
const NAMESPACE_ID = '26313856681946f29245e95c121467ab'; // NEXT_INC_CACHE_KV (wrangler.jsonc)
const DAILY_CAP = 1000;   // حد الحذف المجاني/اليوم
const PROTECT_DAYS = 7;   // أي prefix فيه كتابة أحدث من كده محمي
const READ_SAMPLE = 3;    // عدد المفاتيح المفحوصة من كل prefix لتحديد آخر كتابة

const DRY = process.argv.includes('--dry');
const LIMIT_ARG = process.argv.find(a => a.startsWith('--limit='));
const KEEP_ARG = process.argv.find(a => a.startsWith('--keep-prefix='));

// ── تحميل التوكن من .env.local (نفس أسلوب 3-sync-to-d1.js) ─────────────────────
function loadToken() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const line = fs.readFileSync(envPath, 'utf8').split('\n').find(l => l.startsWith('CLOUDFLARE_API_TOKEN='));
    if (line) return line.slice('CLOUDFLARE_API_TOKEN='.length).trim();
  }
  return process.env.CLOUDFLARE_API_TOKEN;
}

const TOKEN = loadToken();
if (!TOKEN) { console.error('✖ CLOUDFLARE_API_TOKEN غير موجود'); process.exit(1); }

const API = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${NAMESPACE_ID}`;
const authHeaders = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

// ── عمليات الـAPI ──────────────────────────────────────────────────────────────
async function listAllKeys() {
  const all = [];
  let cursor = '';
  while (true) {
    const url = `${API}/keys?limit=1000${cursor ? `&cursor=${cursor}` : ''}`;
    const res = await fetch(url, { headers: authHeaders });
    if (!res.ok) throw new Error(`list keys HTTP ${res.status}`);
    const body = await res.json();
    if (!body.success) throw new Error(`list keys: ${JSON.stringify(body.errors || []).slice(0, 150)}`);
    all.push(...body.result.map(k => k.name));
    cursor = body.result_info && body.result_info.cursor;
    if (!cursor) break;
  }
  return all;
}

async function readLastModified(keyName) {
  const res = await fetch(`${API}/values/${encodeURIComponent(keyName)}`, { headers: authHeaders });
  if (!res.ok) return null;
  try {
    const j = await res.json();
    return j.lastModified ?? (j.value && j.value.lastModified) ?? null;
  } catch { return null; }
}

async function bulkDelete(names) {
  const res = await fetch(`${API}/bulk/delete`, {
    method: 'POST', headers: authHeaders, body: JSON.stringify(names),
  });
  if (!res.ok) throw new Error(`bulk delete HTTP ${res.status}: ${(await res.text()).slice(0, 150)}`);
  return true;
}

// ── التنفيذ ────────────────────────────────────────────────────────────────────
(async () => {
  console.log('═══ تنظيف مقبرة KV ═══');
  console.log(`الوضع: ${DRY ? 'DRY (تحليل فقط)' : 'حذف فعلي'} | السقف: ${DAILY_CAP}/تشغيلة`);

  const keys = await listAllKeys();
  console.log(`إجمالي المفاتيح: ${keys.length.toLocaleString('en-US')}`);

  // تجميع بالبيلد (المقطع الثاني من المفتاح)
  const byPrefix = {};
  for (const k of keys) {
    const p = k.split('/')[1];
    (byPrefix[p] = byPrefix[p] || []).push(k);
  }
  console.log(`عدد البيلدات (prefixes): ${Object.keys(byPrefix).length}`);

  // فحص عينة من كل prefix لتحديد آخر كتابة
  const cutoff = Date.now() - PROTECT_DAYS * 24 * 60 * 60 * 1000;
  const protectedPrefixes = new Set();
  if (KEEP_ARG) protectedPrefixes.add(KEEP_ARG.slice('--keep-prefix='.length));

  const prefixes = Object.keys(byPrefix);
  let checked = 0;
  for (const p of prefixes) {
    for (const k of byPrefix[p].slice(0, READ_SAMPLE)) {
      const lm = await readLastModified(k);
      checked++;
      if (lm && lm > cutoff) { protectedPrefixes.add(p); break; }
    }
  }
  console.log(`فُحص ${checked} مفتاح (عينة) — prefixes محمية (${PROTECT_DAYS} أيام): ${protectedPrefixes.size}`);

  // المفاتيح المرشحة للحذف
  const doomed = keys.filter(k => !protectedPrefixes.has(k.split('/')[1]));
  console.log(`مرشحة للحذف: ${doomed.length.toLocaleString('en-US')} | محمية: ${(keys.length - doomed.length).toLocaleString('en-US')}`);

  const budget = LIMIT_ARG ? parseInt(LIMIT_ARG.slice('--limit='.length), 10) : DAILY_CAP;
  const batch = doomed.slice(0, budget);
  if (batch.length === 0) { console.log('✅ لا شيء للحذف — انتهى.'); return; }
  console.log(`سيتم حذف ${batch.length.toLocaleString('en-US')} مفتاح في التشغيلة دي`);

  if (DRY) {
    console.log('— DRY: أول 10 مرشحة —');
    batch.slice(0, 10).forEach(k => console.log('  ' + k));
    return;
  }

  // حذف جماعي بدفعات 500
  let deleted = 0, failures = 0;
  for (let i = 0; i < batch.length; i += 500) {
    const chunk = batch.slice(i, i + 500);
    try {
      await bulkDelete(chunk);
      deleted += chunk.length;
      console.log(`  ✅ ${deleted.toLocaleString('en-US')}/${batch.length}`);
    } catch (e) {
      failures += chunk.length;
      console.error(`  ⚠ فشل دفعة (${i}-${i + chunk.length}): ${e.message}`);
    }
  }
  console.log(`═══ النتيجة: محذوف ${deleted.toLocaleString('en-US')} • فاشل ${failures} • متبقي في الـnamespace ${(keys.length - deleted).toLocaleString('en-US')} ═══`);
  console.log('ملاحظة: شغّل السكربت يوميًا (سير العمل kv-cleanup.yml) لحد ما تفضل 0 مرشحة.');
})().catch(e => { console.error('✖ فشل:', e.message); process.exit(1); });
