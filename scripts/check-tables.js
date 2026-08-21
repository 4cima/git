#!/usr/bin/env node
/**
 * check-tables.js — List all tables and row counts in Cloudflare D1
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
  const tables = await query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  console.log(`\n=== D1 Tables (${tables.length}) ===\n`);
  for (const { name } of tables) {
    try {
      const cnt = await query(`SELECT COUNT(*) as c FROM ${name}`);
      console.log(`  ${name.padEnd(40)} ${String(cnt[0].c).padStart(10)} rows`);
    } catch { console.log(`  ${name.padEnd(40)} (error)`); }
  }
  console.log('');
})().catch(e => { console.error(e.message); process.exit(1); });
