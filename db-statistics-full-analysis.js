const Database = require('better-sqlite3');
const { createClient } = require('@libsql/client');

// Connect to local database
const localDb = new Database('./data/4cima-local.db');

// Connect to Turso
const turso = createClient({
  url: process.env.TURSO_CONNECTION_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function analyzeDatabase() {
  console.log('\n' + '═'.repeat(100));
  console.log('                    📊 احصائية شاملة لقاعدة البيانات 📊');
  console.log('═'.repeat(100) + '\n');

  // ========== LOCAL DATABASE ANALYSIS ==========
  console.log('\n' + '▓'.repeat(100));
  console.log('                    🗄️  قاعدة البيانات المحلية (SQLite)');
  console.log('▓'.repeat(100) + '\n');

  // Get all tables
  const localTables = localDb.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    ORDER BY name
  `).all();

  for (const table of localTables) {
    const tableName = table.name;
    console.log(`\n📋 جدول: ${tableName}`);
    console.log('─'.repeat(100));

    // Get table schema
    const columns = localDb.prepare(`PRAGMA table_info(${tableName})`).all();
    const rowCount = localDb.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();

    console.log(`   📈 عدد الصفوف: ${rowCount.count.toLocaleString('ar-EG')}`);
    console.log(`   📍 عدد الأعمدة: ${columns.length}\n`);

    console.log('   📌 تفاصيل الأعمدة:');
    console.log('   ' + '─'.repeat(96));

    columns.forEach((col, idx) => {
      const colNum = idx + 1;
      const colName = col.name;
      const colType = col.type;
      const notNull = col.notnull ? '✓ NOT NULL' : '○ NULLABLE';
      const pk = col.pk ? '🔑 PRIMARY KEY' : '';

      console.log(`   ${colNum.toString().padStart(2)}. ${colName.padEnd(25)} | النوع: ${colType.padEnd(15)} | ${notNull.padEnd(15)} ${pk}`);

      // Get statistics for each column
      if (colName !== 'ROWID') {
        try {
          const nullCount = localDb.prepare(`SELECT COUNT(*) as count FROM ${tableName} WHERE ${colName} IS NULL`).get();
          const notNullCount = rowCount.count - nullCount.count;
          const nullPct = ((nullCount.count / rowCount.count) * 100).toFixed(1);

          console.log(`       └─ القيم: ${notNullCount} معرّفة (${(100 - parseFloat(nullPct)).toFixed(1)}%) | ${nullCount.count} فارغة (${nullPct}%)`);

          // Get sample values for string columns
          if (colType.includes('TEXT') && notNullCount > 0) {
            const samples = localDb.prepare(`SELECT DISTINCT ${colName} FROM ${tableName} WHERE ${colName} IS NOT NULL LIMIT 2`).all();
            if (samples.length > 0) {
              console.log(`       └─ أمثلة: ${samples.map(s => `"${s[colName]?.substring(0, 40)}..."`).join(' | ')}`);
            }
          }

          // Get sample values for numeric columns
          if ((colType.includes('INT') || colType.includes('REAL')) && notNullCount > 0) {
            const stats = localDb.prepare(`SELECT MIN(${colName}) as min, MAX(${colName}) as max, AVG(${colName}) as avg FROM ${tableName}`).get();
            console.log(`       └─ الحد الأدنى: ${stats.min} | الحد الأقصى: ${stats.max} | المتوسط: ${stats.avg?.toFixed(2)}`);
          }
        } catch (e) {
          console.log(`       └─ ⚠️  لم يتمكن من جلب الإحصائيات`);
        }
      }
    });

    console.log('   ' + '─'.repeat(96));
  }

  // ========== TURSO DATABASE ANALYSIS ==========
  console.log('\n\n' + '▓'.repeat(100));
  console.log('                    🚀 قاعدة بيانات Turso (السحابة)');
  console.log('▓'.repeat(100) + '\n');

  try {
    // Get all tables from Turso
    const tursoTables = await turso.execute(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `);

    for (const table of tursoTables.rows) {
      const tableName = table.name;
      console.log(`\n📋 جدول: ${tableName}`);
      console.log('─'.repeat(100));

      // Get table schema
      const columnsResult = await turso.execute(`PRAGMA table_info(${tableName})`);
      const columns = columnsResult.rows;
      
      const rowCountResult = await turso.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
      const rowCount = rowCountResult.rows[0].count;

      console.log(`   📈 عدد الصفوف: ${rowCount.toLocaleString('ar-EG')}`);
      console.log(`   📍 عدد الأعمدة: ${columns.length}\n`);

      console.log('   📌 تفاصيل الأعمدة:');
      console.log('   ' + '─'.repeat(96));

      columns.forEach((col, idx) => {
        const colNum = idx + 1;
        const colName = col.name;
        const colType = col.type;
        const notNull = col.notnull ? '✓ NOT NULL' : '○ NULLABLE';
        const pk = col.pk ? '🔑 PRIMARY KEY' : '';

        console.log(`   ${colNum.toString().padStart(2)}. ${colName.padEnd(25)} | النوع: ${colType.padEnd(15)} | ${notNull.padEnd(15)} ${pk}`);

        // Get statistics for each column
        if (colName !== 'ROWID' && tableName.toLowerCase() !== 'sqlite_sequence') {
          try {
            const nullCountResult = await turso.execute(`SELECT COUNT(*) as count FROM ${tableName} WHERE ${colName} IS NULL`);
            const nullCount = nullCountResult.rows[0].count;
            const notNullCount = rowCount - nullCount;
            const nullPct = ((nullCount / rowCount) * 100).toFixed(1);

            console.log(`       └─ القيم: ${notNullCount} معرّفة (${(100 - parseFloat(nullPct)).toFixed(1)}%) | ${nullCount} فارغة (${nullPct}%)`);

            // Get sample values
            if (notNullCount > 0) {
              const samplesResult = await turso.execute(`SELECT DISTINCT ${colName} FROM ${tableName} WHERE ${colName} IS NOT NULL LIMIT 2`);
              if (samplesResult.rows.length > 0) {
                console.log(`       └─ أمثلة: ${samplesResult.rows.map(s => `"${s[colName]?.toString().substring(0, 40)}..."`).join(' | ')}`);
              }
            }
          } catch (e) {
            console.log(`       └─ ⚠️  لم يتمكن من جلب الإحصائيات`);
          }
        }
      });

      console.log('   ' + '─'.repeat(96));
    }
  } catch (error) {
    console.error('❌ خطأ في قراءة Turso:', error.message);
  }

  // ========== COMPARISON & ISSUES ==========
  console.log('\n\n' + '▓'.repeat(100));
  console.log('                    🔍 مقارنة وتحليل المشاكل');
  console.log('▓'.repeat(100) + '\n');

  console.log('🔎 فحص backdrop_path:\n');

  // Local backdrop analysis
  try {
    const localMoviesBackdrop = localDb.prepare(`SELECT COUNT(*) as count FROM movies WHERE backdrop_path IS NOT NULL AND backdrop_path != ''`).get();
    const localMoviesTotal = localDb.prepare(`SELECT COUNT(*) as count FROM movies`).get();
    const localMoviesPct = ((localMoviesBackdrop.count / localMoviesTotal.count) * 100).toFixed(1);

    console.log(`   📽️  الأفلام (Local):`);
    console.log(`       └─ إجمالي: ${localMoviesTotal.count.toLocaleString('ar-EG')}`);
    console.log(`       └─ عندها backdrop: ${localMoviesBackdrop.count.toLocaleString('ar-EG')} (${localMoviesPct}%)`);
    console.log(`       └─ بدون backdrop: ${(localMoviesTotal.count - localMoviesBackdrop.count).toLocaleString('ar-EG')} (${(100 - parseFloat(localMoviesPct)).toFixed(1)}%)\n`);

    const localSeriesBackdrop = localDb.prepare(`SELECT COUNT(*) as count FROM tv_series WHERE backdrop_path IS NOT NULL AND backdrop_path != ''`).get();
    const localSeriesTotal = localDb.prepare(`SELECT COUNT(*) as count FROM tv_series`).get();
    const localSeriesPct = ((localSeriesBackdrop.count / localSeriesTotal.count) * 100).toFixed(1);

    console.log(`   📺 المسلسلات (Local):`);
    console.log(`       └─ إجمالي: ${localSeriesTotal.count.toLocaleString('ar-EG')}`);
    console.log(`       └─ عندها backdrop: ${localSeriesBackdrop.count.toLocaleString('ar-EG')} (${localSeriesPct}%)`);
    console.log(`       └─ بدون backdrop: ${(localSeriesTotal.count - localSeriesBackdrop.count).toLocaleString('ar-EG')} (${(100 - parseFloat(localSeriesPct)).toFixed(1)}%)\n`);
  } catch (e) {
    console.log('⚠️  خطأ في تحليل Local:', e.message);
  }

  // Turso backdrop analysis
  try {
    const tursoMoviesBackdropResult = await turso.execute(`SELECT COUNT(*) as count FROM movies WHERE backdrop_path IS NOT NULL AND backdrop_path != ''`);
    const tursoMoviesBackdrop = tursoMoviesBackdropResult.rows[0].count;
    
    const tursoMoviesTotalResult = await turso.execute(`SELECT COUNT(*) as count FROM movies`);
    const tursoMoviesTotal = tursoMoviesTotalResult.rows[0].count;
    const tursoMoviesPct = ((tursoMoviesBackdrop / tursoMoviesTotal) * 100).toFixed(1);

    console.log(`   📽️  الأفلام (Turso):`);
    console.log(`       └─ إجمالي: ${tursoMoviesTotal.toLocaleString('ar-EG')}`);
    console.log(`       └─ عندها backdrop: ${tursoMoviesBackdrop.toLocaleString('ar-EG')} (${tursoMoviesPct}%)`);
    console.log(`       └─ بدون backdrop: ${(tursoMoviesTotal - tursoMoviesBackdrop).toLocaleString('ar-EG')} (${(100 - parseFloat(tursoMoviesPct)).toFixed(1)}%)\n`);

    const tursoSeriesBackdropResult = await turso.execute(`SELECT COUNT(*) as count FROM tv_series WHERE backdrop_path IS NOT NULL AND backdrop_path != ''`);
    const tursoSeriesBackdrop = tursoSeriesBackdropResult.rows[0].count;
    
    const tursoSeriesTotalResult = await turso.execute(`SELECT COUNT(*) as count FROM tv_series`);
    const tursoSeriesTotal = tursoSeriesTotalResult.rows[0].count;
    const tursoSeriesPct = ((tursoSeriesBackdrop / tursoSeriesTotal) * 100).toFixed(1);

    console.log(`   📺 المسلسلات (Turso):`);
    console.log(`       └─ إجمالي: ${tursoSeriesTotal.toLocaleString('ar-EG')}`);
    console.log(`       └─ عندها backdrop: ${tursoSeriesBackdrop.toLocaleString('ar-EG')} (${tursoSeriesPct}%)`);
    console.log(`       └─ بدون backdrop: ${(tursoSeriesTotal - tursoSeriesBackdrop).toLocaleString('ar-EG')} (${(100 - parseFloat(tursoSeriesPct)).toFixed(1)}%)\n`);
  } catch (e) {
    console.log('⚠️  خطأ في تحليل Turso:', e.message);
  }

  console.log('\n' + '═'.repeat(100));
  console.log('                    ✅ اكتمل التحليل الشامل');
  console.log('═'.repeat(100) + '\n');

  localDb.close();
}

// Run the analysis
analyzeDatabase().catch(console.error);
