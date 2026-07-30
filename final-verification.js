const Database = require('better-sqlite3');
require('dotenv').config({ path: '.env.local' });
const path = require('path');

const localDbPath = path.join(__dirname, 'data', '4cima-local.db');
const localDb = new Database(localDbPath, { readonly: true });

async function main() {
  console.log('═'.repeat(80));
  console.log('FINAL VERIFICATION - RAW RESULTS');
  console.log('═'.repeat(80));
  console.log('');

  try {
    // 3) Backlog الحقيقي الجاهز للمزامنة
    console.log('## 3) BACKLOG READY FOR SYNC (is_complete = 1)');
    console.log('─'.repeat(80));
    
    console.log('\nMovies:');
    const moviesBacklog = localDb.prepare(`
      SELECT filter_status, COUNT(*) as count
      FROM movies 
      WHERE is_complete = 1 
      GROUP BY filter_status
      ORDER BY count DESC
    `).all();
    
    let moviesTotal = 0;
    moviesBacklog.forEach(row => {
      console.log(`  ${(row.filter_status || 'NULL').padEnd(20)} ${row.count.toLocaleString('en-US')}`);
      moviesTotal += row.count;
    });
    console.log(`  ${'TOTAL'.padEnd(20)} ${moviesTotal.toLocaleString('en-US')}`);
    
    console.log('\nTV Series:');
    const seriesBacklog = localDb.prepare(`
      SELECT filter_status, COUNT(*) as count
      FROM tv_series 
      WHERE is_complete = 1 
      GROUP BY filter_status
      ORDER BY count DESC
    `).all();
    
    let seriesTotal = 0;
    seriesBacklog.forEach(row => {
      console.log(`  ${(row.filter_status || 'NULL').padEnd(20)} ${row.count.toLocaleString('en-US')}`);
      seriesTotal += row.count;
    });
    console.log(`  ${'TOTAL'.padEnd(20)} ${seriesTotal.toLocaleString('en-US')}`);
    
    console.log('\n═'.repeat(80));
    console.log('QUERIES COMPLETE');
    console.log('═'.repeat(80));

  } catch (error) {
    console.error('ERROR:', error.message);
    console.error(error.stack);
  } finally {
    localDb.close();
  }
}

main();
