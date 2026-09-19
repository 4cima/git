#!/usr/bin/env node

/**
 * Create composite language+popularity partial indexes for language listing pages
 * (/movies/lang/[code], /series/lang/[code] + /api/movies?language=… + /api/series?language=…)
 * via the D1 HTTP API. Same pattern as create-tmdb-indexes.js (retry on 429/7429/timeout).
 *
 * لماذا: صفحات اللغة كانت تُخطَّط كـ SEARCH idx_*_original_lang → مسح كل صفوف اللغة
 * (69,090 صفًا للإنجليزية × json_each ≈ 217 ألف صف مقروء/نداء) → USE TEMP B-TREE
 * للفرز ثم LIMIT 25. الفهرس المركّب الجزئي بنفس بوابات idx_*_listing يسمح بالبحث
 * النطاقي (لغة → شعبية تنازليًا) والتوقف المبكر عند LIMIT: ~30-60 صفًا/نداء.
 *
 * البوابات (مطابقة حرفيًا لاستعلامات الصفحات ولـidx_*_listing القائم):
 *   IFNULL(filter_status,'clean') IN ('clean','reviewed_approved') AND سنة >= 2000
 * ⚠️ أي تغيير مستقبلي على هذه البوابات في الاستعلامات يستلزم فهرسًا جديدًا مطابقًا.
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

const INDEXES = [
  {
    name: 'idx_movies_lang_listing',
    ddl: `CREATE INDEX IF NOT EXISTS idx_movies_lang_listing
  ON movies(original_language, popularity DESC, id DESC)
  WHERE release_year >= 2000
    AND IFNULL(filter_status, 'clean') IN ('clean', 'reviewed_approved')`,
  },
  {
    name: 'idx_tv_lang_listing',
    ddl: `CREATE INDEX IF NOT EXISTS idx_tv_lang_listing
  ON tv_series(original_language, popularity DESC, id DESC)
  WHERE first_air_year >= 2000
    AND IFNULL(filter_status, 'clean') IN ('clean', 'reviewed_approved')`,
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
  console.log('🔨 Creating language-listing composite partial indexes...\n');

  for (const { name, ddl } of INDEXES) {
    try {
      console.log(`📊 Creating index: ${name}...`);
      const r = await executeD1(ddl);
      console.log(`✅ ${name} created (meta: ${JSON.stringify(r.meta || {})})\n`);
    } catch (err) {
      console.error(`❌ Failed to create ${name}: ${err.message}`);
      console.log('INDEX_LANG_LISTING=FAIL\n');
      process.exit(1);
    }
    console.log('⏳ Waiting 5 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  console.log('✅ All language-listing indexes created successfully');
  console.log('INDEX_LANG_LISTING=OK');
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  console.log('INDEX_LANG_LISTING=FAIL');
  process.exit(1);
});
