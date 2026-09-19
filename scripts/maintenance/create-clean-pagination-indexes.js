#!/usr/bin/env node

/**
 * Create partial composite indexes for keyset pagination in precompute scripts
 * (6-precompute-genre-lists.js — خطوة يومية في سلسلة المزامنة عبر 3-sync-to-d1.js)
 * via the D1 HTTP API. Same pattern as create-lang-listing-indexes.js (retry on 429/7429/timeout).
 *
 * لماذا: `WHERE filter_status='clean' AND slug IS NOT NULL AND tmdb_id IS NOT NULL
 * AND id > ? ORDER BY id ASC LIMIT 200` كان المخطط يختار idx_movies_filter
 * (filter_status=?) ثم يفرز بـTEMP B-TREE ⇒ ~250-290 ألف صف مقروء/نداء ليرجّع 200
 * (~730 نداء يوميًا = 149M صف/يوم — أعلى استعلام في D1 Metrics).
 * الفهرس الجزئي يجعل البحث نطاقيًا على id مع ترتيب مطابق ⇒ ~200-250 صفًا/نداء.
 *
 * شروط الفهرس الجزئي: filter_status = 'clean' فقط.
 * ⚠️ درس مقاس: لا تضع (slug IS NOT NULL / tmdb_id IS NOT NULL) في شرط الفهرس الجزئي —
 * العمودان معلنان NOT NULL في الجدول فيبسّطهما المخطط من الاستعلام كتعابير ثابتة الصدق،
 * ثم يفشل مدقق الـimplication في إثباتهما مقابل شرط الفهرس («no query solution»
 * مع INDEXED BY) فلا يُستخدم الفهرس إطلاقًا. شروط الفهرس الجزئي يجب أن تكون
 * توتولوجيات لا صفرية (أعمدة قابلة للـNULL فقط) — مثل فهارس idx_*_lang_listing.
 *
 * Idempotent: CREATE INDEX IF NOT EXISTS — آمن لإعادة التشغيل.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '../../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '834bca43d616c73db23cf95311cfe17e';
const DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID || 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6';
const TOKEN = process.env.CLOUDFLARE_D1_TOKEN;

if (!TOKEN) {
  console.error('❌ CLOUDFLARE_D1_TOKEN not found in .env.local');
  process.exit(1);
}

const DELAYS = [5000, 10000, 20000, 30000, 45000]; // ms

const CLEAN_GATE = `filter_status = 'clean'`;
const INDEXES = [
  {
    name: 'idx_movies_clean_pagination',
    ddl: `DROP INDEX IF EXISTS idx_movies_clean_pagination`,
    fixup: `CREATE INDEX idx_movies_clean_pagination
  ON movies(filter_status, id)
  WHERE ${CLEAN_GATE}`,
  },
  {
    name: 'idx_tv_clean_pagination',
    ddl: `DROP INDEX IF EXISTS idx_tv_clean_pagination`,
    fixup: `CREATE INDEX idx_tv_clean_pagination
  ON tv_series(filter_status, id)
  WHERE ${CLEAN_GATE}`,
  },
];

async function executeD1(sql, attempt = 1) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ sql });
    const options = {
      hostname: 'api.cloudflare.com',
      path: `/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 120000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.success) {
            resolve(json.result[0]);
          } else {
            const errCode = json.errors?.[0]?.code;
            if ((errCode === 429 || errCode === 7429) && attempt <= 6) {
              const delay = DELAYS[attempt - 1] || 45000;
              console.log(`⚠️  Rate limit (attempt ${attempt}/6), retrying in ${delay/1000}s...`);
              setTimeout(() => {
                executeD1(sql, attempt + 1).then(resolve).catch(reject);
              }, delay);
            } else {
              reject(new Error(json.errors?.[0]?.message || 'D1 query failed'));
            }
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      if (attempt <= 6) {
        const delay = DELAYS[attempt - 1] || 45000;
        console.log(`⚠️  Network error (attempt ${attempt}/6), retrying in ${delay/1000}s...`);
        setTimeout(() => {
          executeD1(sql, attempt + 1).then(resolve).catch(reject);
        }, delay);
      } else {
        reject(new Error('Network error after 6 attempts: ' + e.message));
      }
    });

    req.on('timeout', () => {
      req.destroy();
      if (attempt <= 6) {
        const delay = DELAYS[attempt - 1] || 45000;
        console.log(`⚠️  Timeout (attempt ${attempt}/6), retrying in ${delay/1000}s...`);
        setTimeout(() => {
          executeD1(sql, attempt + 1).then(resolve).catch(reject);
        }, delay);
      } else {
        reject(new Error('Request timeout after 6 attempts'));
      }
    });

    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('🔨 Creating clean-pagination partial indexes (precompute keyset)...\n');

  for (const { name, ddl, fixup } of INDEXES) {
    try {
      console.log(`📊 Recreating index: ${name}...`);
      await executeD1(ddl); // DROP IF EXISTS — النسخة الأولى بشرط توتولوجي لم يستخدمها المخطط
      const r = await executeD1(fixup);
      console.log(`✅ ${name} recreated (rows_written: ${(r.meta || {}).rows_written})\n`);
    } catch (err) {
      console.error(`❌ Failed to create ${name}: ${err.message}`);
      console.log('INDEX_CLEAN_PAGINATION=FAIL\n');
      process.exit(1);
    }
    console.log('⏳ Waiting 5 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  console.log('✅ All clean-pagination indexes created successfully');
  console.log('INDEX_CLEAN_PAGINATION=OK');
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  console.log('INDEX_CLEAN_PAGINATION=FAIL');
  process.exit(1);
});
