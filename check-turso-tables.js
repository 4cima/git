require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

(async () => {
  const result = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log('=== الجداول الموجودة في Turso ===');
  result.rows.forEach(row => console.log('- ' + row.name));
  
  // Check tv_series structure
  const seriesInfo = await client.execute('PRAGMA table_info(tv_series)');
  console.log('\n=== أعمدة جدول tv_series ===');
  seriesInfo.rows.forEach(col => console.log('- ' + col.name + ' (' + col.type + ')'));
})();
