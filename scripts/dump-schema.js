const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

async function dumpSchema() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });

  try {
    const res = await db.execute("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    console.log("=== DATABASE SCHEMA ===");
    res.rows.forEach(row => {
      console.log(`\n--- Table: ${row.name} ---`);
      console.log(row.sql);
    });
  } catch (err) {
    console.error(err);
  }
}
dumpSchema();