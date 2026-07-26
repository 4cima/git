const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function checkOldContent() {
  console.log('Content from 1999 and older in Turso\n');
  
  const movies = await turso.execute('SELECT COUNT(*) as c FROM movies WHERE release_year <= 1999');
  const series = await turso.execute('SELECT COUNT(*) as c FROM tv_series WHERE first_air_year <= 1999');
  
  console.log('Movies (1999 and older):', movies.rows[0].c);
  console.log('Series (1999 and older):', series.rows[0].c);
  console.log('Total:', Number(movies.rows[0].c) + Number(series.rows[0].c));
  
  console.log('\nMovies by decade:');
  const movieDecades = await turso.execute(
    'SELECT CAST(release_year/10*10 AS INTEGER) as decade, COUNT(*) as c FROM movies WHERE release_year <= 1999 GROUP BY decade ORDER BY decade'
  );
  movieDecades.rows.forEach(r => console.log('  ' + r.decade + 's:', r.c));
  
  console.log('\nSeries by decade:');
  const seriesDecades = await turso.execute(
    'SELECT CAST(first_air_year/10*10 AS INTEGER) as decade, COUNT(*) as c FROM tv_series WHERE first_air_year <= 1999 GROUP BY decade ORDER BY decade'
  );
  seriesDecades.rows.forEach(r => console.log('  ' + r.decade + 's:', r.c));
  
  const totalMovies = await turso.execute('SELECT COUNT(*) as c FROM movies');
  const totalSeries = await turso.execute('SELECT COUNT(*) as c FROM tv_series');
  
  const moviePct = ((movies.rows[0].c / totalMovies.rows[0].c) * 100).toFixed(1);
  const seriesPct = ((series.rows[0].c / totalSeries.rows[0].c) * 100).toFixed(1);
  
  console.log('\nPercentage of total:');
  console.log('  Movies:', moviePct + '% of', totalMovies.rows[0].c);
  console.log('  Series:', seriesPct + '% of', totalSeries.rows[0].c);
}

checkOldContent().catch(console.error);
