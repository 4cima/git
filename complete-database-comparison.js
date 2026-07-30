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

function analyzeTableLocal(tableName) {
  const result = {
    name: tableName,
    rowCount: 0,
    columns: [],
    columnStats: {},
    sampleRow: null
  };

  try {
    // Get row count
    const countResult = localDb.prepare(`SELECT COUNT(*) as total FROM ${tableName}`).get();
    result.rowCount = countResult.total;

    if (countResult.total === 0) {
      return result;
    }

    // Get columns
    const columns = localDb.prepare(`PRAGMA table_info(${tableName})`).all();
    result.columns = columns.map(c => ({
      name: c.name,
      type: c.type,
      notNull: c.notnull === 1,
      defaultValue: c.dflt_value,
      pk: c.pk === 1
    }));

    // Get sample row
    result.sampleRow = localDb.prepare(`SELECT * FROM ${tableName} LIMIT 1`).get();

    // Get stats for each column - with progress indicator
    let processed = 0;
    for (const col of columns) {
      try {
        const emptyCount = localDb.prepare(
          `SELECT COUNT(*) as cnt FROM ${tableName} WHERE ${col.name} IS NULL OR ${col.name} = ''`
        ).get().cnt;
        
        const percentage = countResult.total > 0 ? ((emptyCount / countResult.total) * 100).toFixed(2) : 0;
        const hasData = countResult.total - emptyCount;
        
        result.columnStats[col.name] = {
          emptyCount,
          emptyPercentage: parseFloat(percentage),
          hasData
        };
        
        processed++;
        if (processed % 5 === 0 || processed === columns.length) {
          process.stdout.write(`\r  ├─ Column stats: ${processed}/${columns.length}`);
        }
      } catch (e) {
        result.columnStats[col.name] = { error: e.message };
      }
    }
    if (columns.length > 0) console.log(''); // New line after progress
  } catch (error) {
    result.error = error.message;
  }

  return result;
}

async function analyzeTableTurso(tableName) {
  const result = {
    name: tableName,
    rowCount: 0,
    columns: [],
    columnStats: {},
    sampleRow: null
  };

  try {
    console.log(`    ├─ Getting row count...`);
    // Get row count
    const countResult = await tursoClient.execute(`SELECT COUNT(*) as total FROM ${tableName}`);
    result.rowCount = countResult.rows[0].total;
    console.log(`    ├─ Found ${result.rowCount.toLocaleString('en-US')} rows`);

    if (result.rowCount === 0) {
      return result;
    }

    console.log(`    ├─ Getting schema...`);
    // Get columns using PRAGMA
    const columnsResult = await tursoClient.execute(`PRAGMA table_info(${tableName})`);
    result.columns = columnsResult.rows.map(c => ({
      name: c.name,
      type: c.type,
      notNull: c.notnull === 1,
      defaultValue: c.dflt_value,
      pk: c.pk === 1
    }));
    console.log(`    ├─ Found ${result.columns.length} columns`);

    // Get sample row
    const sampleResult = await tursoClient.execute(`SELECT * FROM ${tableName} LIMIT 1`);
    if (sampleResult.rows.length > 0) {
      result.sampleRow = sampleResult.rows[0];
    }

    console.log(`    ├─ Analyzing column statistics (0/${result.columns.length})...`);
    // Get stats for each column
    let processed = 0;
    for (const col of result.columns) {
      try {
        const emptyResult = await tursoClient.execute(
          `SELECT COUNT(*) as cnt FROM ${tableName} WHERE ${col.name} IS NULL OR ${col.name} = ''`
        );
        const emptyCount = emptyResult.rows[0].cnt;
        const percentage = result.rowCount > 0 ? ((emptyCount / result.rowCount) * 100).toFixed(2) : 0;
        const hasData = result.rowCount - emptyCount;
        
        result.columnStats[col.name] = {
          emptyCount,
          emptyPercentage: parseFloat(percentage),
          hasData
        };
        
        processed++;
        if (processed % 5 === 0 || processed === result.columns.length) {
          process.stdout.write(`\r    ├─ Analyzing column statistics (${processed}/${result.columns.length})...`);
        }
      } catch (e) {
        result.columnStats[col.name] = { error: e.message };
      }
    }
    console.log(''); // New line after progress
  } catch (error) {
    result.error = error.message;
  }

  return result;
}

