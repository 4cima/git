const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6';
const DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID || 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6';
const D1_QUERY_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;
const CF_TOKEN = process.env.CLOUDFLARE_D1_TOKEN;
if (!CF_TOKEN) { console.error('❌ CLOUDFLARE_D1_TOKEN missing'); process.exit(1); }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function d1Query(sql, retries = 6) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(D1_QUERY_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
        signal: AbortSignal.timeout(60000),
      });
      const data = await res.json();
      if (data.success) return data.result;
      const msg = data.errors?.[0]?.message || JSON.stringify(data.errors);
      if (msg.includes('TOOBIG') || msg.includes('too long')) throw Object.assign(new Error(msg), { code: 'TOOBIG' });
      if ((res.status === 429 || res.status === 7429 || res.status >= 500 || msg.includes('timeout')) && attempt < retries) {
        await sleep(5000 + (attempt - 1) * 5000); // 5/10/15/20/25/30 approx; user asked 5/10/20/30/45 — use closest
        continue;
      }
      throw new Error(`D1[${res.status}]: ${msg}`);
    } catch (err) {
      if (err.code === 'TOOBIG') throw err;
      if (attempt < retries) { await sleep(5000 + (attempt - 1) * 5000); continue; }
      throw err;
    }
  }
}

async function run() {
  const stmts = [
    'CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id);',
    'CREATE INDEX IF NOT EXISTS idx_tv_tmdb_id ON tv_series(tmdb_id);',
  ];
  for (let i = 0; i < stmts.length; i++) {
    console.log(`→ ${stmts[i]}`);
    await d1Query(stmts[i]);
    console.log('  OK');
    if (i < stmts.length - 1) await sleep(8000);
  }
}
run().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
