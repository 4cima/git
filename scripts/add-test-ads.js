#!/usr/bin/env node
/**
 * Add Test Ads to D1 Database
 * 
 * This script adds two test ads:
 * 1. Banner ad for home-after-hero
 * 2. Popunder ad for global
 */

require('dotenv').config({ path: '.env.local' });

const ACCOUNT_ID = '834bca43d616c73db23cf95311cfe17e';
const DATABASE_ID = 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6';
const D1_HTTP_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;

const TEST_ADS = [
  {
    title: 'إعلان تجريبي - بانر',
    type: 'banner',
    content: '<div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px;"><h3 style="margin: 0 0 10px 0;">إعلان تجريبي</h3><p style="margin: 0;">هذا إعلان تجريبي للاختبار</p></div>',
    position: 'home-after-hero',
    active: 1
  },
  {
    title: 'إعلان تجريبي - بوبندر',
    type: 'popunder',
    content: '<a href="https://example.com" target="_blank">اضغط هنا</a>',
    position: 'global',
    active: 1
  }
];

async function executeSQL(sql, params) {
  const token = process.env.CLOUDFLARE_D1_TOKEN;
  
  if (!token) {
    console.error('❌ CLOUDFLARE_D1_TOKEN not found in .env.local');
    process.exit(1);
  }

  const body = { sql, params: params || [] };
  
  try {
    const res = await fetch(D1_HTTP_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`❌ D1 HTTP ${res.status} ${res.statusText}: ${text}`);
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    
    if (!data.success) {
      const msg = (data.errors || []).map(e => `[${e.code}] ${e.message}`).join(', ');
      console.error(`❌ D1 query failed: ${msg || 'unknown error'}`);
      throw new Error(msg || 'Query failed');
    }

    return data.result?.[0]?.results || [];
  } catch (err) {
    console.error('❌ Error executing SQL:', err.message);
    throw err;
  }
}

async function main() {
  console.log('🚀 Adding test ads to D1...');
  console.log('');

  for (const ad of TEST_ADS) {
    try {
      console.log(`📝 Adding: ${ad.title}`);
      const sql = `
        INSERT INTO ads (title, type, content, position, active)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      await executeSQL(sql, [ad.title, ad.type, ad.content, ad.position, ad.active]);
      console.log(`✅ Added: ${ad.title}`);
    } catch (err) {
      console.error(`❌ Failed to add: ${ad.title}`);
    }
  }

  console.log('');
  console.log('✅ Test ads added successfully!');
  console.log('');
  console.log('📋 Added ads:');
  console.log('   1. Banner - home-after-hero');
  console.log('   2. Popunder - global');
  console.log('');
  console.log('✅ Ready to test ads on the website!');
}

main();
