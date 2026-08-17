// Monitor enrichment progress periodically
const db = require('./scripts/services/local-db');

function getStatus() {
  const movies = db.prepare('SELECT SUM(CASE WHEN is_complete=1 THEN 1 ELSE 0 END) as complete FROM movies').get();
  const series = db.prepare('SELECT SUM(CASE WHEN is_complete=1 THEN 1 ELSE 0 END) as complete FROM tv_series').get();
  const seasons = db.prepare('SELECT COUNT(*) as c FROM seasons').get();
  
  return {
    movies_complete: movies.complete,
    series_complete: series.complete,
    seasons_total: seasons.c,
    timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
  };
}

console.log('Starting enrichment monitor...\n');
console.log('Time       | Movies Complete | Series Complete | Seasons Total');
console.log('-----------|-----------------|-----------------|---------------');

const initial = getStatus();
console.log(`${initial.timestamp} | ${String(initial.movies_complete).padStart(15)} | ${String(initial.series_complete).padStart(15)} | ${String(initial.seasons_total).padStart(13)}`);

setInterval(() => {
  const status = getStatus();
  console.log(`${status.timestamp} | ${String(status.movies_complete).padStart(15)} | ${String(status.series_complete).padStart(15)} | ${String(status.seasons_total).padStart(13)}`);
}, 5 * 60 * 1000); // Every 5 minutes
