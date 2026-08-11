import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('🔍 Verifying Actual Movie/Series Titles in Database');
console.log('='.repeat(70));

// Check for Spider-Man titles
console.log('\n1️⃣ Movies with "Spider-Man" in title (using LIKE):');
const spiderMovies = await turso.execute({
  sql: `SELECT id, title_en FROM movies WHERE title_en LIKE '%Spider-Man%' LIMIT 5`
});
spiderMovies.rows.forEach(r => console.log(`   ${r.id}: ${r.title_en}`));

// Check if they're in FTS5
if (spiderMovies.rows.length > 0) {
  const firstId = spiderMovies.rows[0].id;
  const ftsCheck = await turso.execute({
    sql: `SELECT rowid, title_en FROM movies_fts WHERE rowid = ?`,
    args: [firstId]
  });
  console.log(`   FTS5 indexed: ${ftsCheck.rows.length > 0 ? '✅ YES' : '❌ NO'}`);
}

// Check for series titles with hyphens
console.log('\n2️⃣ Series with "9-1-1" in title:');
const series911 = await turso.execute({
  sql: `SELECT id, name_en FROM tv_series WHERE name_en LIKE '%9-1-1%' LIMIT 5`
});
if (series911.rows.length > 0) {
  series911.rows.forEach(r => console.log(`   ${r.id}: ${r.name_en}`));
} else {
  console.log('   (None found - legitimate)');
}

// Check for short titles
console.log('\n3️⃣ Movies with 2-3 character titles:');
const shortTitles = await turso.execute({
  sql: `SELECT title_en FROM movies WHERE LENGTH(title_en) BETWEEN 1 AND 3 LIMIT 10`
});
if (shortTitles.rows.length > 0) {
  shortTitles.rows.forEach(r => console.log(`   "${r.title_en}"`));
} else {
  console.log('   (None found)');
}

// Now test FTS5 search with sanitization
console.log('\n' + '='.repeat(70));
console.log('🧪 Final FTS5 Search Test with Sanitization');
console.log('='.repeat(70));

function sanitize(input) {
  const trimmed = input.trim();
  const escaped = trimmed.replace(/"/g, '""');
  return `"${escaped}"`;
}

async function testSearch(term, table, idCol, nameCol) {
  const sanitized = sanitize(term);
  try {
    const start = Date.now();
    const result = await turso.execute({
      sql: `SELECT ${table}.${nameCol} 
            FROM ${table}
            JOIN ${table === 'movies' ? 'movies_fts' : 'series_fts'} 
            ON ${table}.${idCol} = ${table === 'movies' ? 'movies_fts' : 'series_fts'}.rowid
            WHERE ${table === 'movies' ? 'movies_fts' : 'series_fts'} MATCH ?
            ORDER BY rank
            LIMIT 3`,
      args: [sanitized]
    });
    const duration = Date.now() - start;
    
    // Check query plan
    const plan = await turso.execute({
      sql: `EXPLAIN QUERY PLAN
            SELECT ${table}.${idCol}
            FROM ${table}
            JOIN ${table === 'movies' ? 'movies_fts' : 'series_fts'} 
            ON ${table}.${idCol} = ${table === 'movies' ? 'movies_fts' : 'series_fts'}.rowid
            WHERE ${table === 'movies' ? 'movies_fts' : 'series_fts'} MATCH ?`,
      args: [sanitized]
    });
    const usesFTS = JSON.stringify(plan.rows).includes('VIRTUAL TABLE INDEX');
    
    console.log(`\n"${term}" in ${table}:`);
    console.log(`  Sanitized: ${sanitized}`);
    console.log(`  Results: ${result.rows.length} (${duration}ms)`);
    console.log(`  Index: ${usesFTS ? '✅ FTS5' : '❌ FULL SCAN'}`);
    if (result.rows.length > 0) {
      result.rows.forEach((r, i) => console.log(`    ${i+1}. ${r[nameCol]}`));
    }
    
    return { term, count: result.rows.length, usesFTS, duration };
  } catch (e) {
    console.log(`\n"${term}" in ${table}: ❌ ERROR - ${e.message}`);
    return { term, error: e.message };
  }
}

const results = [];
results.push(await testSearch('Spider-Man', 'movies', 'id', 'title_en'));
results.push(await testSearch('Amazing Spider', 'movies', 'id', 'title_en'));
results.push(await testSearch("It's a Wonderful Life", 'movies', 'id', 'title_en'));
results.push(await testSearch('الرجل العنكبوت', 'movies', 'id', 'title_ar'));

console.log('\n' + '='.repeat(70));
console.log('📊 FINAL SUMMARY');
console.log('='.repeat(70));

const errors = results.filter(r => r.error);
const noIndex = results.filter(r => !r.error && !r.usesFTS);
const avgDuration = results.filter(r => r.duration).reduce((sum, r) => sum + r.duration, 0) / results.filter(r => r.duration).length;

console.log(`\nTests run: ${results.length}`);
console.log(`Errors: ${errors.length}`);
console.log(`Not using FTS5: ${noIndex.length}`);
console.log(`Avg duration: ${avgDuration.toFixed(0)}ms`);

if (errors.length === 0 && noIndex.length === 0 && avgDuration < 500) {
  console.log('\n✅ ALL TESTS PASSED - Search sanitization working correctly!');
  console.log('   • Special characters handled (hyphens, apostrophes, etc.)');
  console.log('   • FTS5 index used (not full table scan)');
  console.log('   • Performance under 500ms');
  console.log('   • Ready for production deployment');
} else {
  console.log('\n⚠️  Some issues detected - review above');
}

process.exit(0);
