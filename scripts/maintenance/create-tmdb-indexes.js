#!/usr/bin/env node

/**
 * Create tmdb_id indexes on movies and tv_series tables via D1 HTTP API
 * Retry logic for 429/7429/timeout: 6 attempts with backoff 5/10/20/30/45s
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '../../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
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
      timeout: 60000
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
        reject(e);
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
  console.log('🔨 Creating tmdb_id indexes on movies and tv_series...\n');

  // Index 1: movies(tmdb_id)
  try {
    console.log('📊 Creating index: idx_movies_tmdb_id...');
    await executeD1('CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id)');
    console.log('✅ idx_movies_tmdb_id created successfully\n');
  } catch (err) {
    console.error(`❌ Failed to create idx_movies_tmdb_id: ${err.message}`);
    console.log('INDEX_TMDB=FAIL\n');
    process.exit(1);
  }

  // Wait 5s
  console.log('⏳ Waiting 5 seconds...\n');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Index 2: tv_series(tmdb_id)
  try {
    console.log('📊 Creating index: idx_tv_tmdb_id...');
    await executeD1('CREATE INDEX IF NOT EXISTS idx_tv_tmdb_id ON tv_series(tmdb_id)');
    console.log('✅ idx_tv_tmdb_id created successfully\n');
  } catch (err) {
    console.error(`❌ Failed to create idx_tv_tmdb_id: ${err.message}`);
    console.log('INDEX_TMDB=FAIL\n');
    process.exit(1);
  }

  console.log('✅ All indexes created successfully');
  console.log('INDEX_TMDB=OK');
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  console.log('INDEX_TMDB=FAIL');
  process.exit(1);
});
