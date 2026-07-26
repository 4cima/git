const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

async function checkTables() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });

  try {
    const res = await db.execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log(res.rows.map(r => r.name));
  } catch (err) {
    console.error(err);
  }
}
checkTables();