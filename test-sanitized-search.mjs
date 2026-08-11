import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

// Copy sanitization function
function sanitizeSearchInput(input) {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (trimmed.length === 0) return '';
  const escaped = trimmed.replace(/"/g, '""');
  return `"${escaped}"`;
}

const testCases = [
  { raw: 'Spider-Man', desc: 'hyphen (NOT operator)' },
  { raw: "It's", desc: 'apostrophe' },
  { raw: 'IT', desc: 'short 2-char' },
  { raw: 'V', desc: 'single char' },
  { raw: '9-1-1', desc: 'numbers with hyphens' },
  { raw: 'Movie: Part 2', desc: 'colon' },
  { raw: 'spider', desc: 'regular word (baseline)' }
];

console.log('🧪 Testing Sanitized FTS5 Search');
console.log('='.repeat(70));

for (const { raw, desc } of testCases) {
  const sanitized = sanitizeSearchInput(raw);
  console.log(`\n"${raw}" (${desc})`);
  console.log(`  Sanitized: ${sanitized}`);
  
  try {
    const r = await turso.execute({
      sql: `SELECT movies.title_en FROM movies
            JOIN movies_fts ON movies.id = movies_fts.rowid
            WHERE movies_fts MATCH ?
            ORDER BY rank
            LIMIT 3`,
      args: [sanitized]
    });
    console.log(`  ✅ ${r.rows.length} results: ${r.rows.map(x => x.title_en).join(', ')}`);
  } catch (e) {
    console.log(`  ❌ ERROR: ${e.message}`);
  }
}

// Verify query plan still uses FTS5 index
console.log('\n' + '='.repeat(70));
console.log('🔍 Verifying Query Plan (must use FTS5 index)');
console.log('='.repeat(70));

const sanitized = sanitizeSearchInput('Spider-Man');
const plan = await turso.execute({
  sql: `EXPLAIN QUERY PLAN
        SELECT movies.id FROM movies
        JOIN movies_fts ON movies.id = movies_fts.rowid
        WHERE movies_fts MATCH ?`,
  args: [sanitized]
});

console.log('\nQuery plan for "Spider-Man":');
plan.rows.forEach(r => console.log(`  ${r.detail}`));

const usesFTS = JSON.stringify(plan.rows).includes('VIRTUAL TABLE INDEX');
const usesFullScan = JSON.stringify(plan.rows).includes('SCAN movies ');

if (usesFTS && !usesFullScan) {
  console.log('\n✅ Query plan uses FTS5 index (not full scan)');
} else {
  console.log('\n❌ WARNING: Query plan may be using full scan!');
}

process.exit(0);
