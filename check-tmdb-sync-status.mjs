import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_URL = 'https://api.themoviedb.org/3';

const db = new Database(join(__dirname, 'data', '4cima-local.db'));

console.log('📊 Checking TMDB Sync Status\n');
console.log('='.repeat(80));

// Get local max IDs
const localMaxMovie = db.prepare('SELECT MAX(tmdb_id) as max_id FROM movies').get();
const localMaxSeries = db.prepare('SELECT MAX(tmdb_id) as max_id FROM tv_series').get();

console.log('Local DB (Current Max IDs):');
console.log(`  Movies:  ${localMaxMovie.max_id.toLocaleString()}`);
console.log(`  Series:  ${localMaxSeries.max_id.toLocaleString()}`);

// Get TMDB current max IDs
console.log('\nQuerying TMDB for current highest IDs...');

const movieResponse = await fetch(`${TMDB_URL}/movie/latest?api_key=${TMDB_KEY}`);
const latestMovie = await movieResponse.json();

const seriesResponse = await fetch(`${TMDB_URL}/tv/latest?api_key=${TMDB_KEY}`);
const latestSeries = await seriesResponse.json();

console.log('\nTMDB (Current Highest IDs):');
console.log(`  Movies:  ${latestMovie.id.toLocaleString()}`);
console.log(`  Series:  ${latestSeries.id.toLocaleString()}`);

const movieGap = latestMovie.id - localMaxMovie.max_id;
const seriesGap = latestSeries.id - localMaxSeries.max_id;

console.log('\n' + '='.repeat(80));
console.log('Gap Analysis:');
console.log('='.repeat(80));
console.log(`  Movies Gap:  ${movieGap.toLocaleString()} IDs (${localMaxMovie.max_id.toLocaleString()} → ${latestMovie.id.toLocaleString()})`);
console.log(`  Series Gap:  ${seriesGap.toLocaleString()} IDs (${localMaxSeries.max_id.toLocaleString()} → ${latestSeries.id.toLocaleString()})`);

if (movieGap > 0 || seriesGap > 0) {
  console.log('\n⚠️  Local DB is BEHIND - fetch needed');
} else {
  console.log('\n✅ Local DB is UP TO DATE');
}

db.close();
