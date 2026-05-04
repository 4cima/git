const Database = require('better-sqlite3');

async function checkDatabases() {
  console.log('🔍 فحص قواعد البيانات...\n');
  
  // SQLite المحلي
  const db = new Database('./data/4cima-local.db');
  
  // Get all tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('📋 الجداول في SQLite:');
  tables.forEach(t => console.log('  -', t.name));
  console.log('');
  
  // Movies
  const movies = db.prepare('SELECT COUNT(*) as total FROM movies').get();
  const moviesComplete = db.prepare('SELECT COUNT(*) as total FROM movies WHERE is_complete = 1').get();
  const moviesFiltered = db.prepare('SELECT COUNT(*) as total FROM movies WHERE is_filtered = 1').get();
  const moviesIncomplete = db.prepare('SELECT COUNT(*) as total FROM movies WHERE is_complete = 0 AND is_filtered = 0').get();
  
  // TV Shows
  const tvShows = db.prepare('SELECT COUNT(*) as total FROM tv_series').get();
  const tvComplete = db.prepare('SELECT COUNT(*) as total FROM tv_series WHERE is_complete = 1').get();
  const tvFiltered = db.prepare('SELECT COUNT(*) as total FROM tv_series WHERE is_filtered = 1').get();
  const tvIncomplete = db.prepare('SELECT COUNT(*) as total FROM tv_series WHERE is_complete = 0 AND is_filtered = 0').get();
  
  console.log('📊 SQLite المحلي:');
  console.log('');
  console.log('🎬 الأفلام:');
  console.log('  إجمالي:', movies.total.toLocaleString());
  console.log('  مكتمل:', moviesComplete.total.toLocaleString(), `(${(moviesComplete.total/movies.total*100).toFixed(1)}%)`);
  console.log('  مفلتر:', moviesFiltered.total.toLocaleString(), `(${(moviesFiltered.total/movies.total*100).toFixed(1)}%)`);
  console.log('  غير مكتمل:', moviesIncomplete.total.toLocaleString(), `(${(moviesIncomplete.total/movies.total*100).toFixed(1)}%)`);
  console.log('');
  console.log('📺 المسلسلات:');
  console.log('  إجمالي:', tvShows.total.toLocaleString());
  console.log('  مكتمل:', tvComplete.total.toLocaleString(), `(${(tvComplete.total/tvShows.total*100).toFixed(1)}%)`);
  console.log('  مفلتر:', tvFiltered.total.toLocaleString(), `(${(tvFiltered.total/tvShows.total*100).toFixed(1)}%)`);
  console.log('  غير مكتمل:', tvIncomplete.total.toLocaleString(), `(${(tvIncomplete.total/tvShows.total*100).toFixed(1)}%)`);
  
  db.close();
  
  // Turso
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Load env
  require('dotenv').config({ path: '.env.local' });
  
  const { createClient } = require('@libsql/client');
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  
  const tursoMovies = await turso.execute('SELECT COUNT(*) as total FROM movies');
  const tursoMoviesComplete = await turso.execute('SELECT COUNT(*) as total FROM movies WHERE is_complete = 1');
  const tursoMoviesFiltered = await turso.execute('SELECT COUNT(*) as total FROM movies WHERE is_filtered = 1');
  
  const tursoTvShows = await turso.execute('SELECT COUNT(*) as total FROM tv_series');
  const tursoTvComplete = await turso.execute('SELECT COUNT(*) as total FROM tv_series WHERE is_complete = 1');
  const tursoTvFiltered = await turso.execute('SELECT COUNT(*) as total FROM tv_series WHERE is_filtered = 1');
  
  console.log('☁️  Turso:');
  console.log('');
  console.log('🎬 الأفلام:');
  console.log('  إجمالي:', tursoMovies.rows[0].total.toLocaleString());
  console.log('  مكتمل:', tursoMoviesComplete.rows[0].total.toLocaleString());
  console.log('  مفلتر:', tursoMoviesFiltered.rows[0].total.toLocaleString());
  console.log('');
  console.log('📺 المسلسلات:');
  console.log('  إجمالي:', tursoTvShows.rows[0].total.toLocaleString());
  console.log('  مكتمل:', tursoTvComplete.rows[0].total.toLocaleString());
  console.log('  مفلتر:', tursoTvFiltered.rows[0].total.toLocaleString());
  
  // الفرق
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 الفرق (SQLite - Turso):');
  console.log('');
  console.log('🎬 الأفلام:');
  console.log('  غير مزامن:', (movies.total - tursoMovies.rows[0].total).toLocaleString());
  console.log('  مكتمل غير مزامن:', (moviesComplete.total - tursoMoviesComplete.rows[0].total).toLocaleString());
  console.log('');
  console.log('📺 المسلسلات:');
  console.log('  غير مزامن:', (tvShows.total - tursoTvShows.rows[0].total).toLocaleString());
  console.log('  مكتمل غير مزامن:', (tvComplete.total - tursoTvComplete.rows[0].total).toLocaleString());
}

checkDatabases().catch(console.error);
