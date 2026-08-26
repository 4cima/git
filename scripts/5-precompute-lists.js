#!/usr/bin/env node
/**
 * scripts/5-precompute-lists.js
 * 
 * Precompute popular and newest lists for movies and series.
 * Writes to D1 via HTTP API (not local file).
 */

const ACCOUNT_ID = '834bca43d616c73db23cf95311cfe17e';
const DATABASE_ID = 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6';
const D1_HTTP_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;

// Read token from .env.local
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '.env.local');
let token = process.env.CLOUDFLARE_D1_TOKEN;

if (!token && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/CLOUDFLARE_D1_TOKEN=(.+)/);
  if (match) {
    token = match[1].trim();
  }
}

if (!token) {
  console.error('ERROR: CLOUDFLARE_D1_TOKEN not found');
  process.exit(1);
}

async function executeD1(sql, params = []) {
  const maxRetries = 6;
  const delays = [5000, 10000, 20000, 30000, 45000, 60000];
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(D1_HTTP_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql, params }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '(unreadable)');
        
        if (res.status === 429 || text.includes('7429') || text.includes('timeout') || text.includes('object to be reset')) {
          if (attempt < maxRetries - 1) {
            const delay = delays[attempt];
            console.log(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        throw new Error(`D1 HTTP ${res.status}: ${text}`);
      }

      const data = await res.json();
      if (!data.success) {
        const msg = (data.errors ?? []).map(e => `[${e.code}] ${e.message}`).join(', ');
        
        if (msg.includes('7429') || msg.includes('timeout') || msg.includes('object to be reset')) {
          if (attempt < maxRetries - 1) {
            const delay = delays[attempt];
            console.log(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        throw new Error(`D1 query failed: ${msg}`);
      }

      return data.result?.[0]?.results ?? [];
    } catch (err) {
      if (attempt === maxRetries - 1) {
        throw err;
      }
      if (err.message.includes('timeout') || err.message.includes('429') || err.message.includes('7429')) {
        const delay = delays[attempt];
        console.log(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
}

// Create tables if not exist
async function ensureTables() {
  console.log('Ensuring cache tables exist...');
  
  const { execSync } = require('child_process');
  
  const tables = [
    {
      name: 'list_movies_popular',
      sql: `CREATE TABLE IF NOT EXISTS list_movies_popular (
        rank INTEGER PRIMARY KEY,
        id INTEGER NOT NULL,
        tmdb_id INTEGER NOT NULL,
        slug TEXT NOT NULL,
        title_ar TEXT,
        title_en TEXT,
        poster_path TEXT,
        backdrop_path TEXT,
        vote_average REAL,
        release_year INTEGER,
        overview_ar TEXT,
        genres_json TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      )`
    },
    {
      name: 'list_movies_newest',
      sql: `CREATE TABLE IF NOT EXISTS list_movies_newest (
        rank INTEGER PRIMARY KEY,
        id INTEGER NOT NULL,
        tmdb_id INTEGER NOT NULL,
        slug TEXT NOT NULL,
        title_ar TEXT,
        title_en TEXT,
        poster_path TEXT,
        backdrop_path TEXT,
        vote_average REAL,
        release_year INTEGER,
        overview_ar TEXT,
        genres_json TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      )`
    },
    {
      name: 'list_series_popular',
      sql: `CREATE TABLE IF NOT EXISTS list_series_popular (
        rank INTEGER PRIMARY KEY,
        id INTEGER NOT NULL,
        tmdb_id INTEGER NOT NULL,
        slug TEXT NOT NULL,
        name_ar TEXT,
        name_en TEXT,
        poster_path TEXT,
        backdrop_path TEXT,
        vote_average REAL,
        first_air_year INTEGER,
        overview_ar TEXT,
        genres_json TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      )`
    },
    {
      name: 'list_series_newest',
      sql: `CREATE TABLE IF NOT EXISTS list_series_newest (
        rank INTEGER PRIMARY KEY,
        id INTEGER NOT NULL,
        tmdb_id INTEGER NOT NULL,
        slug TEXT NOT NULL,
        name_ar TEXT,
        name_en TEXT,
        poster_path TEXT,
        backdrop_path TEXT,
        vote_average REAL,
        first_air_year INTEGER,
        overview_ar TEXT,
        genres_json TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      )`
    }
  ];
  
  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    console.log(`Creating ${table.name}...`);
    
    try {
      await executeD1(table.sql);
      console.log(`✓ ${table.name} created via HTTP`);
    } catch (err) {
      console.log(`HTTP failed for ${table.name}, trying wrangler...`);
      try {
        const escapedSql = table.sql.replace(/"/g, '\\"');
        execSync(`wrangler d1 execute 4cima-db --remote --command "${escapedSql}"`, {
          stdio: 'inherit',
          cwd: path.join(__dirname, '..')
        });
        console.log(`✓ ${table.name} created via wrangler`);
      } catch (wranglerErr) {
        throw new Error(`Failed to create ${table.name}: ${err.message}`);
      }
    }
    
    if (i < tables.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.log('Tables OK');
}

// Populate list_movies_popular
async function populateMoviesPopular() {
  console.log('Populating list_movies_popular...');
  
  // Fetch top 300 popular movies
  const movies = await executeD1(`
    SELECT id, tmdb_id, slug, title_ar, title_en, poster_path, backdrop_path,
           vote_average, release_year, overview_ar, genres_json
    FROM movies
    WHERE filter_status = 'clean'
      AND slug IS NOT NULL
      AND tmdb_id IS NOT NULL
    ORDER BY popularity DESC
    LIMIT 300
  `);
  
  if (movies.length === 0) {
    console.log('No movies found');
    return 0;
  }
  
  const batchSize = 8;
  let inserted = 0;
  
  for (let i = 0; i < movies.length; i += batchSize) {
    const batch = movies.slice(i, i + batchSize);
    const values = [];
    
    for (let j = 0; j < batch.length; j++) {
      const m = batch[j];
      const rank = i + j + 1;
      values.push([
        rank, m.id, m.tmdb_id, m.slug, m.title_ar, m.title_en,
        m.poster_path, m.backdrop_path, m.vote_average, m.release_year,
        m.overview_ar, m.genres_json
      ]);
    }
    
    if (values.length > 0) {
      const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
      const flatValues = values.flat();
      
      try {
        await executeD1(
          `INSERT OR REPLACE INTO list_movies_popular 
           (rank, id, tmdb_id, slug, title_ar, title_en, poster_path, backdrop_path, 
            vote_average, release_year, overview_ar, genres_json)
           VALUES ${placeholders}`,
          flatValues
        );
        inserted += values.length;
      } catch (err) {
        console.error(`Batch ${i}-${i + batch.length} failed:`, err.message);
        throw err;
      }
    }
  }
  
  // Trim old rows only after all inserts succeeded
  await executeD1(`DELETE FROM list_movies_popular WHERE rank > ?`, [movies.length]);
  
  console.log(`Inserted ${inserted} rows into list_movies_popular`);
  return inserted;
}

// Populate list_movies_newest
async function populateMoviesNewest() {
  console.log('Populating list_movies_newest...');
  
  // Fetch top 300 newest movies by release_year DESC
  const movies = await executeD1(`
    SELECT id, tmdb_id, slug, title_ar, title_en, poster_path, backdrop_path,
           vote_average, release_year, overview_ar, genres_json
    FROM movies
    WHERE filter_status = 'clean'
      AND slug IS NOT NULL
      AND tmdb_id IS NOT NULL
    ORDER BY release_year DESC
    LIMIT 300
  `);
  
  if (movies.length === 0) {
    console.log('No movies found');
    return 0;
  }
  
  const batchSize = 8;
  let inserted = 0;
  
  for (let i = 0; i < movies.length; i += batchSize) {
    const batch = movies.slice(i, i + batchSize);
    const values = [];
    
    for (let j = 0; j < batch.length; j++) {
      const m = batch[j];
      const rank = i + j + 1;
      values.push([
        rank, m.id, m.tmdb_id, m.slug, m.title_ar, m.title_en,
        m.poster_path, m.backdrop_path, m.vote_average, m.release_year,
        m.overview_ar, m.genres_json
      ]);
    }
    
    if (values.length > 0) {
      const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
      const flatValues = values.flat();
      
      try {
        await executeD1(
          `INSERT OR REPLACE INTO list_movies_newest 
           (rank, id, tmdb_id, slug, title_ar, title_en, poster_path, backdrop_path, 
            vote_average, release_year, overview_ar, genres_json)
           VALUES ${placeholders}`,
          flatValues
        );
        inserted += values.length;
      } catch (err) {
        console.error(`Batch ${i}-${i + batch.length} failed:`, err.message);
        throw err;
      }
    }
  }
  
  // Trim old rows only after all inserts succeeded
  await executeD1(`DELETE FROM list_movies_newest WHERE rank > ?`, [movies.length]);
  
  console.log(`Inserted ${inserted} rows into list_movies_newest`);
  return inserted;
}

// Populate list_series_popular
async function populateSeriesPopular() {
  console.log('Populating list_series_popular...');
  
  // Fetch top 300 popular series
  const series = await executeD1(`
    SELECT id, tmdb_id, slug, name_ar, name_en, poster_path, backdrop_path,
           vote_average, first_air_year, overview_ar, genres_json
    FROM tv_series
    WHERE filter_status = 'clean'
      AND slug IS NOT NULL
      AND tmdb_id IS NOT NULL
    ORDER BY popularity DESC
    LIMIT 300
  `);
  
  if (series.length === 0) {
    console.log('No series found');
    return 0;
  }
  
  const batchSize = 8;
  let inserted = 0;
  
  for (let i = 0; i < series.length; i += batchSize) {
    const batch = series.slice(i, i + batchSize);
    const values = [];
    
    for (let j = 0; j < batch.length; j++) {
      const s = batch[j];
      const rank = i + j + 1;
      values.push([
        rank, s.id, s.tmdb_id, s.slug, s.name_ar, s.name_en,
        s.poster_path, s.backdrop_path, s.vote_average, s.first_air_year,
        s.overview_ar, s.genres_json
      ]);
    }
    
    if (values.length > 0) {
      const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
      const flatValues = values.flat();
      
      try {
        await executeD1(
          `INSERT OR REPLACE INTO list_series_popular 
           (rank, id, tmdb_id, slug, name_ar, name_en, poster_path, backdrop_path, 
            vote_average, first_air_year, overview_ar, genres_json)
           VALUES ${placeholders}`,
          flatValues
        );
        inserted += values.length;
      } catch (err) {
        console.error(`Batch ${i}-${i + batch.length} failed:`, err.message);
        throw err;
      }
    }
  }
  
  // Trim old rows only after all inserts succeeded
  await executeD1(`DELETE FROM list_series_popular WHERE rank > ?`, [series.length]);
  
  console.log(`Inserted ${inserted} rows into list_series_popular`);
  return inserted;
}

// Populate list_series_newest
async function populateSeriesNewest() {
  console.log('Populating list_series_newest...');
  
  // Fetch top 300 newest series by first_air_year DESC
  const series = await executeD1(`
    SELECT id, tmdb_id, slug, name_ar, name_en, poster_path, backdrop_path,
           vote_average, first_air_year, overview_ar, genres_json
    FROM tv_series
    WHERE filter_status = 'clean'
      AND slug IS NOT NULL
      AND tmdb_id IS NOT NULL
    ORDER BY first_air_year DESC
    LIMIT 300
  `);
  
  if (series.length === 0) {
    console.log('No series found');
    return 0;
  }
  
  const batchSize = 8;
  let inserted = 0;
  
  for (let i = 0; i < series.length; i += batchSize) {
    const batch = series.slice(i, i + batchSize);
    const values = [];
    
    for (let j = 0; j < batch.length; j++) {
      const s = batch[j];
      const rank = i + j + 1;
      values.push([
        rank, s.id, s.tmdb_id, s.slug, s.name_ar, s.name_en,
        s.poster_path, s.backdrop_path, s.vote_average, s.first_air_year,
        s.overview_ar, s.genres_json
      ]);
    }
    
    if (values.length > 0) {
      const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
      const flatValues = values.flat();
      
      try {
        await executeD1(
          `INSERT OR REPLACE INTO list_series_newest 
           (rank, id, tmdb_id, slug, name_ar, name_en, poster_path, backdrop_path, 
            vote_average, first_air_year, overview_ar, genres_json)
           VALUES ${placeholders}`,
          flatValues
        );
        inserted += values.length;
      } catch (err) {
        console.error(`Batch ${i}-${i + batch.length} failed:`, err.message);
        throw err;
      }
    }
  }
  
  // Trim old rows only after all inserts succeeded
  await executeD1(`DELETE FROM list_series_newest WHERE rank > ?`, [series.length]);
  
  console.log(`Inserted ${inserted} rows into list_series_newest`);
  return inserted;
}

// Main
(async () => {
  try {
    await ensureTables();
    
    const moviesPopular = await populateMoviesPopular();
    const moviesNewest = await populateMoviesNewest();
    const seriesPopular = await populateSeriesPopular();
    const seriesNewest = await populateSeriesNewest();
    
    console.log('\n=== RESULTS ===');
    console.log(`MOVIES_POPULAR=${moviesPopular}`);
    console.log(`MOVIES_NEWEST=${moviesNewest}`);
    console.log(`SERIES_POPULAR=${seriesPopular}`);
    console.log(`SERIES_NEWEST=${seriesNewest}`);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
