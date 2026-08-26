#!/usr/bin/env node
/**
 * scripts/4-precompute-similar.js
 * 
 * Precompute "similar" recommendations for all movies and series.
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
    throw new Error(`D1 HTTP ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (!data.success) {
    const msg = (data.errors ?? []).map(e => `[${e.code}] ${e.message}`).join(', ');
    throw new Error(`D1 query failed: ${msg}`);
  }

  return data.result?.[0]?.results ?? [];
}

// Helper: parse genres_json
function parseGenres(genresJson) {
  if (!genresJson) return [];
  try {
    const parsed = typeof genresJson === 'string' ? JSON.parse(genresJson) : genresJson;
    return Array.isArray(parsed) ? parsed.map(g => g.id || g.tmdb_id || g.slug).filter(Boolean) : [];
  } catch {
    return [];
  }
}

// Helper: calculate overlap
function calculateOverlap(genresA, genresB) {
  const setA = new Set(genresA);
  return genresB.filter(g => setA.has(g)).length;
}

// Create tables if not exist
async function ensureTables() {
  console.log('Ensuring cache tables exist...');
  
  await executeD1(`
    CREATE TABLE IF NOT EXISTS movie_similar_cache (
      tmdb_id INTEGER PRIMARY KEY,
      recommended_ids TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  
  await executeD1(`
    CREATE TABLE IF NOT EXISTS series_similar_cache (
      tmdb_id INTEGER PRIMARY KEY,
      recommended_ids TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  
  console.log('Tables OK');
}

// Process movies
async function processMovies() {
  console.log('Processing movies...');
  
  // Check existing count
  const existing = await executeD1('SELECT COUNT(*) as c FROM movie_similar_cache');
  console.log(`Existing movie cache: ${existing[0]?.c || 0} rows`);
  
  // Fetch movies with genres
  const movies = await executeD1(`
    SELECT tmdb_id, genres_json 
    FROM movies 
    WHERE (filter_status IS NULL OR filter_status IN ('clean', 'reviewed_approved'))
      AND poster_path IS NOT NULL
      AND genres_json IS NOT NULL
      AND vote_count >= 50
    ORDER BY tmdb_id
  `);
  
  console.log(`Loaded ${movies.length} movies`);
  
  if (movies.length === 0) return 0;
  
  // Parse all genres
  const moviesWithGenres = movies.map(m => ({
    tmdb_id: m.tmdb_id,
    genres: parseGenres(m.genres_json)
  })).filter(m => m.genres.length > 0);
  
  console.log(`Movies with genres: ${moviesWithGenres.length}`);
  
  let processed = 0;
  const batchSize = 50;
  
  for (let i = 0; i < moviesWithGenres.length; i += batchSize) {
    const batch = moviesWithGenres.slice(i, i + batchSize);
    const values = [];
    
    for (const movie of batch) {
      // Calculate similar
      const similar = moviesWithGenres
        .filter(m => m.tmdb_id !== movie.tmdb_id)
        .map(m => ({
          tmdb_id: m.tmdb_id,
          overlap: calculateOverlap(movie.genres, m.genres)
        }))
        .filter(m => m.overlap > 0)
        .sort((a, b) => b.overlap - a.overlap)
        .slice(0, 12)
        .map(m => m.tmdb_id);
      
      if (similar.length > 0) {
        values.push([movie.tmdb_id, JSON.stringify(similar)]);
      }
    }
    
    if (values.length > 0) {
      // Batch insert
      const placeholders = values.map(() => '(?, ?)').join(',');
      const flatValues = values.flat();
      await executeD1(
        `INSERT OR REPLACE INTO movie_similar_cache (tmdb_id, recommended_ids) VALUES ${placeholders}`,
        flatValues
      );
    }
    
    processed += batch.length;
    console.log(`Movies: ${processed}/${moviesWithGenres.length}`);
  }
  
  return processed;
}

// Process series
async function processSeries() {
  console.log('Processing series...');
  
  // Check existing count
  const existing = await executeD1('SELECT COUNT(*) as c FROM series_similar_cache');
  console.log(`Existing series cache: ${existing[0]?.c || 0} rows`);
  
  // Fetch series with genres (vote_count may not exist on tv_series)
  const series = await executeD1(`
    SELECT tmdb_id, genres_json 
    FROM tv_series 
    WHERE (filter_status IS NULL OR filter_status IN ('clean', 'reviewed_approved'))
      AND poster_path IS NOT NULL
      AND genres_json IS NOT NULL
    ORDER BY tmdb_id
  `);
  
  console.log(`Loaded ${series.length} series`);
  
  if (series.length === 0) return 0;
  
  // Parse all genres
  const seriesWithGenres = series.map(s => ({
    tmdb_id: s.tmdb_id,
    genres: parseGenres(s.genres_json)
  })).filter(s => s.genres.length > 0);
  
  console.log(`Series with genres: ${seriesWithGenres.length}`);
  
  let processed = 0;
  const batchSize = 50;
  
  for (let i = 0; i < seriesWithGenres.length; i += batchSize) {
    const batch = seriesWithGenres.slice(i, i + batchSize);
    const values = [];
    
    for (const show of batch) {
      // Calculate similar
      const similar = seriesWithGenres
        .filter(s => s.tmdb_id !== show.tmdb_id)
        .map(s => ({
          tmdb_id: s.tmdb_id,
          overlap: calculateOverlap(show.genres, s.genres)
        }))
        .filter(s => s.overlap > 0)
        .sort((a, b) => b.overlap - a.overlap)
        .slice(0, 12)
        .map(s => s.tmdb_id);
      
      if (similar.length > 0) {
        values.push([show.tmdb_id, JSON.stringify(similar)]);
      }
    }
    
    if (values.length > 0) {
      // Batch insert
      const placeholders = values.map(() => '(?, ?)').join(',');
      const flatValues = values.flat();
      await executeD1(
        `INSERT OR REPLACE INTO series_similar_cache (tmdb_id, recommended_ids) VALUES ${placeholders}`,
        flatValues
      );
    }
    
    processed += batch.length;
    console.log(`Series: ${processed}/${seriesWithGenres.length}`);
  }
  
  return processed;
}

// Main
(async () => {
  try {
    await ensureTables();
    
    const moviesCached = await processMovies();
    const seriesCached = await processSeries();
    
    console.log(`\nMOVIES_CACHED=${moviesCached}`);
    console.log(`SERIES_CACHED=${seriesCached}`);
    
    if (moviesCached === 0 && seriesCached === 0) {
      console.log('\nSTOP: No items cached');
      process.exit(0);
    }
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
