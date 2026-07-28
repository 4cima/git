const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', '4cima-local.db');
const db = new Database(dbPath, { readonly: true });

try {
  console.log('Checking database structure...\n');

  // Get all tables
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    ORDER BY name
  `).all();

  console.log('Available tables:');
  tables.forEach(table => {
    console.log(`- ${table.name}`);
    
    // Get column info for each table
    const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
    console.log('  Columns:');
    columns.forEach(col => {
      console.log(`    - ${col.name} (${col.type})`);
    });
    
    // Get row count
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
    console.log(`  Row count: ${count.count}\n`);
  });

} catch (error) {
  console.error('Error:', error.message);
} finally {
  db.close();
}
