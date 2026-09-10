#!/usr/bin/env node
/**
 * scripts/backup-d1-to-r2.js
 *
 * رفع آخر نسخة احتياطية D1 (من data/backups/d1/YYYY-MM-DD/) إلى Cloudflare R2.
 *
 * المتطلبات:
 *   - متغير R2_BUCKET = اسم الـ bucket (إن لم يوجد → تخطٍ آمن بدون فشل).
 *   - توكن بصلاحية R2:Edit: CLOUDFLARE_D1_TOKEN أو CLOUDFLARE_API_TOKEN.
 *   - wrangler متاح (node_modules).
 *
 * ملاحظة: إن لم يكن لديك bucket، يمكن الاعتماد على خطوة artifact في
 * .github/workflows/backup-d1.yml (احتفاظ 30 يومًا) كبديل خارجي.
 *
 * الاستخدام:
 *   R2_BUCKET=4cima-backups node scripts/backup-d1-to-r2.js
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const fs   = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const R2_BUCKET = process.env.R2_BUCKET;

if (!R2_BUCKET) {
  console.log('⏭  R2_BUCKET غير مضبوط — تخطي الرفع إلى R2 (النسخة المحلية + artifact تبقى متاحة).');
  process.exit(0);
}

const BACKUP_ROOT = path.join(__dirname, '..', 'data', 'backups', 'd1');

// ── اختيار أحدث مجلد نسخ (YYYY-MM-DD) ────────────────────────────────────────

if (!fs.existsSync(BACKUP_ROOT)) {
  console.error('❌  لا يوجد مجلد نسخ احتياطية: ' + BACKUP_ROOT);
  process.exit(1);
}
const dirs = fs.readdirSync(BACKUP_ROOT).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().reverse();
if (dirs.length === 0) {
  console.error('❌  لا توجد نسخ احتياطية داخل ' + BACKUP_ROOT);
  process.exit(1);
}
const latest = dirs[0];
const latestDir = path.join(BACKUP_ROOT, latest);

const files = fs.readdirSync(latestDir).filter(f => f.endsWith('.json') || f.endsWith('.json.gz'));
if (files.length === 0) {
  console.error(`❌  مجلد النسخة ${latest} فارغ`);
  process.exit(1);
}

console.log(`☁️  رفع النسخة ${latest} (${files.length} ملف) إلى R2 bucket: ${R2_BUCKET}`);

const wranglerBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
let uploaded = 0;
let failed = 0;

for (const f of files) {
  const localPath = path.join(latestDir, f);
  const key = `d1-backups/${latest}/${f}`;
  try {
    execFileSync(wranglerBin, ['wrangler', 'r2', 'object', 'put', `${R2_BUCKET}/${key}`, '--file', localPath, '--remote'], {
      stdio: 'pipe',
      env: process.env,
    });
    const mb = (fs.statSync(localPath).size / 1024 / 1024).toFixed(2);
    console.log(`   ✅ ${key} (${mb} MB)`);
    uploaded++;
  } catch (err) {
    const msg = (err.stderr && err.stderr.toString()) || err.message;
    console.error(`   ❌ ${key}: ${msg.slice(0, 200)}`);
    failed++;
  }
}

console.log('═══════════════════════════════════════════');
if (failed > 0) {
  console.error(`⚠  اكتمل الرفع مع أخطاء: نجح ${uploaded} | فشل ${failed}`);
  process.exit(1);
}
console.log(`✅ اكتمل الرفع إلى R2: ${uploaded} ملف → ${R2_BUCKET}/d1-backups/${latest}/`);
