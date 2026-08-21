#!/usr/bin/env node
/**
 * check-schema.js — Show column info for key tables in Cloudflare D1
 */
'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const ACCOUNT_ID  = '834bca43d616c73db23cf95311cfe17e';
const DATABASE_ID = 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6';
const URL         = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;
const TOKEN       = process.env.CLOUDFLARE_D1_TOKEN;

if (!TOKEN) { console.error('CLOUDFLARE_D1_TOKEN not set'); process.exit(1); }

async function query(sql) {
  const r = await fetch(URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql }),
  });
  const d = await r.json();
  if (!d.success) throw new Error(JSON.stringify(d.errors));
  return d.result[0].results;
}

(async () => {
  for (const table of ['movies', 'tv_series', 'genres', 'movies_fts', 'series_fts']) {
    try {
      const cols = await query(`PRAGMA table_info(${table})`);
      console.log(`\n${table} (${cols.length} cols): ${cols.map(c => c.name).join(', ')}`);
    } catch (e) {
      console.log(`\n${table}: ERROR - ${e.message}`);
    }
  }
  console.log('');
})().catch(e => { console.error(e.message); process.exit(1); });
