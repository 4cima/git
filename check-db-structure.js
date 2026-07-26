const Database = require('better-sqlite3');

const db = new Database('./data/local.db', { readonly: true });

// Get all tables
console.log('=== TABLES IN DATABASE ===');
const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`).all();
tables.forEach(t => console.log(`  - ${t.name}`));

// Check genres table
console.log('\n=== GENRES TABLE STRUCTURE ===');
const genresColumns = db.prepare(`PRAGMA table_info(genres)`).all();
genresColumns.forEach(c => console.log(`  ${c.name}: ${c.type}`));

// Check movies table
console.log('\n=== MOVIES TABLE STRUCTURE (first 10 columns) ===');
const moviesColumns = db.prepare(`PRAGMA table_info(movies)`).all();
moviesColumns.slice(0, 10).forEach(c => console.log(`  ${c.name}: ${c.type}`));
console.log(`  ... total ${moviesColumns.length} columns`);

// Check if content_genres exists
console.log('\n=== CHECKING content_genres ===');
const contentGenres = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='content_genres'`).all();
if (contentGenres.length > 0) {
  console.log('  ✅ content_genres table EXISTS');
  const cgColumns = db.prepare(`PRAGMA table_info(content_genres)`).all();
  cgColumns.forEach(c => console.log(`    ${c.name}: ${c.type}`));
} else {
  console.log('  ❌ content_genres table DOES NOT EXIST');
}

// Sample genres
console.log('\n=== SAMPLE GENRES ===');
const sampleGenres = db.prepare(`SELECT * FROM genres LIMIT 5`).all();
sampleGenres.forEach(g => console.log(`  ${g.id}: ${g.name_ar} (${g.slug})`));

db.close();
console.log('\n✅ Done!');