function compareSchemas(localCols, tursoCols) {
  const localNames = new Set(localCols.map(c => c.name));
  const tursoNames = new Set(tursoCols.map(c => c.name));

  const inLocalOnly = localCols.filter(c => !tursoNames.has(c.name));
  const inTursoOnly = tursoCols.filter(c => !localNames.has(c.name));
  const common = localCols.filter(c => tursoNames.has(c.name));

  return { inLocalOnly, inTursoOnly, common };
}

function formatValue(value) {
  if (value === null || value === undefined) return '[NULL]';
  if (value === '') return '[EMPTY]';
  if (typeof value === 'string' && value.length > 100) {
    return value.substring(0, 100) + '...';
  }
  return value;
}

function printTableAnalysis(localData, tursoData) {
  console.log('\n' + '═'.repeat(100));
  console.log(`TABLE: ${localData.name}`);
  console.log('═'.repeat(100));

  // Row counts
  console.log('\n📊 ROW COUNTS:');
  console.log(`  Local:  ${localData.rowCount.toLocaleString('en-US')}`);
  console.log(`  Turso:  ${tursoData.rowCount.toLocaleString('en-US')}`);
  
  if (localData.rowCount !== tursoData.rowCount) {
    const diff = Math.abs(localData.rowCount - tursoData.rowCount);
    console.log(`  ⚠️  DIFFERENCE: ${diff.toLocaleString('en-US')} rows`);
  }

  // Schema comparison
  const comparison = compareSchemas(localData.columns, tursoData.columns);
  
  console.log('\n📋 SCHEMA COMPARISON:');
  console.log(`  Common columns: ${comparison.common.length}`);
  console.log(`  Only in Local: ${comparison.inLocalOnly.length}`);
  console.log(`  Only in Turso: ${comparison.inTursoOnly.length}`);

  if (comparison.inLocalOnly.length > 0) {
    console.log('\n  🔴 COLUMNS IN LOCAL BUT NOT IN TURSO:');
    comparison.inLocalOnly.forEach(col => {
      console.log(`    - ${col.name} (${col.type})`);
    });
  }

  if (comparison.inTursoOnly.length > 0) {
    console.log('\n  🟡 COLUMNS IN TURSO BUT NOT IN LOCAL:');
    comparison.inTursoOnly.forEach(col => {
      console.log(`    - ${col.name} (${col.type})`);
    });
  }

  // Sample data from Local
  if (localData.sampleRow) {
    console.log('\n💾 SAMPLE ROW FROM LOCAL:');
    for (const [key, value] of Object.entries(localData.sampleRow)) {
      console.log(`  ${key.padEnd(30)}: ${formatValue(value)}`);
    }
  }

  // Sample data from Turso
  if (tursoData.sampleRow) {
    console.log('\n☁️  SAMPLE ROW FROM TURSO:');
    for (const [key, value] of Object.entries(tursoData.sampleRow)) {
      console.log(`  ${key.padEnd(30)}: ${formatValue(value)}`);
    }
  }

  // Column statistics - Local
  console.log('\n📈 COLUMN STATISTICS - LOCAL:');
  console.log('  ' + '-'.repeat(90));
  console.log(`  ${'Column'.padEnd(30)} ${'Empty %'.padStart(10)} ${'Has Data'.padStart(15)} ${'Status'.padStart(10)}`);
  console.log('  ' + '-'.repeat(90));
  
  for (const col of localData.columns) {
    const stats = localData.columnStats[col.name];
    if (stats && !stats.error) {
      let status = '🟢';
      if (stats.emptyPercentage > 90) status = '🔴';
      else if (stats.emptyPercentage > 50) status = '🟡';
      
      console.log(`  ${col.name.padEnd(30)} ${(stats.emptyPercentage + '%').padStart(10)} ${stats.hasData.toLocaleString('en-US').padStart(15)} ${status.padStart(10)}`);
    }
  }

  // Column statistics - Turso
  console.log('\n📈 COLUMN STATISTICS - TURSO:');
  console.log('  ' + '-'.repeat(90));
  console.log(`  ${'Column'.padEnd(30)} ${'Empty %'.padStart(10)} ${'Has Data'.padStart(15)} ${'Status'.padStart(10)}`);
  console.log('  ' + '-'.repeat(90));
  
  for (const col of tursoData.columns) {
    const stats = tursoData.columnStats[col.name];
    if (stats && !stats.error) {
      let status = '🟢';
      if (stats.emptyPercentage > 90) status = '🔴';
      else if (stats.emptyPercentage > 50) status = '🟡';
      
      console.log(`  ${col.name.padEnd(30)} ${(stats.emptyPercentage + '%').padStart(10)} ${stats.hasData.toLocaleString('en-US').padStart(15)} ${status.padStart(10)}`);
    }
  }
}

