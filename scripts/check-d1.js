#!/usr/bin/env node

/**
 * scripts/check-d1.js
 *
 * D1 doctor — يحدّد بالضبط أي طبقة في مسار الوصول إلى D1 فاشلة، بدل خطأ
 * "401 Unauthorized" العام الذي لا يقول شيئاً.
 *
 * يفحص بالتتابع (كل فحص يبني على السابق):
 *   1. وجود CLOUDFLARE_D1_TOKEN وشكله (cfut_/cfat_ + 40 حرفاً + checksum)
 *   2. GET /user/tokens/verify             → هل التوكن صالح ونشط؟
 *   3. GET /accounts/{account_id}          → هل التوكن يرى الأكاونت المكوَّن؟
 *   4. GET .../d1/database/{db_id}         → هل قاعدة D1 موجودة ومتاحة؟
 *   5. POST .../d1/database/{db_id}/query  → استعلام حقيقي (SELECT 1)
 *
 * لا يُطبع التوكن إطلاقاً — فقط الأطوال وأسماء المتغيرات.
 *
 * Usage:  node scripts/check-d1.js   (أو npm run check:d1)
 * Exit:   0 = المسار سليم، 1 = فشل (مع خطوات الإصلاح المحددة)
 */
'use strict';

const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// نفس الافتراضات الاحتياطية في src/lib/db.ts — لا بد أن تبقى متطابقة
const ACCOUNT_ID  = process.env.CLOUDFLARE_ACCOUNT_ID  || '834bca43d616c73db23cf95311cfe17e';
const DATABASE_ID = process.env.CLOUDFLARE_DATABASE_ID || 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6';
const RAW_TOKEN   = process.env.CLOUDFLARE_D1_TOKEN || '';
const TOKEN       = RAW_TOKEN.trim();

const API = 'https://api.cloudflare.com/client/v4';

/** الشكل الجديد: cfut_/cfat_/cfk_ + 40 حرفاً + checksum — أو الشكل القديم: 40 حرفاً */
const PREFIXED_FORMAT = /^(cfut_|cfat_|cfk_)[0-9A-Za-z]{40}[0-9A-Za-z_-]{0,12}$/;
const LEGACY_FORMAT   = /^[0-9A-Za-z]{40}$/;

// ── Helpers ───────────────────────────────────────────────────────────────────

