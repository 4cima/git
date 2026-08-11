import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

function sanitizeSearchInput(input) {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (trimmed.length === 0) return '';
  const escaped = trimmed.replace(/"/g, '""');
  return `"${escaped}"`;
}

console.log('🔍 Testing "9-1-1" Series Search');
console.log('='.repeat(70));

// First, verify the series exist
console.log('\n1️⃣ Verifying 9-1-1 series exist in database (using LIKE):');
const seriesCheck = await turso.execute({
  sql: `SELECT id, name_en FROM tv_series WHERE name_en LIKE '%9-1-1%' ORDER BY name_en`
});
console.log(`Found ${seriesCheck.rows.length} series:`);
seriesCheck.rows.forEach(r => console.log(`   ${r.id}: ${r.name_en}`));

// Check if they're indexed in series_fts
console.log('\n2️⃣ Checking if they exist in series_fts:');
for (const series of seriesCheck.rows) {
  const ftsCheck = await turso.execute({
    sql: `SELECT rowid, name_en FROM series_fts WHERE rowid = ?`,
    args: [series.id]
  });
  console.log(`   ${series.name_en}: ${ftsCheck.rows.length > 0 ? '✅ Indexed' : '❌ NOT INDEXED'}`);
}

// Now test FTS5 search with sanitization
console.log('\n3️⃣ Testing FTS5 search with sanitized "9-1-1":');
const searchTerm = '9-1-1';
const sanitized = sanitizeSearchInput(searchTerm);
console.log(`Raw search: "${searchTerm}"`);
console.log(`Sanitized: ${sanitized}`);

try {
  const ftsResult = await turso.execute({
    sql: `
      SELECT tv_series.id, tv_series.name_en, tv_series.vote_average
      FROM tv_series
      JOIN series_fts ON tv_series.id = series_fts.rowid
      WHERE series_fts MATCH ?
      ORDER BY rank
      LIMIT 10
    `,
    args: [sanitized]
  });
  
  console.log(`\nResults: ${ftsResult.rows.length}`);
  if (ftsResult.rows.length > 0) {
    ftsResult.rows.forEach((r, i) => {
      console.log(`   ${i+1}. ${r.name_en} (${r.vote_average}/10)`);
    });
  } else {
    console.log('   ❌ NO RESULTS - This is a problem!');
  }
  
  // Check query plan
  const plan = await turso.execute({
    sql: `
      EXPLAIN QUERY PLAN
      SELECT tv_series.id
      FROM tv_series
      JOIN series_fts ON tv_series.id = series_fts.rowid
      WHERE series_fts MATCH ?
    `,
    args: [sanitized]
  });
  
  console.log('\nQuery Plan:');
  plan.rows.forEach(r => console.log(`   ${r.detail}`));
  
  const usesFTS = JSON.stringify(plan.rows).includes('VIRTUAL TABLE INDEX');
  console.log(`\nIndex Usage: ${usesFTS ? '✅ FTS5' : '❌ FULL SCAN'}`);
  
} catch (error) {
  console.log(`\n❌ ERROR: ${error.message}`);
}

// Try alternative searches
console.log('\n' + '='.repeat(70));
console.log('4️⃣ Testing alternative search patterns:');

const alternatives = [
  '9 1 1',           // Spaces instead of hyphens
  '"9-1-1"',         // Already quoted (double-wrapped)
  '911',             // No hyphens
  'lone star',       // Just the subtitle
  '9-1-1 lone',      // Partial match
];

for (const term of alternatives) {
  const alt = sanitizeSearchInput(term);
  try {
    const result = await turso.execute({
      sql: `
        SELECT tv_series.name_en
        FROM tv_series
        JOIN series_fts ON tv_series.id = series_fts.rowid
        WHERE series_fts MATCH ?
        LIMIT 3
      `,
      args: [alt]
    });
    console.log(`\n"${term}" → ${result.rows.length} results`);
    if (result.rows.length > 0) {
      result.rows.forEach(r => console.log(`   - ${r.name_en}`));
    }
  } catch (e) {
    console.log(`\n"${term}" → ERROR: ${e.message}`);
  }
}

// Check what's actually in series_fts for these IDs
console.log('\n' + '='.repeat(70));
console.log('5️⃣ Checking series_fts content for 9-1-1 series:');
for (const series of seriesCheck.rows) {
  const ftsContent = await turso.execute({
    sql: `SELECT rowid, name_en, name_ar FROM series_fts WHERE rowid = ?`,
    args: [series.id]
  });
  if (ftsContent.rows.length > 0) {
    console.log(`\nID ${series.id}:`);
    console.log(`   name_en: "${ftsContent.rows[0].name_en}"`);
    console.log(`   name_ar: "${ftsContent.rows[0].name_ar}"`);
  }
}

console.log('\n' + '='.repeat(70));
console.log('📊 SUMMARY');
console.log('='.repeat(70));
console.log('\nIf "9-1-1" returns 0 results but the series exist and are indexed,');
console.log('the issue is likely that FTS5 with trigram tokenizer cannot match');
console.log('the exact pattern "9-1-1" because:');
console.log('  - Trigrams of "9-1-1" would be: "9-1", "-1-", "1-1"');
console.log('  - These may not match how the text is tokenized in the index');
console.log('\nPossible solutions:');
console.log('  1. Add a fallback LIKE search for very short/numeric queries');
console.log('  2. Store alternate searchable format (e.g., "911" alongside "9-1-1")');
console.log('  3. Use unicode61 tokenizer instead of trigram for better punctuation handling');

process.exit(0);
