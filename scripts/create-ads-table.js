#!/usr/bin/env node
/**
 * Create Ads Table in D1 Database
 * 
 * This script creates the ads table in Cloudflare D1 using HTTP API
 * Required: CLOUDFLARE_D1_TOKEN in .env.local
 */

require('dotenv').config({ path: '.env.local' });

const ACCOUNT_ID = '834bca43d616c73db23cf95311cfe17e';
const DATABASE_ID = 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6';
const D1_HTTP_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;

const SQL = `
CREATE TABLE IF NOT EXISTS ads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('popunder', 'banner', 'preroll', 'midroll')),
  content TEXT NOT NULL,
  position TEXT,
  active INTEGER DEFAULT 1,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ads_active ON ads(active);
CREATE INDEX IF NOT EXISTS idx_ads_type ON ads(type);
CREATE INDEX IF NOT EXISTS idx_ads_position ON ads(position);
`;

async function executeSQL(sql) {
  const token = process.env.CLOUDFLARE_D1_TOKEN;
  
  if (!token) {
    console.error('❌ CLOUDFLARE_D1_TOKEN not found in .env.local');
    console.error('Please add: CLOUDFLARE_D1_TOKEN=your_token to .env.local');
    process.exit(1);
  }

  const body = { sql };
  
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
      process.exit(1);
    }

    const data = await res.json();
    
    if (!data.success) {
      const msg = (data.errors || []).map(e => `[${e.code}] ${e.message}`).join(', ');
      console.error(`❌ D1 query failed: ${msg || 'unknown error'}`);
      process.exit(1);
    }

    return data.result?.[0]?.results || [];
  } catch (err) {
    console.error('❌ Error executing SQL:', err.message);
    process.exit(1);
  }
}

async function main() {
  console.log('🚀 Creating ads table in D1...');
  console.log('📊 Account ID:', ACCOUNT_ID);
  console.log('🗄️  Database ID:', DATABASE_ID);
  console.log('');
  
  try {
    const results = await executeSQL(SQL);
    console.log('✅ Ads table created successfully!');
    console.log('📋 Table structure:');
    console.log('   - id (INTEGER PRIMARY KEY AUTOINCREMENT)');
    console.log('   - title (TEXT NOT NULL)');
    console.log('   - type (TEXT NOT NULL) - popunder, banner, preroll, midroll');
    console.log('   - content (TEXT NOT NULL)');
    console.log('   - position (TEXT)');
    console.log('   - active (INTEGER DEFAULT 1)');
    console.log('   - impressions (INTEGER DEFAULT 0)');
    console.log('   - clicks (INTEGER DEFAULT 0)');
    console.log('   - created_at (TEXT DEFAULT CURRENT_TIMESTAMP)');
    console.log('');
    console.log('📚 Indexes created:');
    console.log('   - idx_ads_active (on active)');
    console.log('   - idx_ads_type (on type)');
    console.log('   - idx_ads_position (on position)');
    console.log('');
    console.log('✅ Ready to use ads!');
  } catch (err) {
    console.error('❌ Failed to create ads table:', err.message);
    process.exit(1);
  }
}

main();
