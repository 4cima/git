const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

async function normalizePaths() {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error('Missing Turso environment variables');
    process.exit(1);
  }

  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });

  const updates = [
    { table: 'movies', col: 'poster_path' },
    { table: 'movies', col: 'backdrop_path' },
    { table: 'tv_series', col: 'poster_path' },
    { table: 'tv_series', col: 'backdrop_path' },
    { table: 'seasons', col: 'poster_path' },
    { table: 'episodes', col: 'still_path' },
    { table: 'people', col: 'profile_path' }
  ];

  console.log('Starting TMDB paths normalization...');

  for (const { table, col } of updates) {
    try {
      // Find how many need updating
      const checkRes = await db.execute(`
        SELECT COUNT(*) as total 
        FROM ${table} 
        WHERE ${col} IS NOT NULL 
          AND TRIM(${col}) != '' 
          AND ${col} NOT LIKE '/%' 
          AND ${col} NOT LIKE 'http%'
      `);
      
      const count = checkRes.rows[0].total;
      
      if (count > 0) {
        console.log(`Fixing ${count} records in ${table}.${col}...`);
        
        // Apply the update
        await db.execute(`
          UPDATE ${table} 
          SET ${col} = '/' || TRIM(${col})
          WHERE ${col} IS NOT NULL 
            AND TRIM(${col}) != '' 
            AND ${col} NOT LIKE '/%' 
            AND ${col} NOT LIKE 'http%'
        `);
        
        console.log(`✅ ${table}.${col} updated successfully.`);
      } else {
        console.log(`✨ ${table}.${col} is already clean.`);
      }
    } catch (error) {
      console.error(`Error processing ${table}.${col}:`, error.message);
    }
  }

  console.log('Normalization complete!');
}

normalizePaths().catch(console.error);
