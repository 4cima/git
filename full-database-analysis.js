const Database = require('better-sqlite3');
const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });
const path = require('path');

// Local DB
const localDbPath = path.join(__dirname, 'data', '4cima-local.db');
const localDb = new Database(localDbPath, { readonly: true });

// Turso client
const tursoClient = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function analyzeAll() {
  console.log('='.repeat(80));
  console.log('  FULL DATABASE ANALYSIS - ALL TABLES');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Get all tables from local
    const tables = localDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
    
    console.log('=== ALL TABLES IN LOCAL DATABASE ===');
    tables.forEach(t => console.log(`  - ${t.name}`));
    console.log('');

    // Analyze each main table
    for (const table of tables) {
      const tableName = table.name;
      
      console.log('\n' + '='.repeat(80));
      console.log(`TABLE: ${tableName}`);
      console.log('='.repeat(80));
      
      try {
        // Get count
        const countResult = localDb.prepare(`SELECT COUNT(*) as total FROM ${tableName}`).get();
        console.log(`\nTotal records: ${countResult.total.toLocaleString()}`);
        
        if (countResult.total === 0) {
          console.log('[TABLE IS EMPTY]');
          continue;
        }
        
        // Get columns
        const columns = localDb.prepare(`PRAGMA table_info(${tableName})`).all();
        console.log(`\nColumns (${columns.length}):`);
        columns.forEach(col => {
          console.log(`  ${col.name.padEnd(30)} ${col.type}`);
        });
        
        // Sample data
        console.log('\n--- SAMPLE RECORD ---');
        const sample = localDb.prepare(`SELECT * FROM ${tableName} LIMIT 1`).get();
        if (sample) {
          for (const [key, value] of Object.entries(sample)) {
            let displayValue = value;
            if (value === null || value === '') {
              displayValue = '[EMPTY]';
            } else if (typeof value === 'string' && value.length > 80) {
              displayValue = value.substring(0, 80) + '...';
            }
            console.log(`  ${key}: ${displayValue}`);
          }
        }
        
        // Check for important fields
        const importantFields = [
          'trailer_key', 'vote_count', 'status', 'country_of_origin',
          'imdb_id', 'age_rating', 'runtime', 'budget', 'revenue',
          'seo_title_ar', 'canonical_url', 'genres_json', 'cast_json'
        ];
        
        console.log('\n--- FIELD STATISTICS ---');
        for (const field of importantFields) {
          const hasColumn = columns.find(c => c.name === field);
          if (hasColumn) {
            try {
              const emptyCount = localDb.prepare(`SELECT COUNT(*) as cnt FROM ${tableName} WHERE ${field} IS NULL OR ${field} = ''`).get().cnt;
              const percentage = ((emptyCount / countResult.total) * 100).toFixed(1);
              const hasData = countResult.total - emptyCount;
              
              let status = '🟢';
              if (percentage > 90) status = '🔴';
              else if (percentage > 50) status = '🟡';
              
              console.log(`  ${status} ${field.padEnd(25)} Empty: ${percentage}%  Has: ${hasData.toLocaleString()}`);
            } catch (e) {
              // Field might not exist
            }
          }
        }
        
      } catch (error) {
        console.log(`  [ERROR analyzing ${tableName}: ${error.message}]`);
      }
    }
    
    // Now check Turso
    console.log('\n\n');
    console.log('='.repeat(80));
    console.log('  TURSO DATABASE (PRODUCTION)');
    console.log('='.repeat(80));
    
    // Check movies in Turso
    try {
      const tursoMovies = await tursoClient.execute('SELECT COUNT(*) as total FROM movies');
      console.log(`\nMovies in Turso: ${tursoMovies.rows[0].total}`);
    } catch (e) {
      console.log('\nMovies table: [ERROR or NOT EXISTS]');
    }
    
    // Check tv_series in Turso
    try {
      const tursoSeries = await tursoClient.execute('SELECT COUNT(*) as total FROM tv_series');
      console.log(`TV Series in Turso: ${tursoSeries.rows[0].total}`);
    } catch (e) {
      console.log('TV Series table: [ERROR or NOT EXISTS]');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('  ANALYSIS COMPLETE');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('Fatal Error:', error.message);
    console.error(error.stack);
  } finally {
    localDb.close();
    tursoClient.close();
  }
}

analyzeAll();
