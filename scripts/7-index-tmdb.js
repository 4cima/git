const ACCOUNT_ID = '834bca43d616c73db23cf95311cfe17e';
const DATABASE_ID = 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6';
const D1_QUERY_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;

// Read token from .env.local (copied from scripts/5-precompute-lists.js)
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '.env.local');
let token = process.env.CLOUDFLARE_D1_TOKEN;

if (!token && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/CLOUDFLARE_D1_TOKEN=(.+)/);
  if (match) {
    token = match[1].trim();
  }
}

if (!token) {
  console.error('ERROR: CLOUDFLARE_D1_TOKEN not found');
  process.exit(1);
}

const TOKEN_LOADED = !!token;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function d1Query(sql, retries = 6) {
  const delays = [5000, 10000, 20000, 30000, 45000];
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(D1_QUERY_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '(unreadable)');
        if ((res.status === 429 || text.includes('7429') || text.includes('timeout')) && attempt < retries - 1) {
          const delay = delays[attempt] || delays[delays.length - 1];
          console.log(`Retry ${attempt + 1}/${retries} after ${delay}ms...`);
          await sleep(delay);
          continue;
        }
        throw new Error(`D1 HTTP ${res.status}: ${text}`);
      }

      const data = await res.json();
      if (!data.success) {
        const msg = (data.errors ?? []).map(e => `[${e.code}] ${e.message}`).join(', ');
        if ((msg.includes('7429') || msg.includes('timeout')) && attempt < retries - 1) {
          const delay = delays[attempt] || delays[delays.length - 1];
          console.log(`Retry ${attempt + 1}/${retries} after ${delay}ms...`);
          await sleep(delay);
          continue;
        }
        throw new Error(`D1 query failed: ${msg}`);
      }

      return data.result;
    } catch (err) {
      if (attempt === retries - 1) throw err;
      if (err.message.includes('timeout') || err.message.includes('429') || err.message.includes('7429')) {
        const delay = delays[attempt] || delays[delays.length - 1];
        console.log(`Retry ${attempt + 1}/${retries} after ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
}

async function run() {
  // Create index on movies.tmdb_id
  console.log('→ CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id);');
  try {
    await d1Query('CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id);');
    console.log('  OK');
    console.log('INDEX_MOVIES: OK');
  } catch (err) {
    console.error('  FAIL:', err.message);
    console.log('INDEX_MOVIES: FAIL');
    throw err;
  }

  // Sleep 5 seconds between indexes
  await sleep(5000);

  // Create index on tv_series.tmdb_id
  console.log('→ CREATE INDEX IF NOT EXISTS idx_tv_tmdb_id ON tv_series(tmdb_id);');
  try {
    await d1Query('CREATE INDEX IF NOT EXISTS idx_tv_tmdb_id ON tv_series(tmdb_id);');
    console.log('  OK');
    console.log('INDEX_TV: OK');
  } catch (err) {
    console.error('  FAIL:', err.message);
    console.log('INDEX_TV: FAIL');
    throw err;
  }
}

run().then(() => {
  console.log('DONE');
  process.exit(0);
}).catch(e => {
  process.exit(1);
});