#!/usr/bin/env node

import Database from 'better-sqlite3';

const db = new Database('./data/4cima-local.db');

console.log('Testing movies query...');
const movies = db.prepare(`
  SELECT 
    id, 
    'movie' as type,
    title_en as title,
    overview_en,
    release_date,
    primary_genre as genres
  FROM movies
  WHERE overview_en IS NOT NULL
  AND (overview_ar IS NULL OR overview_ar = '')
  LIMIT 10
`).all();

console.log(`Found ${movies.length} movies`);
movies.forEach(m => console.log(`- ${m.title}`));

console.log('\nTesting series query...');
const series = db.prepare(`
  SELECT 
    id, 
    'series' as type,
    title_en as title,
    overview_en,
    first_air_date as release_date,
    primary_genre as genres
  FROM tv_series
  WHERE overview_en IS NOT NULL
  AND (overview_ar IS NULL OR overview_ar = '')
  LIMIT 10
`).all();

console.log(`Found ${series.length} series`);
series.forEach(s => console.log(`- ${s.title}`));

db.close();
