#!/usr/bin/env node
/**
 * scripts/backup-d1.js
 *
 * نسخ احتياطي دوري لجداول Cloudflare D1 (قاعدة 4cima-db).
 *
 * الاتصال: نفس طريقة 3-sync-to-d1.js — HTTP API:
 *   POST /accounts/{ACCOUNT_ID}/d1/database/{DATABASE_ID}/query
 *   التوكن: CLOUDFLARE_D1_TOKEN من .env.local، أو CLOUDFLARE_API_TOKEN
 *           (مثل بيئة GitHub Actions حيث لا يوجد .env.local).
 *
 * الجداول المصدَّرة: movies, tv_series, list_movies_genre, list_series_genre
 *
 * المخرجات: data/backups/d1/YYYY-MM-DD/
 *   - <table>-YYYY-MM-DD.json.gz  (افتراضيًا مضغوط بـ gzip، أو .json مع --no-gzip)
 *   - manifest.json               (ملخص: عدد الصفوف والأحجام لكل جدول)
 *
 * الاحتفاظ: آخر 7 مجلدات نسخ فقط (يحذف الأقدم تلقائيًا) — قابل للتغيير بـ --keep=N
 *
 * الاستخدام:
 *   node scripts/backup-d1.js
 *   node scripts/backup-d1.js --keep=7 --no-gzip --tables=movies,tv_series
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

// ── Config ────────────────────────────────────────────────────────────────────

const ACCOUNT_ID  = process.env.CF_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || '834bca43d616c73db23cf95311cfe17e';
const DATABASE_ID = process.env.CF_DATABASE_ID || 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6';
const QUERY_URL   = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;

const CF_TOKEN = process.env.CLOUDFLARE_D1_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
if (!CF_TOKEN) {
  console.error('❌  لا يوجد توكن: اضبط CLOUDFLARE_D1_TOKEN في .env.local أو CLOUDFLARE_API_TOKEN في البيئة');
  process.exit(1);
}

// حجم الدفعة لكل جدول — episodes_json في tv_series كبير (متوسط 8.4KB، أقصى 97KB)
const DEFAULT_BATCH = 500;
const TABLE_BATCH   = { movies: 500, tv_series: 100, list_movies_genre: 5000, list_series_genre: 5000 };

// ── CLI args ──────────────────────────────────────────────────────────────────

const argVal = (prefix) => {
  const a = process.argv.find(s => s.startsWith(prefix));
  return a ? a.split('=')[1] : null;
};
const KEEP   = parseInt(argVal('--keep=') || '7', 10);
const USE_GZ = !process.argv.includes('--no-gzip');
const TABLES = (argVal('--tables=') || 'movies,tv_series,list_movies_genre,list_series_genre')
  .split(',').map(s => s.trim()).filter(Boolean);

const OUT_ROOT = path.join(__dirname, '..', 'data', 'backups', 'd1');
const DATE_STR = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
const OUT_DIR  = path.join(OUT_ROOT, DATE_STR);

// ── D1 query (with retry + اكتشاف تجاوز الحجم) ───────────────────────────────

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function d1Query(sql, params = [], { retries = 3 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(QUERY_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, params }),
      });
      const body = await res.json().catch(() => null);

      if (res.status === 413 || (body && body.errors && body.errors.some(e => /TOO_LARGE|too large/i.test(e.message || '')))) {
        const err = new Error('RESPONSE_TOO_LARGE');
        err.tooLarge = true;
        throw err;
      }
      if (!res.ok || !body || body.success === false) {
        const msg = body && body.errors ? JSON.stringify(body.errors) : `HTTP ${res.status}`;
        throw new Error(`D1 query failed: ${msg}`);
      }
      return body.result[0].results;
    } catch (err) {
      lastErr = err;
      if (err.tooLarge) throw err; // يُعالج بتقليص الدفعة في exportTable
      if (attempt < retries) await sleep(2000 * attempt);
    }
  }
  throw lastErr;
}

// ── Streaming writer (كتابة مستند JSON تدريجيًا) ─────────────────────────────

function openWriter(filePath, gzip) {
  const ws = fs.createWriteStream(filePath);
  const gz = gzip ? zlib.createGzip({ level: 6 }) : null;
  if (gz) gz.pipe(ws);
  const out = gz || ws;
  let streamErr = null;
  ws.on('error', e => { streamErr = e; });
  return {
    write(chunk) {
      if (streamErr) throw streamErr;
      return new Promise((resolve, reject) => {
        const ok = out.write(chunk);
        if (ok) resolve(); else out.once('drain', resolve);
        out.once('error', reject);
      });
    },
    finish() {
      return new Promise((resolve, reject) => {
        const endStream = () => (gz ? gz.end(() => resolve()) : ws.end(() => resolve()));
        if (streamErr) reject(streamErr); else endStream();
        ws.on('error', reject);
      });
    },
  };
}

// ── Table export ──────────────────────────────────────────────────────────────

async function exportTable(table) {
  const [{ c: total }] = await d1Query(`SELECT COUNT(*) AS c FROM ${table}`);
  if (total === 0) {
    console.log(`   ⚠  ${table}: فارغ — تخطي`);
    return { table, count: 0, file: null, bytes: 0 };
  }

  const fileName = `${table}-${DATE_STR}.json${USE_GZ ? '.gz' : ''}`;
  const filePath = path.join(OUT_DIR, fileName);
  const w = openWriter(filePath, USE_GZ);

  await w.write(`{"database_id":"${DATABASE_ID}","table":"${table}",` +
    `"exported_at_utc":"${new Date().toISOString()}","count":${total},"rows":[\n`);

  let batch  = TABLE_BATCH[table] || DEFAULT_BATCH;
  let offset = 0;
  let count  = 0;
  let first  = true;

  while (true) {
    let rows;
    try {
      rows = await d1Query(`SELECT * FROM ${table} ORDER BY rowid LIMIT ? OFFSET ?`, [batch, offset]);
    } catch (err) {
      if (err.tooLarge && batch > 50) {
        batch = Math.floor(batch / 2);
        console.log(`      ↩  تقليص دفعة ${table} إلى ${batch}`);
        continue; // نفس الـ offset
      }
      throw err;
    }
    if (rows.length === 0) break;

    const chunk = rows.map((r, i) => ((first && i === 0) ? '' : ',') + JSON.stringify(r)).join('');
    await w.write(chunk);
    first  = false;
    count  += rows.length;
    offset += rows.length;
    if (count % (batch * 5) === 0) process.stdout.write(`      ${table}: ${count}/${total}\r`);
    if (rows.length < batch) break;
  }
  process.stdout.write(' '.repeat(40) + '\r');

  await w.write(`], "completed_at_utc": "${new Date().toISOString()}"}\n`);
  await w.finish();

  const bytes = fs.statSync(filePath).size;
  console.log(`   ✅ ${table}: ${count.toLocaleString('en-US')} صف → ${fileName} (${(bytes / 1024 / 1024).toFixed(2)} MB)`);
  return { table, count, file: fileName, bytes };
}

// ── Retention: الاحتفاظ بآخر N مجلدات نسخ فقط ────────────────────────────────

function pruneOldBackups() {
  if (!fs.existsSync(OUT_ROOT)) return [];
  const dirs = fs.readdirSync(OUT_ROOT)
    .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()
    .reverse();
  const removed = [];
  for (const d of dirs.slice(KEEP)) {
    fs.rmSync(path.join(OUT_ROOT, d), { recursive: true, force: true });
    removed.push(d);
  }
  return removed;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log(`🗄  نسخ احتياطي D1 — ${DATE_STR}`);
  console.log(`   القاعدة: 4cima-db (${DATABASE_ID})`);
  console.log(`   الجداول: ${TABLES.join(', ')} | gzip: ${USE_GZ ? 'نعم' : 'لا'} | الاحتفاظ: ${KEEP}`);
  console.log('═══════════════════════════════════════════');

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const manifest = { date: DATE_STR, database_id: DATABASE_ID, started_at_utc: new Date().toISOString(), tables: [] };
  let failed = 0;

  for (const table of TABLES) {
    try {
      manifest.tables.push(await exportTable(table));
    } catch (err) {
      failed++;
      console.error(`   ❌ ${table}: ${err.message}`);
      manifest.tables.push({ table, error: err.message });
    }
  }

  manifest.completed_at_utc = new Date().toISOString();
  manifest.failed = failed;
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const removed = pruneOldBackups();
  if (removed.length > 0) console.log(`🧹  حُذفت ${removed.length} نسخة أقدم من آخر ${KEEP}: ${removed.join(', ')}`);

  const totalRows = manifest.tables.reduce((s, t) => s + (t.count || 0), 0);
  const totalMB   = manifest.tables.reduce((s, t) => s + (t.bytes || 0), 0) / 1024 / 1024;
  console.log('═══════════════════════════════════════════');
  console.log(`✅ اكتمل النسخ الاحتياطي: ${totalRows.toLocaleString('en-US')} صف | ${totalMB.toFixed(2)} MB | ${OUT_DIR}`);
  if (failed > 0) {
    console.error(`⚠  جداول فشلت: ${failed}`);
    process.exit(1);
  }
  console.log('═══════════════════════════════════════════');
}

main().catch(err => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
