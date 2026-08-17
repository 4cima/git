import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'data', '4cima-local.db'));

const maxMovie = db.prepare('SELECT MAX(tmdb_id) as max_id FROM movies').get();
const maxSeries = db.prepare('SELECT MAX(tmdb_id) as max_id FROM tv_series').get();
const totalMovies = db.prepare('SELECT COUNT(*) as count FROM movies').get();
const totalSeries = db.prepare('SELECT COUNT(*) as count FROM tv_series').get();

console.log(`Max Movie ID: ${maxMovie.max_id}`);
console.log(`Max Series ID: ${maxSeries.max_id}`);
console.log(`Total Movies: ${totalMovies.count}`);
console.log(`Total Series: ${totalSeries.count}`);

db.close();
