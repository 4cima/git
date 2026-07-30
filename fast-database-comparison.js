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

function analyzeTableLocalFast(tableName) {
  const result = {
    name: tableName,
    rowCount: 0,
    columns: [],
    sampleRows: []
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
      type: c.type
    }));

    // Get 3 sample rows
    result.sampleRows = localDb.prepare(`SELECT * FROM ${tableName} LIMIT 3`).all();
  } catch (error) {
    result.error = error.message;
  }

  return result;
}

async function analyzeTableTursoFast(tableName) {
  const result = {
    name: tableName,
    rowCount: 0,
    columns: [],
    sampleRows: []
  };

  try {
    console.log(`    ⏳ Counting rows...`);
    const countResult = await tursoClient.execute(`SELECT COUNT(*) as total FROM ${tableName}`);
    result.rowCount = countResult.rows[0].total;
    console.log(`    ✅ ${result.rowCount.toLocaleString('en-US')} rows`);

    if (result.rowCount === 0) {
      return result;
    }

    console.log(`    ⏳ Getting schema...`);
    const columnsResult = await tursoClient.execute(`PRAGMA table_info(${tableName})`);
    result.columns = columnsResult.rows.map(c => ({
      name: c.name,
      type: c.type
    }));
    console.log(`    ✅ ${result.columns.length} columns`);

    console.log(`    ⏳ Fetching sample rows...`);
    const sampleResult = await tursoClient.execute(`SELECT * FROM ${tableName} LIMIT 3`);
    result.sampleRows = sampleResult.rows;
    console.log(`    ✅ Got ${result.sampleRows.length} sample rows`);
  } catch (error) {
    result.error = error.message;
    console.log(`    ❌ Error: ${error.message}`);
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

function printTableComparison(localData, tursoData) {
  console.log('\n' + '═'.repeat(100));
  console.log(`TABLE: ${localData.name}`);
  console.log('═'.repeat(100));

  // Row counts
  console.log('\n📊 ROW COUNTS:');
  console.log(`  Local:  ${localData.rowCount.toLocaleString('en-US')}`);
  console.log(`  Turso:  ${tursoData.rowCount.toLocaleString('en-US')}`);
  
  if (localData.rowCount !== tursoData.rowCount) {
    const diff = Math.abs(localData.rowCount - tursoData.rowCount);
    const percentage = ((diff / Math.max(localData.rowCount, tursoData.rowCount)) * 100).toFixed(1);
    console.log(`  🔴 DIFFERENCE: ${diff.toLocaleString('en-US')} rows (${percentage}%)`);
  } else {
    console.log(`  ✅ Row counts match`);
  }

  // Schema comparison
  const comparison = compareSchemas(localData.columns, tursoData.columns);
  
  console.log('\n📋 SCHEMA COMPARISON:');
  console.log(`  Total columns in Local: ${localData.columns.length}`);
  console.log(`  Total columns in Turso: ${tursoData.columns.length}`);
  console.log(`  Common columns: ${comparison.common.length}`);
  
  if (comparison.inLocalOnly.length > 0) {
    console.log(`\n  🔴 COLUMNS IN LOCAL BUT NOT IN TURSO (${comparison.inLocalOnly.length}):`);
    comparison.inLocalOnly.forEach(col => {
      console.log(`    - ${col.name} (${col.type})`);
    });
  }

  if (comparison.inTursoOnly.length > 0) {
    console.log(`\n  🟡 COLUMNS IN TURSO BUT NOT IN LOCAL (${comparison.inTursoOnly.length}):`);
    comparison.inTursoOnly.forEach(col => {
      console.log(`    - ${col.name} (${col.type})`);
    });
  }

  // Sample data from Local
  if (localData.sampleRows && localData.sampleRows.length > 0) {
    console.log('\n💾 SAMPLE ROW FROM LOCAL:');
    const sample = localData.sampleRows[0];
    for (const [key, value] of Object.entries(sample)) {
      console.log(`  ${key.padEnd(30)}: ${formatValue(value)}`);
    }
  }

  // Sample data from Turso
  if (tursoData.sampleRows && tursoData.sampleRows.length > 0) {
    console.log('\n☁️  SAMPLE ROW FROM TURSO:');
    const sample = tursoData.sampleRows[0];
    for (const [key, value] of Object.entries(sample)) {
      console.log(`  ${key.padEnd(30)}: ${formatValue(value)}`);
    }
  }
}

function printLocalOnlyTable(localData) {
  console.log('\n' + '═'.repeat(100));
  console.log(`TABLE: ${localData.name} [LOCAL ONLY]`);
  console.log('═'.repeat(100));
  
  console.log(`\n📊 Row count: ${localData.rowCount.toLocaleString('en-US')}`);
  console.log(`📋 Columns: ${localData.columns.length}`);
  
  console.log('\n📝 Column List:');
  localData.columns.forEach((col, i) => {
    console.log(`  ${(i + 1).toString().padStart(2)}. ${col.name.padEnd(30)} (${col.type})`);
  });

  if (localData.sampleRows && localData.sampleRows.length > 0) {
    console.log('\n💾 SAMPLE ROW:');
    const sample = localData.sampleRows[0];
    for (const [key, value] of Object.entries(sample)) {
      console.log(`  ${key.padEnd(30)}: ${formatValue(value)}`);
    }
  }
}

async function printTursoOnlyTable(tursoData) {
  console.log('\n' + '═'.repeat(100));
  console.log(`TABLE: ${tursoData.name} [TURSO ONLY]`);
  console.log('═'.repeat(100));
  
  console.log(`\n📊 Row count: ${tursoData.rowCount.toLocaleString('en-US')}`);
  console.log(`📋 Columns: ${tursoData.columns.length}`);
  
  console.log('\n📝 Column List:');
  tursoData.columns.forEach((col, i) => {
    console.log(`  ${(i + 1).toString().padStart(2)}. ${col.name.padEnd(30)} (${col.type})`);
  });

  if (tursoData.sampleRows && tursoData.sampleRows.length > 0) {
    console.log('\n☁️  SAMPLE ROW:');
    const sample = tursoData.sampleRows[0];
    for (const [key, value] of Object.entries(sample)) {
      console.log(`  ${key.padEnd(30)}: ${formatValue(value)}`);
    }
  }
}

async function main() {
  const startTime = Date.now();
  
  console.log('╔' + '═'.repeat(98) + '╗');
  console.log('║' + ' '.repeat(20) + 'FAST DATABASE COMPARISON REPORT' + ' '.repeat(47) + '║');
  console.log('║' + ' '.repeat(30) + 'LOCAL vs TURSO' + ' '.repeat(54) + '║');
  console.log('╚' + '═'.repeat(98) + '╝');

  try {
    // Step 1: Discover all tables
    console.log('\n🔍 STEP 1: DISCOVERING ALL TABLES');
    console.log('─'.repeat(100));
    
    console.log('\n⏳ Querying LOCAL database...');
    const localTables = localDb.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).all();
    console.log(`✅ Found ${localTables.length} tables in LOCAL\n`);
    
    console.log('⏳ Querying TURSO database...');
    const tursoTablesResult = await tursoClient.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    );
    const tursoTables = tursoTablesResult.rows;
    console.log(`✅ Found ${tursoTables.length} tables in TURSO\n`);

    // Tables found
    console.log('📋 LOCAL TABLES:');
    localTables.forEach((t, i) => console.log(`  ${(i + 1).toString().padStart(2)}. ${t.name}`));
    
    console.log('\n📋 TURSO TABLES:');
    tursoTables.forEach((t, i) => console.log(`  ${(i + 1).toString().padStart(2)}. ${t.name}`));

    // Step 2: Compare table lists
    console.log('\n\n📊 STEP 2: TABLE COMPARISON');
    console.log('─'.repeat(100));
    
    const localTableNames = new Set(localTables.map(t => t.name));
    const tursoTableNames = new Set(tursoTables.map(t => t.name));
    
    const commonTables = localTables.filter(t => tursoTableNames.has(t.name)).map(t => t.name);
    const onlyInLocal = localTables.filter(t => !tursoTableNames.has(t.name)).map(t => t.name);
    const onlyInTurso = tursoTables.filter(t => !localTableNames.has(t.name)).map(t => t.name);

    console.log(`\n✅ Tables in BOTH: ${commonTables.length}`);
    commonTables.forEach(t => console.log(`    - ${t}`));

    if (onlyInLocal.length > 0) {
      console.log(`\n🔵 Tables ONLY in LOCAL: ${onlyInLocal.length}`);
      onlyInLocal.forEach(t => console.log(`    - ${t}`));
    }

    if (onlyInTurso.length > 0) {
      console.log(`\n🟣 Tables ONLY in TURSO: ${onlyInTurso.length}`);
      onlyInTurso.forEach(t => console.log(`    - ${t}`));
    }

    // Step 3: Analyze common tables
    console.log('\n\n🔬 STEP 3: ANALYZING COMMON TABLES');
    console.log('─'.repeat(100));
    console.log(`📋 Total: ${commonTables.length} tables\n`);

    for (let i = 0; i < commonTables.length; i++) {
      const tableName = commonTables[i];
      const progress = `[${i + 1}/${commonTables.length}]`;
      
      console.log(`\n${progress} 🔍 ${tableName}`);
      console.log(`  📍 LOCAL:`);
      console.log(`    ⏳ Analyzing...`);
      const localStart = Date.now();
      const localData = analyzeTableLocalFast(tableName);
      console.log(`    ✅ Done in ${Date.now() - localStart}ms`);
      
      console.log(`  📍 TURSO:`);
      const tursoStart = Date.now();
      const tursoData = await analyzeTableTursoFast(tableName);
      console.log(`    ✅ Done in ${Date.now() - tursoStart}ms`);
      
      printTableComparison(localData, tursoData);
    }

    // Step 4: Analyze Local-only tables
    if (onlyInLocal.length > 0) {
      console.log('\n\n📦 STEP 4: ANALYZING LOCAL-ONLY TABLES');
      console.log('─'.repeat(100));
      console.log(`📋 Total: ${onlyInLocal.length} tables\n`);
      
      for (let i = 0; i < onlyInLocal.length; i++) {
        const tableName = onlyInLocal[i];
        const progress = `[${i + 1}/${onlyInLocal.length}]`;
        console.log(`\n${progress} 🔍 ${tableName}`);
        const localData = analyzeTableLocalFast(tableName);
        printLocalOnlyTable(localData);
      }
    }

    // Step 5: Analyze Turso-only tables
    if (onlyInTurso.length > 0) {
      console.log('\n\n☁️  STEP 5: ANALYZING TURSO-ONLY TABLES');
      console.log('─'.repeat(100));
      console.log(`📋 Total: ${onlyInTurso.length} tables\n`);
      
      for (let i = 0; i < onlyInTurso.length; i++) {
        const tableName = onlyInTurso[i];
        const progress = `[${i + 1}/${onlyInTurso.length}]`;
        console.log(`\n${progress} 🔍 ${tableName}`);
        const tursoData = await analyzeTableTursoFast(tableName);
        await printTursoOnlyTable(tursoData);
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n\n╔' + '═'.repeat(98) + '╗');
    console.log('║' + ' '.repeat(35) + 'ANALYSIS COMPLETE' + ' '.repeat(46) + '║');
    console.log('║' + `  Total time: ${totalTime}s`.padEnd(99) + '║');
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