async function main() {
  const startTime = Date.now();
  
  console.log('╔' + '═'.repeat(98) + '╗');
  console.log('║' + ' '.repeat(20) + 'COMPLETE DATABASE COMPARISON REPORT' + ' '.repeat(43) + '║');
  console.log('║' + ' '.repeat(30) + 'LOCAL vs TURSO' + ' '.repeat(54) + '║');
  console.log('╚' + '═'.repeat(98) + '╝');

  try {
    // Step 1: Discover all tables in Local
    console.log('\n\n🔍 STEP 1: DISCOVERING ALL TABLES IN LOCAL DATABASE');
    console.log('─'.repeat(100));
    console.log('⏳ Querying sqlite_master...');
    const localTables = localDb.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).all();
    console.log(`✅ Found ${localTables.length} tables\n`);
    
    console.log('Tables found in LOCAL:');
    localTables.forEach((t, i) => console.log(`  ${(i + 1).toString().padStart(2)}. ${t.name}`));

    // Step 2: Discover all tables in Turso
    console.log('\n\n🔍 STEP 2: DISCOVERING ALL TABLES IN TURSO DATABASE');
    console.log('─'.repeat(100));
    console.log('⏳ Connecting to Turso and querying sqlite_master...');
    const tursoTablesResult = await tursoClient.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    );
    const tursoTables = tursoTablesResult.rows;
    console.log(`✅ Found ${tursoTables.length} tables\n`);
    
    console.log('Tables found in TURSO:');
    tursoTables.forEach((t, i) => console.log(`  ${(i + 1).toString().padStart(2)}. ${t.name}`));

    // Step 3: Compare table lists
    console.log('\n\n📊 STEP 3: TABLE COMPARISON');
    console.log('─'.repeat(100));
    console.log('⏳ Comparing table lists...');
    
    const localTableNames = new Set(localTables.map(t => t.name));
    const tursoTableNames = new Set(tursoTables.map(t => t.name));
    
    const commonTables = localTables.filter(t => tursoTableNames.has(t.name)).map(t => t.name);
    const onlyInLocal = localTables.filter(t => !tursoTableNames.has(t.name)).map(t => t.name);
    const onlyInTurso = tursoTables.filter(t => !localTableNames.has(t.name)).map(t => t.name);

    console.log(`✅ Comparison complete\n`);
    console.log(`✅ Tables in BOTH databases: ${commonTables.length}`);
    commonTables.forEach(t => console.log(`    - ${t}`));

    if (onlyInLocal.length > 0) {
      console.log(`\n🔵 Tables ONLY in LOCAL: ${onlyInLocal.length}`);
      onlyInLocal.forEach(t => console.log(`    - ${t}`));
    }

    if (onlyInTurso.length > 0) {
      console.log(`\n🟣 Tables ONLY in TURSO: ${onlyInTurso.length}`);
      onlyInTurso.forEach(t => console.log(`    - ${t}`));
    }

    // Step 4: Analyze each common table in detail
    console.log('\n\n🔬 STEP 4: DETAILED ANALYSIS OF EACH TABLE');
    console.log('─'.repeat(100));
    console.log(`📋 Total tables to analyze: ${commonTables.length}\n`);

    for (let i = 0; i < commonTables.length; i++) {
      const tableName = commonTables[i];
      const progress = `[${i + 1}/${commonTables.length}]`;
      
      console.log(`\n${progress} ⏳ Analyzing ${tableName}...`);
      console.log(`  ├─ Reading from LOCAL database...`);
      const localStart = Date.now();
      const localData = analyzeTableLocal(tableName);
      console.log(`  ├─ ✅ Local done in ${Date.now() - localStart}ms (${localData.rowCount.toLocaleString('en-US')} rows, ${localData.columns.length} columns)`);
      
      console.log(`  ├─ Reading from TURSO database...`);
      const tursoStart = Date.now();
      const tursoData = await analyzeTableTurso(tableName);
      console.log(`  └─ ✅ Turso done in ${Date.now() - tursoStart}ms (${tursoData.rowCount.toLocaleString('en-US')} rows, ${tursoData.columns.length} columns)`);
      
      printTableAnalysis(localData, tursoData);
    }

    // Step 5: Analyze Local-only tables
    if (onlyInLocal.length > 0) {
      console.log('\n\n📦 STEP 5: ANALYZING TABLES ONLY IN LOCAL');
      console.log('─'.repeat(100));
      console.log(`📋 Total local-only tables: ${onlyInLocal.length}\n`);
      
      for (let i = 0; i < onlyInLocal.length; i++) {
        const tableName = onlyInLocal[i];
        const progress = `[${i + 1}/${onlyInLocal.length}]`;
        
        console.log(`\n${progress} ⏳ Analyzing ${tableName} (Local only)...`);
        const localData = analyzeTableLocal(tableName);
        console.log(`  └─ ✅ Done (${localData.rowCount.toLocaleString('en-US')} rows, ${localData.columns.length} columns)`);
        
        console.log('\n' + '═'.repeat(100));
        console.log(`TABLE: ${tableName} [LOCAL ONLY]`);
        console.log('═'.repeat(100));
        console.log(`\nRow count: ${localData.rowCount.toLocaleString('en-US')}`);
        
        if (localData.sampleRow) {
          console.log('\n💾 SAMPLE ROW:');
          for (const [key, value] of Object.entries(localData.sampleRow)) {
            console.log(`  ${key.padEnd(30)}: ${formatValue(value)}`);
          }
        }
        
        console.log('\n📈 COLUMN STATISTICS:');
        console.log('  ' + '-'.repeat(90));
        console.log(`  ${'Column'.padEnd(30)} ${'Empty %'.padStart(10)} ${'Has Data'.padStart(15)} ${'Status'.padStart(10)}`);
        console.log('  ' + '-'.repeat(90));
        
        for (const col of localData.columns) {
          const stats = localData.columnStats[col.name];
          if (stats && !stats.error) {
            let status = '🟢';
            if (stats.emptyPercentage > 90) status = '🔴';
            else if (stats.emptyPercentage > 50) status = '🟡';
            
            console.log(`  ${col.name.padEnd(30)} ${(stats.emptyPercentage + '%').padStart(10)} ${stats.hasData.toLocaleString('en-US').padStart(15)} ${status.padStart(10)}`);
          }
        }
      }
    }

    // Step 6: Analyze Turso-only tables
    if (onlyInTurso.length > 0) {
      console.log('\n\n☁️  STEP 6: ANALYZING TABLES ONLY IN TURSO');
      console.log('─'.repeat(100));
      console.log(`📋 Total Turso-only tables: ${onlyInTurso.length}\n`);
      
      for (let i = 0; i < onlyInTurso.length; i++) {
        const tableName = onlyInTurso[i];
        const progress = `[${i + 1}/${onlyInTurso.length}]`;
        
        console.log(`\n${progress} ⏳ Analyzing ${tableName} (Turso only)...`);
        const tursoData = await analyzeTableTurso(tableName);
        console.log(`  └─ ✅ Done (${tursoData.rowCount.toLocaleString('en-US')} rows, ${tursoData.columns.length} columns)`);
        
        console.log('\n' + '═'.repeat(100));
        console.log(`TABLE: ${tableName} [TURSO ONLY]`);
        console.log('═'.repeat(100));
        console.log(`\nRow count: ${tursoData.rowCount.toLocaleString('en-US')}`);
        
        if (tursoData.sampleRow) {
          console.log('\n☁️  SAMPLE ROW:');
          for (const [key, value] of Object.entries(tursoData.sampleRow)) {
            console.log(`  ${key.padEnd(30)}: ${formatValue(value)}`);
          }
        }
        
        console.log('\n📈 COLUMN STATISTICS:');
        console.log('  ' + '-'.repeat(90));
        console.log(`  ${'Column'.padEnd(30)} ${'Empty %'.padStart(10)} ${'Has Data'.padStart(15)} ${'Status'.padStart(10)}`);
        console.log('  ' + '-'.repeat(90));
        
        for (const col of tursoData.columns) {
          const stats = tursoData.columnStats[col.name];
          if (stats && !stats.error) {
            let status = '🟢';
            if (stats.emptyPercentage > 90) status = '🔴';
            else if (stats.emptyPercentage > 50) status = '🟡';
            
            console.log(`  ${col.name.padEnd(30)} ${(stats.emptyPercentage + '%').padStart(10)} ${stats.hasData.toLocaleString('en-US').padStart(15)} ${status.padStart(10)}`);
          }
        }
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n\n╔' + '═'.repeat(98) + '╗');
    console.log('║' + ' '.repeat(35) + 'ANALYSIS COMPLETE' + ' '.repeat(46) + '║');
    console.log('║' + `  Total execution time: ${totalTime}s`.padEnd(99) + '║');
    console.log('╚' + '═'.repeat(98) + '╝\n');

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);
  } finally {
    localDb.close();
    tursoClient.close();
  }
}

main();
