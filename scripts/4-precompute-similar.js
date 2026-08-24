#!/usr/bin/env node
/**
 * scripts/4-precompute-similar.js
 * 
 * Precompute "similar" recommendations for all movies and series.
 * Runs on LOCAL data/4cima-local.db only.
 * Stores top 12 similar items per content in cache tables.
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../data/4cima-local.db');
const fs = require('fs');

if (!fs.existsSync(dbPath)) {
  console.error('ERROR: data/4cima-local.db not found. STOP.');
  process.exit(1);
}

const db = new Database(dbPath, { readonly: false });

// Helper: parse genres_json
function parseGenres(genresJson) {
  if (!genresJson) return [];
  try {
    const parsed = typeof genresJson === 'string' ? JSON.parse(genresJson) : genresJson;
    return Array.isArray(parsed) ? parsed.map(g => g.id || g.slug).filter(Boolean) : [];
  } catch {
    return [];
  }
}

// Helper: calculate genre overlap
function calculateOverlap(genresA, genresB) {
  const setA = new Set(genresA);
  return genresB.filter(g => setA.has(g)).length;
}

// Process movies
function processMovies() {
  console.log('Processing movies...');
  
  const movies = db.prepare(`
    SELECT tmdb_id, genres_json 
    FROM movies 
    WHERE (filter_status IS NULL OR filter_status IN ('clean', 'reviewed_approved'))
      AND poster_path IS NOT NULL
  `).all();
  
  const insertCache = db.prepare(`
    INSERT OR REPLACE INTO movie_similar_cache (tmdb_id, recommended_ids) 
    VALUES (?, ?)
  `);
  
  let processed = 0;
  
  for (const movie of movies) {
    const currentGenres = parseGenres(movie.genres_json);
    
    // Find similar movies
    const candidates = movies
      .filter(m => m.tmdb_id !== movie.tmdb_id)
      .map(m => ({
        tmdb_id: m.tmdb_id,
        overlap: calculateOverlap(currentGenres, parseGenres(m.genres_json))
      }))
      .filter(m => m.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, 12)
      .map(m => m.tmdb_id);
    
    if (candidates.length > 0) {
      insertCache.run(movie.tmdb_id, JSON.stringify(candidates));
    }
    
    processed++;
    if (processed % 500 === 0) {
      console.log(`Movies: ${processed}/${movies.length}`);
    }
  }
  
  console.log(`MOVIES_CACHED=${processed}`);
  return processed;
}

// Process series
function processSeries() {
  console.log('Processing series...');
  
  const series = db.prepare(`
    SELECT tmdb_id, genres_json 
    FROM tv_series 
    WHERE (filter_status IS NULL OR filter_status IN ('clean', 'reviewed_approved'))
      AND poster_path IS NOT NULL
  `).all();
  
  const insertCache = db.prepare(`
    INSERT OR REPLACE INTO series_similar_cache (tmdb_id, recommended_ids) 
    VALUES (?, ?)
  `);
  
  let processed = 0;
  
  for (const show of series) {
    const currentGenres = parseGenres(show.genres_json);
    
    // Find similar series
    const candidates = series
      .filter(s => s.tmdb_id !== show.tmdb_id)
      .map(s => ({
        tmdb_id: s.tmdb_id,
        overlap: calculateOverlap(currentGenres, parseGenres(s.genres_json))
      }))
      .filter(s => s.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, 12)
      .map(s => s.tmdb_id);
    
    if (candidates.length > 0) {
      insertCache.run(show.tmdb_id, JSON.stringify(candidates));
    }
    
    processed++;
    if (processed % 500 === 0) {
      console.log(`Series: ${processed}/${series.length}`);
    }
  }
  
  console.log(`SERIES_CACHED=${seriesCached}`);
  return processed;
}

// Main
try {
  const moviesCached = processMovies();
  const seriesCached = processSeries();
  
  db.close();
  
  console.log(`\nDONE:`);
  console.log(`MOVIES_CACHED=${moviesCached}`);
  console.log(`SERIES_CACHED=${seriesCached}`);
} catch (err) {
  console.error('ERROR:', err.message);
  db.close();
  process.exit(1);
}
