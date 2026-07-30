require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function check() {
  try {
    const result = await turso.execute('SELECT COUNT(*) as total FROM tv_series');
    console.log('Current TV Series count in Turso:', result.rows[0].total);
    turso.close();
  } catch (error) {
    console.error('Error:', error.message);
    turso.close();
  }
}

check();