const c = {
  bold:  (s) => `\x1b[1m${s}\x1b[0m`,
  dim:   (s) => `\x1b[2m${s}\x1b[0m`,
  red:   (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  gold:  (s) => `\x1b[33m${s}\x1b[0m`,
};

async function api(pathname, init = {}) {
  let res;
  try {
    res = await fetch(API + pathname, {
      ...init,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    return { status: 0, network: err.message, body: null };
  }
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

/** يستخرج [code] message من استجابة Cloudflare */
function cfError(body) {
  if (!body) return 'استجابة غير قابلة للقراءة';
  const errs = (body.errors || []).map((e) => `[${e.code}] ${e.message}`);
  return errs.length ? errs.join(', ') : `success=${body.success}`;
}

const steps = [];

function record(name, ok, detail, fix) {
  steps.push({ name, ok, detail, fix });
  const mark = ok === true ? c.green('✅') : ok === 'warn' ? c.gold('⚠️ ') : c.red('❌');
  console.log(`${mark} ${name}`);
  if (detail) console.log(c.dim(`     ${detail}`));
  if (ok !== true && fix) console.log(c.dim(`     ↳ ${fix}`));
  return ok === true;
}

function finish() {
  const failed = steps.filter((s) => s.ok === false);
  console.log('');
  if (failed.length === 0) {
    console.log(c.green(c.bold('✅ مسار D1 سليم — next dev سيتصل بقاعدة D1 بنجاح.')));
    process.exit(0);
  }
  console.log(c.red(c.bold(`❌ فشل ${failed.length} فحص — next dev لن يستطيع قراءة D1.`)));
  console.log('\n   الخطوات:');
  console.log('   1) dash.cloudflare.com › My Profile › API Tokens › Create Token');
  console.log('      صلاحية: Account › D1 › Edit   (Account Resources: نفس الأكاونت)');
  console.log('   2) ضع القيمة في .env.local:  CLOUDFLARE_D1_TOKEN=<الجديد>');
  console.log('   3) أعد تشغيل next dev (لازم restart لالتقاط .env.local)');
  console.log('   4) أعد تشغيل هذا الفحص:  npm run check:d1\n');
  process.exit(1);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(c.bold('\n🔍 D1 doctor — فحص مسار الاتصال بقاعدة D1\n'));
  console.log(c.dim(`   account:  ${ACCOUNT_ID}`));
  console.log(c.dim(`   database: ${DATABASE_ID}\n`));

  // 1) وجود التوكن وشكله
  if (!TOKEN) {
    record('التوكن مضبوط في .env.local', false,
      'CLOUDFLARE_D1_TOKEN فارغ أو غير موجود.',
      'أضِف السطر CLOUDFLARE_D1_TOKEN=<التوكن> في .env.local ثم أعد تشغيل next dev.');
    finish();
    return;
  }

  record('التوكن موجود في .env.local', 'warn',
    `الطول ${TOKEN.length} حرفاً (القيمة لا تُطبع).`);

  const formatted = PREFIXED_FORMAT.test(TOKEN) || LEGACY_FORMAT.test(TOKEN);
  record('شكل التوكن معروف', formatted || 'warn',
    formatted
      ? 'يطابق شكل Cloudflare (cfut_/cfat_ + 40 حرفاً + checksum، أو الشكل القديم 40 حرفاً).'
      : `الطول ${TOKEN.length} لا يطابق أي شكل معروف — غالباً نُسخ ناقصاً.`,
    'انسخ التوكن كاملاً من Cloudflare Dashboard دفعة واحدة.');

  if (/\s/.test(RAW_TOKEN)) {
    record('لا مسافات حول التوكن', 'warn',
      'القيمة تحتوي مسافة/سطر جديد — الكود يعمل trim() لكن نظّف الملف.',
      'أزل أي مسافة بعد = أو في نهاية السطر.');
  }

  // 2) هل التوكن صالح ونشط؟
  const verify = await api('/user/tokens/verify');
  if (verify.network) {
    record('الوصول إلى api.cloudflare.com', false,
      `فشل الشبكة: ${verify.network}`,
      'تحقق من الاتصال بالإنترنت أو من أي VPN/جدار ناري.');
  } else if (verify.status !== 200) {
    const code0 = verify.body?.errors?.[0]?.code;
    const dead = code0 === 1000 || code0 === 9109;
    record('التوكن صالح (tokens/verify)', false,
      `HTTP ${verify.status} — ${cfError(verify.body)}`,
      dead
        ? 'التوكن مرفوض نهائياً: ملغى (Revoked) أو مُدوَّر (Rolled) أو منتهي المدة. ' +
          'أنشئ توكن جديداً بصلاحية Account › D1 › Edit.'
        : 'راجع صلاحيات التوكن في لوحة Cloudflare.');
  } else {
    const status = verify.body?.result?.status;
    if (status === 'active') {
      record('التوكن صالح (tokens/verify)', true, `status=${status}`);
    } else {
      record('التوكن صالح (tokens/verify)', false,
        `status=${status} — التوكن غير نشط.`,
        'منتهي المدة أو معطّل — أنشئ توكن جديداً (TTL أطول أو بدون انتهاء).');
    }
  }

  // 3) هل الأكاونت المكوَّن مرئي للتوكن؟
  const acct = await api(`/accounts/${ACCOUNT_ID}`);
  record('الأكاونت مطابق للتوكن', acct.network ? false : acct.status === 200,
    acct.network
      ? `فشل الشبكة: ${acct.network}`
      : acct.status === 200
        ? 'التوكن يرى هذا الأكاونت.'
        : `HTTP ${acct.status} — ${cfError(acct.body)}`,
    'الـaccount id غير تابع لهذا التوكن — تأكد أن التوكن من نفس الأكاونت الذي فيه ' +
    'القاعدة، أو صحّح CLOUDFLARE_ACCOUNT_ID في .env.local.');

  // 4) هل قاعدة D1 نفسها متاحة؟
  const dbRes = await api(`/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}`);
  record('قاعدة D1 موجودة', dbRes.network ? false : dbRes.status === 200,
    dbRes.network
      ? `فشل الشبكة: ${dbRes.network}`
      : dbRes.status === 200
        ? `name=${dbRes.body?.result?.name ?? '?'}`
        : `HTTP ${dbRes.status} — ${cfError(dbRes.body)}`,
    'إما أن database id خطأ، أو أن التوكن بلا صلاحية قراءة D1 على هذا الأكاونت.');

  // 5) استعلام حقيقي — الدليل النهائي (نفس المسار الذي يستخدمه next dev)
  const probe = await api(`/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`, {
    method: 'POST',
    body: JSON.stringify({ sql: 'SELECT 1 AS ok' }),
  });

  if (probe.network) {
    record('استعلام D1 حقيقي (SELECT 1)', false,
      `فشل الشبكة: ${probe.network}`,
      'تحقق من الاتصال بالإنترنت.');
  } else if (probe.status !== 200 || probe.body?.success !== true) {
    const code = probe.body?.errors?.[0]?.code;
    const authLike = probe.status === 401 || code === 10000 || code === 9109;
    record('استعلام D1 حقيقي (SELECT 1)', false,
      `HTTP ${probe.status} — ${cfError(probe.body)}`,
      authLike
        ? 'التوكن مرفوض على مسار D1: ملغى/منتهي، أو بلا صلاحية Account › D1 › Edit. ' +
          'أنشئ توكن جديداً بصلاحية D1 › Edit على نفس الأكاونت.'
        : 'راجع صلاحية D1 › Edit وdatabase id.');
  } else {
    record('استعلام D1 حقيقي (SELECT 1)', true,
      `النتيجة: ${JSON.stringify(probe.body?.result?.[0]?.results?.[0])}`);
  }

  finish();
}

main().catch((err) => {
  console.error(c.red(`\n❌ فشل غير متوقع في الفحص: ${err?.message || err}\n`));
  process.exit(1);
});
