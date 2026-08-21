#!/usr/bin/env node
/**
 * dump-schema.js — Export full DDL schema from Cloudflare D1
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
  const rows = await query(
    "SELECT name, sql FROM sqlite_master WHERE type IN ('table','index','trigger') AND name NOT LIKE 'sqlite_%' ORDER BY type, name"
  );
  console.log('=== Cloudflare D1 Schema ===\n');
  for (const { name, sql } of rows) {
    console.log(`--- ${name} ---`);
    console.log(sql + ';');
    console.log('');
  }
})().catch(e => { console.error(e.message); process.exit(1); });
